import { Link } from "@tanstack/react-router";
import { CheckCircle2, ChevronRight, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/i18n";

export type NextAction = {
  id: string;
  icon: LucideIcon;
  title: string;
  description?: string;
  to: string;
  params?: Record<string, string>;
  tone?: "default" | "urgent";
};

export function NextActions({ items, emptyText }: { items: NextAction[]; emptyText: string }) {
  const { t } = useI18n();
  return (
    <section className="card-soft p-5">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">
        {t("ui.nextAction")}
      </h2>

      {!items.length ? (
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <CheckCircle2 className="size-5 text-success" />
          {emptyText}
        </div>
      ) : (
        <ul className="space-y-2">
          {items.map((a) => {
            const Icon = a.icon;
            return (
              <li key={a.id}>
                <Link
                  to={a.to}
                  params={a.params as never}
                  className={cn(
                    "flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-accent/60",
                    a.tone === "urgent" ? "border-primary/40 bg-primary/5" : "border-border",
                  )}
                >
                  <span
                    className={cn(
                      "size-9 shrink-0 rounded-lg flex items-center justify-center",
                      a.tone === "urgent"
                        ? "bg-primary text-primary-foreground"
                        : "bg-accent text-accent-foreground",
                    )}
                  >
                    <Icon className="size-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium truncate">{a.title}</span>
                    {a.description && (
                      <span className="block text-xs text-muted-foreground truncate">{a.description}</span>
                    )}
                  </span>
                  <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
