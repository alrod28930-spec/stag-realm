-- Enhanced Auth & User Management System

-- Extend profiles table
ALTER TABLE profiles 
  ADD COLUMN IF NOT EXISTS avatar_url text,
  ADD COLUMN IF NOT EXISTS timezone text default 'America/Chicago',
  ADD COLUMN IF NOT EXISTS marketing_opt_in boolean default false;

-- User settings table
CREATE TABLE IF NOT EXISTS user_settings (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  workspace_default uuid REFERENCES workspaces(id),
  theme text DEFAULT 'dark',
  analyst_persona text DEFAULT 'Mentor',
  voice_profile text DEFAULT 'StagVoice',
  notifications_email boolean DEFAULT true,
  notifications_push boolean DEFAULT false,
  data_sharing_opt_in boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- User overrides (per-workspace user preferences)
CREATE TABLE IF NOT EXISTS user_overrides (
  workspace_id uuid REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  key text NOT NULL,
  value jsonb NOT NULL,
  PRIMARY KEY (workspace_id, user_id, key)
);

-- Secure brokerage connections
CREATE TABLE IF NOT EXISTS connections_brokerages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES workspaces(id) ON DELETE CASCADE,
  provider text NOT NULL,
  account_label text,
  api_key_cipher bytea NOT NULL,
  api_secret_cipher bytea NOT NULL,
  nonce bytea NOT NULL,
  scope jsonb,
  status text DEFAULT 'active',
  last_sync timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- User devices for push notifications
CREATE TABLE IF NOT EXISTS user_devices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  push_token text,
  platform text,
  last_seen timestamptz DEFAULT now()
);

-- Enable RLS on all new tables
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE connections_brokerages ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_devices ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_settings
CREATE POLICY "Users can manage own settings" ON user_settings 
  FOR ALL USING (user_id = auth.uid()) 
  WITH CHECK (user_id = auth.uid());

-- RLS Policies for user_overrides
CREATE POLICY "Users can manage own overrides" ON user_overrides 
  FOR ALL 
  USING (auth.uid() = user_id AND is_member_of_workspace(workspace_id))
  WITH CHECK (auth.uid() = user_id AND is_member_of_workspace(workspace_id));

-- RLS Policies for connections_brokerages
CREATE POLICY "Members can manage brokerage connections" ON connections_brokerages 
  FOR ALL 
  USING (is_member_of_workspace(workspace_id))
  WITH CHECK (is_member_of_workspace(workspace_id));

-- RLS Policies for user_devices
CREATE POLICY "Users can manage own devices" ON user_devices 
  FOR ALL USING (user_id = auth.uid()) 
  WITH CHECK (user_id = auth.uid());

-- Create triggers for updated_at
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN 
  NEW.updated_at = now(); 
  RETURN NEW; 
END 
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_user_settings_updated_at 
  BEFORE UPDATE ON user_settings
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_connections_brokerages_updated_at 
  BEFORE UPDATE ON connections_brokerages
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Add initial user settings for existing users
INSERT INTO user_settings (user_id)
SELECT id FROM auth.users 
WHERE NOT EXISTS (
  SELECT 1 FROM user_settings WHERE user_id = auth.users.id
);