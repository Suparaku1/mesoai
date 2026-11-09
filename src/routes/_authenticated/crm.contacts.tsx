import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, Mail, Phone, Building2, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { pageMeta } from "@/lib/seo";
import { useI18n } from "@/i18n";

export const Route = createFileRoute("/_authenticated/crm/contacts")({
  head: () => ({ meta: pageMeta("Kontaktet CRM", "Menaxho kontaktet e nxënësve, prindërve dhe partnerëve të shkollës.") }),
  component: ContactsPage,
});

function useTypes(t: (k: any) => string) {
  return [
    { v: "parent", l: t("crm2.type.parent") },
    { v: "business", l: t("crm2.type.business") },
    { v: "alumni", l: t("crm2.type.alumni") },
    { v: "supplier", l: t("crm2.type.supplier") },
    { v: "other", l: t("crm2.type.other") },
  ] as const;
}

function ContactsPage() {
  const { t } = useI18n();
  const TYPES = useTypes(t);
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ first_name: "", last_name: "", email: "", phone: "", company: "", notes: "", type: "parent" as string });

  const { data: contacts = [], isLoading } = useQuery({
    queryKey: ["crm-contacts"],
    queryFn: async () => {
      const { data, error } = await supabase.from("crm_contacts").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const filtered = contacts.filter((c) => {
    const s = search.toLowerCase();
    return !s || `${c.first_name} ${c.last_name ?? ""} ${c.email ?? ""} ${c.phone ?? ""} ${c.company ?? ""}`.toLowerCase().includes(s);
  });

  async function save() {
    if (!form.first_name.trim()) { toast.error(t("crm2.nameRequired")); return; }
    const { error } = await supabase.from("crm_contacts").insert({
      first_name: form.first_name.trim(),
      last_name: form.last_name.trim() || null,
      email: form.email.trim() || null,
      phone: form.phone.trim() || null,
      company: form.company.trim() || null,
      notes: form.notes.trim() || null,
      type: form.type as any,
    });
    if (error) { toast.error(error.message); return; }
    toast.success(t("crm2.added"));
    setOpen(false);
    setForm({ first_name: "", last_name: "", email: "", phone: "", company: "", notes: "", type: "parent" });
    qc.invalidateQueries({ queryKey: ["crm-contacts"] });
  }

  async function remove(id: string) {
    if (!confirm(t("crm2.confirmDelete"))) return;
    const { error } = await supabase.from("crm_contacts").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success(t("crm2.deleted"));
    qc.invalidateQueries({ queryKey: ["crm-contacts"] });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-full min-w-0 sm:flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input aria-label={t("crm2.search")} placeholder={t("crm2.search")} value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="size-4 mr-1" /> {t("crm2.newContact")}</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{t("crm2.addContact")}</DialogTitle></DialogHeader>
            <div className="grid gap-3 py-2">
              <div className="grid grid-cols-2 gap-2">
                <div><Label htmlFor="contact-first_name">{t("crm2.firstName")}</Label><Input id="contact-first_name" value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} /></div>
                <div><Label htmlFor="contact-last_name">{t("crm2.lastName")}</Label><Input id="contact-last_name" value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} /></div>
              </div>
              <div><Label htmlFor="contact-email">{t("crm2.email")}</Label><Input id="contact-email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
              <div><Label htmlFor="contact-phone">{t("crm2.phone")}</Label><Input id="contact-phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
              <div><Label htmlFor="contact-company">{t("crm2.company")}</Label><Input id="contact-company" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} /></div>
              <div>
                <Label htmlFor="contact-type">{t("crm2.type")}</Label>
                <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                  <SelectTrigger id="contact-type"><SelectValue /></SelectTrigger>
                  <SelectContent>{TYPES.map((t) => <SelectItem key={t.v} value={t.v}>{t.l}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label htmlFor="contact-notes">{t("crm2.notes")}</Label><Textarea id="contact-notes" rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>{t("crm2.cancel")}</Button>
              <Button onClick={save}>{t("crm2.save")}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">{t("crm2.loading")}</p>
      ) : filtered.length === 0 ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">{t("crm2.none")}</Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((c) => (
            <Card key={c.id} className="p-4 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-medium truncate">{c.first_name} {c.last_name}</div>
                  <Badge variant="secondary" className="text-xs mt-1">
                    {TYPES.find((t) => t.v === c.type)?.l ?? c.type}
                  </Badge>
                </div>
                <Button size="icon" variant="ghost" aria-label={t("crm2.confirmDelete")} onClick={() => remove(c.id)}><Trash2 className="size-4" /></Button>
              </div>
              <div className="space-y-1 text-sm text-muted-foreground">
                {c.email && <div className="flex items-center gap-2 truncate"><Mail className="size-3.5 shrink-0" />{c.email}</div>}
                {c.phone && <div className="flex items-center gap-2"><Phone className="size-3.5" />{c.phone}</div>}
                {c.company && <div className="flex items-center gap-2 truncate"><Building2 className="size-3.5 shrink-0" />{c.company}</div>}
              </div>
              {c.notes && <p className="text-xs text-muted-foreground line-clamp-2 pt-1 border-t border-border">{c.notes}</p>}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
