import { useProfile } from "@/hooks/use-profile";
import type { AppRole } from "@/lib/get-role";

/** Rol i vetëm, i derivuar nga `useProfile` (një query e vetme e ndarë). */
export function useRole(userId: string | undefined) {
  const q = useProfile(userId);
  return { ...q, data: q.data?.role as AppRole | undefined };
}
