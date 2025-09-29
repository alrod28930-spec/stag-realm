-- Fix search_path for the trigger function
DROP FUNCTION IF EXISTS public.trigger_market_data_sync();

CREATE OR REPLACE FUNCTION public.trigger_market_data_sync()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
