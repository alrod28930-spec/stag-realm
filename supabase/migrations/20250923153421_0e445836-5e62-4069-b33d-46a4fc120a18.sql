-- Ensure demo workspace membership exists
INSERT INTO workspace_members (workspace_id, user_id, role)
VALUES ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'owner')
ON CONFLICT (workspace_id, user_id) DO NOTHING;

-- Create workspace memberships for existing users who don't have them
INSERT INTO workspace_members (workspace_id, user_id, role)
SELECT 
  w.id as workspace_id,
  w.owner_id as user_id,
  'owner' as role
FROM workspaces w
LEFT JOIN workspace_members wm ON w.id = wm.workspace_id AND w.owner_id = wm.user_id
WHERE w.owner_id IS NOT NULL AND wm.workspace_id IS NULL;

-- For users without any workspace, assign them to the demo workspace temporarily
-- This helps with immediate functionality while proper workspaces are created
INSERT INTO workspace_members (workspace_id, user_id, role)
SELECT 
  '00000000-0000-0000-0000-000000000001' as workspace_id,
  u.id as user_id,
  'member' as role
FROM auth.users u
LEFT JOIN workspace_members wm ON u.id = wm.user_id
WHERE wm.user_id IS NULL
  AND u.id != '00000000-0000-0000-0000-000000000000'  -- Skip demo user
ON CONFLICT (workspace_id, user_id) DO NOTHING;