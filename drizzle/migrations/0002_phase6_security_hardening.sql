-- Fix tautology: students may only read topics of courses they are enrolled in
DROP POLICY IF EXISTS "topics_enrolled_students_select" ON public.topics;
CREATE POLICY "topics_enrolled_students_select" ON public.topics
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.enrollments e
    WHERE e.course_id = topics.course_id
      AND e.student_id = auth.uid()
      AND e.status = 'approved'::enrollment_status
  )
  OR public.has_role(auth.uid(), 'admin'::app_role)
);

-- Business/financial data: staff only
DROP POLICY IF EXISTS "budgets read auth" ON public.budgets;
CREATE POLICY "budgets read staff" ON public.budgets
FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'teacher'::app_role));

DROP POLICY IF EXISTS "po read auth" ON public.purchase_orders;
CREATE POLICY "po read staff" ON public.purchase_orders
FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'teacher'::app_role));

DROP POLICY IF EXISTS "poi read auth" ON public.purchase_order_items;
CREATE POLICY "poi read staff" ON public.purchase_order_items
FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'teacher'::app_role));

DROP POLICY IF EXISTS "auto read auth" ON public.automation_rules;
CREATE POLICY "auto read staff" ON public.automation_rules
FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'teacher'::app_role));

DROP POLICY IF EXISTS "Authenticated read inventory" ON public.inventory_items;
CREATE POLICY "Staff read inventory" ON public.inventory_items
FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'teacher'::app_role));

DROP POLICY IF EXISTS "stock read auth" ON public.stock_movements;
CREATE POLICY "stock read staff" ON public.stock_movements
FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'teacher'::app_role));

-- Course cover uploads limited to the course teacher or an admin
DROP POLICY IF EXISTS "Auth upload course covers" ON storage.objects;
DROP POLICY IF EXISTS "Auth update course covers" ON storage.objects;
CREATE POLICY "Teacher or admin upload course covers" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'course-covers'
  AND (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'teacher'::app_role))
);
CREATE POLICY "Teacher or admin update course covers" ON storage.objects
FOR UPDATE TO authenticated
USING (
  bucket_id = 'course-covers'
  AND (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'teacher'::app_role))
);