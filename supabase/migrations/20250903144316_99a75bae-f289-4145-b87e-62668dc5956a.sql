-- Extend bot_profiles for Trading Desk integration
ALTER TABLE IF EXISTS bot_profiles
  ADD COLUMN IF NOT EXISTS active boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS mode text NOT NULL DEFAULT 'standard', 
  ADD COLUMN IF NOT EXISTS last_activated timestamptz,
  ADD COLUMN IF NOT EXISTS last_deactivated timestamptz;

-- Add constraint for mode values
ALTER TABLE bot_profiles DROP CONSTRAINT IF EXISTS bot_profiles_mode_check;
ALTER TABLE bot_profiles ADD CONSTRAINT bot_profiles_mode_check 
  CHECK (mode IN ('standard', 'intraday'));

-- Create index for active bots lookup
CREATE INDEX IF NOT EXISTS idx_bot_profiles_active ON bot_profiles(workspace_id, active) WHERE active = true;

-- Update existing bot profiles to have names if they don't
UPDATE bot_profiles 
SET mode = 'standard' 
WHERE mode IS NULL OR mode = '';

-- Add a simple bot name column if it doesn't exist
ALTER TABLE IF EXISTS bot_profiles
  ADD COLUMN IF NOT EXISTS name text;

-- Set default names for existing bots without names
UPDATE bot_profiles 
SET name = 'Bot ' || substr(workspace_id::text, 1, 8)
WHERE name IS NULL OR name = '';