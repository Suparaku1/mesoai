import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const IngestInput = z.object({ courseId: z.string().uuid() });

async function embedTexts(apiKey: string, texts: string[]): Promise<number[][]> {
  const res = await fetch("https://ai.gateway.lovable.dev/v1/embeddings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "google/gemini-embedding-001",
      input: texts,
      // request 768 dims to match our vector column
      dimensions: 768,
    }),
  });
  if (!res.ok) throw new Error(`Embeddings failed ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const json = (await res.json()) as { data: Array<{ embedding: number[] }> };
  return json.data.map((d) => d.embedding);
}

/** Chunk topic content into ~800 char segments for embedding. */
function chunkTopic(topic: {
  id: string;
  title: string;
  summary: string | null;
  explanation: string | null;
  examples: string | null;
  exercises_solved: string | null;
}) {
  const parts = [
    `# ${topic.title}\n\n${topic.summary ?? ""}`,
    topic.explanation ?? "",
    topic.examples ? `Shembuj:\n${topic.examples}` : "",
    topic.exercises_solved ? `Ushtrime të zgjidhura:\n${topic.exercises_solved}` : "",
  ].filter(Boolean);
  const full = parts.join("\n\n").trim();
  if (!full) return [];
  const size = 800;
  const chunks: string[] = [];
  for (let i = 0; i < full.length; i += size) chunks.push(full.slice(i, i + size));
  return chunks;
}

export const ingestCourseKnowledge = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => IngestInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("Mungon LOVABLE_API_KEY");

    // Verify caller owns the course
    const { data: course } = await supabase
      .from("courses")
      .select("id, teacher_id")
      .eq("id", data.courseId)
      .maybeSingle();
    if (!course) throw new Error("Kursi nuk u gjet");
    if (course.teacher_id !== userId) throw new Error("Nuk keni leje");

    const { data: topics, error } = await supabase
      .from("topics")
      .select("id, title, summary, explanation, examples, exercises_solved")
      .eq("course_id", data.courseId)
      .is("deleted_at", null)
      .order("order_index");
    if (error) throw error;
    if (!topics?.length) throw new Error("Kursi s'ka tema për të indeksuar");

    // Load admin client to bypass RLS for the bulk write
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const rows: Array<{ topic_id: string; content: string; embedding: string; metadata: { title: string } }> = [];
    for (const t of topics) {
      const chunks = chunkTopic(t);
      if (!chunks.length) continue;

      // Embed in small batches to stay under gateway limits
      const embeddings = await embedTexts(apiKey, chunks);
      if (embeddings.length !== chunks.length || embeddings.some((e) => e.length !== 768)) throw new Error("Indeksi AI nuk është i plotë.");
      rows.push(...chunks.map((content, i) => ({
        topic_id: t.id,
        content,
        embedding: JSON.stringify(embeddings[i]),
        metadata: { title: t.title },
      })));
    }
    if (!rows.length) throw new Error("Kursi nuk ka përmbajtje për indeksim.");
    const { data: count, error: replacementError } = await supabaseAdmin.rpc("replace_course_knowledge", { p_course: data.courseId, p_rows: rows });
    if (replacementError) throw replacementError;
    return { ok: true, chunks: count };
  });
