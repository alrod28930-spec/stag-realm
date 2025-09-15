-- Find the user by email and update their subscription to elite tier
-- First, let's get the user's workspace_id from their profile
WITH user_info AS (
  SELECT p.id as user_id
  FROM auth.users au
  JOIN public.profiles p ON au.id = p.id
  WHERE au.email = 'alrod28930@gmail.com'
),
workspace_info AS (
  SELECT wm.workspace_id
  FROM user_info ui
  JOIN public.workspace_members wm ON ui.user_id = wm.user_id
  LIMIT 1
)
-- Update or insert the subscription to elite tier
INSERT INTO public.subscriptions (workspace_id, plan, status, billing_interval, updated_at)
SELECT wi.workspace_id, 'elite'::plan_tier, 'active', 'monthly', now()
FROM workspace_info wi
ON CONFLICT (workspace_id) 
DO UPDATE SET 
  plan = 'elite'::plan_tier,
  status = 'active',
  updated_at = now();

-- Also ensure they have all elite tier entitlements
WITH user_info AS (
  SELECT p.id as user_id
  FROM auth.users au
  JOIN public.profiles p ON au.id = p.id
  WHERE au.email = 'alrod28930@gmail.com'
),
workspace_info AS (
  SELECT wm.workspace_id
  FROM user_info ui
  JOIN public.workspace_members wm ON ui.user_id = wm.user_id
  LIMIT 1
)
INSERT INTO public.workspace_entitlements (workspace_id, feature_code, enabled, source)
SELECT wi.workspace_id, f.code, true, 'manual_upgrade'
FROM workspace_info wi
CROSS JOIN public.features f
WHERE f.tier_min IN ('lite', 'standard', 'pro', 'elite')
ON CONFLICT (workspace_id, feature_code) 
DO UPDATE SET 
  enabled = true,
  source = 'manual_upgrade';