import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertStaff } from "./staff-access";

const GATEWAY = "https://connector-gateway.lovable.dev/google_calendar/calendar/v3";

const schema = z.object({
  summary: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  startISO: z.string().datetime({ offset: true }),
  endISO: z.string().datetime({ offset: true }),
  attendees: z.array(z.string().email()).optional(),
  calendarId: z.literal("primary").default("primary"),
}).refine((data) => new Date(data.endISO) > new Date(data.startISO), "Afati i mbarimit duhet të jetë pas fillimit.");

const MAX_ATTEMPTS = 3;
const TIMEOUT_MS = 15000;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Regjistron çdo thirrje Calendar në të njëjtin regjistër me email-et (channel = calendar). */
async function logCalendar(row: { summary: string; status: string; attempts: number; error?: string | null; id?: string | null; event?: string }) {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("email_log").insert({
      recipient: "Google Calendar",
      subject: row.summary.slice(0, 200),
      event: row.event ?? "calendar_event",
      channel: "calendar",
      status: row.status,
      attempts: row.attempts,
      error: row.error ?? null,
      provider_id: row.id ?? null,
    });
    if (error) console.error("[calendar log]", error.message);
  } catch (error) {
    console.error("[calendar log]", error instanceof Error ? error.message : "unknown");
  }
}

async function gcall(path: string, init: RequestInit, logAs?: { summary: string; event?: string }) {
  const lovable = process.env.LOVABLE_API_KEY;
  const key = process.env.GOOGLE_CALENDAR_API_KEY;
  if (!lovable || !key) {
    if (logAs) await logCalendar({ ...logAs, status: "not_configured", attempts: 0, error: "Google Calendar connector nuk është konfiguruar" });
    throw new Error("Google Calendar connector nuk është konfiguruar");
  }

  let lastError = "";
  let attempts = 0;
  let status = "failed";
  const isCreate = init.method === "POST";
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    attempts = attempt;
    try {
      const res = await fetch(`${GATEWAY}${path}`, {
        ...init,
        signal: AbortSignal.timeout(TIMEOUT_MS),
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${lovable}`,
          "X-Connection-Api-Key": key,
          ...(init.headers ?? {}),
        },
      });
      if (res.ok) {
        const json = (await res.json()) as { id?: string };
        if (logAs) await logCalendar({ ...logAs, status: "sent", attempts, id: json.id ?? null });
        return json;
      }
      const t = await res.text();
      lastError = `Calendar API ${res.status}: ${t.slice(0, 200)}`;
      if (isCreate && res.status >= 500) { status = "unknown"; break; }
      if (res.status !== 429 && res.status < 500) break;
    } catch (e) {
      lastError = e instanceof Error ? e.message : String(e);
      if (isCreate) { status = "unknown"; break; }
    }
    if (attempt < MAX_ATTEMPTS) await sleep(500 * 2 ** (attempt - 1));
  }
  if (logAs) await logCalendar({ ...logAs, status, attempts, error: lastError.slice(0, 500) });
  throw new Error(lastError || "Calendar API dështoi");
}

function eventBody(summary: string, description: string, start: Date, end: Date, attendees: string[] = []) {
  return {
    summary,
    description,
    start: { dateTime: start.toISOString(), timeZone: "Europe/Tirane" },
    end: { dateTime: end.toISOString(), timeZone: "Europe/Tirane" },
    attendees: attendees.map((email) => ({ email })),
    reminders: { useDefault: true },
  };
}

export const createCalendarEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => schema.parse(data))
  .handler(async ({ data, context }) => {
    await assertStaff(context.supabase, context.userId);
    if (data.attendees?.length) {
      const { assertKnownRecipients } = await import("./recipient-guard.server");
      await assertKnownRecipients(data.attendees);
    }
    const body = eventBody(data.summary, data.description ?? "", new Date(data.startISO), new Date(data.endISO), data.attendees);
    const json = (await gcall(
      `/calendars/${encodeURIComponent(data.calendarId)}/events`,
      { method: "POST", body: JSON.stringify(body) },
      { summary: data.summary },
    )) as { id?: string; htmlLink?: string };
    return { id: json.id ?? null, link: json.htmlLink ?? null };
  });

export const listCalendarEvents = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ calendarId: z.literal("primary").optional(), timeMin: z.string().datetime({ offset: true }).optional(), timeMax: z.string().datetime({ offset: true }).optional() }).parse(data ?? {}))
  .handler(async ({ data, context }) => {
    await assertStaff(context.supabase, context.userId);
    const params = new URLSearchParams({
      singleEvents: "true",
      orderBy: "startTime",
      maxResults: "50",
      ...(data.timeMin ? { timeMin: data.timeMin } : {}),
      ...(data.timeMax ? { timeMax: data.timeMax } : {}),
    });
    const json = (await gcall(
      `/calendars/${encodeURIComponent(data.calendarId ?? "primary")}/events?${params}`,
      { method: "GET" },
    )) as { items?: Array<Record<string, string | number | boolean | null>> };
    return { items: json.items ?? [] };
  });

/**
 * Sinkronizon afatet e detyrave dhe provimet e kurseve të mësuesit me Google Calendar.
 * Krijon ngjarje të reja ose përditëson ato ekzistuese (pa dublikime).
 */
export const syncDeadlinesToCalendar = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
    const { data: isTeacher } = await supabase.rpc("has_role", { _user_id: userId, _role: "teacher" });
    if (!isAdmin && !isTeacher) throw new Error("Vetëm mësuesit mund të sinkronizojnë kalendarin");

    let q = supabase.from("courses").select("id, title").is("deleted_at", null);
    if (!isAdmin) q = q.eq("teacher_id", userId);
    const { data: courses, error: courseError } = await q;
    if (courseError) throw courseError;
    const courseMap = new Map((courses ?? []).map((c) => [c.id, c.title]));
    const courseIds = [...courseMap.keys()];
    if (!courseIds.length) return { created: 0, updated: 0, failed: 0 };

    const { data: topics, error: topicError } = await supabase.from("topics").select("id, title, course_id").in("course_id", courseIds).is("deleted_at", null);
    if (topicError) throw topicError;
    const topicMap = new Map((topics ?? []).map((t) => [t.id, t]));
    const topicIds = [...topicMap.keys()];
    const now = new Date().toISOString();

    const [homeworkResult, examResult] = await Promise.all([
      topicIds.length
        ? supabase.from("homework").select("id, topic_id, instructions, due_date, calendar_event_id").in("topic_id", topicIds).gte("due_date", now)
        : Promise.resolve({ data: [] as { id: string; topic_id: string; instructions: string; due_date: string | null; calendar_event_id: string | null }[] }),
      supabase.from("exams").select("id, course_id, title, scheduled_at, duration_min, room, calendar_event_id").in("course_id", courseIds).gte("scheduled_at", now),
    ]);
    if ("error" in homeworkResult && homeworkResult.error) throw homeworkResult.error;
    if (examResult.error) throw examResult.error;
    const hw = homeworkResult.data;
    const exams = examResult.data;

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let created = 0, updated = 0, failed = 0;

    async function upsert(table: "homework" | "exams", id: string, existing: string | null, body: ReturnType<typeof eventBody>) {
      try {
        // Stable Google event IDs survive a failed mapping write or concurrent sync.
        const eventId = existing ?? `${table === "homework" ? "a" : "b"}${id.replaceAll("-", "")}`;
        const path = `/calendars/primary/events/${encodeURIComponent(eventId)}`;
        const logAs = { summary: body.summary, event: `sync_${table}` };
        if (existing) await gcall(path, { method: "PATCH", body: JSON.stringify(body) }, logAs);
        else {
          try {
            await gcall("/calendars/primary/events", { method: "POST", body: JSON.stringify({ ...body, id: eventId }) }, logAs);
          } catch (error) {
            if (!(error instanceof Error) || !error.message.includes("Calendar API 409:")) throw error;
            await gcall(path, { method: "PATCH", body: JSON.stringify(body) }, logAs);
          }
          const { error } = await supabaseAdmin.from(table).update({ calendar_event_id: eventId }).eq("id", id);
          if (error) throw new Error(`Calendar mapping: ${error.message}`);
        }
        if (existing) updated++;
        else created++;
      } catch (error) {
        await logCalendar({ summary: body.summary, event: `sync_${table}`, status: "failed", attempts: 1, error: error instanceof Error ? error.message : "unknown" });
        failed++;
      }
    }

    for (const h of hw ?? []) {
      if (!h.due_date) continue;
      const topic = topicMap.get(h.topic_id);
      const due = new Date(h.due_date);
      await upsert("homework", h.id, h.calendar_event_id, eventBody(
        `Detyrë: ${topic?.title ?? ""} (${courseMap.get(topic?.course_id ?? "") ?? ""})`,
        h.instructions.slice(0, 1500), new Date(due.getTime() - 30 * 60000), due,
      ));
    }
    for (const e of exams ?? []) {
      const start = new Date(e.scheduled_at);
      await upsert("exams", e.id, e.calendar_event_id, eventBody(
        `Provim: ${e.title} (${courseMap.get(e.course_id) ?? ""})`,
        e.room ? `Salla: ${e.room}` : "", start, new Date(start.getTime() + (e.duration_min ?? 60) * 60000),
      ));
    }
    return { created, updated, failed };
  });
