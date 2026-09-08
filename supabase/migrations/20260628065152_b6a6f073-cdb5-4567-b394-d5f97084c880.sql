
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info',
  link TEXT,
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_notifications_user ON public.notifications(user_id, read, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own notifications" ON public.notifications
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users update own notifications" ON public.notifications
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users delete own notifications" ON public.notifications
  FOR DELETE TO authenticated USING (auth.uid() = user_id);
-- Inserts done via SECURITY DEFINER triggers; no insert policy needed.

ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- Trigger: enrollment created → notify teacher
CREATE OR REPLACE FUNCTION public.notify_enrollment_request()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_teacher UUID; v_title TEXT; v_student TEXT;
BEGIN
  SELECT teacher_id, title INTO v_teacher, v_title FROM public.courses WHERE id = NEW.course_id;
  SELECT COALESCE(first_name || ' ' || last_name, email) INTO v_student FROM public.profiles WHERE id = NEW.student_id;
  INSERT INTO public.notifications(user_id, title, message, type, link)
  VALUES (v_teacher, 'Kërkesë e re regjistrimi', COALESCE(v_student,'Një nxënës') || ' kërkon të regjistrohet në "' || v_title || '"', 'enrollment', '/courses/' || NEW.course_id);
  RETURN NEW;
END $$;

CREATE TRIGGER trg_notify_enrollment_request
AFTER INSERT ON public.enrollments
FOR EACH ROW EXECUTE FUNCTION public.notify_enrollment_request();

-- Trigger: enrollment status changed → notify student
CREATE OR REPLACE FUNCTION public.notify_enrollment_status()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_title TEXT; v_msg TEXT;
BEGIN
  IF NEW.status = OLD.status THEN RETURN NEW; END IF;
  SELECT title INTO v_title FROM public.courses WHERE id = NEW.course_id;
  IF NEW.status = 'approved' THEN
    v_msg := 'Kërkesa jote për kursin "' || v_title || '" u aprovua.';
  ELSIF NEW.status = 'rejected' THEN
    v_msg := 'Kërkesa jote për kursin "' || v_title || '" u refuzua.';
  ELSE RETURN NEW;
  END IF;
  INSERT INTO public.notifications(user_id, title, message, type, link)
  VALUES (NEW.student_id, 'Përditësim regjistrimi', v_msg, 'enrollment', '/courses/' || NEW.course_id);
  RETURN NEW;
END $$;

CREATE TRIGGER trg_notify_enrollment_status
AFTER UPDATE ON public.enrollments
FOR EACH ROW EXECUTE FUNCTION public.notify_enrollment_status();

-- Trigger: homework graded → notify student
CREATE OR REPLACE FUNCTION public.notify_homework_graded()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_topic UUID; v_title TEXT;
BEGIN
  IF NEW.grade IS NULL OR NEW.grade IS NOT DISTINCT FROM OLD.grade THEN RETURN NEW; END IF;
  SELECT topic_id INTO v_topic FROM public.homework WHERE id = NEW.homework_id;
  SELECT title INTO v_title FROM public.topics WHERE id = v_topic;
  INSERT INTO public.notifications(user_id, title, message, type, link)
  VALUES (NEW.student_id, 'Detyra u vlerësua', 'Detyra për "' || COALESCE(v_title,'temën') || '" u notua: ' || NEW.grade, 'grade', '/topics/' || v_topic);
  RETURN NEW;
END $$;

CREATE TRIGGER trg_notify_homework_graded
AFTER UPDATE ON public.homework_submissions
FOR EACH ROW EXECUTE FUNCTION public.notify_homework_graded();
