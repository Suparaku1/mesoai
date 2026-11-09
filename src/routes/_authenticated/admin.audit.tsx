import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, ScrollText } from "lucide-react";
import { pageMeta } from "@/lib/seo";
import { useI18n } from "@/i18n";
import { downloadCSV } from "@/lib/csv";

export const Route = createFileRoute("/_authenticated/admin/audit")({
  head: () => ({ meta: pageMeta("Audit Log", "Regjistri i plotë i veprimeve në platformë: kush, çfarë dhe kur.") }),
  component: Page,
});

type Row = {
  id: string;
  user_id: string | null;
  action: string;
  entity: string;
  entity_id: string | null;
  module: string | null;
  metadata: { label?: string; changes?: Record<string, { from: string; to: string }>; grade?: number; status?: string } | null;
  created_at: string;
};

const MODULES = ["admin", "crm", "erp", "courses", "homework", "grades"];
const ACTIONS = ["insert", "update", "delete"];

function actionVariant(a: string) {
  if (a === "delete") return "destructive" as const;
  if (a === "insert") return "default" as const;
  return "secondary" as const;
}

function Page() {
  const { t } = useI18n();
  const [q, setQ] = useState("");
  const [mod, setMod] = useState("all");
  const [act, setAct] = useState("all");

  const { data } = useQuery({
    queryKey: ["audit", mod, act],
    queryFn: async () => {
      let query = supabase.from("audit_log").select("*").order("created_at", { ascending: false }).limit(500);
      if (mod !== "all") query = query.eq("module", mod);
      if (act !== "all") query = query.eq("action", act);
      const { data } = await query;
      const rows = (data ?? []) as unknown as Row[];
      const ids = Array.from(new Set(rows.map((r) => r.user_id).filter(Boolean))) as string[];
      const names = new Map<string, string>();
      if (ids.length) {
        const { data: profs } = await supabase.from("profiles").select("id, first_name, last_name, email").in("id", ids);
        (profs ?? []).forEach((p) =>
          names.set(p.id, `${p.first_name} ${p.last_name}`.trim() || p.email),
        );
      }
      return rows.map((r) => ({ ...r, userName: r.user_id ? names.get(r.user_id) ?? r.user_id.slice(0, 8) : t("aud.system") }));
    },
  });

  const rows = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return data ?? [];
    return (data ?? []).filter((r) =>
      [r.userName, r.entity, r.metadata?.label, r.entity_id].some((v) => v?.toLowerCase().includes(s)),
    );
  }, [data, q]);

  const fmtDate = (d: string) => new Date(d).toLocaleDateString("sq-AL");
  const fmtTime = (d: string) => new Date(d).toLocaleTimeString("sq-AL");

  const exportCsv = () =>
    downloadCSV(
      "audit-log.csv",
      rows.map((r) => ({
        data: fmtDate(r.created_at),
        ora: fmtTime(r.created_at),
        perdoruesi: r.userName,
        moduli: r.module ?? "",
        veprimi: r.action,
        objekti: r.entity,
        id: r.entity_id ?? "",
        pershkrimi: r.metadata?.label ?? "",
        ndryshimet: r.metadata?.changes ? JSON.stringify(r.metadata.changes) : "",
      })),
    );

  return (
    <div className="container mx-auto p-4 sm:p-6 space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="text-2xl font-semibold flex items-center gap-2">
          <ScrollText className="size-6" /> {t("aud.title")}
        </h1>
        <Button variant="outline" size="sm" onClick={exportCsv} disabled={!rows.length}>
          <Download className="size-4 mr-1" /> {t("aud.export")}
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        <Input className="max-w-xs" placeholder={t("aud.search")} value={q} onChange={(e) => setQ(e.target.value)} />
        <Select value={mod} onValueChange={setMod}>
          <SelectTrigger className="w-40" aria-label={t("aud.module")}><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("aud.module")}: {t("aud.all")}</SelectItem>
            {MODULES.map((m) => <SelectItem key={m} value={m}>{t(`aud.m.${m}` as never)}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={act} onValueChange={setAct}>
          <SelectTrigger className="w-40" aria-label={t("aud.action")}><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("aud.action")}: {t("aud.all")}</SelectItem>
            {ACTIONS.map((a) => <SelectItem key={a} value={a}>{t(`aud.a.${a}` as never)}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardHeader><CardTitle>{t("aud.recent500")}</CardTitle></CardHeader>
        <CardContent>
          <div className="max-h-[70vh] overflow-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-muted-foreground sticky top-0 bg-card">
                <tr>
                  <th className="py-2 pr-3">{t("aud.date")}</th>
                  <th className="py-2 pr-3">{t("aud.time")}</th>
                  <th className="py-2 pr-3">{t("aud.user")}</th>
                  <th className="py-2 pr-3">{t("aud.module")}</th>
                  <th className="py-2 pr-3">{t("aud.action")}</th>
                  <th className="py-2 pr-3">{t("aud.entity")}</th>
                  <th className="py-2">{t("aud.details")}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-t border-border/50 align-top">
                    <td className="py-2 pr-3 whitespace-nowrap">{fmtDate(r.created_at)}</td>
                    <td className="py-2 pr-3 whitespace-nowrap font-mono text-xs">{fmtTime(r.created_at)}</td>
                    <td className="py-2 pr-3">{r.userName}</td>
                    <td className="py-2 pr-3">{r.module ? t(`aud.m.${r.module}` as never) : "—"}</td>
                    <td className="py-2 pr-3">
                      <Badge variant={actionVariant(r.action)}>
                        {ACTIONS.includes(r.action) ? t(`aud.a.${r.action}` as never) : r.action}
                      </Badge>
                    </td>
                    <td className="py-2 pr-3">
                      <div>{r.entity}</div>
                      {r.metadata?.label && <div className="text-xs text-muted-foreground line-clamp-1">{r.metadata.label}</div>}
                    </td>
                    <td className="py-2 text-xs text-muted-foreground">
                      {r.metadata?.changes &&
                        Object.entries(r.metadata.changes).slice(0, 4).map(([k, v]) => (
                          <div key={k}>
                            <b>{k}</b>: {v.from || "∅"} → {v.to || "∅"}
                          </div>
                        ))}
                      {r.metadata?.grade != null && <div>Nota: {r.metadata.grade}</div>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!rows.length && <p className="text-muted-foreground text-sm py-4">{t("aud.none")}</p>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
