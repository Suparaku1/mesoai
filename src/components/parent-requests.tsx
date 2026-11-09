import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useI18n } from "@/i18n";
import { matchesStudentName } from "@/lib/parent-policy";
import { toast } from "sonner";
import { Check, X } from "lucide-react";

export function ParentRequests() {
  const { t } = useI18n();
  const qc = useQueryClient();
  const [selected, setSelected] = useState<Record<string, string>>({});
  const query = useQuery({
    queryKey: ["parent-requests-review"],
    queryFn: async () => {
      const [requests, profiles, roles] = await Promise.all([
        supabase
          .from("parent_access_requests")
          .select("*")
          .eq("status", "pending")
          .order("created_at"),
        supabase.from("profiles").select("id,first_name,last_name,email"),
        supabase.from("user_roles").select("user_id,role"),
      ]);
      if (requests.error) throw requests.error;
      if (profiles.error) throw profiles.error;
      if (roles.error) throw roles.error;
      const students = new Set(
        (roles.data ?? []).filter((r) => r.role === "student").map((r) => r.user_id),
      );
      return { requests: requests.data ?? [], profiles: profiles.data ?? [], students };
    },
  });
  const review = useMutation({
    mutationFn: async ({
      id,
      student,
      approve,
    }: {
      id: string;
      student: string;
      approve: boolean;
    }) => {
      const { error } = await supabase.rpc("review_parent_access", {
        p_request: id,
        p_student: student || "00000000-0000-0000-0000-000000000000",
        p_approve: approve,
      });
      if (error) throw error;
      return approve;
    },
    onSuccess: (approve) => {
      toast.success(t(approve ? "parentAccess.approved" : "parentAccess.rejected"));
      qc.invalidateQueries({ queryKey: ["parent-requests-review"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <section className="space-y-4">
      <h2 className="text-xl font-semibold">{t("parentAccess.requests")}</h2>
      {query.isPending && <p>{t("parentAccess.loading")}</p>}
      {query.isError && <p className="text-destructive">{t("parentAccess.error")}</p>}
      {query.data?.requests.length === 0 && (
        <p className="text-muted-foreground">{t("parentAccess.noRequests")}</p>
      )}
      {query.data?.requests.map((r) => {
        const parent = query.data.profiles.find((p) => p.id === r.parent_id);
        const matches = query.data.profiles.filter(
          (p) =>
            query.data.students.has(p.id) &&
            matchesStudentName(r.student_full_name, p.first_name, p.last_name),
        );
        const student = selected[r.id] ?? (matches.length === 1 ? matches[0]?.id : "") ?? "";
        return (
          <div key={r.id} className="border border-border rounded-md p-4 space-y-3">
            <div className="break-words">
              <strong>
                {parent?.first_name} {parent?.last_name}
              </strong>{" "}
              → {r.student_full_name}
              <p className="text-sm text-muted-foreground">
                {parent?.email} · {new Date(r.created_at).toLocaleString()}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Select
                value={student}
                onValueChange={(value) => setSelected((s) => ({ ...s, [r.id]: value }))}
              >
                <SelectTrigger className="w-full sm:w-80">
                  <SelectValue placeholder={t("parentAccess.selectStudent")} />
                </SelectTrigger>
                <SelectContent>
                  {matches.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.first_name} {p.last_name} · {p.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                disabled={!student || review.isPending}
                onClick={() => review.mutate({ id: r.id, student, approve: true })}
              >
                <Check className="size-4 mr-2" />
                {t("parentAccess.approve")}
              </Button>
              <Button
                variant="outline"
                disabled={review.isPending}
                onClick={() => review.mutate({ id: r.id, student, approve: false })}
              >
                <X className="size-4 mr-2" />
                {t("parentAccess.reject")}
              </Button>
            </div>
          </div>
        );
      })}
    </section>
  );
}
