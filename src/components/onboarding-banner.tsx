import { Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { X, Rocket, BookPlus, Users, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { useI18n } from "@/i18n";

export function OnboardingBanner({ userId }: { userId: string }) {
  const { t } = useI18n();
  const qc = useQueryClient();
  const { data: prefs, isLoading } = useQuery({
    queryKey: ["prefs", userId],
    queryFn: async () => {
      const { data } = await supabase.from("user_preferences").select("*").eq("user_id", userId).maybeSingle();
      return data;
    },
  });

  if (isLoading || prefs?.onboarding_dismissed) return null;

  async function dismiss() {
    await supabase.from("user_preferences").upsert({ user_id: userId, onboarding_dismissed: true });
    qc.invalidateQueries({ queryKey: ["prefs", userId] });
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative rounded-xl border border-primary/30 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-5"
    >
      <button onClick={dismiss} className="absolute top-3 right-3 opacity-60 hover:opacity-100" aria-label={t("ui.onboardingClose")}>
        <X className="size-4" />
      </button>
      <div className="flex items-center gap-2 text-primary font-semibold mb-2">
        <Rocket className="size-5" /> {t("ui.onboardingWelcome")}
      </div>
      <p className="text-sm text-muted-foreground mb-4">{t("ui.onboardingSteps")}</p>
      <div className="grid sm:grid-cols-3 gap-3">
        <Step icon={BookPlus} n={1} title={t("ui.onboardingStep1Title")} desc={t("ui.onboardingStep1Desc")} to="/courses/new" cta={t("ui.onboardingStep1Cta")} />
        <Step icon={Sparkles} n={2} title={t("ui.onboardingStep2Title")} desc={t("ui.onboardingStep2Desc")} />
        <Step icon={Users} n={3} title={t("ui.onboardingStep3Title")} desc={t("ui.onboardingStep3Desc")} to="/browse" cta={t("ui.onboardingStep3Cta")} />
      </div>
    </motion.div>
  );
}

function Step({ icon: Icon, n, title, desc, to, cta }: { icon: any; n: number; title: string; desc: string; to?: string; cta?: string }) {
  return (
    <div className="rounded-lg bg-background/60 border border-border p-3">
      <div className="flex items-center gap-2 mb-1">
        <div className="size-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">{n}</div>
        <Icon className="size-4 text-primary" />
        <div className="font-medium text-sm">{title}</div>
      </div>
      <p className="text-xs text-muted-foreground mb-2">{desc}</p>
      {to && <Link to={to}><Button size="sm" variant="outline" className="h-7 text-xs">{cta}</Button></Link>}
    </div>
  );
}
