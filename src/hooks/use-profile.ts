import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { AppRole } from "@/lib/get-role";

const PRIORITY: AppRole[] = ["teacher", "admin", "parent", "student"];

export type UserProfile = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  [key: string]: unknown;
};

export type ProfileData = {
  profile: UserProfile | null;
  roles: AppRole[];
  /** Roli kryesor sipas prioritetit (teacher > admin > parent > student). */
  role: AppRole | undefined;
  isAdmin: boolean;
  isTeacher: boolean;
};

/**
 * Burimi i vetëm i së vërtetës për profilin dhe rolet e përdoruesit.
 * Zëvendëson query-t e dublikuara nëpër route-t.
 */
export function useProfile(userId: string | undefined) {
  return useQuery<ProfileData>({
    queryKey: ["profile", userId],
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const [{ data: p }, { data: r }] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", userId!).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", userId!),
      ]);
      const roles = (r ?? []).map((x) => x.role as AppRole);
      const role = PRIORITY.find((x) => roles.includes(x));
      return {
        profile: (p as UserProfile) ?? null,
        roles,
        role,
        isAdmin: roles.includes("admin"),
        isTeacher: roles.includes("teacher") || roles.includes("admin"),
      };
    },
  });
}
