import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Wallet, Plus, Download, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import { downloadCSV } from "@/lib/csv";
import { pageMeta } from "@/lib/seo";
import { useI18n } from "@/i18n";

export const Route = createFileRoute("/_authenticated/finance")({
  head: () => ({ meta: pageMeta("Financat", "Faturat, pagesat dhe pasqyra financiare e shkollës.") }),
  component: FinancePage,
});

function useStatusMeta(t: (k: any) => string): Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> {
  return {
    draft: { label: t("fin.status.draft"), variant: "outline" },
    sent: { label: t("fin.status.sent"), variant: "secondary" },
    paid: { label: t("fin.status.paid"), variant: "default" },
    overdue: { label: t("fin.status.overdue"), variant: "destructive" },
  };
}

function FinancePage() {
  const { t } = useI18n();
  const STATUS = useStatusMeta(t);
  const qc = useQueryClient();
  const [form, setForm] = useState({ number: "", amount: "", due_date: "", notes: "" });

  const { data: invoices } = useQuery({
    queryKey: ["invoices"],
    queryFn: async () => {
      const { data, error } = await supabase.from("invoices").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      if (!form.number || !form.amount) throw new Error(t("fin.requiredFields"));
      const { error } = await supabase.from("invoices").insert({
        number: form.number,
        amount: Number(form.amount),
        due_date: form.due_date || null,
        notes: form.notes || null,
        status: "draft",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(t("fin.created"));
      setForm({ number: "", amount: "", due_date: "", notes: "" });
      qc.invalidateQueries({ queryKey: ["invoices"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const markPaid = useMutation({
    mutationFn: async (inv: { id: string; amount: number }) => {
      const { error: e1 } = await supabase.from("payments").insert({ invoice_id: inv.id, amount: inv.amount, method: "cash" });
      if (e1) throw e1;
      const { error: e2 } = await supabase.from("invoices").update({ status: "paid" }).eq("id", inv.id);
      if (e2) throw e2;
    },
    onSuccess: () => {
      toast.success(t("fin.marked"));
      qc.invalidateQueries({ queryKey: ["invoices"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const total = (invoices ?? []).reduce((s, i) => s + Number(i.amount || 0), 0);
  const paid = (invoices ?? []).filter((i) => i.status === "paid").reduce((s, i) => s + Number(i.amount || 0), 0);

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Wallet className="size-6" /> {t("fin.title")}</h1>
          <p className="text-sm text-muted-foreground">{t("fin.subtitle")}</p>
        </div>
        <Button variant="outline" onClick={() => downloadCSV("faturat.csv", invoices ?? [])} disabled={!invoices?.length}>
          <Download className="size-4 mr-1" /> {t("fin.exportCsv")}
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card><CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">{t("fin.stat.totalInvoiced")}</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{total.toLocaleString("sq-AL")} L</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">{t("fin.stat.collected")}</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-emerald-600">{paid.toLocaleString("sq-AL")} L</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">{t("fin.stat.unpaid")}</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-amber-600">{(total - paid).toLocaleString("sq-AL")} L</div></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Plus className="size-4" /> {t("fin.newInvoice")}</CardTitle></CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-5">
          <Input placeholder={t("fin.number")} value={form.number} onChange={(e) => setForm({ ...form, number: e.target.value })} />
          <Input type="number" placeholder={t("fin.amount")} value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
          <Input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} />
          <Input placeholder={t("fin.notes")} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          <Button onClick={() => create.mutate()} disabled={create.isPending}>{t("fin.create")}</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">{t("fin.invoices")}</CardTitle></CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left"><tr>
              <th className="p-3">{t("fin.col.number")}</th><th className="p-3">{t("fin.col.amount")}</th><th className="p-3">{t("fin.col.dueDate")}</th><th className="p-3">{t("fin.col.status")}</th><th className="p-3"></th>
            </tr></thead>
            <tbody className="divide-y divide-border">
              {(invoices ?? []).map((i) => (
                <tr key={i.id}>
                  <td className="p-3 font-medium">{i.number}</td>
                  <td className="p-3">{Number(i.amount).toLocaleString("sq-AL")} {i.currency}</td>
                  <td className="p-3 text-xs">{i.due_date ? new Date(i.due_date).toLocaleDateString("sq-AL") : "—"}</td>
                  <td className="p-3"><Badge variant={STATUS[i.status]?.variant ?? "outline"}>{STATUS[i.status]?.label ?? i.status}</Badge></td>
                  <td className="p-3 text-right">
                    {i.status !== "paid" && (
                      <Button size="sm" variant="ghost" onClick={() => markPaid.mutate({ id: i.id, amount: Number(i.amount) })}>
                        <CheckCircle2 className="size-4 mr-1" /> {t("fin.markPaid")}
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
              {!(invoices ?? []).length && <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">{t("fin.none")}</td></tr>}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
