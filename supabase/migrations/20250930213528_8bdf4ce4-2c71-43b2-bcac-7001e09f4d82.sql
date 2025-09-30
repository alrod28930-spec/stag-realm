-- ============================================================================
-- 1) Candles RPC function for efficient data fetching
-- ============================================================================
CREATE OR REPLACE FUNCTION fetch_candles(
  _ws uuid, 
  _symbol text, 
  _tf text, 
  _from timestamptz, 
  _to timestamptz
)
RETURNS TABLE(
  ts timestamptz,
  o numeric,
  h numeric,
  l numeric,
  c numeric,
  v numeric,
  vwap numeric
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT ts, o, h, l, c, v, vwap
  FROM candles
  WHERE workspace_id = _ws 
    AND symbol = _symbol 
    AND tf = _tf 
    AND ts BETWEEN _from AND _to
  ORDER BY ts ASC
  LIMIT 5000;
$$;

-- Index for candles performance
CREATE INDEX IF NOT EXISTS ix_candles_ws_symbol_tf_ts 
  ON candles (workspace_id, symbol, tf, ts);

-- ============================================================================
-- 2) Chart layouts table for persistence
-- ============================================================================
CREATE TABLE IF NOT EXISTS chart_layouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  user_id uuid NOT NULL,
  name text NOT NULL DEFAULT 'default',
  layout jsonb NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(workspace_id, user_id, name)
);

ALTER TABLE chart_layouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY chart_layouts_user_access ON chart_layouts
  FOR ALL
  USING (user_id = auth.uid() AND is_member_of_workspace(workspace_id))
  WITH CHECK (user_id = auth.uid() AND is_member_of_workspace(workspace_id));

-- ============================================================================
-- 3) Strategy runs table for background execution tracking
-- ============================================================================
CREATE TABLE IF NOT EXISTS strategy_runs (
  run_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  user_id uuid NOT NULL,
  strategy_id uuid,
  status text NOT NULL CHECK (status IN ('research','paper','live','halted','error')),
  cfg jsonb NOT NULL DEFAULT '{}'::jsonb,
  started_at timestamptz,
  stopped_at timestamptz,
  updated_at timestamptz DEFAULT now(),
  error_message text
);

ALTER TABLE strategy_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY strategy_runs_user_access ON strategy_runs
  FOR ALL
  USING (user_id = auth.uid() AND is_member_of_workspace(workspace_id))
  WITH CHECK (user_id = auth.uid() AND is_member_of_workspace(workspace_id));

CREATE INDEX IF NOT EXISTS ix_strategy_runs_workspace_user 
  ON strategy_runs (workspace_id, user_id);

-- ============================================================================
-- 4) Broker health tracking
-- ============================================================================
CREATE TABLE IF NOT EXISTS broker_health (
  workspace_id uuid NOT NULL,
  broker text NOT NULL,
  last_ok timestamptz,
  last_check timestamptz DEFAULT now(),
  status text NOT NULL DEFAULT 'unknown' CHECK (status IN ('ok','degraded','down','unknown')),
  error_message text,
  PRIMARY KEY (workspace_id, broker)
);

ALTER TABLE broker_health ENABLE ROW LEVEL SECURITY;

CREATE POLICY broker_health_workspace_access ON broker_health
  FOR ALL
  USING (is_member_of_workspace(workspace_id))
  WITH CHECK (is_member_of_workspace(workspace_id));

-- ============================================================================
-- 5) Update trigger for chart_layouts
-- ============================================================================
CREATE TRIGGER update_chart_layouts_updated_at
  BEFORE UPDATE ON chart_layouts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();