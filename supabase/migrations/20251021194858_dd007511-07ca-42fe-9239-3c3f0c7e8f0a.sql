-- Phase VI: Predictive Anomalies + Sentiment + Predictive Merge
-- Note: oracle_news already exists, we'll work with its existing schema

-- Add missing columns to existing oracle_news if needed
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'oracle_news' AND column_name = 'confidence') THEN
    ALTER TABLE oracle_news ADD COLUMN confidence NUMERIC NOT NULL DEFAULT 0.7;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'oracle_news' AND column_name = 'created_at') THEN
    ALTER TABLE oracle_news ADD COLUMN created_at TIMESTAMPTZ DEFAULT now();
  END IF;
END $$;

-- Detected anomalies (new table)
CREATE TABLE IF NOT EXISTS oracle_anomalies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL,
  symbol TEXT NOT NULL,
  tf TEXT NOT NULL,
  kind TEXT NOT NULL,
  severity NUMERIC NOT NULL,
  observed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  meta JSONB NOT NULL DEFAULT '{}'::jsonb
);

-- Predictive fusion output (new table)
CREATE TABLE IF NOT EXISTS oracle_predictive (
  workspace_id UUID NOT NULL,
  symbol TEXT NOT NULL,
  tf TEXT NOT NULL,
  score NUMERIC NOT NULL,
  sentiment NUMERIC NOT NULL,
  anomaly NUMERIC NOT NULL,
  price_momentum NUMERIC NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (workspace_id, symbol, tf)
);

-- Enable RLS on new tables
ALTER TABLE oracle_anomalies ENABLE ROW LEVEL SECURITY;
ALTER TABLE oracle_predictive ENABLE ROW LEVEL SECURITY;

-- RLS Policies for new tables
CREATE POLICY oracle_anomalies_ws ON oracle_anomalies
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM workspace_members wm 
      WHERE wm.workspace_id = oracle_anomalies.workspace_id 
      AND wm.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM workspace_members wm 
      WHERE wm.workspace_id = oracle_anomalies.workspace_id 
      AND wm.user_id = auth.uid()
    )
  );

CREATE POLICY oracle_predictive_ws ON oracle_predictive
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM workspace_members wm 
      WHERE wm.workspace_id = oracle_predictive.workspace_id 
      AND wm.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM workspace_members wm 
      WHERE wm.workspace_id = oracle_predictive.workspace_id 
      AND wm.user_id = auth.uid()
    )
  );

-- Indexes
CREATE INDEX IF NOT EXISTS ix_news_ws_sym_time ON oracle_news (workspace_id, symbol, ts DESC);
CREATE INDEX IF NOT EXISTS ix_anom_ws_sym_time ON oracle_anomalies (workspace_id, symbol, observed_at DESC);
CREATE INDEX IF NOT EXISTS ix_pred_ws_sym_tf ON oracle_predictive (workspace_id, symbol, tf);