import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertStaff } from "./staff-access";

const schema = z.object({
  to: z.string().email(),
  subject: z.string().min(1).max(200),
  html: z.string().min(1).max(20000),
});

export const sendGmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => schema.parse(data))
  .handler(async ({ data, context }) => {
    await assertStaff(context.supabase, context.userId);
    const { assertKnownRecipients } = await import("./recipient-guard.server");
    await assertKnownRecipients([data.to]);
    const { sendMail } = await import("./gmail.server");
    return await sendMail(data.to, data.subject, data.html);
  });
