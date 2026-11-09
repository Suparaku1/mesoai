REVOKE EXECUTE ON FUNCTION public.finish_tutor_request(uuid,uuid,jsonb) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.finish_tutor_request(uuid,uuid,jsonb) TO service_role;
CREATE OR REPLACE FUNCTION public.finish_tutor_request(p_thread_id uuid,p_token uuid,p_assistant jsonb DEFAULT NULL)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF p_assistant IS NOT NULL AND p_assistant->>'role' <> 'assistant' THEN RAISE EXCEPTION 'Invalid assistant'; END IF;
 UPDATE public.tutor_threads SET messages=CASE WHEN p_assistant IS NULL THEN messages ELSE messages || jsonb_build_array(p_assistant) END,request_token=NULL,request_started_at=NULL,updated_at=now() WHERE id=p_thread_id AND request_token=p_token;
 RETURN FOUND;
END; $$;