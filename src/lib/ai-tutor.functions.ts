import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const ChatInput = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().min(1).max(4000),
      }),
    )
    .min(1)
    .max(30),
});

export const askTutor = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => ChatInput.parse(input))
  .handler(async ({ data }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("Mungon LOVABLE_API_KEY");

    const { generateText } = await import("ai");
    const { createLovableAiGatewayProvider } = await import("./ai-gateway.server");
    const gateway = createLovableAiGatewayProvider(apiKey);

    const result = await generateText({
      model: gateway("google/gemini-3-flash-preview"),
      messages: [
        {
          role: "system",
          content:
            "Ti je një Tutor AI në SHQIP për nxënësit e Shkollës Profesionale Elbasan (drejtimet: Elektroteknike dhe TIK). Përgjigju qartë, shkurt dhe me shembuj. Ndihmoji të kuptojnë konceptet pa u dhënë direkt përgjigjet e testeve. Përdor formatim Markdown (lista, theksim, kod) kur ndihmon.",
        },
        ...data.messages,
      ],
    });

    return { reply: result.text };
  });
