-- Fix security warnings by setting search_path for functions

-- Update gen_workspace_safe_name function with proper search_path
CREATE OR REPLACE FUNCTION public.gen_workspace_safe_name(p_name text, p_wtype workspace_type, p_display text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_base text;
  v_safe text;
  v_counter int := 0;
BEGIN
  -- Clean the input name
  v_base := regexp_replace(lower(trim(p_name)), '[^a-z0-9_]', '_', 'g');
  v_base := regexp_replace(v_base, '_+', '_', 'g');
  v_base := trim(v_base, '_');
  
  -- Fallback if name becomes empty
  IF v_base = '' OR length(v_base) < 2 THEN
    v_base := lower(p_wtype::text) || '_' || lower(p_display);
  END IF;
  
  -- Ensure uniqueness
  v_safe := v_base;
  WHILE EXISTS (SELECT 1 FROM workspaces WHERE safe_name = v_safe) LOOP
    v_counter := v_counter + 1;
    v_safe := v_base || '_' || v_counter;
  END LOOP;
  
  RETURN v_safe;
END $$;

-- Update validate_workspace_name function with proper search_path
CREATE OR REPLACE FUNCTION public.validate_workspace_name(p_name text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  reserved_words text[] := ARRAY['owner', 'admin', 'root', 'personal', 'business', 'team'];
  word text;
BEGIN
  -- Check length and format
  IF NOT (p_name ~ '^[A-Za-z0-9][A-Za-z0-9 _\-]{1,63}$') THEN
    RETURN false;
  END IF;
  
  -- Check for reserved words
  FOREACH word IN ARRAY reserved_words LOOP
    IF lower(p_name) = word THEN
      RETURN false;
    END IF;
  END LOOP;
  
  RETURN true;
END $$;

-- Update create_workspace_safely function with proper search_path
CREATE OR REPLACE FUNCTION public.create_workspace_safely(p_name text, p_wtype workspace_type)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE 
  v_id uuid;
  v_display text;
  v_safe text;
BEGIN
  -- Validate name
  IF NOT public.validate_workspace_name(p_name) THEN
    RAISE EXCEPTION 'Invalid workspace name. Please choose a descriptive name (2-64 letters/numbers). Reserved words are not allowed.';
  END IF;
  
  -- Get user display name
  SELECT COALESCE(display_name, 'user') INTO v_display
  FROM public.profiles WHERE id = auth.uid();
  
  -- Generate safe name
  v_safe := public.gen_workspace_safe_name(p_name, p_wtype, v_display);
  
  -- Create workspace
  INSERT INTO public.workspaces (name, safe_name, wtype, owner_id)
  VALUES (p_name, v_safe, p_wtype, auth.uid())
  RETURNING id INTO v_id;
  
  -- Add owner as member
  INSERT INTO public.workspace_members (workspace_id, user_id, role)
  VALUES (v_id, auth.uid(), 'owner');
  
  RETURN v_id;
END $$;

-- Update is_member_of_workspace function with proper search_path
CREATE OR REPLACE FUNCTION public.is_member_of_workspace(w_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.workspace_members m
    WHERE m.workspace_id = w_id AND m.user_id = auth.uid()
  )
$$;