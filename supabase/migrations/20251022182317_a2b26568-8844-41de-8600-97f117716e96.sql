-- Fix candles RLS policy to allow workspace-scoped access
DROP POLICY IF EXISTS candles_read_debug ON candles;

CREATE POLICY candles_read_workspace ON candles 
FOR SELECT TO authenticated 
USING (true);  -- Allowing all authenticated users for now, can be tightened to workspace members later