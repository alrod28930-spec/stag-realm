-- Create demo account for testing
-- This will be handled by the auth system trigger automatically
INSERT INTO auth.users (
  id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_user_meta_data,
  raw_app_meta_data,
  is_super_admin,
  role
) VALUES (
  '00000000-0000-0000-0000-000000000000'::uuid,
  'demo@example.com',
  crypt('demo123', gen_salt('bf')),
  NOW(),
  NOW(),
  NOW(),
  '{"display_name": "Demo User"}',
  '{}',
  false,
  'authenticated'
) ON CONFLICT (email) DO NOTHING;