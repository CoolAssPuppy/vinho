-- Schedule process-enrichment-queue.
--
-- wines_enrichment_queue accumulated 94 pending rows since Sept 2025 because
-- no cron, trigger, or client ever invoked the processor. The function now
-- relies on gateway JWT verification (like process-wine-queue), so the cron
-- authenticates with the anon key, matching the existing queue jobs.

do $$
begin
  if not exists (select 1 from pg_namespace where nspname = 'cron') then
    return;
  end if;

  if not exists (select 1 from cron.job where jobname = 'process-enrichment-queue') then
    perform cron.schedule(
      'process-enrichment-queue',
      '*/5 * * * *',
      $job$
      select net.http_post(
        url := 'https://aghiopwrzzvamssgcwpv.supabase.co/functions/v1/process-enrichment-queue',
        headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFnaGlvcHdyenp2YW1zc2djd3B2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg0MDQ2OTAsImV4cCI6MjA3Mzk4MDY5MH0.QgiwIydcXOkZ0OWE35RPVGJ8uzBy6GzLByLbVtpTeNY"}'::jsonb,
        body := '{"limit": 10}'::jsonb
      );
      $job$
    );
  end if;
end;
$$;
