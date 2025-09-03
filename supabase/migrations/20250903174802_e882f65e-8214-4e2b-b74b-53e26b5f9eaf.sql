-- Make owner_id nullable temporarily to allow test workspace creation
ALTER TABLE public.workspaces 
ALTER COLUMN owner_id DROP NOT NULL;

-- Create the test workspace without owner_id constraint
INSERT INTO public.workspaces (id, name, wtype, safe_name, owner_id)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'StagAlgo Demo Workspace',
  'personal',
  'stagalgo_demo_workspace',
  NULL
) ON CONFLICT (id) DO UPDATE SET 
  name = 'StagAlgo Demo Workspace',
  safe_name = 'stagalgo_demo_workspace';