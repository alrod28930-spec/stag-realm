-- Create feature entitlements for the 9 main tabs based on subscription tiers
INSERT INTO features (code, description, tier_min) VALUES 
  ('TAB_DASHBOARD', 'Dashboard - Core overview and basic Analyst summaries', 'standard'),
  ('TAB_INTELLIGENCE', 'Intelligence - Analyst + Oracle insights and explanations', 'standard'),
  ('TAB_MARKET', 'Market - Basic market data, watchlists, and alerts', 'standard'),
  ('TAB_PORTFOLIO', 'Portfolio - Holdings, performance, and positions tracking', 'pro'),
  ('TAB_TRADING_DESK', 'Trading Desk - Live/manual trading with bot-assisted execution', 'pro'),
  ('TAB_CHARTS', 'Charts - Interactive charts with live streaming and overlays', 'pro'),
  ('TAB_WORKSPACE', 'Workspace - Elite multi-panel drag-and-drop canvas with Bubble Mode', 'elite'),
  ('TAB_BROKERAGE_DOCK', 'Brokerage Dock - Embedded browser for brokerage account access', 'elite'),
  ('TAB_CRADLE', 'Cradle - Import hub for strategies, APIs, CSVs, and integrations', 'elite')
ON CONFLICT (code) DO UPDATE SET
  description = EXCLUDED.description,
  tier_min = EXCLUDED.tier_min;

-- Create demo mode features (accessible to all users including demo accounts)
INSERT INTO features (code, description, tier_min) VALUES 
  ('DEMO_MODE', 'Demo mode access with sample data', 'lite'),
  ('LIVE_TRADING', 'Live trading execution capabilities', 'pro'),
  ('REAL_TIME_DATA', 'Real-time market data feeds', 'standard'),
  ('ADVANCED_ANALYTICS', 'Advanced analytical tools and insights', 'pro'),
  ('BOT_EXECUTION', 'Automated trading bot execution', 'pro')
ON CONFLICT (code) DO UPDATE SET
  description = EXCLUDED.description,
  tier_min = EXCLUDED.tier_min;

-- Function to get user subscription tier
CREATE OR REPLACE FUNCTION public.get_user_subscription_tier(p_workspace_id uuid)
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT COALESCE(s.plan::text, 'lite') 
  FROM subscriptions s 
  WHERE s.workspace_id = p_workspace_id 
    AND s.status = 'active'
  LIMIT 1;
$$;

-- Function to check if user has access to a specific tab
CREATE OR REPLACE FUNCTION public.has_tab_access(p_workspace_id uuid, p_tab_code text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT CASE 
    -- Always allow demo users to see tabs (but with restrictions)
    WHEN EXISTS (
      SELECT 1 FROM profiles p 
      WHERE p.id = auth.uid() 
        AND p.display_name IN ('Demo User', 'Owner User')
    ) THEN true
    -- Check if user's subscription tier meets the minimum requirement for the tab
    ELSE EXISTS (
      SELECT 1 
      FROM features f
      WHERE f.code = p_tab_code
        AND CASE f.tier_min
          WHEN 'lite' THEN true
          WHEN 'standard' THEN get_user_subscription_tier(p_workspace_id) IN ('standard', 'pro', 'elite')
          WHEN 'pro' THEN get_user_subscription_tier(p_workspace_id) IN ('pro', 'elite')
          WHEN 'elite' THEN get_user_subscription_tier(p_workspace_id) = 'elite'
          ELSE false
        END
    )
  END;
$$;