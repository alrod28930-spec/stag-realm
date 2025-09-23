-- Fix critical database inconsistencies that are causing workspace loading failures

-- 1. Fix demo workspace owner
UPDATE workspaces 
SET owner_id = '00000000-0000-0000-0000-000000000000' 
WHERE id = '00000000-0000-0000-0000-000000000001';

-- 2. Fix workspace member roles - members should be owners of their own workspaces
UPDATE workspace_members 
SET role = 'owner' 
WHERE workspace_id = '00000000-0000-0000-0000-000000000001';

-- 3. Ensure demo user workspace membership exists
INSERT INTO workspace_members (workspace_id, user_id, role)
VALUES ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'owner')
ON CONFLICT (workspace_id, user_id) DO UPDATE SET role = 'owner';

-- 4. Set proper workspace defaults for existing users
UPDATE user_settings 
SET workspace_default = '00000000-0000-0000-0000-000000000001'
WHERE user_id IN (
  SELECT user_id FROM workspace_members 
  WHERE workspace_id = '00000000-0000-0000-0000-000000000001'
) AND workspace_default IS NULL;

-- 5. Create user_settings entries for users without them
INSERT INTO user_settings (user_id, workspace_default)
SELECT wm.user_id, wm.workspace_id
FROM workspace_members wm
LEFT JOIN user_settings us ON wm.user_id = us.user_id
WHERE us.user_id IS NULL;

-- 6. Add missing symbols that are causing foreign key violations
INSERT INTO ref_symbols (symbol, exchange, asset_class, sector, industry) VALUES
('BTC', 'CRYPTO', 'crypto', 'Cryptocurrency', 'Digital Asset'),
('ETH', 'CRYPTO', 'crypto', 'Cryptocurrency', 'Smart Contracts'),
('DOGE', 'CRYPTO', 'crypto', 'Cryptocurrency', 'Meme Coin')
ON CONFLICT (symbol) DO NOTHING;