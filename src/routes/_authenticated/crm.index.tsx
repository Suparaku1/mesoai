import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Users, GitBranch, LifeBuoy, Sparkles } from "lucide-react";
import { pageMeta } from "@/lib/seo";
import { useI18n } from "@/i18n";

export const Route = createFileRoute("/_authenticated/crm/")({
  head: () => ({ meta: pageMeta("CRM Përmbledhje", "Statistika të regjistrimeve, lead-eve dhe tiketave të mbështetjes.") }),
  component: CrmOverview,
});

function Stat({ label, value, icon: Icon, to }: { label: string; value: number; icon: typeof Users; to: string }) {
  return (
    <Link to={to}>
      <Card className="p-4 hover:border-primary/50 transition-colors">
        <div className="flex items-center gap-3">
          <span className="size-9 rounded-lg bg-accent flex items-center justify-center">
            <Icon className="size-4 text-primary" />
          </span>
          <div>
            <div className="text-2xl font-semibold leading-none">{value}</div>
            <div className="text-xs text-muted-foreground mt-1">{label}</div>
          </div>
        </div>
      </Card>
    </Link>
  );
}

function CrmOverview() {
  const { t } = useI18n();
  const { data } = useQuery({
    queryKey: ["crm-overview"],
    queryFn: async () => {
      const [contacts, leads, tickets, stages, recentLeads] = await Promise.all([
        supabase.from("crm_contacts").select("id", { count: "exact", head: true }).is("deleted_at", null),
        supabase.from("crm_leads").select("id", { count: "exact", head: true }),
        supabase.from("crm_tickets").select("id", { count: "exact", head: true }).eq("status", "open"),
        supabase.from("crm_pipeline_stages").select("id,name,order_index").order("order_index"),
        supabase
          .from("crm_leads")
          .select("id,title,stage_id,created_at, crm_contacts(first_name,last_name,email)")
          .order("created_at", { ascending: false })
          .limit(6),
      ]);
      const byStage = new Map<string, number>();
      const { data: allLeads } = await supabase.from("crm_leads").select("stage_id");
      for (const l of allLeads ?? []) byStage.set(l.stage_id, (byStage.get(l.stage_id) ?? 0) + 1);
      return {
        contacts: contacts.count ?? 0,
        leads: leads.count ?? 0,
        openTickets: tickets.count ?? 0,
        stages: (stages.data ?? []).map((s) => ({ ...s, count: byStage.get(s.id) ?? 0 })),
        recentLeads: recentLeads.data ?? [],
      };
    },
  });

  const stageName = new Map((data?.stages ?? []).map((s) => [s.id, s.name]));

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label={t("crm.stat.contacts")} value={data?.contacts ?? 0} icon={Users} to="/crm/contacts" />
        <Stat label={t("crm.stat.leads")} value={data?.leads ?? 0} icon={GitBranch} to="/crm/pipeline" />
        <Stat label={t("crm.stat.tickets")} value={data?.openTickets ?? 0} icon={LifeBuoy} to="/crm/tickets" />
      </div>

      <Card className="p-4">
        <h2 className="text-sm font-semibold mb-3">{t("crm.pipelineDist")}</h2>
        <div className="space-y-2">
          {(data?.stages ?? []).map((s) => {
            const total = data?.leads || 1;
            return (
              <div key={s.id} className="flex items-center gap-3">
                <span className="text-xs w-28 shrink-0 text-muted-foreground truncate">{s.name}</span>
                <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                  <div className="h-full bg-primary" style={{ width: `${(s.count / total) * 100}%` }} />
                </div>
                <span className="text-xs w-6 text-right tabular-nums">{s.count}</span>
              </div>
            );
          })}
          {!data?.stages.length && <p className="text-sm text-muted-foreground">{t("crm.noStages")}</p>}
        </div>
      </Card>

      <Card className="p-4">
        <h2 className="text-sm font-semibold mb-1 flex items-center gap-2">
          <Sparkles className="size-4 text-primary" /> {t("crm.recentLeads")}
        </h2>
        <p className="text-xs text-muted-foreground mb-3">
          {t("crm.recentLeadsDesc")}
        </p>
        <div className="divide-y divide-border">
          {(data?.recentLeads ?? []).map((l: any) => (
            <div key={l.id} className="py-2 flex items-center justify-between gap-3 text-sm">
              <div className="min-w-0">
                <div className="truncate font-medium">{l.title}</div>
                <div className="text-xs text-muted-foreground truncate">
                  {[l.crm_contacts?.first_name, l.crm_contacts?.last_name].filter(Boolean).join(" ") ||
                    l.crm_contacts?.email ||
                    "—"}
                </div>
              </div>
              <span className="text-xs px-2 py-0.5 rounded-full bg-accent text-accent-foreground shrink-0">
                {stageName.get(l.stage_id) ?? "—"}
              </span>
            </div>
          ))}
          {!data?.recentLeads.length && <p className="text-sm text-muted-foreground py-2">{t("crm.noLeads")}</p>}
        </div>
      </Card>
    </div>
  );
}
