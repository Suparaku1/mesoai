import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import { toast } from "sonner";
import { ExternalLink, Trash2, BookMarked } from "lucide-react";
import { pageMeta } from "@/lib/seo";
import { useI18n } from "@/i18n";

export const Route = createFileRoute("/_authenticated/library")({
  head: () => ({ meta: pageMeta("Biblioteka", "Materiale mësimore, libra dhe burime digjitale për Elektroteknikë dhe TIK.") }),
  component: Page,
});

function Page() {
  const { t } = useI18n();
  const { user } = Route.useRouteContext();
  const qc = useQueryClient();
  const [form, setForm] = useState({ title: "", description: "", category: "", external_url: "" });

  const { data: roleInfo } = useQuery({
    queryKey: ["role-lib", user.id],
    queryFn: async () => {
      const { data } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
      const roles = (data ?? []).map((r) => r.role);
      return { canAdd: roles.includes("teacher") || roles.includes("admin") };
    },
  });

  const { data: items } = useQuery({
    queryKey: ["library"],
    queryFn: async () => {
      const { data } = await supabase.from("library_resources").select("*").order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const add = useMutation({
    mutationFn: async () => {
      if (!form.title) throw new Error(t("lib.titleRequired"));
      const { error } = await supabase.from("library_resources").insert({ ...form, uploaded_by: user.id });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["library"] }); setForm({ title: "", description: "", category: "", external_url: "" }); toast.success(t("lib.added")); },
    onError: (e: Error) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("library_resources").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["library"] }),
  });

  return (
    <div className="container mx-auto p-4 sm:p-6 space-y-4">
      <h1 className="text-2xl font-semibold flex items-center gap-2"><BookMarked className="size-6"/> {t("lib.title")}</h1>

      {roleInfo?.canAdd && (
        <Card>
          <CardHeader><CardTitle>{t("lib.addTitle")}</CardTitle></CardHeader>
          <CardContent className="grid sm:grid-cols-2 gap-2">
            <Input placeholder={t("lib.titlePlaceholder")} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            <Input placeholder={t("lib.categoryPlaceholder")} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
            <Input className="sm:col-span-2" placeholder={t("lib.urlPlaceholder")} value={form.external_url} onChange={(e) => setForm({ ...form, external_url: e.target.value })} />
            <Textarea className="sm:col-span-2" placeholder={t("lib.descPlaceholder")} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            <Button className="sm:col-span-2" onClick={() => add.mutate()} disabled={add.isPending}>{t("lib.add")}</Button>
          </CardContent>
        </Card>
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {(items ?? []).map((it) => (
          <Card key={it.id}>
            <CardContent className="p-4 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-medium">{it.title}</div>
                  {it.category && <div className="text-xs text-muted-foreground">{it.category}</div>}
                </div>
                {(roleInfo?.canAdd && it.uploaded_by === user.id) && <Button size="icon" variant="ghost" onClick={() => del.mutate(it.id)}><Trash2 className="size-4"/></Button>}
              </div>
              {it.description && <p className="text-sm text-muted-foreground">{it.description}</p>}
              {it.external_url && <a href={it.external_url} target="_blank" rel="noreferrer" className="text-sm text-primary inline-flex items-center gap-1"><ExternalLink className="size-3"/> {t("lib.openResource")}</a>}
            </CardContent>
          </Card>
        ))}
        {!(items ?? []).length && <p className="text-sm text-muted-foreground">{t("lib.empty")}</p>}
      </div>
    </div>
  );
}
