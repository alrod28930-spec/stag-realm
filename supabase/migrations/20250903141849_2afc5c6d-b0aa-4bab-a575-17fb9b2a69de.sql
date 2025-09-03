-- Add intraday trading columns to bot_profiles
ALTER TABLE IF EXISTS bot_profiles
  ADD COLUMN IF NOT EXISTS intraday_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS intraday_max_trades int NOT NULL DEFAULT 6,
  ADD COLUMN IF NOT EXISTS intraday_time_window text NOT NULL DEFAULT '09:35-15:45',
  ADD COLUMN IF NOT EXISTS intraday_stop_style text NOT NULL DEFAULT 'tight',
  ADD COLUMN IF NOT EXISTS intraday_rr_min numeric NOT NULL DEFAULT 1.5,
  ADD COLUMN IF NOT EXISTS intraday_min_volume_usd numeric NOT NULL DEFAULT 1000000,
  ADD COLUMN IF NOT EXISTS intraday_blackout_json jsonb DEFAULT '{"pre_open":5,"pre_close":10}',
  ADD COLUMN IF NOT EXISTS pdt_guard boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS intraday_daily_loss_halt_pct numeric NOT NULL DEFAULT 1.0;

-- Create intraday sessions table for exchange hours mapping
CREATE TABLE IF NOT EXISTS intraday_sessions (
  workspace_id uuid REFERENCES workspaces(id) ON DELETE CASCADE,
  symbol_class text NOT NULL,
  tz text NOT NULL DEFAULT 'America/New_York',
  open_time time NOT NULL DEFAULT '09:30',
  close_time time NOT NULL DEFAULT '16:00',
  PRIMARY KEY (workspace_id, symbol_class)
);

-- Enable RLS on intraday_sessions
ALTER TABLE intraday_sessions ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for intraday_sessions
CREATE POLICY "Members can access intraday sessions" 
ON intraday_sessions 
FOR ALL 
USING (is_member_of_workspace(workspace_id))
WITH CHECK (is_member_of_workspace(workspace_id));