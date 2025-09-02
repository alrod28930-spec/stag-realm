-- Fix security warnings by updating functions in place

-- Fix function search path issues without dropping (to avoid dependency issues)
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