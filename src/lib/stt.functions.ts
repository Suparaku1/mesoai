import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const schema = z.object({
  audioBase64: z.string().min(100),
  mimeType: z.string().default("audio/webm"),
});

/** Transcribe audio via Lovable AI Gateway (Gemini). Returns Albanian text. */
export const transcribeAudio = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => schema.parse(data))
  .handler(async ({ data }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY mungon");

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: "Transkripto këtë audio në gjuhën shqipe. Kthe VETËM tekstin e transkriptuar, pa koment." },
              { type: "input_audio", input_audio: { data: data.audioBase64, format: data.mimeType.includes("mp3") ? "mp3" : "webm" } },
            ],
          },
        ],
      }),
    });
    if (!res.ok) {
      const t = await res.text();
      throw new Error(`Transkriptim dështoi (${res.status}): ${t.slice(0, 200)}`);
    }
    const json = (await res.json()) as any;
    const text = json?.choices?.[0]?.message?.content ?? "";
    return { text: String(text).trim() };
  });
