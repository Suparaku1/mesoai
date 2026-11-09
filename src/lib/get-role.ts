import { supabase } from "@/integrations/supabase/client";

export type AppRole = "admin" | "teacher" | "student" | "parent";

const PRIORITY: AppRole[] = ["teacher", "admin", "parent", "student"];

export async function getPrimaryRole(userId: string): Promise<AppRole | undefined> {
  const { data, error } = await supabase.from("user_roles").select("role").eq("user_id", userId);
  if (error) throw new Error(error.message);
  const roles = (data ?? []).map((r) => r.role as AppRole);
  return PRIORITY.find((r) => roles.includes(r));
}

export async function getAllRoles(userId: string): Promise<AppRole[]> {
  const { data, error } = await supabase.from("user_roles").select("role").eq("user_id", userId);
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => r.role as AppRole);
}
