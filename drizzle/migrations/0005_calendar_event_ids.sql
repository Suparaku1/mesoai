ALTER TABLE public.homework ADD COLUMN IF NOT EXISTS calendar_event_id text;
ALTER TABLE public.exams ADD COLUMN IF NOT EXISTS calendar_event_id text;