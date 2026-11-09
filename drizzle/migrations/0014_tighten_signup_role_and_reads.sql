CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r text := NULLIF(NEW.raw_user_meta_data->>'role','');
BEGIN
  INSERT INTO public.profiles (id, first_name, last_name, email, drejtimi, klasa, paralelja)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'first_name',''),
    COALESCE(NEW.raw_user_meta_data->>'last_name',''),
    NEW.email,
    NULLIF(NEW.raw_user_meta_data->>'drejtimi','')::public.drejtimi_enum,
    NULLIF(NEW.raw_user_meta_data->>'klasa','')::public.klasa_enum,
    NULLIF(NEW.raw_user_meta_data->>'paralelja','')::public.paralelja_enum
  );
  -- Only self-service roles may come from sign-up metadata; staff roles are granted by admins.
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, CASE WHEN r = 'parent' THEN 'parent'::public.app_role ELSE 'student'::public.app_role END);
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.can_view_course(_course uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'teacher')
    OR EXISTS (SELECT 1 FROM public.enrollments e WHERE e.course_id=_course AND e.student_id=auth.uid() AND e.status='approved')
    OR EXISTS (SELECT 1 FROM public.enrollments e JOIN public.parent_links pl ON pl.student_id=e.student_id
               WHERE e.course_id=_course AND pl.parent_id=auth.uid() AND e.status='approved');
$$;
REVOKE EXECUTE ON FUNCTION public.can_view_course(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.can_view_course(uuid) TO authenticated;

DROP POLICY IF EXISTS "schedule readable to auth" ON public.schedule;
CREATE POLICY "schedule read course members" ON public.schedule FOR SELECT TO authenticated USING (public.can_view_course(course_id));
DROP POLICY IF EXISTS "exams read auth" ON public.exams;
CREATE POLICY "exams read course members" ON public.exams FOR SELECT TO authenticated USING (public.can_view_course(course_id));
DROP POLICY IF EXISTS "library read auth" ON public.library_resources;
CREATE POLICY "library read staff and students" ON public.library_resources FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'teacher') OR public.has_role(auth.uid(),'student'));
DROP POLICY IF EXISTS "announcements read auth" ON public.announcements;
CREATE POLICY "announcements read by audience" ON public.announcements FOR SELECT TO authenticated USING (
  author_id = auth.uid() OR public.has_role(auth.uid(),'admin') OR audience = 'all'
  OR (audience='students' AND public.has_role(auth.uid(),'student'))
  OR (audience='teachers' AND public.has_role(auth.uid(),'teacher'))
  OR (audience='parents' AND public.has_role(auth.uid(),'parent')));