-- Auto-create default workspace for users on login
CREATE OR REPLACE FUNCTION public.ensure_default_workspace()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  wid uuid;
  uid uuid;
BEGIN
  uid := auth.uid();
  
  -- Check if user already has a workspace membership
  SELECT wm.workspace_id INTO wid
  FROM workspace_members wm
  WHERE wm.user_id = uid
  LIMIT 1;

  -- If no workspace exists, create one
  IF wid IS NULL THEN
    -- Create new workspace
    INSERT INTO workspaces(name, owner_id, wtype)
    VALUES ('My Workspace', uid, 'personal')
    RETURNING id INTO wid;
    
    -- Add user as owner member
    INSERT INTO workspace_members(workspace_id, user_id, role)
    VALUES (wid, uid, 'owner');
    
    -- Set as default in user_settings
    INSERT INTO user_settings(user_id, workspace_default)
    VALUES (uid, wid)
    ON CONFLICT (user_id) 
    DO UPDATE SET workspace_default = wid;
  END IF;

  RETURN wid;
END;
$$;

-- Ensure proper RLS policies for candles table
DROP POLICY IF EXISTS candles_ws_read ON candles;
DROP POLICY IF EXISTS candles_member_read ON candles;

CREATE POLICY candles_workspace_read
ON candles FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM workspace_members wm
    WHERE wm.workspace_id = candles.workspace_id
      AND wm.user_id = auth.uid()
  )
);

-- Ensure proper RLS policies for oracle_signals
DROP POLICY IF EXISTS "Members can access oracle signals" ON oracle_signals;

CREATE POLICY oracle_signals_workspace_read
ON oracle_signals FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM workspace_members wm
    WHERE wm.workspace_id = oracle_signals.workspace_id
      AND wm.user_id = auth.uid()
  )
);

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_candles_workspace_symbol_tf_ts
  ON candles (workspace_id, symbol, tf, ts);

CREATE INDEX IF NOT EXISTS idx_oracle_signals_workspace_symbol
  ON oracle_signals (workspace_id, symbol, ts DESC);