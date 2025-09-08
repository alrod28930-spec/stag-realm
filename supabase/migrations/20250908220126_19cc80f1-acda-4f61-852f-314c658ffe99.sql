-- Create features table with tier mapping
CREATE TABLE IF NOT EXISTS public.features (
  code TEXT PRIMARY KEY,
  description TEXT NOT NULL,
  tier_min TEXT NOT NULL CHECK (tier_min IN ('lite','standard','pro','elite'))
);

-- Create workspace entitlements table
CREATE TABLE IF NOT EXISTS public.workspace_entitlements (
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
  feature_code TEXT REFERENCES public.features(code),
  enabled BOOLEAN NOT NULL DEFAULT false,
  source TEXT NOT NULL DEFAULT 'subscription',
  updated_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (workspace_id, feature_code)
);

-- Enable RLS on workspace entitlements
ALTER TABLE public.workspace_entitlements ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for entitlements
CREATE POLICY "ent_read" ON public.workspace_entitlements
  FOR SELECT USING (is_member_of_workspace(workspace_id));

-- Create function to check entitlements
CREATE OR REPLACE FUNCTION public.has_entitlement(p_workspace UUID, p_feature TEXT)
RETURNS BOOLEAN 
LANGUAGE SQL 
STABLE 
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE((
    SELECT enabled FROM workspace_entitlements
    WHERE workspace_id = p_workspace AND feature_code = p_feature
  ), false);
$$;

-- Seed features table with the provided mapping
INSERT INTO public.features (code, description, tier_min) VALUES
('DEMO_TRADING', 'Paper trading / demo only', 'lite'),
('ANALYST_BASIC', 'Analyst explanations', 'lite'),
('RECORDER_BASIC', 'Basic logs', 'lite'),
('CRADLE_SHEET', 'Spreadsheet lab', 'lite'),
('TRADING_DESK', 'Manual order entry cockpit', 'standard'),
('BROKERAGE_DOCK', 'Embedded broker portal', 'standard'),
('PORTFOLIO_MIRROR', 'Live portfolio mirroring', 'standard'),
('CORE_BOTS', 'Core strategy bots', 'standard'),
('ORACLE_BASIC', 'U.S. market signals', 'standard'),
('ADV_BOTS', 'Advanced/customizable bots', 'pro'),
('DAY_TRADE_MODE', 'Day trading mode', 'pro'),
('ORACLE_EXPANDED', 'ETFs, forex, macro signals', 'pro'),
('SEEKER', 'Hidden intelligence engine', 'pro'),
('LEARNING_BOT', 'Adaptive personalization', 'pro'),
('RECORDER_ADV', 'Audit logs + tax exports', 'pro'),
('CRADLE_CODE', 'Code injection in Cradle', 'pro'),
('VOICE_ANALYST', 'Voice/TTS Analyst', 'elite'),
('WORLD_MARKETS', 'Global brokers/markets', 'elite'),
('UNLIMITED_WORKSPACES', 'No workspace cap', 'elite'),
('PRIORITY_SUPPORT', 'Priority support', 'elite')
ON CONFLICT (code) DO NOTHING;