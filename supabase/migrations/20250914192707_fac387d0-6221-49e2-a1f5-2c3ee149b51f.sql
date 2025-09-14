-- Check what tier values are allowed and update accordingly
-- Remove any lite tier features first
DELETE FROM features WHERE tier_min = 'lite';

-- Insert new tab-based features using valid tier values
INSERT INTO features (code, description, tier_min) VALUES
-- Standard tier - First 3 tabs + basic features (demo users will get these through entitlements)
('TAB_DASHBOARD', 'Access to main dashboard overview', 'standard'),
('TAB_INTELLIGENCE', 'AI analysis and Oracle signals', 'standard'),  
('TAB_MARKET', 'Market data and AI insights', 'standard'),
('PAPER_TRADING', 'Demo trading without real money', 'standard'),
('LIVE_TRADING', 'Real money trading capabilities', 'standard'),
('CORE_BOTS', 'Basic automated trading bots', 'standard'),
('ORACLE_BASIC', 'Basic AI market signals', 'standard'),

-- Pro tier - Next 3 tabs + advanced features  
('TAB_PORTFOLIO', 'Portfolio positions and audit trail', 'pro'),
('TAB_TRADING_DESK', 'Manual and automated trading interface', 'pro'),
('TAB_CHARTS', 'Live streaming charts and trading', 'pro'),
('ADV_BOTS', 'Advanced trading algorithms', 'pro'),
('DAY_TRADE_MODE', 'High-frequency day trading features', 'pro'),
('ORACLE_EXPANDED', 'Advanced AI market analysis', 'pro'),

-- Elite tier - All remaining tabs + premium features
('TAB_BROKERAGE_DOCK', 'External brokerage account access', 'elite'),
('TAB_CRADLE', 'Strategy incubator and testing', 'elite'),
('VOICE_ANALYST', 'AI voice-powered analysis', 'elite'), 
('PRIORITY_SUPPORT', 'Premium customer support', 'elite')

ON CONFLICT (code) DO UPDATE SET
description = EXCLUDED.description,
tier_min = EXCLUDED.tier_min;