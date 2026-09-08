import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ShoppingCart, Wallet, Plus, X, Save, Package } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { createPurchaseOrder, updatePurchaseOrderStatus, upsertBudget } from "@/lib/erp.functions";
import { pageMeta } from "@/lib/seo";
import { useI18n, type TranslationKey } from "@/i18n";

export const Route = createFileRoute("/_authenticated/admin/erp")({
  head: () => ({ meta: pageMeta("ERP — Blerje & Buxhet", "Buxhetet dhe porositë e blerjes për bazën materiale të shkollës.") }),
  component: ErpPage,
});

type PO = { id: string; supplier: string; status: string; total_amount: number; expected_at: string | null; notes: string | null; created_at: string };
type Budget = { id: string; category: string; period_month: string; planned_amount: number; spent_amount: number; notes: string | null };

function ErpPage() {
  const { t } = useI18n();
  const qc = useQueryClient();
  const [poDraft, setPoDraft] = useState<Partial<PO> | null>(null);
  const [budgetDraft, setBudgetDraft] = useState<Partial<Budget> | null>(null);

  const createPo = useServerFn(createPurchaseOrder);
  const updatePo = useServerFn(updatePurchaseOrderStatus);
  const upBudget = useServerFn(upsertBudget);

  const { data: pos } = useQuery({
    queryKey: ["purchase_orders"],
    queryFn: async () => (await supabase.from("purchase_orders").select("*").order("created_at", { ascending: false })).data as PO[] ?? [],
  });
  const { data: budgets } = useQuery({
    queryKey: ["budgets"],
    queryFn: async () => (await supabase.from("budgets").select("*").order("period_month", { ascending: false })).data as Budget[] ?? [],
  });

  async function savePo() {
    if (!poDraft?.supplier?.trim()) return toast.error(t("erp.po.errSupplier"));
    try {
      await createPo({
        data: {
          supplier: poDraft.supplier.trim(),
          status: (poDraft.status as "draft") ?? "draft",
          total_amount: Number(poDraft.total_amount ?? 0),
          expected_at: poDraft.expected_at ?? undefined,
          notes: poDraft.notes ?? undefined,
        },
      });
      toast.success(t("erp.po.created"));
      setPoDraft(null);
      qc.invalidateQueries({ queryKey: ["purchase_orders"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("erp.error"));
    }
  }

  async function setStatus(id: string, status: "draft" | "ordered" | "received" | "cancelled") {
    try {
      await updatePo({ data: { id, status } });
      qc.invalidateQueries({ queryKey: ["purchase_orders"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("erp.error"));
    }
  }

  async function saveBudget() {
    if (!budgetDraft?.category?.trim()) return toast.error(t("erp.budget.errCategory"));
    try {
      await upBudget({
        data: {
          category: budgetDraft.category.trim(),
          period_month: budgetDraft.period_month ?? new Date().toISOString().slice(0, 7) + "-01",
          planned_amount: Number(budgetDraft.planned_amount ?? 0),
          spent_amount: Number(budgetDraft.spent_amount ?? 0),
          notes: budgetDraft.notes ?? undefined,
        },
      });
      toast.success(t("erp.budget.saved"));
      setBudgetDraft(null);
      qc.invalidateQueries({ queryKey: ["budgets"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("erp.error"));
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><Package className="size-6" /> {t("erp.title")}</h1>
        <p className="text-sm text-muted-foreground">{t("erp.desc")}</p>
      </div>

      <Tabs defaultValue="po">
        <TabsList>
          <TabsTrigger value="po"><ShoppingCart className="size-4 mr-1" /> {t("erp.tab.po")}</TabsTrigger>
          <TabsTrigger value="budget"><Wallet className="size-4 mr-1" /> {t("erp.tab.budget")}</TabsTrigger>
        </TabsList>

        <TabsContent value="po" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => setPoDraft({ status: "draft", total_amount: 0 })}><Plus className="size-4 mr-1" /> {t("erp.po.new")}</Button>
          </div>
          {poDraft && (
            <div className="card-soft p-5 space-y-3">
              <div className="flex justify-between items-center">
                <h3 className="font-semibold">{t("erp.po.new")}</h3>
                <Button size="icon" variant="ghost" onClick={() => setPoDraft(null)}><X className="size-4" /></Button>
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                <Input placeholder={t("erp.po.supplier")} value={poDraft.supplier ?? ""} onChange={(e) => setPoDraft({ ...poDraft, supplier: e.target.value })} />
                <Input type="number" placeholder={t("erp.po.total")} value={poDraft.total_amount ?? 0} onChange={(e) => setPoDraft({ ...poDraft, total_amount: Number(e.target.value) })} />
                <Input type="date" value={poDraft.expected_at ?? ""} onChange={(e) => setPoDraft({ ...poDraft, expected_at: e.target.value })} />
                <Textarea placeholder={t("erp.po.notes")} value={poDraft.notes ?? ""} onChange={(e) => setPoDraft({ ...poDraft, notes: e.target.value })} className="sm:col-span-2" />
              </div>
              <Button onClick={savePo}><Save className="size-4 mr-1" /> {t("erp.save")}</Button>
            </div>
          )}
          <div className="card-soft overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-left">
                <tr><th className="p-3">{t("erp.po.supplier")}</th><th className="p-3">{t("erp.po.status")}</th><th className="p-3">{t("erp.po.totalShort")}</th><th className="p-3">{t("erp.po.expected")}</th><th className="p-3">{t("erp.po.actions")}</th></tr>
              </thead>
              <tbody className="divide-y divide-border">
                {(pos ?? []).map((po) => (
                  <tr key={po.id}>
                    <td className="p-3 font-medium">{po.supplier}</td>
                    <td className="p-3"><span className="px-2 py-0.5 rounded-full text-xs bg-muted">{t(`erp.status.${po.status}` as TranslationKey)}</span></td>
                    <td className="p-3 font-mono">{po.total_amount.toLocaleString()} ALL</td>
                    <td className="p-3 text-muted-foreground">{po.expected_at ?? "—"}</td>
                    <td className="p-3">
                      <div className="flex gap-1 flex-wrap">
                        {(["ordered", "received", "cancelled"] as const).map((s) => (
                          <Button key={s} size="sm" variant="ghost" disabled={po.status === s} onClick={() => setStatus(po.id, s)}>{t(`erp.status.${s}` as TranslationKey)}</Button>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
                {!pos?.length && <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">{t("erp.po.empty")}</td></tr>}
              </tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="budget" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => setBudgetDraft({ period_month: new Date().toISOString().slice(0, 7) + "-01" })}><Plus className="size-4 mr-1" /> {t("erp.budget.new")}</Button>
          </div>
          {budgetDraft && (
            <div className="card-soft p-5 space-y-3">
              <div className="flex justify-between items-center">
                <h3 className="font-semibold">{t("erp.budget.title")}</h3>
                <Button size="icon" variant="ghost" onClick={() => setBudgetDraft(null)}><X className="size-4" /></Button>
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                <Input placeholder={t("erp.budget.category")} value={budgetDraft.category ?? ""} onChange={(e) => setBudgetDraft({ ...budgetDraft, category: e.target.value })} />
                <Input type="date" value={budgetDraft.period_month ?? ""} onChange={(e) => setBudgetDraft({ ...budgetDraft, period_month: e.target.value })} />
                <Input type="number" placeholder={t("erp.budget.planned")} value={budgetDraft.planned_amount ?? 0} onChange={(e) => setBudgetDraft({ ...budgetDraft, planned_amount: Number(e.target.value) })} />
                <Input type="number" placeholder={t("erp.budget.spent")} value={budgetDraft.spent_amount ?? 0} onChange={(e) => setBudgetDraft({ ...budgetDraft, spent_amount: Number(e.target.value) })} />
              </div>
              <Button onClick={saveBudget}><Save className="size-4 mr-1" /> {t("erp.save")}</Button>
            </div>
          )}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
            {(budgets ?? []).map((b) => {
              const pct = b.planned_amount ? Math.min(100, (b.spent_amount / b.planned_amount) * 100) : 0;
              return (
                <div key={b.id} className="card-soft p-4 space-y-2">
                  <div className="flex justify-between">
                    <div className="font-semibold">{b.category}</div>
                    <div className="text-xs text-muted-foreground">{b.period_month.slice(0, 7)}</div>
                  </div>
                  <div className="text-sm">{b.spent_amount.toLocaleString()} / {b.planned_amount.toLocaleString()} ALL</div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div className={`h-full ${pct > 90 ? "bg-destructive" : pct > 70 ? "bg-amber-500" : "bg-primary"}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
            {!budgets?.length && <div className="card-soft p-10 text-center text-muted-foreground md:col-span-2 lg:col-span-3">{t("erp.budget.empty")}</div>}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
