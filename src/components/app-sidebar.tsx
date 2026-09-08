import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard, BookOpen, Sparkles, MessageSquare, CalendarClock, BarChart3, Shield,
  Package, ClipboardCheck, CalendarDays, BookMarked, Megaphone, GraduationCap, Users,
  ScrollText,
  Mail, Settings, Contact, ChevronDown, Rocket, Wallet, ShoppingCart, Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import logo from "@/assets/logo.jpeg";
import { useState } from "react";
import { useI18n, type TranslationKey } from "@/i18n";

type NavItem = { to: string; labelKey: TranslationKey; icon: React.ComponentType<{ className?: string }> };
type Group = { key: string; labelKey: TranslationKey; items: NavItem[]; adminOnly?: boolean };

const GROUPS: Group[] = [
  {
    key: "main",
    labelKey: "nav.group.main",
    items: [
      { to: "/dashboard", labelKey: "nav.dashboard", icon: LayoutDashboard },
      { to: "/browse", labelKey: "nav.browse", icon: BookOpen },
      { to: "/tutor", labelKey: "nav.tutor", icon: Sparkles },
    ],
  },
  {
    key: "learn",
    labelKey: "nav.group.learn",
    items: [
      { to: "/calendar", labelKey: "nav.calendar", icon: CalendarClock },
      { to: "/schedule", labelKey: "nav.schedule", icon: CalendarDays },
      { to: "/exams", labelKey: "nav.exams", icon: GraduationCap },
      { to: "/attendance", labelKey: "nav.attendance", icon: ClipboardCheck },
      { to: "/library", labelKey: "nav.library", icon: BookMarked },
    ],
  },
  {
    key: "comm",
    labelKey: "nav.group.comm",
    items: [
      { to: "/messages", labelKey: "nav.messages", icon: MessageSquare },
      { to: "/announcements", labelKey: "nav.announcements", icon: Megaphone },
      { to: "/parent", labelKey: "nav.parent", icon: Users },
    ],
  },
  {
    key: "biz",
    labelKey: "nav.group.biz",
    items: [
      { to: "/analytics", labelKey: "nav.analytics", icon: BarChart3 },
      { to: "/crm/contacts", labelKey: "nav.crm", icon: Contact },
      { to: "/finance", labelKey: "nav.finance", icon: Wallet },
      { to: "/settings", labelKey: "nav.settings", icon: Settings },
    ],
  },
  {
    key: "admin",
    labelKey: "nav.group.admin",
    adminOnly: true,
    items: [
      { to: "/admin/users", labelKey: "nav.admin.users", icon: Shield },
      { to: "/admin/parents", labelKey: "nav.admin.parents", icon: Users },
      { to: "/admin/inventory", labelKey: "nav.admin.inventory", icon: Package },
      { to: "/admin/erp", labelKey: "nav.admin.erp", icon: ShoppingCart },
      { to: "/admin/automations", labelKey: "nav.admin.automations", icon: Zap },
      { to: "/admin/audit", labelKey: "nav.admin.audit", icon: ScrollText },
      { to: "/admin/email-log", labelKey: "nav.admin.emailLog", icon: Mail },
    ],
  },
];

export function AppSidebar({ isAdmin, onNavigate }: { isAdmin?: boolean; onNavigate?: () => void }) {
  const { location } = useRouterState();
  const { t } = useI18n();
  const groups = GROUPS.filter((g) => !g.adminOnly || isAdmin);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  return (
    <aside className="flex h-full w-full flex-col bg-sidebar text-sidebar-foreground">
      <div className="px-4 py-4 border-b border-sidebar-border">
        <Link to="/dashboard" onClick={onNavigate} className="flex items-center gap-2 font-semibold">
          <img src={logo} alt="Logo" className="size-9 rounded-full object-cover ring-2 ring-sidebar-primary/20" />
          <div className="leading-tight">
            <div className="text-sm">{t("app.school")}</div>
            <div className="text-[10px] opacity-70 font-normal">{t("app.subtitle")}</div>
          </div>
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-3">
        {groups.map((g) => {
          const isCollapsed = collapsed[g.key];
          return (
            <div key={g.key}>
              <button
                onClick={() => setCollapsed((s) => ({ ...s, [g.key]: !s[g.key] }))}
                className="w-full flex items-center justify-between px-3 py-1 text-[10px] font-semibold uppercase tracking-wider opacity-60 hover:opacity-100"
              >
                <span>{t(g.labelKey)}</span>
                <ChevronDown className={cn("size-3 transition-transform", isCollapsed && "-rotate-90")} />
              </button>
              {!isCollapsed && (
                <div className="mt-1 space-y-0.5">
                  {g.items.map((item) => {
                    const active = location.pathname === item.to || location.pathname.startsWith(item.to + "/");
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.to}
                        to={item.to}
                        onClick={onNavigate}
                        className={cn(
                          "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                          active
                            ? "bg-sidebar-primary text-sidebar-primary-foreground font-medium"
                            : "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                        )}
                      >
                        <Icon className="size-4 shrink-0" />
                        <span className="truncate">{t(item.labelKey)}</span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      <div className="px-4 py-3 border-t border-sidebar-border text-[10px] opacity-70">
        <Rocket className="size-3 inline mr-1" />
        © {new Date().getFullYear()} Uendi · E. Suparaku
      </div>
    </aside>
  );
}
