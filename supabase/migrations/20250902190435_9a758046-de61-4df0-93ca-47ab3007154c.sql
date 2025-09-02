-- Create bot_profiles table for per-workspace trade bot operating profiles
CREATE TABLE IF NOT EXISTS public.bot_profiles (
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE PRIMARY KEY,
  capital_risk_pct NUMERIC NOT NULL DEFAULT 0.05,       -- 0.05, 0.10, 0.20
  daily_return_target_pct NUMERIC NOT NULL DEFAULT 0.01, -- 0.01, 0.02, 0.05
  execution_mode TEXT NOT NULL DEFAULT 'manual',         -- 'manual' | 'automated'
  risk_indicator TEXT NOT NULL DEFAULT 'low',            -- 'low' | 'medium' | 'high'
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create trigger for updated_at
CREATE TRIGGER trg_bot_profiles_updated_at
  BEFORE UPDATE ON public.bot_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- Enable RLS
ALTER TABLE public.bot_profiles ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for bot profiles
CREATE POLICY "Members can access bot profiles" ON public.bot_profiles
  FOR ALL 
  USING (is_member_of_workspace(workspace_id))
  WITH CHECK (is_member_of_workspace(workspace_id));