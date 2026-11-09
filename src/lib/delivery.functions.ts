import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertStaff, canRetryDelivery } from "./staff-access";

/** Reports whether the Gmail and Google Calendar connectors are configured. */
export const checkConnectors = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => data ?? {})
  .handler(async ({ context }) => {
    await assertStaff(context.supabase, context.userId);
    async function probe(service: string, key: string | undefined, path: string) {
      const auth = process.env["LOVABLE_API_KEY"];
      if (!auth || !key) return false;
      try {
        const response = await fetch(`https://connector-gateway.lovable.dev/${service}/${path}`, {
          headers: { Authorization: `Bearer ${auth}`, "X-Connection-Api-Key": key },
          signal: AbortSignal.timeout(15000),
        });
        return response.ok;
      } catch { return false; }
    }
    const [gmail, calendar] = await Promise.all([
      probe("google_mail", process.env["GOOGLE_MAIL_API_KEY"], "gmail/v1/users/me/profile"),
      probe("google_calendar", process.env["GOOGLE_CALENDAR_API_KEY"], "calendar/v3/calendars/primary"),
    ]);
    return { gmail, calendar };
  });

/** Re-sends a previously failed email using the stored body. Admin/teacher only. */
export const retryFailedEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    await assertStaff(context.supabase, context.userId);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row } = await supabaseAdmin
      .from("email_log")
      .select("recipient, subject, body, event, status, channel")
      .eq("id", data.id)
      .maybeSingle();
    if (!row) throw new Error("Regjistrimi nuk u gjet");
    if (row.status === "sent") return { sent: false, reason: "already_sent" as const };
    if (!canRetryDelivery(row)) throw new Error("Ky dërgim kërkon verifikim dhe nuk mund të ridërgohet automatikisht.");
    if (!row.body) throw new Error("Përmbajtja e email-it nuk është ruajtur");

    const { data: claimed, error: claimError } = await supabaseAdmin.from("email_log")
      .update({ status: "retrying" }).eq("id", data.id).eq("status", row.status)
      .eq("channel", "email").select("id").maybeSingle();
    if (claimError) throw new Error(claimError.message);
    if (!claimed) throw new Error("Ridërgimi është nisur tashmë.");

    const { sendMail } = await import("./gmail.server");
    await sendMail(row.recipient, row.subject, row.body, row.event ?? undefined);
    const { error: saved } = await supabaseAdmin.from("email_log").update({ status: "sent" }).eq("id", data.id);
    if (saved) throw new Error("Email-i u dërgua, por regjistri nuk u përditësua.");
    return { sent: true };
  });
