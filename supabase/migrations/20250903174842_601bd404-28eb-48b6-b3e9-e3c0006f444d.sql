-- Set up basic demo data without user dependencies

-- Create default risk settings for any workspace
INSERT INTO public.risk_settings (workspace_id, per_trade_risk_pct, daily_drawdown_halt_pct, leverage_cap)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  0.02,
  0.03,
  1.0
) ON CONFLICT (workspace_id) DO NOTHING;

-- Add demo portfolio data
INSERT INTO public.portfolio_current (workspace_id, equity, cash)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  100000.00,
  25000.00
) ON CONFLICT (workspace_id) DO UPDATE SET 
  equity = 100000.00,
  cash = 25000.00;