-- Enable pg_cron and pg_net extensions for scheduled jobs
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Create cron job to sync market data every 5 minutes
-- This will keep charts and market pages updated with fresh Alpaca data
SELECT cron.schedule(
  'market-data-sync-job',
  '*/5 * * * *', -- Every 5 minutes
  $$
  SELECT
    net.http_post(
        url:='https://vtfpwvzufffmtnovvilx.supabase.co/functions/v1/market-data-sync',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ0ZnB3dnp1ZmZmbXRub3Z2aWx4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY4MTg5ODcsImV4cCI6MjA3MjM5NDk4N30.QCdlv2PkBwOmUOSitFq9xx6iM_6uNEkvB0AvrJVr2yU"}'::jsonb,
        body:=concat('{"time": "', now(), '"}')::jsonb
    ) as request_id;
  $$
);

-- Optional: Create a manual trigger function for immediate sync
CREATE OR REPLACE FUNCTION public.trigger_market_data_sync()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT net.http_post(
    url:='https://vtfpwvzufffmtnovvilx.supabase.co/functions/v1/market-data-sync',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ0ZnB3dnp1ZmZmbXRub3Z2aWx4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY4MTg5ODcsImV4cCI6MjA3MjM5NDk4N30.QCdlv2PkBwOmUOSitFq9xx6iM_6uNEkvB0AvrJVr2yU"}'::jsonb,
    body:='{"manual_trigger": true}'::jsonb
  ) INTO result;
  
  RETURN jsonb_build_object('status', 'triggered', 'request_id', result);
END;
$$;

COMMENT ON FUNCTION public.trigger_market_data_sync IS 'Manually trigger market data sync from Alpaca';
