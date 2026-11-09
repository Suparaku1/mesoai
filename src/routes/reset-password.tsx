import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { pageMeta } from "@/lib/seo";
import { useI18n } from "@/i18n";

export const Route = createFileRoute("/reset-password")({
  head: () => ({ meta: pageMeta("Rivendos fjalëkalimin", "Vendos një fjalëkalim të ri për llogarinë tënde në Uendi Platform.") }),
  component: ResetPage,
});

function ResetPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [ready, setReady] = useState<boolean | null>(null);
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || (event === "SIGNED_IN" && session)) setReady(true);
    });
    supabase.auth.getSession().then(({ data }) => setReady((r) => r ?? !!data.session));
    const timer = setTimeout(() => setReady((r) => r ?? false), 4000);
    return () => { sub.subscription.unsubscribe(); clearTimeout(timer); };
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (pw.length < 8) return toast.error(t("auth.newPassword"));
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: pw });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(t("auth.passwordSet"));
    navigate({ to: "/dashboard" });
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-10 bg-background">
      <div className="card-soft p-6 w-full max-w-md space-y-4">
        <h1 className="text-xl font-semibold">{t("auth.resetTitle")}</h1>
        {ready === false ? (
          <p className="text-sm text-muted-foreground">{t("auth.resetInvalid")}</p>
        ) : (
          <form onSubmit={submit} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="np">{t("auth.newPassword")}</Label>
              <Input id="np" type="password" minLength={8} required value={pw} onChange={(e) => setPw(e.target.value)} disabled={!ready} />
            </div>
            <Button type="submit" className="w-full" disabled={!ready || busy}>{t("auth.setPassword")}</Button>
          </form>
        )}
        <Link to="/auth" search={{ tab: "login" }} className="text-sm text-primary hover:underline block text-center">
          {t("auth.back")}
        </Link>
      </div>
    </main>
  );
}
