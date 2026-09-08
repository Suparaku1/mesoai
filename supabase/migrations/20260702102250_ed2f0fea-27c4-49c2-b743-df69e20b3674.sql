
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS cover_image_url TEXT;

DO $$ BEGIN
  CREATE POLICY "Auth upload course covers" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id='course-covers');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Auth update course covers" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id='course-covers');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.user_preferences (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  onboarding_dismissed BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.user_preferences TO authenticated;
GRANT ALL ON public.user_preferences TO service_role;
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "own prefs" ON public.user_preferences FOR ALL TO authenticated USING (user_id=auth.uid()) WITH CHECK (user_id=auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
