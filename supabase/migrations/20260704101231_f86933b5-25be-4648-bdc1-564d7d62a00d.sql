
-- pgvector for embeddings
CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;

CREATE TABLE IF NOT EXISTS public.course_chunks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  topic_id uuid REFERENCES public.topics(id) ON DELETE CASCADE,
  content text NOT NULL,
  embedding extensions.vector(768),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.course_chunks TO authenticated;
GRANT ALL ON public.course_chunks TO service_role;

ALTER TABLE public.course_chunks ENABLE ROW LEVEL SECURITY;

-- Students see chunks of courses they're approved in; teachers see their own courses' chunks
CREATE POLICY "Chunks visible to approved students or course teacher"
ON public.course_chunks FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.courses c
    WHERE c.id = course_chunks.course_id
      AND (
        c.teacher_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.enrollments e
          WHERE e.course_id = c.id AND e.student_id = auth.uid() AND e.status = 'approved'
        )
      )
  )
);

CREATE INDEX IF NOT EXISTS course_chunks_course_idx ON public.course_chunks(course_id);
CREATE INDEX IF NOT EXISTS course_chunks_embedding_idx
  ON public.course_chunks USING ivfflat (embedding extensions.vector_cosine_ops) WITH (lists = 100);

-- RPC to search chunks by embedding, scoped to a user's accessible courses
CREATE OR REPLACE FUNCTION public.match_course_chunks(
  query_embedding extensions.vector(768),
  match_count int DEFAULT 6,
  filter_course uuid DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  course_id uuid,
  topic_id uuid,
  content text,
  similarity float
)
LANGUAGE sql
STABLE SECURITY INVOKER
SET search_path = public, extensions
AS $$
  SELECT c.id, c.course_id, c.topic_id, c.content,
         1 - (c.embedding <=> query_embedding) AS similarity
  FROM public.course_chunks c
  WHERE c.embedding IS NOT NULL
    AND (filter_course IS NULL OR c.course_id = filter_course)
  ORDER BY c.embedding <=> query_embedding
  LIMIT match_count
$$;
