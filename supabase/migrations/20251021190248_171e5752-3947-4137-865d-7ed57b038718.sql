-- Phase IV: Vault Security + Safe Execution + Portfolio Planner

-- 1) Vault keys for secure credential storage
CREATE TABLE IF NOT EXISTS vault_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL,
  broker TEXT NOT NULL,
  vault_ref TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2) Execution audit log for all trading actions
CREATE TABLE IF NOT EXISTS execution_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL,
  event TEXT NOT NULL,
  payload JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3) Indexes for performance
CREATE INDEX IF NOT EXISTS ix_vault_keys_workspace ON vault_keys(workspace_id);
CREATE INDEX IF NOT EXISTS ix_execution_audit_workspace_ts ON execution_audit(workspace_id, created_at DESC);

-- 4) RLS policies for vault_keys
ALTER TABLE vault_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY vault_keys_ws ON vault_keys
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM workspace_members wm 
    WHERE wm.workspace_id = vault_keys.workspace_id 
    AND wm.user_id = auth.uid()
  )
) WITH CHECK (
  EXISTS (
    SELECT 1 FROM workspace_members wm 
    WHERE wm.workspace_id = vault_keys.workspace_id 
    AND wm.user_id = auth.uid()
  )
);

-- 5) RLS policies for execution_audit
ALTER TABLE execution_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY exec_ws ON execution_audit
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM workspace_members wm 
    WHERE wm.workspace_id = execution_audit.workspace_id 
    AND wm.user_id = auth.uid()
  )
) WITH CHECK (
  EXISTS (
    SELECT 1 FROM workspace_members wm 
    WHERE wm.workspace_id = execution_audit.workspace_id 
    AND wm.user_id = auth.uid()
  )
);