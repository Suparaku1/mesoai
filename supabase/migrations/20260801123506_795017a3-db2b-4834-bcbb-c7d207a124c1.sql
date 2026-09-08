ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS email_notifications boolean NOT NULL DEFAULT true;

ALTER TABLE public.quiz_attempts
  ADD COLUMN IF NOT EXISTS needs_review boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS reviewed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS final_grade integer,
  ADD COLUMN IF NOT EXISTS reviewed_by uuid,
  ADD COLUMN IF NOT EXISTS teacher_feedback text;

DROP POLICY IF EXISTS "Teachers review attempts of their courses" ON public.quiz_attempts;
CREATE POLICY "Teachers review attempts of their courses"
ON public.quiz_attempts FOR UPDATE TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.quizzes q
  JOIN public.topics t ON t.id = q.topic_id
  JOIN public.courses c ON c.id = t.course_id
  WHERE q.id = quiz_attempts.quiz_id AND c.teacher_id = auth.uid()
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.quizzes q
  JOIN public.topics t ON t.id = q.topic_id
  JOIN public.courses c ON c.id = t.course_id
  WHERE q.id = quiz_attempts.quiz_id AND c.teacher_id = auth.uid()
));

DROP POLICY IF EXISTS "Teachers view attempts of their courses" ON public.quiz_attempts;
CREATE POLICY "Teachers view attempts of their courses"
ON public.quiz_attempts FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.quizzes q
  JOIN public.topics t ON t.id = q.topic_id
  JOIN public.courses c ON c.id = t.course_id
  WHERE q.id = quiz_attempts.quiz_id AND c.teacher_id = auth.uid()
));

CREATE TABLE IF NOT EXISTS public.course_homework_grades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  student_id uuid NOT NULL,
  grade integer NOT NULL CHECK (grade BETWEEN 4 AND 10),
  feedback text,
  graded_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (course_id, student_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.course_homework_grades TO authenticated;
GRANT ALL ON public.course_homework_grades TO service_role;
ALTER TABLE public.course_homework_grades ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students view own homework grade"
ON public.course_homework_grades FOR SELECT TO authenticated
USING (student_id = auth.uid());

CREATE POLICY "Parents view child homework grade"
ON public.course_homework_grades FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.parent_links pl
  WHERE pl.parent_id = auth.uid() AND pl.student_id = course_homework_grades.student_id
));

CREATE POLICY "Teachers manage homework grades of their courses"
ON public.course_homework_grades FOR ALL TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.courses c WHERE c.id = course_homework_grades.course_id AND c.teacher_id = auth.uid()
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.courses c WHERE c.id = course_homework_grades.course_id AND c.teacher_id = auth.uid()
));

DROP TRIGGER IF EXISTS touch_course_homework_grades ON public.course_homework_grades;
CREATE TRIGGER touch_course_homework_grades
BEFORE UPDATE ON public.course_homework_grades
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();