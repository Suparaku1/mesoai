import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, ArrowRight } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { pageMeta } from "@/lib/seo";
import { useI18n } from "@/i18n";

export const Route = createFileRoute("/_authenticated/crm/pipeline")({
  head: () => ({ meta: pageMeta("Pipeline CRM", "Pamje Kanban e regjistrimeve nga interesi te aprovimi final.") }),
  component: PipelinePage,
});

function PipelinePage() {
  const { t } = useI18n();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ contact_id: "", title: "", drejtimi_interes: "", value_notes: "" });

  const { data: stages = [] } = useQuery({
    queryKey: ["crm-stages"],
    queryFn: async () => {
      const { data } = await supabase.from("crm_pipeline_stages").select("*").order("order_index");
      return data ?? [];
    },
  });

  const { data: leads = [] } = useQuery({
    queryKey: ["crm-leads"],
    queryFn: async () => {
      const { data } = await supabase.from("crm_leads").select("*, crm_contacts(first_name,last_name,email)").order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const { data: contacts = [] } = useQuery({
    queryKey: ["crm-contacts-mini"],
    queryFn: async () => {
      const { data } = await supabase.from("crm_contacts").select("id,first_name,last_name").order("first_name");
      return data ?? [];
    },
  });

  async function createLead() {
    if (!form.contact_id || !form.title.trim() || !stages.length) { toast.error(t("crm2.selectContactAndTitle")); return; }
    const { error } = await supabase.from("crm_leads").insert({
      contact_id: form.contact_id,
      stage_id: stages[0].id,
      title: form.title.trim(),
      drejtimi_interes: form.drejtimi_interes.trim() || null,
      value_notes: form.value_notes.trim() || null,
    });
    if (error) { toast.error(error.message); return; }
    toast.success(t("crm2.leadCreated"));
    setOpen(false);
    setForm({ contact_id: "", title: "", drejtimi_interes: "", value_notes: "" });
    qc.invalidateQueries({ queryKey: ["crm-leads"] });
  }

  async function moveStage(leadId: string, stageId: string) {
    const { error } = await supabase.from("crm_leads").update({ stage_id: stageId }).eq("id", leadId);
    if (error) { toast.error(error.message); return; }
    qc.invalidateQueries({ queryKey: ["crm-leads"] });
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="size-4 mr-1" /> {t("crm2.newLead")}</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{t("crm2.addLead")}</DialogTitle></DialogHeader>
            <div className="grid gap-3 py-2">
              <div>
                <Label>{t("crm2.contact")}</Label>
                <Select value={form.contact_id} onValueChange={(v) => setForm({ ...form, contact_id: v })}>
                  <SelectTrigger><SelectValue placeholder={t("crm2.selectContact")} /></SelectTrigger>
                  <SelectContent>{contacts.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.first_name} {c.last_name ?? ""}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>{t("crm2.title")}</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder={t("crm2.titlePlaceholder")} /></div>
              <div><Label>{t("crm2.interestField")}</Label><Input value={form.drejtimi_interes} onChange={(e) => setForm({ ...form, drejtimi_interes: e.target.value })} /></div>
              <div><Label>{t("crm2.notes")}</Label><Textarea rows={3} value={form.value_notes} onChange={(e) => setForm({ ...form, value_notes: e.target.value })} /></div>
            </div>
            <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>{t("crm2.cancel")}</Button><Button onClick={createLead}>{t("crm2.save")}</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        {stages.map((stage: any) => {
          const stageLeads = leads.filter((l: any) => l.stage_id === stage.id);
          return (
            <div key={stage.id} className="space-y-2">
              <div className="flex items-center gap-2 px-2">
                <span className="size-2 rounded-full" style={{ background: stage.color }} />
                <h3 className="text-sm font-semibold">{stage.name}</h3>
                <span className="ml-auto text-xs text-muted-foreground">{stageLeads.length}</span>
              </div>
              <div className="space-y-2 min-h-[100px]">
                {stageLeads.map((lead: any) => {
                  const idx = stages.findIndex((s: any) => s.id === lead.stage_id);
                  const next = stages[idx + 1];
                  return (
                    <Card key={lead.id} className="p-3 space-y-1 text-sm">
                      <div className="font-medium truncate">{lead.title}</div>
                      <div className="text-xs text-muted-foreground truncate">
                        {lead.crm_contacts?.first_name} {lead.crm_contacts?.last_name ?? ""}
                      </div>
                      {lead.drejtimi_interes && <div className="text-xs">{lead.drejtimi_interes}</div>}
                      {next && (
                        <Button size="sm" variant="ghost" className="w-full h-7 text-xs justify-between mt-1" onClick={() => moveStage(lead.id, next.id)}>
                          → {next.name} <ArrowRight className="size-3" />
                        </Button>
                      )}
                    </Card>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
