-- Create analyst and oracle tables with RLS
-- Enable vector extension for potential RAG functionality
CREATE EXTENSION IF NOT EXISTS vector;

-- Analyst configuration & outputs
CREATE TABLE IF NOT EXISTS analyst_prompts (
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  persona TEXT NOT NULL,
  system_text TEXT NOT NULL,
  style_notes TEXT,
  updated_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY(workspace_id, persona)
);

CREATE TABLE IF NOT EXISTS voice_profiles (
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  tts_provider TEXT NOT NULL,
  tts_voice_id TEXT NOT NULL,
  speaking_rate NUMERIC DEFAULT 1.0,
  pitch NUMERIC DEFAULT 0,
  PRIMARY KEY(workspace_id, name)
);

CREATE TABLE IF NOT EXISTS analyst_outputs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  ts TIMESTAMPTZ DEFAULT now(),
  input_kind TEXT,
  input_json JSONB,
  output_text TEXT,
  tts_url TEXT,
  model TEXT
);

-- Oracle ingestion and scoring
CREATE TABLE IF NOT EXISTS oracle_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  provider TEXT NOT NULL,
  api_key_ref TEXT,
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS oracle_news (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  symbol TEXT,
  ts TIMESTAMPTZ NOT NULL,
  headline TEXT,
  source TEXT,
  url TEXT,
  sentiment NUMERIC,
  topics JSONB
);

CREATE TABLE IF NOT EXISTS oracle_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  symbol TEXT NOT NULL,
  ts TIMESTAMPTZ NOT NULL DEFAULT now(),
  score NUMERIC,
  drivers JSONB
);

-- Enable RLS on all new tables
ALTER TABLE analyst_prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE voice_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE analyst_outputs ENABLE ROW LEVEL SECURITY;
ALTER TABLE oracle_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE oracle_news ENABLE ROW LEVEL SECURITY;
ALTER TABLE oracle_scores ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for analyst tables
CREATE POLICY analyst_prompts_read ON analyst_prompts 
  FOR SELECT USING (is_member_of_workspace(workspace_id));
CREATE POLICY analyst_prompts_write ON analyst_prompts 
  FOR INSERT WITH CHECK (is_member_of_workspace(workspace_id));
CREATE POLICY analyst_prompts_update ON analyst_prompts 
  FOR UPDATE USING (is_member_of_workspace(workspace_id));

CREATE POLICY voice_profiles_read ON voice_profiles 
  FOR SELECT USING (is_member_of_workspace(workspace_id));
CREATE POLICY voice_profiles_write ON voice_profiles 
  FOR INSERT WITH CHECK (is_member_of_workspace(workspace_id));
CREATE POLICY voice_profiles_update ON voice_profiles 
  FOR UPDATE USING (is_member_of_workspace(workspace_id));

CREATE POLICY analyst_outputs_read ON analyst_outputs 
  FOR SELECT USING (is_member_of_workspace(workspace_id));
CREATE POLICY analyst_outputs_write ON analyst_outputs 
  FOR INSERT WITH CHECK (is_member_of_workspace(workspace_id));

-- Create RLS policies for oracle tables
CREATE POLICY oracle_sources_read ON oracle_sources 
  FOR SELECT USING (is_member_of_workspace(workspace_id));
CREATE POLICY oracle_sources_write ON oracle_sources 
  FOR INSERT WITH CHECK (is_member_of_workspace(workspace_id));
CREATE POLICY oracle_sources_update ON oracle_sources 
  FOR UPDATE USING (is_member_of_workspace(workspace_id));

CREATE POLICY oracle_news_read ON oracle_news 
  FOR SELECT USING (is_member_of_workspace(workspace_id));
CREATE POLICY oracle_news_write ON oracle_news 
  FOR INSERT WITH CHECK (is_member_of_workspace(workspace_id));

CREATE POLICY oracle_scores_read ON oracle_scores 
  FOR SELECT USING (is_member_of_workspace(workspace_id));
CREATE POLICY oracle_scores_write ON oracle_scores 
  FOR INSERT WITH CHECK (is_member_of_workspace(workspace_id));

-- Create indexes for performance
CREATE INDEX idx_analyst_outputs_workspace_ts ON analyst_outputs(workspace_id, ts DESC);
CREATE INDEX idx_oracle_news_workspace_ts ON oracle_news(workspace_id, ts DESC);
CREATE INDEX idx_oracle_scores_workspace_symbol_ts ON oracle_scores(workspace_id, symbol, ts DESC);

-- Insert default analyst personas
INSERT INTO analyst_prompts (workspace_id, persona, system_text, style_notes) 
SELECT id, 'Mentor', 
  'You are a warm, encouraging financial mentor. Explain concepts clearly and offer supportive guidance. Always include appropriate risk disclaimers.',
  'Warm tone, educational focus'
FROM workspaces 
ON CONFLICT DO NOTHING;

INSERT INTO analyst_prompts (workspace_id, persona, system_text, style_notes)
SELECT id, 'Strategist', 
  'You are a cold, analytical strategist. Focus on data, probabilities, and tactical analysis. Be direct and precise. Always include appropriate risk disclaimers.',
  'Direct tone, data-focused'
FROM workspaces 
ON CONFLICT DO NOTHING;