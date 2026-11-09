CREATE POLICY profiles_admin_read ON public.profiles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY user_roles_admin_read ON public.user_roles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER trg_audit AFTER INSERT OR UPDATE OR DELETE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.audit_row_change('admin');
CREATE OR REPLACE FUNCTION public.current_role() RETURNS public.app_role LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$ SELECT role FROM public.user_roles WHERE user_id=auth.uid() ORDER BY CASE role WHEN 'teacher' THEN 1 WHEN 'admin' THEN 2 WHEN 'parent' THEN 3 WHEN 'student' THEN 4 END LIMIT 1 $$;
REVOKE ALL ON FUNCTION public.current_role() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.current_role() TO authenticated, service_role;