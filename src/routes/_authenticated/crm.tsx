import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { Users, GitBranch, MessageCircle, LifeBuoy, LayoutDashboard } from "lucide-react";
import { cn } from "@/lib/utils";
import { pageMeta } from "@/lib/seo";
import { useI18n } from "@/i18n";

export const Route = createFileRoute("/_authenticated/crm")({
  head: () => ({ meta: pageMeta("CRM", "Kontaktet, pipeline-i i regjistrimeve, komunikimet dhe tiketat.") }),
  component: CrmLayout,
});

function useTabs(t: (k: any) => string) {
  return [
    { to: "/crm", label: t("crm2.nav.overview"), icon: LayoutDashboard, exact: true },
    { to: "/crm/contacts", label: t("crm2.nav.contacts"), icon: Users },
    { to: "/crm/pipeline", label: t("crm2.nav.pipeline"), icon: GitBranch },
    { to: "/crm/communications", label: t("crm2.nav.communications"), icon: MessageCircle },
    { to: "/crm/tickets", label: t("crm2.nav.tickets"), icon: LifeBuoy },
  ];
}

function CrmLayout() {
  const { t } = useI18n();
  const TABS = useTabs(t);
  const { location } = useRouterState();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">CRM</h1>
        <p className="text-sm text-muted-foreground">{t("crm2.layoutSubtitle")}</p>
      </div>
      <div className="flex gap-1 overflow-x-auto border-b border-border">
        {TABS.map((t) => {
          const active = t.exact
            ? location.pathname === "/crm" || location.pathname === "/crm/"
            : location.pathname.startsWith(t.to);
          const Icon = t.icon;
          return (
            <Link
              key={t.to}
              to={t.to}
              className={cn(
                "inline-flex shrink-0 items-center gap-2 px-3 sm:px-4 py-2 text-sm rounded-t-md border-b-2 -mb-px transition-colors",
                active
                  ? "border-primary text-primary font-medium"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon className="size-4" />
              {t.label}
            </Link>
          );
        })}
      </div>
      <Outlet />
    </div>
  );
}
