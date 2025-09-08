-- Fix potential issue with empty workspaces having no default entitlements
-- Create a function to ensure lite features are available for all workspaces by default

CREATE OR REPLACE FUNCTION public.ensure_default_entitlements(p_workspace_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert lite tier features as default for any workspace that has no entitlements
  INSERT INTO workspace_entitlements (workspace_id, feature_code, enabled, source)
  SELECT p_workspace_id, code, true, 'default'
  FROM features 
  WHERE tier_min = 'lite'
  AND NOT EXISTS (
    SELECT 1 FROM workspace_entitlements 
    WHERE workspace_id = p_workspace_id
  );
END;
$$;

-- Add trigger to automatically assign lite features when a workspace is referenced
-- (This prevents empty entitlements scenarios)