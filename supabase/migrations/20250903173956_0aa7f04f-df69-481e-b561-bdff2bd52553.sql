-- Fix critical security issue: User profiles should only be viewable by the profile owner or workspace members

-- First, let's drop the overly permissive policies
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;

-- Create secure policy that only allows users to view their own profile
CREATE POLICY "Users can only view own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = id);

-- Allow workspace members to view profiles of other members in the same workspace (optional - remove if too permissive)
CREATE POLICY "Workspace members can view member profiles"
ON public.profiles
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM workspace_members wm1
    JOIN workspace_members wm2 ON wm1.workspace_id = wm2.workspace_id
    WHERE wm1.user_id = auth.uid() 
    AND wm2.user_id = profiles.id
  )
);

-- Fix function search path security issues
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email));
  RETURN NEW;
END;
$function$;