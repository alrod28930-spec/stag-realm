-- Create subscription and workspace for testing account
INSERT INTO public.subscriptions (workspace_id, plan, status, billing_interval)
VALUES ('00000000-0000-0000-0000-000000000001', 'elite', 'active', 'monthly')
ON CONFLICT (workspace_id) 
DO UPDATE SET plan = 'elite', status = 'active', billing_interval = 'monthly';

-- Ensure workspace exists for testing
INSERT INTO public.workspaces (id, name, owner_id, wtype)
VALUES ('00000000-0000-0000-0000-000000000001', 'Testing Workspace', null, 'personal')
ON CONFLICT (id) 
DO UPDATE SET name = 'Testing Workspace', wtype = 'personal';