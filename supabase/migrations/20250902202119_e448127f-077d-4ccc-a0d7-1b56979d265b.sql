-- Fix the create_workspace_safely function to handle authentication properly
CREATE OR REPLACE FUNCTION public.create_workspace_safely(p_name text, p_wtype workspace_type)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE 
  v_id uuid;
  v_user_id uuid;
  v_display text;
  v_safe text;
BEGIN
  -- Get the current user ID and ensure user is authenticated
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated to create workspace';
  END IF;
  
  -- Validate name
  IF NOT public.validate_workspace_name(p_name) THEN
    RAISE EXCEPTION 'Invalid workspace name. Please choose a descriptive name (2-64 letters/numbers). Reserved words are not allowed.';
  END IF;
  
  -- Get user display name
  SELECT COALESCE(display_name, 'user') INTO v_display
  FROM public.profiles WHERE id = v_user_id;
  
  -- Fallback if no profile exists
  IF v_display IS NULL THEN
    v_display := 'user';
  END IF;
  
  -- Generate safe name
  v_safe := public.gen_workspace_safe_name(p_name, p_wtype, v_display);
  
  -- Create workspace with explicit owner_id
  INSERT INTO public.workspaces (name, safe_name, wtype, owner_id)
  VALUES (p_name, v_safe, p_wtype, v_user_id)
  RETURNING id INTO v_id;
  
  -- Add owner as member
  INSERT INTO public.workspace_members (workspace_id, user_id, role)
  VALUES (v_id, v_user_id, 'owner');
  
  RETURN v_id;
END $$;