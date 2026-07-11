-- Repair orphaned scan uploads and fix queue cron schedules.
--
-- Root cause: all three clients (iOS, Android, web) orchestrate scan
-- submission as four sequential network calls (storage upload, scans
-- insert, wines_added_queue insert, edge function invoke). If the client
-- is interrupted after the upload (app backgrounded, network drop, view
-- dismissed), the photo lands in storage but no scan or queue row is ever
-- created, and nothing recovers it. Observed in production on 2026-07-04
-- and 2026-07-05.
--
-- Fix 1: repair_orphaned_scans() finds scans-bucket objects with no
-- matching scans row and enqueues them, making the pipeline self-healing.
-- Fix 2: the process-wine-queue cron jobs used 6-field cron syntax
-- ("*/15 * * * * *"), which pg_cron does not support; it parsed the first
-- five fields and ran every 15 minutes instead of every 15 seconds.
-- pg_cron 1.5+ supports "N seconds" syntax directly.
-- Fix 3: refresh-stats-materialized-views has failed on every run because
-- it refreshes user_profile_stats_materialized, which does not exist (only
-- user_wine_stats_materialized does). The failure aborts the whole command,
-- so the real stats view never refreshes and user stats are stale. Rewrite
-- the job to refresh only the view that exists.

create or replace function public.repair_orphaned_scans(
  p_grace interval default interval '5 minutes',
  p_max_age interval default interval '30 days'
)
returns integer
language plpgsql
set search_path = ''
as $$
declare
  v_repaired integer := 0;
  v_object record;
  v_user_id uuid;
  v_scan_id uuid;
  v_public_url text;
begin
  for v_object in
    select o.name, o.created_at
    from storage.objects o
    where o.bucket_id = 'scans'
      -- Grace period: give the normal client flow time to finish before
      -- treating an upload as orphaned.
      and o.created_at < now() - p_grace
      and o.created_at > now() - p_max_age
      and o.name ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/'
      and not exists (
        select 1 from public.scans s where s.image_path = o.name
      )
      and not exists (
        select 1 from public.wines_added_queue q
        where q.idempotency_key = 'repair:' || o.name
      )
    order by o.created_at
  loop
    v_user_id := split_part(v_object.name, '/', 1)::uuid;

    -- Skip objects whose owner no longer exists (deleted accounts).
    if not exists (select 1 from auth.users u where u.id = v_user_id) then
      continue;
    end if;

    v_scan_id := gen_random_uuid();
    v_public_url := 'https://aghiopwrzzvamssgcwpv.supabase.co/storage/v1/object/public/scans/'
      || v_object.name;

    insert into public.scans (id, user_id, image_path, scan_image_url, created_at)
    values (v_scan_id, v_user_id, v_object.name, v_public_url, v_object.created_at);

    -- The unique idempotency_key guarantees each orphan is enqueued once,
    -- even across concurrent or repeated repair runs.
    insert into public.wines_added_queue
      (id, user_id, image_url, scan_id, status, idempotency_key)
    values
      (gen_random_uuid(), v_user_id, v_public_url, v_scan_id, 'pending',
       'repair:' || v_object.name)
    on conflict (idempotency_key) do nothing;

    v_repaired := v_repaired + 1;
  end loop;

  return v_repaired;
end;
$$;

comment on function public.repair_orphaned_scans(interval, interval) is
  'Self-healing for the scan pipeline: enqueues scans-bucket uploads that never got a scans/queue row because the client was interrupted mid-submission.';

-- Cron-only maintenance function; clients must not call it.
revoke all on function public.repair_orphaned_scans(interval, interval)
  from public, anon, authenticated;

-- Cron changes only apply in environments with pg_cron (production).
do $$
declare
  v_jobid bigint;
begin
  if not exists (select 1 from pg_namespace where nspname = 'cron') then
    return;
  end if;

  -- Fix 2: replace the unsupported 6-field schedules with pg_cron's
  -- seconds syntax, restoring the intended cadence.
  select jobid into v_jobid from cron.job where jobname = 'process-wine-queue';
  if v_jobid is not null then
    perform cron.alter_job(v_jobid, schedule => '15 seconds');
  end if;

  select jobid into v_jobid from cron.job where jobname = 'process-wine-queue-backup';
  if v_jobid is not null then
    -- The seconds syntax only allows 1-59, so every minute uses cron format.
    perform cron.alter_job(v_jobid, schedule => '* * * * *');
  end if;

  -- Fix 3: refresh only the materialized view that actually exists.
  select jobid into v_jobid from cron.job
  where jobname = 'refresh-stats-materialized-views';
  if v_jobid is not null then
    perform cron.alter_job(
      v_jobid,
      command => 'REFRESH MATERIALIZED VIEW CONCURRENTLY public.user_wine_stats_materialized;'
    );
  end if;

  -- Fix 1 schedule: sweep for orphaned uploads every 10 minutes.
  if not exists (select 1 from cron.job where jobname = 'repair-orphaned-scans') then
    perform cron.schedule(
      'repair-orphaned-scans',
      '*/10 * * * *',
      'select public.repair_orphaned_scans();'
    );
  end if;
end;
$$;
