-- Step 1: Create workspace for elite test account
DO $$
DECLARE
  v_user_id uuid;
  v_workspace_id uuid := '11111111-1111-1111-1111-111111111111';
BEGIN
  -- Find user ID
  SELECT id INTO v_user_id FROM auth.users WHERE email = 'alrod28930@gmail.com';
  
  IF v_user_id IS NOT NULL THEN
    -- Create workspace if it doesn't exist
    INSERT INTO workspaces (id, name, owner_id)
    VALUES (v_workspace_id, 'Elite Test Workspace', v_user_id)
    ON CONFLICT (id) DO NOTHING;
    
    -- Add workspace membership
    INSERT INTO workspace_members (workspace_id, user_id, role)
    VALUES (v_workspace_id, v_user_id, 'owner')
    ON CONFLICT (workspace_id, user_id) DO NOTHING;
    
    -- Set as default workspace in user_settings
    INSERT INTO user_settings (user_id, workspace_default)
    VALUES (v_user_id, v_workspace_id)
    ON CONFLICT (user_id) DO UPDATE SET workspace_default = v_workspace_id;
  END IF;
END $$;

-- Step 2: Re-tag orphaned candles data to elite test workspace
UPDATE candles
SET workspace_id = '11111111-1111-1111-1111-111111111111'
WHERE workspace_id IS NULL 
   OR workspace_id::text = '00000000-0000-0000-0000-000000000000';

-- Re-tag oracle_signals
UPDATE oracle_signals
SET workspace_id = '11111111-1111-1111-1111-111111111111'
WHERE workspace_id IS NULL 
   OR workspace_id::text = '00000000-0000-0000-0000-000000000000';

-- Step 3: Tighten RLS policies for candles
DROP POLICY IF EXISTS candles_open_read ON candles;

CREATE POLICY candles_ws_read ON candles
FOR SELECT TO authenticated
USING (is_member_of_workspace(workspace_id));

-- Step 4: Create automatic workspace assignment function
CREATE OR REPLACE FUNCTION ensure_workspace_for_user(_user uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE 
  ws uuid;
BEGIN
  -- Check if user already has a workspace
  SELECT workspace_id INTO ws 
  FROM workspace_members 
  WHERE user_id = _user 
  LIMIT 1;
  
  -- If no workspace, create one
  IF ws IS NULL THEN
    ws := gen_random_uuid();
    
    -- Create workspace
    INSERT INTO workspaces (id, name, owner_id)
    VALUES (ws, 'Personal Workspace', _user);
    
    -- Add membership
    INSERT INTO workspace_members (workspace_id, user_id, role)
    VALUES (ws, _user, 'owner');
    
    -- Set as default in user_settings
    INSERT INTO user_settings (user_id, workspace_default)
    VALUES (_user, ws)
    ON CONFLICT (user_id) DO UPDATE SET workspace_default = ws;
    
    -- Initialize default entitlements
    PERFORM ensure_default_entitlements(ws);
  END IF;
  
  RETURN ws;
END;
$$;