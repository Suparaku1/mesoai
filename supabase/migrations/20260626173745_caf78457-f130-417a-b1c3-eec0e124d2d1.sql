
-- ENUMS
CREATE TYPE public.app_role AS ENUM ('teacher','student');
CREATE TYPE public.drejtimi_enum AS ENUM ('Elektroteknike','TIK');
CREATE TYPE public.klasa_enum AS ENUM ('10','11','12','13');
CREATE TYPE public.paralelja_enum AS ENUM ('A','B','C','D');
CREATE TYPE public.enrollment_status AS ENUM ('pending','approved','rejected');
CREATE TYPE public.course_status AS ENUM ('draft','published');

-- PROFILES
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  drejtimi public.drejtimi_enum,
  klasa public.klasa_enum,
  paralelja public.paralelja_enum,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- USER ROLES
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  UNIQUE(user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.current_role()
RETURNS public.app_role LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT role FROM public.user_roles WHERE user_id = auth.uid() LIMIT 1
$$;

-- Profile policies
CREATE POLICY "profiles_select_own_or_teacher" ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.has_role(auth.uid(), 'teacher'));
CREATE POLICY "profiles_insert_self" ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());
CREATE POLICY "profiles_update_self" ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid());

-- user_roles policies
CREATE POLICY "roles_select_own_or_teacher" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'teacher'));

-- COURSES
CREATE TABLE public.courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  drejtimi public.drejtimi_enum NOT NULL,
  klasa public.klasa_enum NOT NULL,
  paralelja public.paralelja_enum,
  pdf_path TEXT,
  status public.course_status NOT NULL DEFAULT 'draft',
  ai_processed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.courses TO authenticated;
GRANT ALL ON public.courses TO service_role;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "courses_teacher_all" ON public.courses FOR ALL TO authenticated
  USING (teacher_id = auth.uid()) WITH CHECK (teacher_id = auth.uid());
CREATE POLICY "courses_students_view_published" ON public.courses FOR SELECT TO authenticated
  USING (status = 'published' AND public.has_role(auth.uid(),'student'));

-- ENROLLMENTS
CREATE TABLE public.enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  status public.enrollment_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(student_id, course_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.enrollments TO authenticated;
GRANT ALL ON public.enrollments TO service_role;
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "enroll_student_own" ON public.enrollments FOR SELECT TO authenticated
  USING (student_id = auth.uid() OR EXISTS (SELECT 1 FROM public.courses c WHERE c.id = course_id AND c.teacher_id = auth.uid()));
CREATE POLICY "enroll_student_insert" ON public.enrollments FOR INSERT TO authenticated
  WITH CHECK (student_id = auth.uid() AND public.has_role(auth.uid(),'student'));
CREATE POLICY "enroll_teacher_update" ON public.enrollments FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.courses c WHERE c.id = course_id AND c.teacher_id = auth.uid()));

-- TOPICS
CREATE TABLE public.topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  order_index INT NOT NULL,
  title TEXT NOT NULL,
  summary TEXT,
  explanation TEXT,
  objectives TEXT,
  presentation TEXT,
  examples TEXT,
  exercises TEXT,
  exercises_solved TEXT,
  is_test BOOLEAN NOT NULL DEFAULT false,
  is_final BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.topics TO authenticated;
GRANT ALL ON public.topics TO service_role;
ALTER TABLE public.topics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "topics_teacher_all" ON public.topics FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.courses c WHERE c.id = course_id AND c.teacher_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.courses c WHERE c.id = course_id AND c.teacher_id = auth.uid()));
CREATE POLICY "topics_enrolled_students_select" ON public.topics FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.enrollments e WHERE e.course_id = course_id AND e.student_id = auth.uid() AND e.status = 'approved'));

-- QUIZZES
CREATE TABLE public.quizzes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id UUID NOT NULL REFERENCES public.topics(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  questions JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.quizzes TO authenticated;
GRANT ALL ON public.quizzes TO service_role;
ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "quizzes_teacher_all" ON public.quizzes FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.topics t JOIN public.courses c ON c.id = t.course_id WHERE t.id = topic_id AND c.teacher_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.topics t JOIN public.courses c ON c.id = t.course_id WHERE t.id = topic_id AND c.teacher_id = auth.uid()));
CREATE POLICY "quizzes_students_select" ON public.quizzes FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.topics t JOIN public.enrollments e ON e.course_id = t.course_id WHERE t.id = topic_id AND e.student_id = auth.uid() AND e.status='approved'));

-- QUIZ ATTEMPTS / GRADES
CREATE TABLE public.quiz_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  answers JSONB NOT NULL,
  score NUMERIC NOT NULL,
  grade INT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.quiz_attempts TO authenticated;
GRANT ALL ON public.quiz_attempts TO service_role;
ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "attempts_student_own" ON public.quiz_attempts FOR SELECT TO authenticated
  USING (student_id = auth.uid() OR EXISTS (SELECT 1 FROM public.quizzes q JOIN public.topics t ON t.id=q.topic_id JOIN public.courses c ON c.id=t.course_id WHERE q.id = quiz_id AND c.teacher_id = auth.uid()));
CREATE POLICY "attempts_student_insert" ON public.quiz_attempts FOR INSERT TO authenticated
  WITH CHECK (student_id = auth.uid());

-- TOPIC PROGRESS
CREATE TABLE public.topic_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  topic_id UUID NOT NULL REFERENCES public.topics(id) ON DELETE CASCADE,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(student_id, topic_id)
);
GRANT SELECT, INSERT, DELETE ON public.topic_progress TO authenticated;
GRANT ALL ON public.topic_progress TO service_role;
ALTER TABLE public.topic_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "progress_student_own" ON public.topic_progress FOR SELECT TO authenticated
  USING (student_id = auth.uid() OR EXISTS (SELECT 1 FROM public.topics t JOIN public.courses c ON c.id=t.course_id WHERE t.id=topic_id AND c.teacher_id=auth.uid()));
CREATE POLICY "progress_student_insert" ON public.topic_progress FOR INSERT TO authenticated
  WITH CHECK (student_id = auth.uid());

-- HOMEWORK
CREATE TABLE public.homework (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id UUID NOT NULL REFERENCES public.topics(id) ON DELETE CASCADE,
  instructions TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.homework TO authenticated;
GRANT ALL ON public.homework TO service_role;
ALTER TABLE public.homework ENABLE ROW LEVEL SECURITY;

CREATE POLICY "hw_teacher_all" ON public.homework FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.topics t JOIN public.courses c ON c.id=t.course_id WHERE t.id=topic_id AND c.teacher_id=auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.topics t JOIN public.courses c ON c.id=t.course_id WHERE t.id=topic_id AND c.teacher_id=auth.uid()));
CREATE POLICY "hw_student_select" ON public.homework FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.topics t JOIN public.enrollments e ON e.course_id=t.course_id WHERE t.id=topic_id AND e.student_id=auth.uid() AND e.status='approved'));

CREATE TABLE public.homework_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  homework_id UUID NOT NULL REFERENCES public.homework(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  grade INT,
  feedback TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.homework_submissions TO authenticated;
GRANT ALL ON public.homework_submissions TO service_role;
ALTER TABLE public.homework_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "hws_student_own" ON public.homework_submissions FOR SELECT TO authenticated
  USING (student_id = auth.uid() OR EXISTS (SELECT 1 FROM public.homework h JOIN public.topics t ON t.id=h.topic_id JOIN public.courses c ON c.id=t.course_id WHERE h.id=homework_id AND c.teacher_id=auth.uid()));
CREATE POLICY "hws_student_insert" ON public.homework_submissions FOR INSERT TO authenticated
  WITH CHECK (student_id = auth.uid());
CREATE POLICY "hws_teacher_update" ON public.homework_submissions FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.homework h JOIN public.topics t ON t.id=h.topic_id JOIN public.courses c ON c.id=t.course_id WHERE h.id=homework_id AND c.teacher_id=auth.uid()));

-- Auto-create profile on signup (uses metadata)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
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
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, COALESCE(NULLIF(NEW.raw_user_meta_data->>'role','')::public.app_role,'student'));
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Storage policies (course-pdfs: teacher path = teacher_id/...)
CREATE POLICY "pdfs_teacher_all" ON storage.objects FOR ALL TO authenticated
  USING (bucket_id='course-pdfs' AND auth.uid()::text = (storage.foldername(name))[1])
  WITH CHECK (bucket_id='course-pdfs' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "pdfs_students_read_enrolled" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id='course-pdfs' AND EXISTS (
    SELECT 1 FROM public.courses c JOIN public.enrollments e ON e.course_id=c.id
    WHERE c.pdf_path = storage.objects.name AND e.student_id = auth.uid() AND e.status='approved'
  ));

-- Homework bucket: student uploads under student_id/, teacher of related course can read
CREATE POLICY "hw_student_upload" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id='homework' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "hw_student_read_own" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id='homework' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "hw_teacher_read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id='homework' AND EXISTS (
    SELECT 1 FROM public.homework_submissions hs
    JOIN public.homework h ON h.id=hs.homework_id
    JOIN public.topics t ON t.id=h.topic_id
    JOIN public.courses c ON c.id=t.course_id
    WHERE hs.file_path = storage.objects.name AND c.teacher_id = auth.uid()
  ));
