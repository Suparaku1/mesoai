import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export async function assertStaff(client: SupabaseClient<Database>, userId: string) {
  const { data, error } = await client.from("user_roles").select("role").eq("user_id", userId);
  if (error) throw new Error(error.message);
  if (!data?.some((r) => r.role === "teacher" || r.role === "admin"))
    throw new Error("Vetëm mësuesit dhe administratori mund ta kryejnë këtë veprim.");
}

export function canRetryDelivery(row: { channel: string; status: string }) {
  return row.channel === "email" && ["failed", "not_configured"].includes(row.status);
}