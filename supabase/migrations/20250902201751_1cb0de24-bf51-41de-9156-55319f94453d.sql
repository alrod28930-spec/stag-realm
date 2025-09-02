-- Fix infinite recursion in workspace_members RLS policy
-- Drop existing problematic policies and recreate them without circular references

DROP POLICY IF EXISTS "Admins can manage memberships" ON workspace_members;
DROP POLICY IF EXISTS "Members can view workspace memberships" ON workspace_members;

-- Create non-recursive policies for workspace_members
CREATE POLICY "Members can view workspace memberships" ON workspace_members
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM workspace_members m2 
    WHERE m2.workspace_id = workspace_members.workspace_id 
    AND m2.user_id = auth.uid()
  )
);

CREATE POLICY "Admins can manage memberships" ON workspace_members
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM workspace_members m2
    WHERE m2.workspace_id = workspace_members.workspace_id 
    AND m2.user_id = auth.uid() 
    AND m2.role IN ('owner', 'admin')
  )
) WITH CHECK (
  EXISTS (
    SELECT 1 FROM workspace_members m2
    WHERE m2.workspace_id = workspace_members.workspace_id 
    AND m2.user_id = auth.uid() 
    AND m2.role IN ('owner', 'admin')
  )
);