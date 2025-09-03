-- Complete the workspace setup for test accounts

-- Add workspace membership for both test users
INSERT INTO public.workspace_members (workspace_id, user_id, role)
VALUES 
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'owner'),
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', 'owner')
ON CONFLICT (workspace_id, user_id) DO UPDATE SET role = 'owner';

-- Create default risk settings
INSERT INTO public.risk_settings (workspace_id, per_trade_risk_pct, daily_drawdown_halt_pct, leverage_cap)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  0.02,
  0.03,
  1.0
) ON CONFLICT (workspace_id) DO NOTHING;

-- Create demo bot profile
INSERT INTO public.bot_profiles (
  workspace_id, name, active, execution_mode, risk_per_trade_pct, 
  max_trades_per_day, signal_confidence_min, risk_indicator
)
SELECT 
  '00000000-0000-0000-0000-000000000001',
  'Demo Trading Bot',
  false,
  'manual',
  0.01,
  3,
  0.85,
  'low'
WHERE NOT EXISTS (
  SELECT 1 FROM public.bot_profiles 
  WHERE workspace_id = '00000000-0000-0000-0000-000000000001' 
  AND name = 'Demo Trading Bot'
);

-- Add some demo portfolio data
INSERT INTO public.portfolio_current (workspace_id, equity, cash)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  100000.00,
  25000.00
) ON CONFLICT (workspace_id) DO UPDATE SET 
  equity = 100000.00,
  cash = 25000.00;