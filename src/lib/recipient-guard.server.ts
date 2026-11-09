/** Only allow outbound mail/invites to platform users or CRM contacts. */
export async function assertKnownRecipients(emails: string[]) {
  const list = [...new Set(emails.map((e) => e.trim().toLowerCase()))];
  if (!list.length) return;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const [{ data: p, error: e1 }, { data: c, error: e2 }] = await Promise.all([
    supabaseAdmin.from("profiles").select("email").in("email", list),
    supabaseAdmin.from("crm_contacts").select("email").in("email", list).is("deleted_at", null),
  ]);
  if (e1 || e2) throw new Error("Verifikimi i marrësve dështoi.");
  const known = new Set([...(p ?? []), ...(c ?? [])].map((r) => (r.email ?? "").toLowerCase()));
  if (list.some((e) => !known.has(e))) throw new Error("Marrësi duhet të jetë përdorues i platformës ose kontakt CRM.");
}
