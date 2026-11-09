import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listAllUsers, setUserRole } from "@/lib/admin.functions";
import { Button } from "@/components/ui/button";
import { Shield, GraduationCap, BookOpen, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { pageMeta } from "@/lib/seo";
import { useI18n } from "@/i18n";

export const Route = createFileRoute("/_authenticated/admin/users")({
  head: () => ({ meta: pageMeta("Përdoruesit", "Menaxhimi i llogarive, roleve dhe të drejtave të përdoruesve.") }),
  component: AdminUsersPage,
});

const ROLES: { value: "teacher" | "student" | "admin"; label: string; icon: typeof Shield }[] = [
];

function useRoles(t: (k: any) => string) {
  return [
    { value: "admin" as const, label: t("adm.role.admin"), icon: Shield },
    { value: "teacher" as const, label: t("adm.role.teacher"), icon: BookOpen },
    { value: "student" as const, label: t("adm.role.student"), icon: GraduationCap },
  ];
}

function AdminUsersPage() {
  const { t } = useI18n();
  const ROLES = useRoles(t);
  const list = useServerFn(listAllUsers);
  const change = useServerFn(setUserRole);
  const qc = useQueryClient();
  const [q, setQ] = useState("");

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-users"],
    queryFn: () => list(),
  });

  const mutation = useMutation({
    mutationFn: (vars: { userId: string; role: "teacher" | "student" | "admin"; grant: boolean }) =>
      change({ data: vars }),
    onSuccess: () => {
      toast.success(t("adm.users.roleUpdated"));
      qc.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (e: Error) => toast.error(e?.message ?? t("adm.users.error")),
  });

  if (error) {
    return <div className="card-soft p-8 text-center text-destructive">{(error as Error).message}</div>;
  }

  const filtered = (data ?? []).filter((u) =>
    !q ||
    `${u.first_name} ${u.last_name} ${u.email}`.toLowerCase().includes(q.toLowerCase()),
  );

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Shield className="size-6" /> {t("adm.users.title")}</h1>
          <p className="text-sm text-muted-foreground">{t("adm.users.subtitle")}</p>
        </div>
        <Input className="max-w-xs" placeholder={t("adm.users.search")} value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      {isLoading ? (
        <div className="text-muted-foreground"><Loader2 className="size-4 inline animate-spin mr-1" /> {t("adm.users.loading")}</div>
      ) : (
        <div className="card-soft overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left">
              <tr>
                <th className="p-3 font-medium">{t("adm.users.col.user")}</th>
                <th className="p-3 font-medium">{t("adm.users.col.school")}</th>
                <th className="p-3 font-medium">{t("adm.users.col.roles")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((u) => (
                <tr key={u.id}>
                  <td className="p-3">
                    <div className="font-medium">{u.first_name} {u.last_name}</div>
                    <div className="text-xs text-muted-foreground">{u.email}</div>
                  </td>
                  <td className="p-3 text-xs">
                    {u.drejtimi && <div>{u.drejtimi}</div>}
                    {u.klasa && <div className="text-muted-foreground">{t("adm.users.class")} {u.klasa}{u.paralelja ?? ""}</div>}
                  </td>
                  <td className="p-3">
                    <div className="flex flex-wrap gap-2">
                      {ROLES.map((r) => {
                        const has = u.roles.includes(r.value);
                        return (
                          <Button
                            key={r.value}
                            size="sm"
                            variant={has ? "default" : "outline"}
                            onClick={() => mutation.mutate({ userId: u.id, role: r.value, grant: !has })}
                            disabled={mutation.isPending}
                            className="h-7 text-xs"
                          >
                            <r.icon className="size-3 mr-1" />
                            {r.label}
                          </Button>
                        );
                      })}
                    </div>
                  </td>
                </tr>
              ))}
              {!filtered.length && (
                <tr><td colSpan={3} className="p-6 text-center text-muted-foreground text-sm">{t("adm.users.none")}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
