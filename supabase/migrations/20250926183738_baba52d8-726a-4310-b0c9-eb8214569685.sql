-- Fix database security issues by adding proper search_path to functions

-- Update functions to have proper security settings
ALTER FUNCTION public.update_user_bid_profile_timestamp() SET search_path TO 'public';
ALTER FUNCTION public.ensure_default_entitlements(uuid) SET search_path TO 'public';  
ALTER FUNCTION public.recorder_log(uuid, text, smallint, text, text, text, jsonb) SET search_path TO 'public';