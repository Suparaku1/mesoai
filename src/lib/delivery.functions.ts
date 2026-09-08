import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Reports whether the Gmail and Google Calendar connectors are configured. */
export const checkConnectors = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => data ?? {})
  .handler(async () => ({
    gmail: Boolean(process.env["LOVABLE_API_KEY"] && process.env["GOOGLE_MAIL_API_KEY"]),
    calendar: Boolean(process.env["LOVABLE_API_KEY"] && process.env["GOOGLE_CALENDAR_API_KEY"]),
  }));

/** Re-sends a previously failed email using the stored body. Admin/teacher only. */
export const retryFailedEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { data: roles } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId);
    const allowed = (roles ?? []).some((r) => r.role === "admin" || r.role === "teacher");
    if (!allowed) throw new Error("Nuk keni leje për këtë veprim");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row } = await supabaseAdmin
      .from("email_log")
      .select("recipient, subject, body, event, status")
      .eq("id", data.id)
      .maybeSingle();
    if (!row) throw new Error("Regjistrimi nuk u gjet");
    if (row.status === "sent") return { sent: false, reason: "already_sent" as const };
    if (!row.body) throw new Error("Përmbajtja e email-it nuk është ruajtur");

    const { sendMail } = await import("./gmail.server");
    await sendMail(row.recipient, row.subject, row.body, row.event ?? undefined);
    return { sent: true };
  });
