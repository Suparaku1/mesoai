/**
 * CRM automation helpers (server-only).
 * Keeps the CRM pipeline in sync with real school events: every enrollment
 * request creates/updates a contact + lead, and approval/rejection moves the
 * lead to the matching stage while logging a communication entry.
 */

type EnrollmentEvent = "enrollment_requested" | "enrollment_approved" | "enrollment_rejected";

const STAGE_BY_EVENT: Record<EnrollmentEvent, string[]> = {
  enrollment_requested: ["lead i ri", "i ri", "new"],
  enrollment_approved: ["regjistruar", "fituar", "won"],
  enrollment_rejected: ["refuzuar", "humbur", "lost"],
};

function pickStage(
  stages: Array<{ id: string; name: string; order_index: number }>,
  event: EnrollmentEvent,
): string | null {
  if (!stages.length) return null;
  const keys = STAGE_BY_EVENT[event];
  const found = stages.find((s) => keys.some((k) => s.name.toLowerCase().includes(k)));
  if (found) return found.id;
  if (event === "enrollment_requested") return stages[0]!.id;
  return stages[stages.length - 1]!.id;
}

export async function syncEnrollmentToCrm(input: {
  event: EnrollmentEvent;
  courseId: string;
  studentId: string;
}) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const [{ data: profile }, { data: course }, { data: stages }] = await Promise.all([
    supabaseAdmin
      .from("profiles")
      .select("id, first_name, last_name, email, drejtimi, klasa, paralelja")
      .eq("id", input.studentId)
      .maybeSingle(),
    supabaseAdmin.from("courses").select("id, title, teacher_id, drejtimi").eq("id", input.courseId).maybeSingle(),
    supabaseAdmin.from("crm_pipeline_stages").select("id,name,order_index").order("order_index"),
  ]);
  if (!profile || !course) return { synced: false };

  const fullName = `${profile.first_name ?? ""} ${profile.last_name ?? ""}`.trim() || profile.email;

  // 1. Contact — one per student email
  let contactId: string | null = null;
  if (profile.email) {
    const { data: existing } = await supabaseAdmin
      .from("crm_contacts")
      .select("id")
      .eq("email", profile.email)
      .is("deleted_at", null)
      .maybeSingle();
    if (existing) {
      contactId = existing.id;
    } else {
      const { data: created } = await supabaseAdmin
        .from("crm_contacts")
        .insert({
          first_name: profile.first_name || fullName,
          last_name: profile.last_name || null,
          email: profile.email,
          type: "other",
          notes: `Nxënës i platformës — ${profile.drejtimi ?? "—"} ${profile.klasa ?? ""}${profile.paralelja ?? ""}`.trim(),
          tags: ["nxenes", "auto"],
          owner_id: course.teacher_id,
        })
        .select("id")
        .maybeSingle();
      contactId = created?.id ?? null;
    }
  }
  if (!contactId) return { synced: false };

  // 2. Lead — one per (contact, course)
  const leadTitle = `Regjistrim: ${course.title}`;
  const stageId = pickStage((stages ?? []) as never, input.event);
  const { data: lead } = await supabaseAdmin
    .from("crm_leads")
    .select("id")
    .eq("contact_id", contactId)
    .eq("title", leadTitle)
    .maybeSingle();

  if (lead) {
    if (stageId) await supabaseAdmin.from("crm_leads").update({ stage_id: stageId }).eq("id", lead.id);
  } else if (stageId) {
    await supabaseAdmin.from("crm_leads").insert({
      contact_id: contactId,
      stage_id: stageId,
      title: leadTitle,
      drejtimi_interes: course.drejtimi ?? null,
      value_notes: `Krijuar automatikisht nga kërkesa e regjistrimit e ${fullName}.`,
      assigned_to: course.teacher_id,
    });
  }

  // 3. Communication log
  const label: Record<EnrollmentEvent, string> = {
    enrollment_requested: "Kërkesë regjistrimi",
    enrollment_approved: "Regjistrimi u aprovua",
    enrollment_rejected: "Regjistrimi u refuzua",
  };
  await supabaseAdmin.from("crm_communications").insert({
    contact_id: contactId,
    type: "note",
    subject: `${label[input.event]} — ${course.title}`,
    body: `${fullName} · kursi "${course.title}".`,
    created_by: course.teacher_id,
  });

  return { synced: true, contactId };
}

/**
 * Executes active automation rules for an event using the service client, so
 * rules fire for any actor (student, parent, teacher) not just admins.
 */
export async function runAutomationRules(event: string, payload?: Record<string, unknown>) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: rules } = await supabaseAdmin
    .from("automation_rules")
    .select("id,name,action_type,action_config")
    .eq("trigger_event", event)
    .eq("is_active", true);
  if (!rules?.length) return { executed: 0 };

  let executed = 0;
  for (const rule of rules) {
    const cfg = (rule.action_config ?? {}) as Record<string, unknown>;
    try {
      let message = `Ekzekutuar veprimi ${rule.action_type}`;
      if (rule.action_type === "create_notification" && cfg.user_id) {
        await supabaseAdmin.from("notifications").insert({
          user_id: cfg.user_id as string,
          title: (cfg.title as string) ?? rule.name,
          message: (cfg.message as string) ?? `Ngjarja: ${event}`,
          type: "automation",
          link: (cfg.link as string) ?? null,
        });
      } else if (rule.action_type === "send_email" && cfg.to) {
        const { sendMail } = await import("./gmail.server");
        await sendMail(
          cfg.to as string,
          (cfg.subject as string) ?? `Uendi Platform: ${event}`,
          (cfg.html as string) ?? `<p>Ngjarja u aktivizua: ${event}</p>`,
        );
      } else {
        message = `Veprimi ${rule.action_type} u anashkalua (konfigurim i paplotë)`;
      }
      await supabaseAdmin
        .from("automation_runs")
        .insert({ rule_id: rule.id, status: "success", message, payload: (payload ?? null) as never });
      executed += 1;
    } catch (e) {
      await supabaseAdmin.from("automation_runs").insert({
        rule_id: rule.id,
        status: "failure",
        message: e instanceof Error ? e.message : "gabim",
        payload: (payload ?? null) as never,
      });
    }
  }
  return { executed };
}
