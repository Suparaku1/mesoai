import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { pageMeta } from "@/lib/seo";
import { useI18n } from "@/i18n";

export const Route = createFileRoute("/_authenticated/crm/tickets")({
  head: () => ({ meta: pageMeta("Tiketat CRM", "Kërkesat e mbështetjes nga nxënësit, prindërit dhe stafi.") }),
  component: TicketsPage,
});

function useStatus(t: (k: any) => string) {
  return [
    { v: "open", l: t("crm2.status.open"), c: "bg-blue-500/10 text-blue-600" },
    { v: "in_progress", l: t("crm2.status.inProgress"), c: "bg-amber-500/10 text-amber-600" },
    { v: "resolved", l: t("crm2.status.resolved"), c: "bg-emerald-500/10 text-emerald-600" },
    { v: "closed", l: t("crm2.status.closed"), c: "bg-slate-500/10 text-slate-600" },
  ];
}
function usePriority(t: (k: any) => string) {
  return [
    { v: "low", l: t("crm2.priority.low") },
    { v: "medium", l: t("crm2.priority.medium") },
    { v: "high", l: t("crm2.priority.high") },
    { v: "urgent", l: t("crm2.priority.urgent") },
  ];
}

function TicketsPage() {
  const { t } = useI18n();
  const STATUS = useStatus(t);
  const PRIORITY = usePriority(t);
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ contact_id: "", subject: "", description: "", priority: "medium" });

  const { data: tickets = [] } = useQuery({
    queryKey: ["crm-tickets"],
    queryFn: async () => {
      const { data } = await supabase.from("crm_tickets").select("*, crm_contacts(first_name,last_name)").order("created_at", { ascending: false });
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

  async function create() {
    if (!form.subject.trim()) { toast.error(t("crm2.subjectRequired")); return; }
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase.from("crm_tickets").insert({
      contact_id: form.contact_id || null,
      subject: form.subject.trim(),
      description: form.description.trim() || null,
      priority: form.priority as any,
      opened_by: u.user?.id ?? null,
    });
    if (error) { toast.error(error.message); return; }
    toast.success(t("crm2.ticketCreated"));
    setOpen(false);
    setForm({ contact_id: "", subject: "", description: "", priority: "medium" });
    qc.invalidateQueries({ queryKey: ["crm-tickets"] });
  }

  async function updateStatus(id: string, status: string) {
    const { error } = await supabase.from("crm_tickets").update({ status: status as any }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    qc.invalidateQueries({ queryKey: ["crm-tickets"] });
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="size-4 mr-1" /> {t("crm2.newTicket")}</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{t("crm2.createTicket")}</DialogTitle></DialogHeader>
            <div className="grid gap-3 py-2">
              <div>
                <Label>{t("crm2.contactOptional")}</Label>
                <Select value={form.contact_id} onValueChange={(v) => setForm({ ...form, contact_id: v })}>
                  <SelectTrigger><SelectValue placeholder={t("crm2.selectContact")} /></SelectTrigger>
                  <SelectContent>{contacts.map((c) => <SelectItem key={c.id} value={c.id}>{c.first_name} {c.last_name ?? ""}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>{t("crm2.subject")}</Label><Input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} /></div>
              <div><Label>{t("crm2.description")}</Label><Textarea rows={4} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
              <div>
                <Label>{t("crm2.priority")}</Label>
                <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{PRIORITY.map((p) => <SelectItem key={p.v} value={p.v}>{p.l}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>{t("crm2.cancel")}</Button><Button onClick={create}>{t("crm2.save")}</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {tickets.length === 0 ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">{t("crm2.noTickets")}</Card>
      ) : (
        <div className="space-y-2">
          {tickets.map((t) => {
            const st = STATUS.find((s) => s.v === t.status);
            return (
              <Card key={t.id} className="p-4 space-y-2">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-medium">{t.subject}</div>
                    <div className="text-xs text-muted-foreground">
                      {t.crm_contacts ? `${t.crm_contacts.first_name} ${t.crm_contacts.last_name ?? ""} · ` : ""}
                      {new Date(t.created_at).toLocaleDateString("sq-AL")}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={st?.c}>{st?.l}</Badge>
                    <Badge variant="outline" className="text-xs">{PRIORITY.find((p) => p.v === t.priority)?.l}</Badge>
                  </div>
                </div>
                {t.description && <p className="text-sm text-muted-foreground">{t.description}</p>}
                <div className="flex gap-2 pt-2 border-t border-border">
                  <Select value={t.status} onValueChange={(v) => updateStatus(t.id, v)}>
                    <SelectTrigger className="h-8 w-40 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>{STATUS.map((s) => <SelectItem key={s.v} value={s.v}>{s.l}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
