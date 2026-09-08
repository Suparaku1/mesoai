import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Zap, Plus, Trash2, X, Save, CheckCircle2, XCircle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { pageMeta } from "@/lib/seo";
import { useI18n } from "@/i18n";

export const Route = createFileRoute("/_authenticated/admin/automations")({
  head: () => ({ meta: pageMeta("Automatizimet", "Rregulla automatike për njoftime, email dhe veprime në platformë.") }),
  component: AutomationsPage,
});

type Rule = {
  id: string;
  name: string;
  trigger_event: string;
  action_type: string;
  action_config: Record<string, unknown>;
  is_active: boolean;
};
type Run = { id: string; rule_id: string | null; status: string; message: string | null; created_at: string };

function useTriggers(t: (k: any) => string) {
  return [
    { v: "homework_graded", l: t("aut.trig.homeworkGraded") },
    { v: "enrollment_approved", l: t("aut.trig.enrollmentApproved") },
    { v: "low_stock", l: t("aut.trig.lowStock") },
    { v: "announcement_created", l: t("aut.trig.announcementCreated") },
    { v: "purchase_order_received", l: t("aut.trig.purchaseOrderReceived") },
  ];
}
function useActions(t: (k: any) => string) {
  return [
    { v: "create_notification", l: t("aut.act.createNotification") },
    { v: "send_email", l: t("aut.act.sendEmail") },
  ];
}

function AutomationsPage() {
  const { t } = useI18n();
  const qc = useQueryClient();
  const [draft, setDraft] = useState<Partial<Rule> | null>(null);
  const [configText, setConfigText] = useState("{}");
  const TRIGGERS = useTriggers(t);
  const ACTIONS = useActions(t);

  const { data: rules } = useQuery({
    queryKey: ["automation_rules"],
    queryFn: async () => (await supabase.from("automation_rules").select("*").order("created_at", { ascending: false })).data as Rule[] ?? [],
  });
  const { data: runs } = useQuery({
    queryKey: ["automation_runs"],
    queryFn: async () => (await supabase.from("automation_runs").select("*").order("created_at", { ascending: false }).limit(30)).data as Run[] ?? [],
  });

  function edit(r: Partial<Rule> | null) {
    setDraft(r);
    setConfigText(r?.action_config ? JSON.stringify(r.action_config, null, 2) : "{}");
  }

  async function save() {
    if (!draft?.name?.trim() || !draft.trigger_event || !draft.action_type) return toast.error(t("aut.fillFields"));
    let cfg: Record<string, unknown> = {};
    try { cfg = JSON.parse(configText); } catch { return toast.error(t("aut.invalidJson")); }
    const payload = {
      name: draft.name.trim(),
      trigger_event: draft.trigger_event,
      action_type: draft.action_type,
      action_config: cfg as never,
      is_active: draft.is_active ?? true,
    };
    const { error } = draft.id
      ? await supabase.from("automation_rules").update(payload).eq("id", draft.id)
      : await supabase.from("automation_rules").insert(payload);
    if (error) return toast.error(error.message);
    toast.success(t("aut.saved"));
    setDraft(null);
    qc.invalidateQueries({ queryKey: ["automation_rules"] });
  }

  async function toggle(r: Rule) {
    await supabase.from("automation_rules").update({ is_active: !r.is_active }).eq("id", r.id);
    qc.invalidateQueries({ queryKey: ["automation_rules"] });
  }

  async function del(id: string) {
    if (!confirm(t("aut.confirmDelete"))) return;
    await supabase.from("automation_rules").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["automation_rules"] });
  }

  const configPlaceholder =
    draft?.action_type === "send_email"
      ? `{"to":"user@example.com","subject":"...","html":"<p>...</p>"}`
      : `{"title":"...","message":"...","user_id":"<uuid>","link":"/dashboard"}`;

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Zap className="size-6" /> {t("aut.title")}</h1>
          <p className="text-sm text-muted-foreground">{t("aut.subtitle")}</p>
        </div>
        <Button onClick={() => edit({ name: "", trigger_event: TRIGGERS[0].v, action_type: ACTIONS[0].v, is_active: true })}>
          <Plus className="size-4 mr-1" /> {t("aut.new")}
        </Button>
      </div>

      {draft && (
        <div className="card-soft p-5 space-y-3">
          <div className="flex justify-between items-center">
            <h3 className="font-semibold">{draft.id ? t("aut.update") : t("aut.new")}</h3>
            <Button size="icon" variant="ghost" onClick={() => setDraft(null)}><X className="size-4" /></Button>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <Input placeholder={t("aut.name")} value={draft.name ?? ""} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
            <div className="flex items-center gap-2"><Switch checked={draft.is_active ?? true} onCheckedChange={(v) => setDraft({ ...draft, is_active: v })} /><span className="text-sm">{t("aut.active")}</span></div>
            <Select value={draft.trigger_event} onValueChange={(v) => setDraft({ ...draft, trigger_event: v })}>
              <SelectTrigger><SelectValue placeholder={t("aut.trigger")} /></SelectTrigger>
              <SelectContent>{TRIGGERS.map((t) => <SelectItem key={t.v} value={t.v}>{t.l}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={draft.action_type} onValueChange={(v) => setDraft({ ...draft, action_type: v })}>
              <SelectTrigger><SelectValue placeholder={t("aut.action")} /></SelectTrigger>
              <SelectContent>{ACTIONS.map((a) => <SelectItem key={a.v} value={a.v}>{a.l}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">{t("aut.config")}</label>
            <Textarea rows={5} value={configText} onChange={(e) => setConfigText(e.target.value)} placeholder={configPlaceholder} className="font-mono text-xs" />
          </div>
          <Button onClick={save}><Save className="size-4 mr-1" /> {t("aut.save")}</Button>
        </div>
      )}

      <div className="card-soft overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-left">
            <tr><th className="p-3">{t("aut.col.name")}</th><th className="p-3">{t("aut.col.trigger")}</th><th className="p-3">{t("aut.col.action")}</th><th className="p-3">{t("aut.col.active")}</th><th className="p-3" /></tr>
          </thead>
          <tbody className="divide-y divide-border">
            {(rules ?? []).map((r) => (
              <tr key={r.id}>
                <td className="p-3 font-medium">{r.name}</td>
                <td className="p-3 text-xs">{TRIGGERS.find((t) => t.v === r.trigger_event)?.l ?? r.trigger_event}</td>
                <td className="p-3 text-xs">{ACTIONS.find((a) => a.v === r.action_type)?.l ?? r.action_type}</td>
                <td className="p-3"><Switch checked={r.is_active} onCheckedChange={() => toggle(r)} /></td>
                <td className="p-3">
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost" onClick={() => edit(r)}>{t("aut.edit")}</Button>
                    <Button size="icon" variant="ghost" onClick={() => del(r.id)}><Trash2 className="size-3 text-destructive" /></Button>
                  </div>
                </td>
              </tr>
            ))}
            {!rules?.length && <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">{t("aut.none")}</td></tr>}
          </tbody>
        </table>
      </div>

      <div>
        <h2 className="font-semibold mb-2">{t("aut.recentRuns")}</h2>
        <div className="card-soft divide-y divide-border">
          {(runs ?? []).map((r) => (
            <div key={r.id} className="p-3 flex items-center gap-3 text-sm">
              {r.status === "success" ? <CheckCircle2 className="size-4 text-emerald-500" /> : <XCircle className="size-4 text-destructive" />}
              <div className="flex-1">
                <div>{r.message ?? r.status}</div>
                <div className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString()}</div>
              </div>
            </div>
          ))}
          {!runs?.length && <div className="p-6 text-center text-muted-foreground">{t("aut.noRuns")}</div>}
        </div>
      </div>
    </div>
  );
}
