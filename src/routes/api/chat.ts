import { createFileRoute } from "@tanstack/react-router";
import { convertToModelMessages, streamText, stepCountIs, type UIMessage } from "ai";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";
import { createTutorTools } from "@/lib/tutor-tools.server";


type ChatBody = { messages?: unknown; courseId?: string | null };

async function embedQuery(apiKey: string, text: string): Promise<number[]> {
  const res = await fetch("https://ai.gateway.lovable.dev/v1/embeddings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "google/gemini-embedding-001",
      input: text,
      dimensions: 768,
    }),
  });
  if (!res.ok) throw new Error(`Embed failed: ${res.status}`);
  const j = (await res.json()) as { data: Array<{ embedding: number[] }> };
  return j.data[0].embedding;
}

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { messages, courseId } = (await request.json()) as ChatBody;
        if (!Array.isArray(messages) || messages.length === 0) {
          return new Response("Messages required", { status: 400 });
        }
        const apiKey = process.env.LOVABLE_API_KEY;
        if (!apiKey) return new Response("Missing LOVABLE_API_KEY", { status: 500 });

        // Verify caller with Supabase bearer token
        const authHeader = request.headers.get("Authorization") ?? "";
        const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
        if (!token) return new Response("Unauthorized", { status: 401 });

        const { createClient } = await import("@supabase/supabase-js");
        const supabase = createClient(
          process.env.SUPABASE_URL!,
          process.env.SUPABASE_PUBLISHABLE_KEY!,
          {
            global: { headers: { Authorization: `Bearer ${token}` } },
            auth: { persistSession: false, autoRefreshToken: false },
          },
        );
        const { data: userRes } = await supabase.auth.getUser(token);
        if (!userRes?.user) return new Response("Unauthorized", { status: 401 });

        // Extract latest user question text for RAG
        const lastUser = (messages as UIMessage[]).slice().reverse().find((m) => m.role === "user");
        const question =
          lastUser?.parts
            ?.map((p) => (p.type === "text" ? p.text : ""))
            .join(" ")
            .trim() ?? "";

        let context = "";
        const citations: Array<{ title?: string; snippet: string }> = [];
        if (question) {
          try {
            const emb = await embedQuery(apiKey, question);
            const { data: matches } = await supabase.rpc("match_course_chunks", {
              query_embedding: emb as unknown as string,
              match_count: 6,
              filter_course: courseId ?? null,
            });
            if (matches?.length) {
              context = matches
                .map((m: { content: string }, i: number) => `[${i + 1}] ${m.content}`)
                .join("\n\n");
              for (const m of matches as Array<{ content: string; metadata?: { title?: string } }>) {
                citations.push({ title: m.metadata?.title, snippet: m.content.slice(0, 120) });
              }
            }
          } catch {
            // fall through — reply without RAG
          }
        }

        const system = `Ti je Tutori AI i Uendi Platform për nxënësit e Shkollës Profesionale Elbasan.
Përgjigju në SHQIP, qartë dhe shkurt. Përdor Markdown (lista, kod, theksim).
Kur je i sigurtë, referoju fragmenteve poshtë me [1], [2] etj. Mos i jep direkt përgjigjet e testeve — udhëzoji nxënësit të mendojnë.

Ke vegla për të parë të dhënat reale të nxënësit: kurset ku është regjistruar, progresin në tema, notat (4–10) dhe detyrat e padorëzuara.
Përdori sa herë pyetja ka të bëjë me situatën personale të nxënësit ("ku jam", "çfarë kam mbetur", "sa kam marrë", "cila është tema e radhës"). Mos i shpik të dhënat — nëse vegla nuk kthen rezultat, thuaje hapur.

${context ? `KONTEKST NGA MATERIALET E KURSIT:\n${context}` : "Nuk u gjet kontekst i posaçëm — përgjigju nga njohuritë e përgjithshme."}`;

        const gateway = createLovableAiGatewayProvider(apiKey);
        const result = streamText({
          model: gateway("google/gemini-3-flash-preview"),
          system,
          tools: createTutorTools(supabase, userRes.user.id),
          stopWhen: stepCountIs(50),
          messages: await convertToModelMessages(messages as UIMessage[]),
        });


        return result.toUIMessageStreamResponse({
          originalMessages: messages as UIMessage[],
          onError: (error) => {
            console.error("[api/chat] stream error", error);
            return error instanceof Error ? error.message : String(error);
          },
        });
      },
    },
  },
});
