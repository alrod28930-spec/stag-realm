-- Add RLS policies for broker connections

-- Enable RLS on connections_brokerages if not already
ALTER TABLE connections_brokerages ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist to avoid conflicts
DROP POLICY IF EXISTS broker_links_ws_rw ON connections_brokerages;
DROP POLICY IF EXISTS connections_brokerages_ws_read ON connections_brokerages;
DROP POLICY IF EXISTS connections_brokerages_ws_write ON connections_brokerages;

-- Create comprehensive policy for connections_brokerages
CREATE POLICY connections_brokerages_workspace_access ON connections_brokerages
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM workspace_members wm
    WHERE wm.workspace_id = connections_brokerages.workspace_id
      AND wm.user_id = auth.uid()
  )
) WITH CHECK (
  EXISTS (
    SELECT 1 FROM workspace_members wm
    WHERE wm.workspace_id = connections_brokerages.workspace_id
      AND wm.user_id = auth.uid()
  )
);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_connections_brokerages_workspace
  ON connections_brokerages (workspace_id, status);