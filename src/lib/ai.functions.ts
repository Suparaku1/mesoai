import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const GenerateInput = z.object({
  courseId: z.string().uuid(),
  pdfPath: z.string().min(1),
});

export const generateCourseFromPdf = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => GenerateInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // verify ownership
    const { data: course, error: courseErr } = await supabase
      .from("courses")
      .select("id, title, teacher_id")
      .eq("id", data.courseId)
      .maybeSingle();
    if (courseErr || !course) throw new Error("Kursi nuk u gjet");
    if (course.teacher_id !== userId) throw new Error("Nuk keni leje");

    // download PDF
    const { data: file, error: dlErr } = await supabase.storage
      .from("course-pdfs")
      .download(data.pdfPath);
    if (dlErr || !file) throw new Error("Skedari PDF nuk u gjet");

    const bytes = new Uint8Array(await file.arrayBuffer());
    let binary = "";
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
    const base64 = btoa(binary);

    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("Mungon LOVABLE_API_KEY");

    const systemPrompt = `Ti je ndihmës mësimor për shkollën profesionale shqiptare. Analizo librin PDF dhe gjenero strukturën e plotë të kursit në SHQIP.

Kthe VETËM një objekt JSON valid me këtë skemë (pa markdown, pa shpjegime jashtë JSON):
{
  "topics": [
    {
      "title": "Titulli i temës",
      "summary": "Përmbledhje 2-3 fjali",
      "objectives": "Objektivat e mësimit (3-5 pika, ndara me \\n)",
      "explanation": "Shpjegim i detajuar 200-400 fjalë",
      "examples": "2-3 shembuj praktikë",
      "exercises": "3-5 ushtrime pa zgjidhje",
      "exercises_solved": "2 ushtrime me zgjidhje të detajuar",
      "quiz": [
        { "type": "mcq", "question": "...", "options": ["A","B","C","D"], "correct": 0 },
        { "type": "tf", "question": "...", "correct": true },
        { "type": "fill", "question": "Plotëso: ___", "answer": "fjala" }
      ]
    }
  ]
}

Rregulla:
- Krijo 6-10 tema të rëndomta + 2 testime (pas temës 4 dhe pas temës 8) + 1 test final
- Për tema testimi: title fillon me "Testimi:" dhe ka VETËM quiz (8-10 pyetje)
- Për testin final: title "Test Final" me 12-15 pyetje
- Të gjitha fushat duhen plotësuar me përmbajtje reale nga PDF`;

    // NOTE: AI SDK's @ai-sdk/openai-compatible converter does not support PDF file parts.
    // POST the OpenAI-compatible chat-completions body directly to the Lovable Gateway.
    const filename = data.pdfPath.split("/").pop() ?? "book.pdf";
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": apiKey,
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: [
              { type: "text", text: `Titulli i kursit: ${course.title}\n\nAnalizo PDF-në bashkangjitur dhe krijo strukturën.` },
              {
                type: "file",
                file: {
                  filename,
                  file_data: `data:application/pdf;base64,${base64}`,
                },
              },
            ],
          },
        ],
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Gateway error ${res.status}: ${errText.slice(0, 300)}`);
    }
    const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const text = (json.choices?.[0]?.message?.content ?? "").trim();

    // extract JSON
    let parsed: { topics: Array<Record<string, unknown>> };
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    try {
      parsed = JSON.parse(jsonMatch ? jsonMatch[0] : text);
    } catch {
      throw new Error("AI nuk ktheu JSON të vlefshëm. Provo përsëri.");
    }

    if (!parsed.topics?.length) throw new Error("AI nuk gjeneroi tema");

    const topics = z.array(z.object({
      title: z.string().min(1),
      summary: z.string().optional(), objectives: z.string().optional(),
      explanation: z.string().optional(), examples: z.string().optional(),
      exercises: z.string().optional(), exercises_solved: z.string().optional(),
      quiz: z.array(z.union([
        z.object({ type: z.literal("mcq"), question: z.string(), options: z.array(z.string()), correct: z.number().int().nonnegative() }),
        z.object({ type: z.literal("tf"), question: z.string(), correct: z.boolean() }),
        z.object({ type: z.literal("fill"), question: z.string(), answer: z.string() }),
      ])).optional(),
    })).min(1).parse(parsed.topics);
    const { data: count, error: saveError } = await supabase.rpc("replace_generated_course", {
      p_course: data.courseId, p_topics: topics,
    });
    if (saveError) throw new Error(saveError.message);
    return { ok: true, count };
  });
