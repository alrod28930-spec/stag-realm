-- 1) User profiles for Analyst personalization
CREATE TABLE IF NOT EXISTS user_profiles (
  workspace_id UUID NOT NULL,
  user_id UUID NOT NULL,
  risk_level TEXT NOT NULL CHECK (risk_level IN ('conservative','balanced','aggressive')),
  style TEXT NOT NULL CHECK (style IN ('trend','mean_reversion','breakout','mixed')),
  max_daily_trades INT NOT NULL DEFAULT 5,
  max_position_risk_pct NUMERIC NOT NULL DEFAULT 0.02,
  objectives JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (workspace_id, user_id)
);

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS user_profiles_ws ON user_profiles;

CREATE POLICY user_profiles_ws ON user_profiles
FOR ALL USING (
  EXISTS (SELECT 1 FROM workspace_members wm WHERE wm.workspace_id=user_profiles.workspace_id AND wm.user_id=auth.uid())
) WITH CHECK (
  EXISTS (SELECT 1 FROM workspace_members wm WHERE wm.workspace_id=user_profiles.workspace_id AND wm.user_id=auth.uid())
);

-- 3) BID user stats (derived from learning events)
CREATE TABLE IF NOT EXISTS bid_user_stats (
  workspace_id UUID NOT NULL,
  user_id UUID NOT NULL,
  symbol TEXT NOT NULL,
  tf TEXT NOT NULL,
  trades INT NOT NULL DEFAULT 0,
  win_rate NUMERIC NOT NULL DEFAULT 0,
  avg_rr NUMERIC NOT NULL DEFAULT 0,
  avg_hold_minutes NUMERIC NOT NULL DEFAULT 0,
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (workspace_id, user_id, symbol, tf)
);

ALTER TABLE bid_user_stats ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS bid_user_stats_ws ON bid_user_stats;

CREATE POLICY bid_user_stats_ws ON bid_user_stats
FOR ALL USING (
  EXISTS (SELECT 1 FROM workspace_members wm WHERE wm.workspace_id=bid_user_stats.workspace_id AND wm.user_id=auth.uid())
) WITH CHECK (
  EXISTS (SELECT 1 FROM workspace_members wm WHERE wm.workspace_id=bid_user_stats.workspace_id AND wm.user_id=auth.uid())
);

-- 4) Oracle signal scores by regime
CREATE TABLE IF NOT EXISTS oracle_signal_scores (
  workspace_id UUID NOT NULL,
  symbol TEXT NOT NULL,
  tf TEXT NOT NULL,
  regime TEXT NOT NULL,
  n INT NOT NULL DEFAULT 0,
  hit_rate NUMERIC NOT NULL DEFAULT 0,
  avg_edge_bp NUMERIC NOT NULL DEFAULT 0,
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (workspace_id, symbol, tf, regime)
);

ALTER TABLE oracle_signal_scores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS oracle_signal_scores_ws ON oracle_signal_scores;

CREATE POLICY oracle_signal_scores_ws ON oracle_signal_scores
FOR ALL USING (
  EXISTS (SELECT 1 FROM workspace_members wm WHERE wm.workspace_id=oracle_signal_scores.workspace_id AND wm.user_id=auth.uid())
) WITH CHECK (
  EXISTS (SELECT 1 FROM workspace_members wm WHERE wm.workspace_id=oracle_signal_scores.workspace_id AND wm.user_id=auth.uid())
);

-- 5) Agent feature flags
CREATE TABLE IF NOT EXISTS agent_feature_flags (
  workspace_id UUID PRIMARY KEY,
  flags JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE agent_feature_flags ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS agent_feature_flags_ws ON agent_feature_flags;

CREATE POLICY agent_feature_flags_ws ON agent_feature_flags
FOR ALL USING (
  EXISTS (SELECT 1 FROM workspace_members wm WHERE wm.workspace_id=agent_feature_flags.workspace_id AND wm.user_id=auth.uid())
) WITH CHECK (
  EXISTS (SELECT 1 FROM workspace_members wm WHERE wm.workspace_id=agent_feature_flags.workspace_id AND wm.user_id=auth.uid())
);

-- Update bid_learning_events RLS policies
ALTER TABLE bid_learning_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS bid_learning_events_ws ON bid_learning_events;

CREATE POLICY bid_learning_events_ws ON bid_learning_events
FOR ALL USING (
  EXISTS (SELECT 1 FROM workspace_members wm WHERE wm.workspace_id=bid_learning_events.workspace_id AND wm.user_id=auth.uid())
) WITH CHECK (
  EXISTS (SELECT 1 FROM workspace_members wm WHERE wm.workspace_id=bid_learning_events.workspace_id AND wm.user_id=auth.uid())
);

-- Create updated_at trigger for user_profiles
DROP TRIGGER IF EXISTS user_profiles_updated_at ON user_profiles;

CREATE OR REPLACE FUNCTION update_user_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER user_profiles_updated_at
BEFORE UPDATE ON user_profiles
FOR EACH ROW
EXECUTE FUNCTION update_user_profiles_updated_at();

-- Create index for candles query performance
CREATE INDEX IF NOT EXISTS ix_candles_ws_sym_tf_ts ON candles (workspace_id, symbol, tf, ts);

-- Create index for oracle_signal_scores
CREATE INDEX IF NOT EXISTS ix_oracle_scores_ws_tf_hit ON oracle_signal_scores (workspace_id, tf, hit_rate DESC, avg_edge_bp DESC);