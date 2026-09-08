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
import { Plus, Mail, Phone, Users, MessageSquare, StickyNote } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { pageMeta } from "@/lib/seo";
import { useI18n } from "@/i18n";

export const Route = createFileRoute("/_authenticated/crm/communications")({
  head: () => ({ meta: pageMeta("Komunikimet CRM", "Historiku i komunikimeve me email dhe mesazhe për çdo kontakt.") }),
  component: CommunicationsPage,
});

function useTypeMeta(t: (k: any) => string): Record<string, { l: string; icon: any }> {
  return {
    email: { l: t("crm2.comm.email"), icon: Mail },
    phone: { l: t("crm2.comm.phone"), icon: Phone },
    meeting: { l: t("crm2.comm.meeting"), icon: Users },
    sms: { l: t("crm2.comm.sms"), icon: MessageSquare },
    note: { l: t("crm2.comm.note"), icon: StickyNote },
  };
}

function CommunicationsPage() {
  const { t } = useI18n();
  const TYPE_META = useTypeMeta(t);
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ contact_id: "", type: "email", subject: "", body: "" });

  const { data: items = [] } = useQuery({
    queryKey: ["crm-comms"],
    queryFn: async () => {
      const { data } = await supabase.from("crm_communications").select("*, crm_contacts(first_name,last_name)").order("occurred_at", { ascending: false }).limit(100);
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

  async function log() {
    if (!form.contact_id) { toast.error(t("crm2.selectContactRequired")); return; }
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase.from("crm_communications").insert({
      contact_id: form.contact_id,
      type: form.type as any,
      subject: form.subject.trim() || null,
      body: form.body.trim() || null,
      created_by: u.user?.id ?? null,
    });
    if (error) { toast.error(error.message); return; }
    toast.success(t("crm2.logged"));
    setOpen(false);
    setForm({ contact_id: "", type: "email", subject: "", body: "" });
    qc.invalidateQueries({ queryKey: ["crm-comms"] });
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="size-4 mr-1" /> {t("crm2.logComm")}</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{t("crm2.newComm")}</DialogTitle></DialogHeader>
            <div className="grid gap-3 py-2">
              <div>
                <Label>{t("crm2.contact")}</Label>
                <Select value={form.contact_id} onValueChange={(v) => setForm({ ...form, contact_id: v })}>
                  <SelectTrigger><SelectValue placeholder={t("crm2.selectContact")} /></SelectTrigger>
                  <SelectContent>{contacts.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.first_name} {c.last_name ?? ""}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>{t("crm2.commType")}</Label>
                <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.entries(TYPE_META).map(([k, m]) => <SelectItem key={k} value={k}>{m.l}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>{t("crm2.commSubject")}</Label><Input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} /></div>
              <div><Label>{t("crm2.commBody")}</Label><Textarea rows={4} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} /></div>
            </div>
            <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>{t("crm2.cancel")}</Button><Button onClick={log}>{t("crm2.save")}</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {items.length === 0 ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">{t("crm2.noComms")}</Card>
      ) : (
        <div className="space-y-2">
          {items.map((it: any) => {
            const meta = TYPE_META[it.type] ?? TYPE_META.note;
            const Icon = meta.icon;
            return (
              <Card key={it.id} className="p-4">
                <div className="flex items-start gap-3">
                  <div className="size-9 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0"><Icon className="size-4" /></div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{it.crm_contacts?.first_name} {it.crm_contacts?.last_name ?? ""}</span>
                      <Badge variant="secondary" className="text-xs">{meta.l}</Badge>
                      <span className="text-xs text-muted-foreground ml-auto">{new Date(it.occurred_at).toLocaleString("sq-AL")}</span>
                    </div>
                    {it.subject && <div className="text-sm font-medium mt-1">{it.subject}</div>}
                    {it.body && <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">{it.body}</p>}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
