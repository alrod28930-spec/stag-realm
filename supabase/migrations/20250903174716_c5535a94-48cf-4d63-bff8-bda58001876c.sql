-- Create test workspace and user data (using demo user as owner to avoid FK constraint)

-- Update existing workspace to ensure demo user owns it
UPDATE public.workspaces 
SET name = 'StagAlgo Demo Workspace', safe_name = 'stagalgo_demo_workspace'
WHERE id = '00000000-0000-0000-0000-000000000001';

-- Insert workspace membership for demo user as owner
INSERT INTO public.workspace_members (workspace_id, user_id, role)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000000',
  'owner'
) ON CONFLICT (workspace_id, user_id) DO UPDATE SET role = 'owner';

-- Create default risk settings for the workspace if not exists
INSERT INTO public.risk_settings (workspace_id, per_trade_risk_pct, daily_drawdown_halt_pct, leverage_cap)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  0.02,
  0.03,
  1.0
) ON CONFLICT (workspace_id) DO NOTHING;

-- Create a default bot profile for demonstration
INSERT INTO public.bot_profiles (
  workspace_id, name, active, execution_mode, risk_per_trade_pct, 
  max_trades_per_day, signal_confidence_min, risk_indicator
)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Demo Trading Bot',
  false,
  'manual',
  0.01,
  3,
  0.85,
  'low'
) ON CONFLICT DO NOTHING;