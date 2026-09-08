import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const GATEWAY = "https://connector-gateway.lovable.dev/google_calendar/calendar/v3";

const schema = z.object({
  summary: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  startISO: z.string(),
  endISO: z.string(),
  attendees: z.array(z.string().email()).optional(),
  calendarId: z.string().default("primary"),
});

const MAX_ATTEMPTS = 3;
const TIMEOUT_MS = 15000;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function gcall(path: string, init: RequestInit) {
  const lovable = process.env.LOVABLE_API_KEY;
  const key = process.env.GOOGLE_CALENDAR_API_KEY;
  if (!lovable || !key) throw new Error("Google Calendar connector nuk është konfiguruar");

  let lastError = "";
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
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
      if (res.ok) return await res.json();
      const t = await res.text();
      lastError = `Calendar API ${res.status}: ${t.slice(0, 200)}`;
      if (res.status !== 429 && res.status < 500) break;
    } catch (e) {
      lastError = e instanceof Error ? e.message : String(e);
    }
    if (attempt < MAX_ATTEMPTS) await sleep(500 * 2 ** (attempt - 1));
  }
  throw new Error(lastError || "Calendar API dështoi");
}

export const createCalendarEvent = createServerFn({ method: "POST" })
  .inputValidator((data) => schema.parse(data))
  .handler(async ({ data }) => {
    const body = {
      summary: data.summary,
      description: data.description ?? "",
      start: { dateTime: data.startISO, timeZone: "Europe/Tirane" },
      end: { dateTime: data.endISO, timeZone: "Europe/Tirane" },
      attendees: (data.attendees ?? []).map((email) => ({ email })),
      reminders: { useDefault: true },
    };
    const json = (await gcall(`/calendars/${encodeURIComponent(data.calendarId)}/events`, {
      method: "POST",
      body: JSON.stringify(body),
    })) as { id?: string; htmlLink?: string };
    return { id: json.id ?? null, link: json.htmlLink ?? null };
  });

export const listCalendarEvents = createServerFn({ method: "GET" })
  .inputValidator((data: { calendarId?: string; timeMin?: string; timeMax?: string }) => data ?? {})
  .handler(async ({ data }) => {
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
    )) as { items?: any[] };
    return { items: json.items ?? [] };
  });
