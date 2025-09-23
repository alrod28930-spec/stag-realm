-- Fix workspace issues by updating existing data without foreign key violations

-- 1. Fix workspace member roles - existing users should be owners
UPDATE workspace_members 
SET role = 'owner' 
WHERE workspace_id = '00000000-0000-0000-0000-000000000001';

-- 2. Set proper workspace defaults for existing users
UPDATE user_settings 
SET workspace_default = '00000000-0000-0000-0000-000000000001'
WHERE user_id IN (
  SELECT user_id FROM workspace_members 
  WHERE workspace_id = '00000000-0000-0000-0000-000000000001'
) AND workspace_default IS NULL;

-- 3. Create user_settings entries for users without them
INSERT INTO user_settings (user_id, workspace_default)
SELECT wm.user_id, wm.workspace_id
FROM workspace_members wm
LEFT JOIN user_settings us ON wm.user_id = us.user_id
WHERE us.user_id IS NULL;

-- 4. Make workspace owner_id nullable to avoid foreign key issues with demo users
ALTER TABLE workspaces ALTER COLUMN owner_id DROP NOT NULL;