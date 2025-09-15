-- Fix the security issue with search_path in the trigger function
CREATE OR REPLACE FUNCTION update_user_bid_profile_timestamp()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public
AS $$
BEGIN
  NEW.last_updated = now();
  RETURN NEW;
END;
$$;