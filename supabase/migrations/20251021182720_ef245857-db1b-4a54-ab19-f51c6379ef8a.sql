-- Phase II: Analyst v2, BID patterns, Repository events (oracle_signals already exists)

-- Analyst state tracking
CREATE TABLE IF NOT EXISTS analyst_states (
  workspace_id uuid NOT NULL,
  user_id uuid NOT NULL,
  mode text NOT NULL DEFAULT 'paper',
  tone text NOT NULL DEFAULT 'neutral',
  context jsonb NOT NULL DEFAULT '{}'::jsonb,
  last_plan jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  PRIMARY KEY (workspace_id, user_id)
);

-- BID pattern recognition
CREATE TABLE IF NOT EXISTS bid_patterns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  pattern_hash text,
  feature jsonb,
  success_rate numeric,
  last_seen timestamptz DEFAULT now()
);

-- Repository events (audit + learning bridge)
CREATE TABLE IF NOT EXISTS repository_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  source text NOT NULL CHECK (source IN ('oracle','bid','analyst','broker')),
  payload jsonb NOT NULL,
  ts timestamptz DEFAULT now()
);

-- Add confidence column to existing oracle_signals if missing
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'oracle_signals' AND column_name = 'confidence'
  ) THEN
    ALTER TABLE oracle_signals ADD COLUMN confidence numeric DEFAULT 0.5;
  END IF;
END $$;

-- RLS policies for new tables
ALTER TABLE analyst_states ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS analyst_states_ws ON analyst_states;
CREATE POLICY analyst_states_ws ON analyst_states
FOR ALL USING (
  EXISTS (SELECT 1 FROM workspace_members wm 
    WHERE wm.workspace_id = analyst_states.workspace_id 
    AND wm.user_id = auth.uid())
) WITH CHECK (
  EXISTS (SELECT 1 FROM workspace_members wm 
    WHERE wm.workspace_id = analyst_states.workspace_id 
    AND wm.user_id = auth.uid())
);

ALTER TABLE bid_patterns ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS bid_patterns_ws ON bid_patterns;
CREATE POLICY bid_patterns_ws ON bid_patterns
FOR ALL USING (
  EXISTS (SELECT 1 FROM workspace_members wm 
    WHERE wm.workspace_id = bid_patterns.workspace_id 
    AND wm.user_id = auth.uid())
) WITH CHECK (
  EXISTS (SELECT 1 FROM workspace_members wm 
    WHERE wm.workspace_id = bid_patterns.workspace_id 
    AND wm.user_id = auth.uid())
);

ALTER TABLE repository_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS repository_events_ws ON repository_events;
CREATE POLICY repository_events_ws ON repository_events
FOR ALL USING (
  EXISTS (SELECT 1 FROM workspace_members wm 
    WHERE wm.workspace_id = repository_events.workspace_id 
    AND wm.user_id = auth.uid())
) WITH CHECK (
  EXISTS (SELECT 1 FROM workspace_members wm 
    WHERE wm.workspace_id = repository_events.workspace_id 
    AND wm.user_id = auth.uid())
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_analyst_states_ws_user ON analyst_states(workspace_id, user_id);
CREATE INDEX IF NOT EXISTS idx_bid_patterns_ws ON bid_patterns(workspace_id);
CREATE INDEX IF NOT EXISTS idx_oracle_signals_confidence ON oracle_signals(confidence DESC);
CREATE INDEX IF NOT EXISTS idx_repository_events_ws_ts ON repository_events(workspace_id, ts DESC);
CREATE INDEX IF NOT EXISTS idx_repository_events_source ON repository_events(source);