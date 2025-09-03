-- Create test workspace and user data for John Trader (Owner account)

-- Insert workspace data if not exists
INSERT INTO public.workspaces (id, name, owner_id, wtype, safe_name)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'StagAlgo Demo Workspace', 
  '00000000-0000-0000-0000-000000000002',
  'personal',
  'stagalgo_demo_workspace'
) ON CONFLICT (id) DO UPDATE SET 
  owner_id = '00000000-0000-0000-0000-000000000002',
  name = 'StagAlgo Demo Workspace';

-- Insert workspace membership for owner
INSERT INTO public.workspace_members (workspace_id, user_id, role)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000002',
  'owner'
) ON CONFLICT (workspace_id, user_id) DO UPDATE SET role = 'owner';

-- Insert workspace membership for demo user (keep existing)
INSERT INTO public.workspace_members (workspace_id, user_id, role)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000000',
  'member'
) ON CONFLICT (workspace_id, user_id) DO NOTHING;

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