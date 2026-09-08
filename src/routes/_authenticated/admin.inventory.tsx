import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Package, Plus, Trash2, Pencil, X, Save, ArrowUp, ArrowDown } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { addStockMovement } from "@/lib/erp.functions";
import { pageMeta } from "@/lib/seo";
import { useI18n } from "@/i18n";

export const Route = createFileRoute("/_authenticated/admin/inventory")({
  head: () => ({ meta: pageMeta("Inventari", "Baza materiale dhe stoku i laboratorëve të shkollës.") }),
  component: InventoryPage,
});

type Item = {
  id: string;
  name: string;
  category: string;
  quantity: number;
  unit: string | null;
  location: string | null;
  notes: string | null;
};

function InventoryPage() {
  const { t } = useI18n();
  const { user } = Route.useRouteContext();
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Partial<Item> | null>(null);

  const { data: isAdmin } = useQuery({
    queryKey: ["is-admin", user.id],
    queryFn: async () => {
      const { data } = await supabase.rpc("has_role", { _user_id: user.id, _role: "admin" });
      return !!data;
    },
  });

  const { data: items } = useQuery({
    queryKey: ["inventory"],
    queryFn: async () => (await supabase.from("inventory_items").select("*").order("name")).data ?? [],
  });

  async function save() {
    if (!editing?.name?.trim()) return toast.error(t("adm.inv.nameRequired"));
    const payload = {
      name: editing.name.trim(),
      category: editing.category || t("adm.inv.other"),
      quantity: Number(editing.quantity ?? 0),
      unit: editing.unit || null,
      location: editing.location || null,
      notes: editing.notes || null,
    };
    const { error } = editing.id
      ? await supabase.from("inventory_items").update(payload).eq("id", editing.id)
      : await supabase.from("inventory_items").insert({ ...payload, created_by: user.id });
    if (error) return toast.error(error.message);
    toast.success(t("adm.inv.saved"));
    setEditing(null);
    qc.invalidateQueries({ queryKey: ["inventory"] });
  }

  async function del(id: string) {
    if (!confirm(t("adm.inv.confirmDelete"))) return;
    const { error } = await supabase.from("inventory_items").delete().eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["inventory"] });
  }

  const move = useServerFn(addStockMovement);
  async function adjust(id: string, delta: number) {
    try {
      await move({ data: { item_id: id, delta, reason: delta > 0 ? t("adm.inv.manualIn") : t("adm.inv.manualOut") } });
      qc.invalidateQueries({ queryKey: ["inventory"] });
      toast.success(delta > 0 ? t("adm.inv.added") : t("adm.inv.removed"));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("adm.inv.error"));
    }
  }

  const grouped: Record<string, Item[]> = {};
  (items ?? []).forEach((it) => {
    (grouped[it.category] ||= []).push(it);
  });

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Package className="size-6" /> {t("adm.inv.title")}</h1>
          <p className="text-sm text-muted-foreground">{t("adm.inv.subtitle")}</p>
        </div>
        {isAdmin && (
          <Button onClick={() => setEditing({ name: "", category: t("adm.inv.other"), quantity: 1 })}>
            <Plus className="size-4 mr-1" /> {t("adm.inv.new")}
          </Button>
        )}
      </div>

      {editing && (
        <div className="card-soft p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">{editing.id ? t("adm.inv.update") : t("adm.inv.new")}</h3>
            <Button variant="ghost" size="icon" onClick={() => setEditing(null)}><X className="size-4" /></Button>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <Input placeholder={t("adm.inv.name")} value={editing.name ?? ""} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
            <Input placeholder={t("adm.inv.category")} value={editing.category ?? ""} onChange={(e) => setEditing({ ...editing, category: e.target.value })} />
            <Input type="number" min={0} placeholder={t("adm.inv.quantity")} value={editing.quantity ?? 0} onChange={(e) => setEditing({ ...editing, quantity: Number(e.target.value) })} />
            <Input placeholder={t("adm.inv.unit")} value={editing.unit ?? ""} onChange={(e) => setEditing({ ...editing, unit: e.target.value })} />
            <Input placeholder={t("adm.inv.location")} value={editing.location ?? ""} onChange={(e) => setEditing({ ...editing, location: e.target.value })} className="sm:col-span-2" />
            <Textarea placeholder={t("adm.inv.notes")} value={editing.notes ?? ""} onChange={(e) => setEditing({ ...editing, notes: e.target.value })} className="sm:col-span-2" />
          </div>
          <Button onClick={save}><Save className="size-4 mr-1" /> {t("adm.inv.save")}</Button>
        </div>
      )}

      {!items?.length ? (
        <div className="card-soft p-10 text-center text-muted-foreground">{t("adm.inv.none")}</div>
      ) : (
        Object.entries(grouped).map(([cat, list]) => (
          <section key={cat}>
            <h2 className="font-semibold mb-2 text-sm uppercase tracking-wide text-muted-foreground">{cat}</h2>
            <div className="card-soft overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-left">
                  <tr>
                    <th className="p-3 font-medium">{t("adm.inv.name")}</th>
                    <th className="p-3 font-medium">{t("adm.inv.quantity")}</th>
                    <th className="p-3 font-medium">{t("adm.inv.location")}</th>
                    {isAdmin && <th className="p-3 w-24" />}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {list.map((it) => (
                    <tr key={it.id}>
                      <td className="p-3">
                        <div className="font-medium">{it.name}</div>
                        {it.notes && <div className="text-xs text-muted-foreground">{it.notes}</div>}
                      </td>
                      <td className="p-3">
                        <span className={`font-mono ${it.quantity <= 5 ? "text-destructive font-semibold" : ""}`}>{it.quantity}</span> {it.unit ?? ""}
                        {isAdmin && (
                          <span className="ml-2 inline-flex gap-1">
                            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => adjust(it.id, 1)}><ArrowUp className="size-3" /></Button>
                            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => adjust(it.id, -1)}><ArrowDown className="size-3" /></Button>
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-muted-foreground">{it.location ?? "—"}</td>
                      {isAdmin && (
                        <td className="p-3">
                          <div className="flex gap-1">
                            <Button size="icon" variant="ghost" onClick={() => setEditing(it)}><Pencil className="size-3" /></Button>
                            <Button size="icon" variant="ghost" onClick={() => del(it.id)}><Trash2 className="size-3 text-destructive" /></Button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ))
      )}
    </div>
  );
}
