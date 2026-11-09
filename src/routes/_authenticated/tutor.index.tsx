import { createFileRoute } from "@tanstack/react-router";
import { pageMeta } from "@/lib/seo";
import { useI18n } from "@/i18n";
import { BookOpen } from "lucide-react";
export const Route = createFileRoute("/_authenticated/tutor/")({
  head: () => ({
    meta: pageMeta(
      "Bisedat e Tutorit",
      "Hap një bisedë të ruajtur ose nis një pyetje të re për materialet mësimore.",
    ),
  }),
  component: TutorWelcome,
});

function TutorWelcome() {
  const { t } = useI18n();
  return (
    <div className="py-16 text-center">
      <BookOpen className="size-8 text-primary mx-auto mb-4" />
      <h2 className="text-lg font-semibold">{t("tutor.emptyTitle")}</h2>
      <p className="mt-2 text-sm text-muted-foreground">{t("tutor.emptyDesc")}</p>
    </div>
  );
}
