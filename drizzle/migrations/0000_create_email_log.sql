CREATE TABLE public.email_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient text NOT NULL,
  subject text NOT NULL,
  event text,
  channel text NOT NULL DEFAULT 'email',
  status text NOT NULL DEFAULT 'sent',
  attempts integer NOT NULL DEFAULT 1,
  error text,
  provider_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.email_log TO authenticated;
GRANT ALL ON public.email_log TO service_role;

ALTER TABLE public.email_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins and teachers can read email log"
ON public.email_log
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'teacher'));

CREATE INDEX email_log_created_at_idx ON public.email_log (created_at DESC);
