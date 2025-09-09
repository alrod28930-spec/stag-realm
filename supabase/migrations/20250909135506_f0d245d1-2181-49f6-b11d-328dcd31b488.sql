-- Analyst 2.0 Database Schema (corrected)

-- User preferences (risk & voice)
CREATE TABLE IF NOT EXISTS user_prefs (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  risk_profile TEXT CHECK (risk_profile IN ('low','med','high')) DEFAULT 'med',
  horizon TEXT CHECK (horizon IN ('intra','swing','long')) DEFAULT 'swing',
  favored_assets TEXT[],
  teach_level TEXT CHECK (teach_level IN ('beginner','intermediate','advanced')) DEFAULT 'intermediate',
  voice_enabled BOOLEAN DEFAULT true,
  voice_rate NUMERIC DEFAULT 1.0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Analyst session memory (compact, per user/workspace)
CREATE TABLE IF NOT EXISTS analyst_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  summary JSONB DEFAULT '{}'::JSONB,
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (workspace_id, user_id)
);

-- Minimal tool telemetry
CREATE TABLE IF NOT EXISTS analyst_telemetry (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  event TEXT NOT NULL,
  payload JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE user_prefs ENABLE ROW LEVEL SECURITY;
ALTER TABLE analyst_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE analyst_telemetry ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_prefs
CREATE POLICY "Users can manage own preferences" ON user_prefs
FOR ALL USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- RLS Policies for analyst_sessions
CREATE POLICY "Users can access own sessions" ON analyst_sessions
FOR ALL USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- RLS Policies for analyst_telemetry
CREATE POLICY "Users can access own telemetry" ON analyst_telemetry
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own telemetry" ON analyst_telemetry
FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Add triggers for updated_at
CREATE TRIGGER update_user_prefs_updated_at
    BEFORE UPDATE ON user_prefs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_analyst_sessions_updated_at
    BEFORE UPDATE ON analyst_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();