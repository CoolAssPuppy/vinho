-- Reduce disk IO pressure from cron and pg_net bookkeeping.
--
-- Production hit its disk IO budget. Attribution from pg_stat_statements:
-- 155,361,594 of the database's 156,229,285 total shared block reads (99.4%)
-- came from a single query, pg_net's response-TTL cleanup:
--
--   WITH rows AS (SELECT ctid FROM net._http_response WHERE created < now() - $1
--                 ORDER BY created LIMIT $2)
--   DELETE FROM net._http_response r USING rows WHERE r.ctid = rows.ctid
--
-- Root cause: net._http_response had bloated to 260 MB while holding only
-- 1,941 live rows. pg_net's 6-hour TTL delete keeps the row count small, so
-- n_dead_tup never crossed the autovacuum threshold, so autovacuum had not
-- run on the table since 2026-01-28. The relation was never truncated and
-- new inserts kept extending it instead of reusing free space. Every cleanup
-- pass then paid ~337 cold block reads to delete a handful of rows out of a
-- mostly-empty 33,000-page heap, roughly 1.19 TB of disk reads in total.
--
-- cron.job_run_details had the same shape for a different reason: pg_cron
-- never prunes it and nothing here did either, so it reached 313,857 rows
-- and 268 MB going back to 2025-09-21.
--
-- Volume driver: migration 20260710233316 corrected process-wine-queue from
-- a misparsed 6-field schedule (which pg_cron silently ran every 15 minutes)
-- to a real 15-second schedule. That was the right fix, but it took pg_net
-- traffic from 96 to 5,750 calls per day and turned a slow leak into a fast
-- one.
--
-- The 496 MB of accumulated bloat was reclaimed out-of-band with VACUUM FULL
-- (it needs an ACCESS EXCLUSIVE lock, so it does not belong in a migration).
-- This migration stops it from rebuilding.

-- 1. Keep autovacuum on top of the two churn tables.
--
-- Both are insert-heavy with a small steady-state row count, which is exactly
-- the shape that defeats the default scale-factor thresholds. Pin the scale
-- factors to zero and use absolute thresholds so vacuum runs on a predictable
-- cadence and keeps the free space map current, letting inserts reuse pages
-- instead of extending the relation.
--
-- These tables are owned by supabase_admin. The grants that let `postgres`
-- alter them are a Supabase platform detail, so a permission failure must not
-- break the deploy: log and continue.
do $$
declare
  v_table text;
  v_settings text := 'autovacuum_vacuum_threshold = 500, '
                     'autovacuum_vacuum_scale_factor = 0, '
                     'autovacuum_vacuum_insert_threshold = 1000, '
                     'autovacuum_vacuum_insert_scale_factor = 0, '
                     'autovacuum_analyze_threshold = 500, '
                     'autovacuum_analyze_scale_factor = 0';
begin
  foreach v_table in array array['net._http_response', 'cron.job_run_details'] loop
    begin
      if to_regclass(v_table) is null then
        continue;
      end if;
      execute format('alter table %s set (%s)', v_table, v_settings);
    exception when insufficient_privilege or undefined_table then
      raise notice 'skipping autovacuum tuning for %: %', v_table, sqlerrm;
    end;
  end loop;
end;
$$;

-- Cron changes only apply in environments with pg_cron (production).
do $$
declare
  v_jobid bigint;
begin
  if not exists (select 1 from pg_namespace where nspname = 'cron') then
    return;
  end if;

  -- 2. Prune cron history daily so it cannot grow unbounded again.
  --
  -- At the current 8,222 runs per day, a 7-day window holds ~58,000 rows and
  -- ~32 MB, which is enough history to debug a failing job over a weekend.
  if not exists (select 1 from cron.job where jobname = 'purge-cron-history') then
    perform cron.schedule(
      'purge-cron-history',
      '20 4 * * *',
      $cmd$delete from cron.job_run_details where end_time < now() - interval '7 days';$cmd$
    );
  end if;

  -- 3. Drop the redundant backup driver.
  --
  -- process-wine-queue-backup existed to cover for the 15-second job when that
  -- job was silently running every 15 minutes. The 15-second schedule now works,
  -- so the backup adds 1,440 pg_net round trips a day and covers nothing the
  -- primary does not already cover 4 times a minute.
  if exists (select 1 from cron.job where jobname = 'process-wine-queue-backup') then
    perform cron.unschedule('process-wine-queue-backup');
  end if;

  -- 4. Refresh the stats view hourly instead of every 5 minutes.
  --
  -- REFRESH MATERIALIZED VIEW CONCURRENTLY builds a full temp copy of the view
  -- and diffs it against the existing one on every run. The view is a five-table
  -- join with seven SIMILAR TO regexes evaluated per row, and at 288 runs a day
  -- it was the largest write-IO source after the cron bookkeeping itself
  -- (199,929 blocks dirtied, 1,017 seconds of execution time).
  --
  -- This trades stats freshness for IO: user stats can now lag by up to an hour.
  -- If that is too stale, the durable fix is to refresh on change rather than on
  -- a timer, not to shorten this interval.
  select jobid into v_jobid from cron.job
  where jobname = 'refresh-stats-materialized-views';

  if v_jobid is not null then
    perform cron.alter_job(v_jobid, schedule => '0 * * * *');
  end if;
end;
$$;
