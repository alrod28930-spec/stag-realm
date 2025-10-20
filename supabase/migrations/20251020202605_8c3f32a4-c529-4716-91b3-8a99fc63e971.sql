-- Phase 2: Database-level subscription bypass
-- Add enforcement check to DB functions

-- Helper function to check if subscription enforcement is enabled
-- Reads from app.subscription_enforcement setting (defaults to false)
CREATE OR REPLACE FUNCTION public.is_subscription_enforcement_enabled()
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Default to false (enforcement disabled) if setting doesn't exist
  RETURN COALESCE(
    current_setting('app.subscription_enforcement', true)::boolean,
    false
  );
END;
$$;

-- Update has_entitlement to bypass when enforcement is disabled
CREATE OR REPLACE FUNCTION public.has_entitlement(p_workspace uuid, p_feature text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Bypass: Grant all access when enforcement is disabled (default)
  IF NOT is_subscription_enforcement_enabled() THEN
    RETURN true;
  END IF;
  
  -- Normal entitlement check when enforcement is enabled
  RETURN COALESCE((
    SELECT enabled FROM workspace_entitlements
    WHERE workspace_id = p_workspace AND feature_code = p_feature
  ), false);
END;
$$;

-- Update get_user_subscription_tier to return 'elite' when enforcement disabled
CREATE OR REPLACE FUNCTION public.get_user_subscription_tier(p_workspace_id uuid)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Bypass: Return 'elite' tier when enforcement is disabled (default)
  IF NOT is_subscription_enforcement_enabled() THEN
    RETURN 'elite';
  END IF;
  
  -- Normal tier lookup when enforcement is enabled
  RETURN COALESCE(
    (SELECT s.plan::text 
     FROM subscriptions s 
     WHERE s.workspace_id = p_workspace_id 
       AND s.status = 'active'
     LIMIT 1),
    'lite'
  );
END;
$$;

-- Update has_tab_access to bypass tier checks when enforcement disabled
CREATE OR REPLACE FUNCTION public.has_tab_access(p_workspace_id uuid, p_tab_code text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Bypass: Grant all tab access when enforcement is disabled (default)
  IF NOT is_subscription_enforcement_enabled() THEN
    RETURN true;
  END IF;
  
  -- Normal tab access check when enforcement is enabled
  RETURN CASE 
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
END;
$$;

COMMENT ON FUNCTION public.is_subscription_enforcement_enabled() IS 
'Check if subscription enforcement is enabled. Defaults to false (disabled). Set app.subscription_enforcement=true to enable tier restrictions.';

COMMENT ON FUNCTION public.has_entitlement(uuid, text) IS 
'Check workspace entitlement. Bypasses checks and returns true when subscription enforcement is disabled (default).';

COMMENT ON FUNCTION public.get_user_subscription_tier(uuid) IS 
'Get workspace subscription tier. Returns elite when enforcement is disabled (default), otherwise checks subscriptions table.';

COMMENT ON FUNCTION public.has_tab_access(uuid, text) IS 
'Check tab access permissions. Grants full access when enforcement is disabled (default), otherwise validates tier requirements.';