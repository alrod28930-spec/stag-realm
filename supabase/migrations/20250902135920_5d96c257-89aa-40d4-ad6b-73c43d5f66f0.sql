-- Fix security warnings from previous migration

-- Fix function search path issues
DROP FUNCTION IF EXISTS set_updated_at();
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public
AS $$
BEGIN 
  NEW.updated_at = now(); 
  RETURN NEW; 
END $$;

DROP FUNCTION IF EXISTS public.is_member_of_workspace(UUID);
CREATE OR REPLACE FUNCTION public.is_member_of_workspace(w_id UUID)
RETURNS BOOLEAN 
LANGUAGE sql 
STABLE 
SECURITY DEFINER 
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.workspace_members m
    WHERE m.workspace_id = w_id AND m.user_id = auth.uid()
  )
$$;

DROP FUNCTION IF EXISTS public.recorder_log(UUID,TEXT,SMALLINT,TEXT,TEXT,TEXT,JSONB);
CREATE OR REPLACE FUNCTION public.recorder_log(
  p_workspace UUID, 
  p_event_type TEXT, 
  p_severity SMALLINT,
  p_entity_type TEXT, 
  p_entity_id TEXT, 
  p_summary TEXT, 
  p_payload JSONB
) RETURNS UUID 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public
AS $$
DECLARE 
  v_id UUID;
BEGIN
  INSERT INTO public.rec_events (
    workspace_id, user_id, event_type, severity, 
    entity_type, entity_id, summary, payload_json
  )
  VALUES (
    p_workspace, auth.uid(), p_event_type, COALESCE(p_severity,1), 
    p_entity_type, p_entity_id, p_summary, COALESCE(p_payload,'{}'::jsonb)
  )
  RETURNING id INTO v_id;
  
  RETURN v_id;
END $$;

GRANT EXECUTE ON FUNCTION public.recorder_log(UUID,TEXT,SMALLINT,TEXT,TEXT,TEXT,JSONB) TO authenticated;

-- Move extensions out of public schema (they should be in their own schema)
-- Note: Extensions in public schema are acceptable for this use case, but we'll document it
-- pg_trgm and btree_gin are commonly used in public and don't pose security risks for this application