import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { pageMeta } from "@/lib/seo";
import { useI18n } from "@/i18n";

export const Route = createFileRoute("/_authenticated/admin/parents")({
  head: () => ({ meta: pageMeta("Prindërit", "Lidhjet prind–nxënës dhe menaxhimi i aksesit të prindërve.") }),
  component: Page,
});

function Page() {
  const { t } = useI18n();
  const qc = useQueryClient();
  const [parentId, setParentId] = useState("");
  const [studentId, setStudentId] = useState("");

  const { data: users } = useQuery({
    queryKey: ["all-profiles-roles"],
    queryFn: async () => {
      const { data: profiles } = await supabase.from("profiles").select("id,first_name,last_name,email");
      const { data: roles } = await supabase.from("user_roles").select("user_id,role");
      const roleMap: Record<string, string[]> = {};
      (roles ?? []).forEach((r: any) => { (roleMap[r.user_id] ??= []).push(r.role); });
      return (profiles ?? []).map((p: any) => ({ ...p, roles: roleMap[p.id] ?? [] }));
    },
  });

  const parents = (users ?? []).filter((u: any) => u.roles.includes("parent"));
  const students = (users ?? []).filter((u: any) => u.roles.includes("student"));

  const { data: links } = useQuery({
    queryKey: ["parent-links-all"],
    queryFn: async () => {
      const { data } = await supabase
        .from("parent_links")
        .select("id, parent:profiles!parent_links_parent_id_fkey(first_name,last_name,email), student:profiles!parent_links_student_id_fkey(first_name,last_name,email)");
      return data ?? [];
    },
  });

  const link = useMutation({
    mutationFn: async () => {
      if (!parentId || !studentId) throw new Error(t("adm.parents.selectBoth"));
      const { error } = await supabase.from("parent_links").insert({ parent_id: parentId, student_id: studentId });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["parent-links-all"] }); toast.success(t("adm.parents.linked")); },
    onError: (e: any) => toast.error(e.message),
  });

  const unlink = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("parent_links").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["parent-links-all"] }),
  });

  return (
    <div className="container mx-auto p-4 sm:p-6 space-y-4">
      <h1 className="text-2xl font-semibold">{t("adm.parents.title")}</h1>

      <Card>
        <CardHeader><CardTitle>{t("adm.parents.create")}</CardTitle></CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Select value={parentId} onValueChange={setParentId}>
            <SelectTrigger className="w-64"><SelectValue placeholder={t("adm.parents.parent")} /></SelectTrigger>
            <SelectContent>{parents.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.first_name} {p.last_name} · {p.email}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={studentId} onValueChange={setStudentId}>
            <SelectTrigger className="w-64"><SelectValue placeholder={t("adm.parents.student")} /></SelectTrigger>
            <SelectContent>{students.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.first_name} {p.last_name} · {p.email}</SelectItem>)}</SelectContent>
          </Select>
          <Button onClick={() => link.mutate()} disabled={link.isPending}>{t("adm.parents.link")}</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>{t("adm.parents.existing")}</CardTitle></CardHeader>
        <CardContent className="space-y-1">
          {(links ?? []).map((l: any) => (
            <div key={l.id} className="flex items-center justify-between text-sm border-b border-border/40 py-1">
              <span>{l.parent?.first_name} {l.parent?.last_name} → {l.student?.first_name} {l.student?.last_name}</span>
              <Button size="icon" variant="ghost" onClick={() => unlink.mutate(l.id)}><Trash2 className="size-4"/></Button>
            </div>
          ))}
          {!(links ?? []).length && <p className="text-sm text-muted-foreground">{t("adm.parents.none")}</p>}
        </CardContent>
      </Card>
    </div>
  );
}
