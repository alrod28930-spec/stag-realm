-- Remove lite tier features and add new tab-based features
DELETE FROM features WHERE tier_min = 'lite';

-- Insert new tab-based features
INSERT INTO features (code, name, description, tier_min) VALUES
-- Demo tier (available to all users including demo accounts)
('TAB_DASHBOARD', 'Dashboard Tab', 'Access to main dashboard overview', 'demo'),
('PAPER_TRADING', 'Paper Trading', 'Demo trading without real money', 'demo'),

-- Standard tier - First 3 tabs + live trading
('TAB_INTELLIGENCE', 'Intelligence Tab', 'AI analysis and Oracle signals', 'standard'),
('TAB_MARKET', 'Market Tab', 'Market data and AI insights', 'standard'),
('LIVE_TRADING', 'Live Trading', 'Real money trading capabilities', 'standard'),
('CORE_BOTS', 'Core Trade Bots', 'Basic automated trading bots', 'standard'),
('ORACLE_BASIC', 'Basic Oracle Signals', 'Basic AI market signals', 'standard'),

-- Pro tier - Next 3 tabs + advanced features  
('TAB_PORTFOLIO', 'Portfolio Tab', 'Portfolio positions and audit trail', 'pro'),
('TAB_TRADING_DESK', 'Trading Desk Tab', 'Manual and automated trading interface', 'pro'),
('TAB_CHARTS', 'Charts Tab', 'Live streaming charts and trading', 'pro'),
('ADV_BOTS', 'Advanced Bots', 'Advanced trading algorithms', 'pro'),
('DAY_TRADE_MODE', 'Day Trading Mode', 'High-frequency day trading features', 'pro'),
('ORACLE_EXPANDED', 'Expanded Oracle', 'Advanced AI market analysis', 'pro'),

-- Elite tier - All remaining tabs + premium features
('TAB_BROKERAGE_DOCK', 'Brokerage Dock Tab', 'External brokerage account access', 'elite'),
('TAB_CRADLE', 'Cradle Tab', 'Strategy incubator and testing', 'elite'),
('WORKSPACE_MULTI_PANEL', 'Multi-Panel Workspace', 'Elite 4-panel workspace layout', 'elite'),
('VOICE_ANALYST', 'Voice Analyst', 'AI voice-powered analysis', 'elite'),
('PRIORITY_SUPPORT', 'Priority Support', 'Premium customer support', 'elite')

ON CONFLICT (code) DO UPDATE SET
name = EXCLUDED.name,
description = EXCLUDED.description,
tier_min = EXCLUDED.tier_min;

-- Update any existing workspace entitlements to use new feature codes
-- This will help existing users transition to the new system