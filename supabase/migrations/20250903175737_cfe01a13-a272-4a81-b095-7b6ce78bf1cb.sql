-- Add test user to workspace membership for paper trading tests
INSERT INTO workspace_members (workspace_id, user_id, role) 
VALUES ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', 'owner')
ON CONFLICT (workspace_id, user_id) DO NOTHING;

-- Create default risk settings for test workspace
INSERT INTO risk_settings (workspace_id) 
VALUES ('00000000-0000-0000-0000-000000000001')
ON CONFLICT (workspace_id) DO NOTHING;

-- Ensure portfolio data exists for test workspace
INSERT INTO portfolio_current (workspace_id, equity, cash, updated_at) 
VALUES ('00000000-0000-0000-0000-000000000001', 100000, 25000, NOW())
ON CONFLICT (workspace_id) DO UPDATE SET
  equity = EXCLUDED.equity,
  cash = EXCLUDED.cash,
  updated_at = NOW();