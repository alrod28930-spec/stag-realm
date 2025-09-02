-- First, let's create a default workspace with a proper UUID
INSERT INTO public.workspaces (id, name, safe_name, wtype, owner_id) 
VALUES (
  '00000000-0000-0000-0000-000000000001'::uuid, 
  'Demo Workspace', 
  'demo_workspace', 
  'personal', 
  '00000000-0000-0000-0000-000000000000'::uuid
) 
ON CONFLICT (id) DO NOTHING;

-- Create workspace membership for demo user (we'll create the user next)
INSERT INTO public.workspace_members (workspace_id, user_id, role)
VALUES (
  '00000000-0000-0000-0000-000000000001'::uuid,
  '00000000-0000-0000-0000-000000000000'::uuid,
  'owner'
) 
ON CONFLICT (workspace_id, user_id) DO NOTHING;