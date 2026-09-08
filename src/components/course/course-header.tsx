import type { ReactNode } from "react";
import { useI18n } from "@/i18n";

export function CourseHeader({
  title,
  subtitle,
  coverUrl,
  actions,
}: {
  title?: string | null;
  subtitle?: string | null;
  coverUrl?: string | null;
  actions?: ReactNode;
}) {
  const { t } = useI18n();
  return (
    <div className="space-y-4">
      {coverUrl ? (
        <div className="relative rounded-xl overflow-hidden aspect-[3/1] bg-muted">
          <img src={coverUrl} alt={title ?? t("course.coverAlt")} className="w-full h-full object-cover" />
        </div>
      ) : null}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">{title}</h1>
          {subtitle ? <p className="text-sm text-muted-foreground">{subtitle}</p> : null}
        </div>
        {actions ? <div className="flex gap-2 flex-wrap">{actions}</div> : null}
      </div>
    </div>
  );
}
