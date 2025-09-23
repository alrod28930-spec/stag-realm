-- Create the missing demo workspace with correct type
INSERT INTO public.workspaces (id, name, owner_id, wtype, created_at, updated_at)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Demo Workspace',
  '00000000-0000-0000-0000-000000000000',
  'personal',
  now(),
  now()
)
ON CONFLICT (id) DO NOTHING;