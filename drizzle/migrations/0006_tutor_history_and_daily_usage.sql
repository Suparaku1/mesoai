CREATE TABLE public.tutor_threads (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES public.profiles(id) ON DELETE CASCADE,
 title text NOT NULL DEFAULT 'Bisedë e re',
 course_id uuid REFERENCES public.courses(id) ON DELETE SET NULL,
 messages jsonb NOT NULL DEFAULT '[]'::jsonb,
 request_token uuid,
 request_started_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.tutor_threads TO authenticated;
GRANT ALL ON public.tutor_threads TO service_role;
ALTER TABLE public.tutor_threads ENABLE ROW LEVEL SECURITY;
CREATE POLICY tutor_threads_read ON public.tutor_threads FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY tutor_threads_create ON public.tutor_threads FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() AND messages = '[]'::jsonb AND request_token IS NULL AND request_started_at IS NULL AND (course_id IS NULL OR EXISTS (SELECT 1 FROM public.courses WHERE id = course_id)));
CREATE POLICY tutor_threads_delete ON public.tutor_threads FOR DELETE TO authenticated USING (user_id = auth.uid());
CREATE INDEX tutor_threads_owner_updated ON public.tutor_threads(user_id, updated_at DESC);
CREATE TABLE public.tutor_daily_usage (
 user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
 usage_date date NOT NULL,
 requests integer NOT NULL DEFAULT 0,
 PRIMARY KEY(user_id, usage_date)
);
GRANT SELECT ON public.tutor_daily_usage TO authenticated;
GRANT ALL ON public.tutor_daily_usage TO service_role;
ALTER TABLE public.tutor_daily_usage ENABLE ROW LEVEL SECURITY;
CREATE POLICY tutor_usage_read ON public.tutor_daily_usage FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE OR REPLACE FUNCTION public.reserve_tutor_request(p_thread_id uuid DEFAULT NULL, p_message jsonb DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_user uuid := auth.uid(); v_day date := (now() AT TIME ZONE 'Europe/Tirane')::date; v_count integer; v_thread public.tutor_threads; v_token uuid := gen_random_uuid();
BEGIN
 IF v_user IS NULL THEN RAISE EXCEPTION 'Unauthorized'; END IF;
 IF p_thread_id IS NOT NULL THEN
  SELECT * INTO v_thread FROM public.tutor_threads WHERE id = p_thread_id AND user_id = v_user FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Conversation not found'; END IF;
  IF v_thread.request_token IS NOT NULL AND v_thread.request_started_at > now() - interval '10 minutes' THEN
   RETURN jsonb_build_object('allowed', false, 'reason', 'busy');
  END IF;
  IF p_message IS NULL OR p_message->>'role' <> 'user' OR jsonb_typeof(p_message->'parts') <> 'array' THEN RAISE EXCEPTION 'Invalid message'; END IF;
 END IF;
 INSERT INTO public.tutor_daily_usage(user_id, usage_date) VALUES (v_user,v_day) ON CONFLICT DO NOTHING;
 SELECT requests INTO v_count FROM public.tutor_daily_usage WHERE user_id=v_user AND usage_date=v_day FOR UPDATE;
 IF v_count >= 50 THEN RETURN jsonb_build_object('allowed',false,'reason','daily_limit','used',v_count,'limit',50); END IF;
 UPDATE public.tutor_daily_usage SET requests=requests+1 WHERE user_id=v_user AND usage_date=v_day;
 IF p_thread_id IS NOT NULL THEN
  UPDATE public.tutor_threads SET messages=messages || jsonb_build_array(p_message), request_token=v_token, request_started_at=now(), updated_at=now(), title=CASE WHEN jsonb_array_length(messages)=0 THEN left(p_message->'parts'->0->>'text',80) ELSE title END WHERE id=p_thread_id AND user_id=v_user;
 END IF;
 RETURN jsonb_build_object('allowed',true,'used',v_count+1,'limit',50,'token',v_token);
END; $$;
REVOKE ALL ON FUNCTION public.reserve_tutor_request(uuid,jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reserve_tutor_request(uuid,jsonb) TO authenticated;
CREATE OR REPLACE FUNCTION public.finish_tutor_request(p_thread_id uuid,p_token uuid,p_assistant jsonb DEFAULT NULL)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Unauthorized'; END IF;
 IF p_assistant IS NOT NULL AND p_assistant->>'role' <> 'assistant' THEN RAISE EXCEPTION 'Invalid assistant'; END IF;
 UPDATE public.tutor_threads SET messages=CASE WHEN p_assistant IS NULL THEN messages ELSE messages || jsonb_build_array(p_assistant) END,request_token=NULL,request_started_at=NULL,updated_at=now() WHERE id=p_thread_id AND user_id=auth.uid() AND request_token=p_token;
 RETURN FOUND;
END; $$;
REVOKE ALL ON FUNCTION public.finish_tutor_request(uuid,uuid,jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.finish_tutor_request(uuid,uuid,jsonb) TO authenticated;