import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const Input = z.object({
  courseId: z.string().uuid(),
  prompt: z.string().min(3).max(500),
});

export const generateCourseCover = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => Input.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: course } = await supabase.from("courses").select("id,teacher_id").eq("id", data.courseId).maybeSingle();
    if (!course) throw new Error("Kursi nuk u gjet");
    if (course.teacher_id !== userId) throw new Error("Nuk keni leje");

    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("Mungon LOVABLE_API_KEY");

    const res = await fetch("https://ai.gateway.lovable.dev/v1/images/generations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "google/gemini-3.1-flash-image",
        messages: [
          {
            role: "user",
            content: `Kopertinë profesionale ilustrative për një kurs shkolle profesionale me temën: "${data.prompt}". Stil modern, ngjyra blu-teal, edukativ, pa tekst.`,
          },
        ],
        modalities: ["image", "text"],
      }),
    });

    if (!res.ok) {
      const t = await res.text().catch(() => "");
      throw new Error(`Gabim AI (${res.status}): ${t.slice(0, 200)}`);
    }
    const json = await res.json();
    const b64: string | undefined =
      json?.data?.[0]?.b64_json ??
      (json?.choices?.[0]?.message?.images?.[0]?.image_url?.url as string | undefined)?.replace(/^data:image\/[^;]+;base64,/, "");
    if (!b64) throw new Error("AI nuk ktheu imazh");
    const imageUrl = `data:image/png;base64,${b64}`;

    await supabase.from("courses").update({ cover_image_url: imageUrl }).eq("id", data.courseId);
    return { url: imageUrl };
  });
