import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertStaff } from "./staff-access";

// Trigger events emitted by the app; automation rules match by trigger_event.
export type AutomationEvent =
  | "homework_graded"
  | "enrollment_approved"
  | "low_stock"
  | "announcement_created"
  | "purchase_order_received";

const runSchema = z.object({
  event: z.string().min(1),
  payload: z.record(z.string(), z.unknown()).optional(),
});

// Fire an event: find active rules matching, execute action_type, log result.
export const runAutomation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => runSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertStaff(context.supabase, context.userId);
    const { data: rules, error } = await context.supabase
      .from("automation_rules")
      .select("id,name,action_type,action_config")
      .eq("trigger_event", data.event)
      .eq("is_active", true);
    if (error) throw new Error(error.message);

    const results: Array<{ rule: string; status: string; message?: string }> = [];
    for (const rule of rules ?? []) {
      try {
        const cfg = (rule.action_config ?? {}) as Record<string, unknown>;
        let message = `Ekzekutuar veprimi ${rule.action_type}`;

        if (rule.action_type === "create_notification") {
          const userId = (cfg.user_id as string) ?? context.userId;
          await context.supabase.from("notifications").insert({
            user_id: userId,
            title: (cfg.title as string) ?? rule.name,
            message: (cfg.message as string) ?? `Ngjarja: ${data.event}`,
            type: "automation",
            link: (cfg.link as string) ?? null,
          });
        } else if (rule.action_type === "send_email") {
          // Async import to avoid client bundling
          const { sendGmail } = await import("./gmail.functions");
          await sendGmail({
            data: {
              to: cfg.to as string,
              subject: (cfg.subject as string) ?? `Uendi: ${data.event}`,
              html: (cfg.html as string) ?? `<p>Ngjarja u aktivizua: ${data.event}</p>`,
            },
          });
        } else {
          message = `Veprimi ${rule.action_type} nuk mbështetet ende`;
        }

        await context.supabase.from("automation_runs").insert({
          rule_id: rule.id,
          status: "success",
          message,
          payload: (data.payload ?? null) as never,
        });
        results.push({ rule: rule.name, status: "success" });
      } catch (e) {
        const msg = e instanceof Error ? e.message : "gabim";
        await context.supabase.from("automation_runs").insert({
          rule_id: rule.id,
          status: "failure",
          message: msg,
          payload: (data.payload ?? null) as never,
        });
        results.push({ rule: rule.name, status: "failure", message: msg });
      }
    }
    return { executed: results.length, results };
  });
