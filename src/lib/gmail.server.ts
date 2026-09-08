const GATEWAY = "https://connector-gateway.lovable.dev/google_mail/gmail/v1";

function b64url(str: string) {
  return btoa(unescape(encodeURIComponent(str)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function buildRaw(to: string, subject: string, html: string) {
  const lines = [
    `To: ${to}`,
    `Subject: =?UTF-8?B?${btoa(unescape(encodeURIComponent(subject)))}?=`,
    "MIME-Version: 1.0",
    'Content-Type: text/html; charset="UTF-8"',
    "",
    html,
  ];
  return b64url(lines.join("\r\n"));
}

const MAX_ATTEMPTS = 3;
const TIMEOUT_MS = 15000;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function logDelivery(row: {
  recipient: string;
  subject: string;
  event?: string | null;
  status: string;
  attempts: number;
  error?: string | null;
  provider_id?: string | null;
  body?: string | null;
}) {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("email_log").insert({
      recipient: row.recipient,
      subject: row.subject,
      event: row.event ?? null,
      channel: "email",
      status: row.status,
      attempts: row.attempts,
      error: row.error ?? null,
      provider_id: row.provider_id ?? null,
      body: row.body ?? null,
    });
  } catch {
    /* logging is best-effort */
  }
}

/**
 * Server-only Gmail send through the connector gateway.
 * Retries transient failures (429 / 5xx / network) with backoff, times out
 * each attempt, and records every outcome in `email_log`.
 */
export async function sendMail(to: string, subject: string, html: string, event?: string) {
  const lovable = process.env["LOVABLE_API_KEY"];
  const gmailKey = process.env["GOOGLE_MAIL_API_KEY"];
  if (!lovable || !gmailKey) {
    await logDelivery({
      recipient: to,
      subject,
      event: event ?? null,
      status: "not_configured",
      attempts: 0,
      body: html,
      error: "Gmail connector nuk është konfiguruar",
    });
    throw new Error("Gmail connector nuk është konfiguruar");
  }

  const raw = buildRaw(to, subject, html);
  let lastError = "";

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const res = await fetch(`${GATEWAY}/users/me/messages/send`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${lovable}`,
          "X-Connection-Api-Key": gmailKey,
        },
        body: JSON.stringify({ raw }),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });

      if (res.ok) {
        const json = (await res.json()) as { id?: string };
        await logDelivery({
          recipient: to,
          subject,
          event: event ?? null,
          status: "sent",
          attempts: attempt,
          provider_id: json.id ?? null,
        });
        return { id: json.id ?? null };
      }

      const text = await res.text();
      lastError = `Gmail dërgim dështoi (${res.status}): ${text.slice(0, 200)}`;
      const retryable = res.status === 429 || res.status >= 500;
      if (!retryable) break;
    } catch (e) {
      lastError = e instanceof Error ? e.message : String(e);
    }
    if (attempt < MAX_ATTEMPTS) await sleep(500 * 2 ** (attempt - 1));
  }

  await logDelivery({
    recipient: to,
    subject,
    event: event ?? null,
    status: "failed",
    attempts: MAX_ATTEMPTS,
    body: html,
    error: lastError.slice(0, 500),
  });
  throw new Error(lastError || "Gmail dërgim dështoi");
}


/** Shared branded HTML wrapper for all platform emails. */
export function mailTemplate(opts: {
  heading: string;
  greeting?: string;
  body: string;
  highlight?: string;
  note?: string;
}) {
  return `
  <div style="font-family:system-ui,-apple-system,Segoe UI,sans-serif;background:#f1f5f9;padding:24px">
    <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:14px;overflow:hidden;border:1px solid #e2e8f0">
      <div style="background:#1e3a5f;color:#fff;padding:18px 24px">
        <div style="font-size:16px;font-weight:700">Shkolla Profesionale Elbasan</div>
        <div style="font-size:12px;opacity:.8">Uendi Platform</div>
      </div>
      <div style="padding:24px;color:#0f172a">
        <h2 style="margin:0 0 12px;font-size:19px;color:#1e3a5f">${opts.heading}</h2>
        ${opts.greeting ? `<p style="margin:0 0 10px">Përshëndetje ${opts.greeting},</p>` : ""}
        <div style="font-size:14px;line-height:1.6;color:#334155">${opts.body}</div>
        ${
          opts.highlight
            ? `<div style="font-size:32px;font-weight:800;color:#0f766e;text-align:center;padding:14px;background:#ecfdf5;border-radius:12px;margin:18px 0">${opts.highlight}</div>`
            : ""
        }
        ${opts.note ? `<p style="font-size:13px;color:#475569">${opts.note}</p>` : ""}
      </div>
      <div style="padding:14px 24px;background:#f8fafc;color:#94a3b8;font-size:11px;text-align:center">
        Ky website është krijuar nga Esmerald Suparaku · Uendi Platform
      </div>
    </div>
  </div>`;
}

export function escapeHtml(s: string) {
  return s.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c] ?? c);
}
