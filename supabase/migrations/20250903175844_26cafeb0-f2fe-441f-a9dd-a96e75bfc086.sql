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

-- Add some sample trade data for testing ROI calculations (use NULL for user_id to avoid foreign key issues)
INSERT INTO rec_events (id, workspace_id, user_id, event_type, severity, entity_type, entity_id, summary, payload_json, ts)
VALUES 
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000001', NULL, 'trade.closed', 1, 'trade', 'test_trade_1', 'Test closed trade with profit', '{"pnl": 150.50, "return_pct": 0.025, "hold_minutes": 245, "symbol": "AAPL"}', NOW() - INTERVAL '2 days'),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000001', NULL, 'trade.closed', 1, 'trade', 'test_trade_2', 'Test closed trade with loss', '{"pnl": -75.25, "return_pct": -0.015, "hold_minutes": 180, "symbol": "MSFT"}', NOW() - INTERVAL '1 day'),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000001', NULL, 'trade.manual.executed', 1, 'trade', 'test_trade_3', 'Test manual trade executed', '{"symbol": "GOOGL", "side": "buy", "quantity": 10, "executed_price": 125.00}', NOW() - INTERVAL '1 hour')
ON CONFLICT (id) DO NOTHING;