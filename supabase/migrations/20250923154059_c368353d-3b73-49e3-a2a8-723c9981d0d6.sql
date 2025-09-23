-- Fix workspace entitlements and ensure proper setup
-- First, ensure demo workspace has elite entitlements for demonstration
INSERT INTO workspace_entitlements (workspace_id, feature_code, enabled, source)
SELECT 
  '00000000-0000-0000-0000-000000000001' as workspace_id,
  code as feature_code,
  true as enabled,
  'default' as source
FROM features
WHERE tier_min = 'elite'
ON CONFLICT (workspace_id, feature_code) DO UPDATE SET
  enabled = EXCLUDED.enabled,
  updated_at = now();

-- Grant elite features to existing real user workspaces (for owner testing)
INSERT INTO workspace_entitlements (workspace_id, feature_code, enabled, source)
SELECT DISTINCT
  wm.workspace_id,
  f.code as feature_code,
  true as enabled,
  'grant' as source
FROM workspace_members wm
JOIN workspaces w ON w.id = wm.workspace_id
JOIN features f ON f.tier_min = 'elite'
WHERE wm.user_id IN (
  SELECT id FROM auth.users 
  WHERE email IN ('alrod28930@gmail.com', 'alrod3345@gmail.com')
)
AND wm.workspace_id != '00000000-0000-0000-0000-000000000001'
ON CONFLICT (workspace_id, feature_code) DO UPDATE SET
  enabled = EXCLUDED.enabled,
  updated_at = now();

-- Ensure all workspaces have at least lite tier features
INSERT INTO workspace_entitlements (workspace_id, feature_code, enabled, source)
SELECT DISTINCT
  w.id as workspace_id,
  f.code as feature_code,
  true as enabled,
  'default' as source
FROM workspaces w
CROSS JOIN features f
WHERE f.tier_min = 'lite'
AND NOT EXISTS (
  SELECT 1 FROM workspace_entitlements we 
  WHERE we.workspace_id = w.id AND we.feature_code = f.code
)
ON CONFLICT (workspace_id, feature_code) DO NOTHING;