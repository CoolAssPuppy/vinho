-- Reproduce the base cron jobs in a tracked migration.
--
-- The queue/embedding/stats cron jobs previously existed only in
-- migrations-archive, so a project built from migrations/ alone had no queue
-- processing at all. This recreates them idempotently: each job is scheduled
-- only if a job of that name does not already exist, so this is a no-op on the
-- production database where they are already present.
--
-- The Authorization bearer is the project's public anon key (the same value
-- shipped to browsers), not a secret. Rotating to a vault-sourced key is
-- tracked separately (DB-4).

do $$
declare
  anon_key text := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFnaGlvcHdyenp2YW1zc2djd3B2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg0MDQ2OTAsImV4cCI6MjA3Mzk4MDY5MH0.QgiwIydcXOkZ0OWE35RPVGJ8uzBy6GzLByLbVtpTeNY';
  base_url text := 'https://aghiopwrzzvamssgcwpv.supabase.co';
  auth_headers jsonb;
begin
  if not exists (select 1 from pg_namespace where nspname = 'cron') then
    return;
  end if;

  auth_headers := jsonb_build_object(
    'Content-Type', 'application/json',
    'Authorization', 'Bearer ' || anon_key
  );

  -- Drive the wine-processing queue every 15 seconds.
  if not exists (select 1 from cron.job where jobname = 'process-wine-queue') then
    perform cron.schedule('process-wine-queue', '15 seconds', format(
      $cmd$select net.http_post(url := %L, headers := %L::jsonb, body := '{}'::jsonb);$cmd$,
      base_url || '/functions/v1/process-wine-queue', auth_headers));
  end if;

  -- Backup driver once a minute in case the 15s job misses.
  if not exists (select 1 from cron.job where jobname = 'process-wine-queue-backup') then
    perform cron.schedule('process-wine-queue-backup', '* * * * *', format(
      $cmd$select net.http_post(url := %L, headers := %L::jsonb, body := '{}'::jsonb);$cmd$,
      base_url || '/functions/v1/process-wine-queue', auth_headers));
  end if;

  -- Generate wine-identity embeddings every 5 minutes.
  if not exists (select 1 from cron.job where jobname = 'process-wine-embeddings') then
    perform cron.schedule('process-wine-embeddings', '*/5 * * * *', format(
      $cmd$select net.http_post(url := %L, headers := %L::jsonb, body := '{"job_type": "wine_identity", "limit": 50}'::jsonb);$cmd$,
      base_url || '/functions/v1/generate-embeddings', auth_headers));
  end if;

  -- Requeue embedding jobs stuck in 'processing' for over 30 minutes.
  if not exists (select 1 from cron.job where jobname = 'reset-stuck-embedding-jobs') then
    perform cron.schedule('reset-stuck-embedding-jobs', '0 * * * *', $cmd$
  update embedding_jobs_queue
  set status = 'pending'
  where status = 'processing'
    and created_at < now() - interval '30 minutes'
  $cmd$);
  end if;

  -- Refresh the user-wine stats materialized view every 5 minutes.
  if not exists (select 1 from cron.job where jobname = 'refresh-stats-materialized-views') then
    perform cron.schedule('refresh-stats-materialized-views', '*/5 * * * *',
      'REFRESH MATERIALIZED VIEW CONCURRENTLY public.user_wine_stats_materialized;');
  end if;
end;
$$;
