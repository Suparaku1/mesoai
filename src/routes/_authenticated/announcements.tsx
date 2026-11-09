import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { toast } from "sonner";
import { Megaphone, Trash2 } from "lucide-react";
import { pageMeta } from "@/lib/seo";
import { useI18n } from "@/i18n";

export const Route = createFileRoute("/_authenticated/announcements")({
  head: () => ({ meta: pageMeta("Njoftimet", "Njoftimet zyrtare të shkollës për nxënës, mësues dhe prindër.") }),
  component: Page,
});

function useAudience() {
  const { t } = useI18n();
  return [
    { v: "all", label: t("ann.audience.all") },
    { v: "students", label: t("ann.audience.students") },
    { v: "teachers", label: t("ann.audience.teachers") },
    { v: "parents", label: t("ann.audience.parents") },
  ];
}

function Page() {
  const { user } = Route.useRouteContext();
  const { t } = useI18n();
  const AUDIENCE = useAudience();
  const qc = useQueryClient();
  const [form, setForm] = useState({ title: "", body: "", audience: "all" });

  const { data: roleInfo } = useQuery({
    queryKey: ["role-ann", user.id],
    queryFn: async () => {
      const { data } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
      const roles = (data ?? []).map((r) => r.role);
      return { canPost: roles.includes("teacher") || roles.includes("admin") };
    },
  });

  const { data: items } = useQuery({
    queryKey: ["ann"],
    queryFn: async () => {
      const { data } = await supabase.from("announcements").select("*, profiles:author_id(first_name,last_name)").order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const add = useMutation({
    mutationFn: async () => {
      if (!form.title || !form.body) throw new Error(t("ann.errFill"));
      const { error } = await supabase.from("announcements").insert({ ...form, author_id: user.id });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["ann"] }); setForm({ title: "", body: "", audience: "all" }); toast.success(t("ann.published")); },
    onError: (e: Error) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("announcements").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ann"] }),
  });

  return (
    <div className="container mx-auto p-4 sm:p-6 space-y-4">
      <h1 className="text-2xl font-semibold flex items-center gap-2"><Megaphone className="size-6"/> {t("ann.title")}</h1>

      {roleInfo?.canPost && (
        <Card>
          <CardHeader><CardTitle>{t("ann.publish")}</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <Input placeholder={t("ann.titlePlaceholder")} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            <Textarea placeholder={t("ann.bodyPlaceholder")} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} />
            <div className="flex gap-2">
              <Select value={form.audience} onValueChange={(v) => setForm({ ...form, audience: v })}>
                <SelectTrigger className="w-52"><SelectValue /></SelectTrigger>
                <SelectContent>{AUDIENCE.map((a) => <SelectItem key={a.v} value={a.v}>{a.label}</SelectItem>)}</SelectContent>
              </Select>
              <Button onClick={() => add.mutate()} disabled={add.isPending}>{t("ann.publishBtn")}</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {(items ?? []).map((it) => (
          <Card key={it.id}>
            <CardContent className="p-4 space-y-1">
              <div className="flex items-center justify-between">
                <div className="font-semibold">{it.title}</div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{AUDIENCE.find((a) => a.v === it.audience)?.label}</Badge>
                  {it.author_id === user.id && <Button size="icon" variant="ghost" onClick={() => del.mutate(it.id)}><Trash2 className="size-4"/></Button>}
                </div>
              </div>
              <p className="text-sm whitespace-pre-wrap">{it.body}</p>
              <div className="text-xs text-muted-foreground">{it.profiles?.first_name} {it.profiles?.last_name} · {new Date(it.created_at).toLocaleString("sq-AL")}</div>
            </CardContent>
          </Card>
        ))}
        {!(items ?? []).length && <p className="text-sm text-muted-foreground">{t("ann.empty")}</p>}
      </div>
    </div>
  );
}
