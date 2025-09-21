-- Enable the pg_cron extension for scheduled jobs
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Create a cron job to process the wine queue every 15 seconds
-- This will call our Edge Function to process pending wine uploads
SELECT cron.schedule(
  'process-wine-queue', -- job name
  '*/15 * * * * *',     -- every 15 seconds (cron format with seconds)
  $$
  SELECT
    net.http_post(
      url := 'https://aghiopwrzzvamssgcwpv.supabase.co/functions/v1/process-wine-queue',
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('app.settings.service_role_key') || '"}',
      body := '{}'::jsonb
    );
  $$
);

-- Note: You'll need to replace 'your-project-ref' with your actual Supabase project reference
-- and set up the service_role_key in your database settings