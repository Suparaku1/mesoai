import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { DREJTIMET, KLASAT, PARALELET } from "@/lib/constants";
import { GraduationCap } from "lucide-react";
import { pageMeta } from "@/lib/seo";
import { useI18n } from "@/i18n";

function safeNext(value: unknown): string | undefined {
  return typeof value === "string" && value.startsWith("/") && !value.startsWith("//") ? value : undefined;
}

export const Route = createFileRoute("/auth")({
  validateSearch: (s: Record<string, unknown>) => ({
    tab: (s['tab'] as string) === "register" ? ("register" as const) : ("login" as const),
    ...(safeNext(s['next']) ? { next: safeNext(s['next'])! } : {}),
  }),
  head: () => ({ meta: pageMeta("Hyrja", "Hyr ose regjistrohu në Uendi Platform si mësues, nxënës ose prind.") }),
  component: AuthPage,
});

function AuthPage() {
  const { t } = useI18n();
  const search = Route.useSearch();
  const tab = search.tab;
  const next = safeNext((search as { next?: string }).next);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  function goAfterAuth() {
    if (next) {
      window.location.href = next;
      return;
    }
    navigate({ to: "/dashboard" });
  }

  // Pas kthimit nga Google: kur sesioni është gati, dërgo te faqja e synuar.
  useEffect(() => {
    let done = false;
    const go = () => {
      if (done) return;
      done = true;
      const saved = safeNext(sessionStorage.getItem("auth_next") ?? undefined);
      sessionStorage.removeItem("auth_next");
      if (saved) window.location.href = saved;
      else navigate({ to: "/dashboard" });
    };
    supabase.auth.getSession().then(({ data }) => { if (data.session) go(); });
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session && sessionStorage.getItem("auth_next") !== null) go();
    });
    return () => sub.subscription.unsubscribe();
  }, [navigate]);



  // Login state
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // Register state
  const [role, setRole] = useState<"teacher" | "student" | "parent">("student");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [drejtimi, setDrejtimi] = useState<string>("");
  const [klasa, setKlasa] = useState<string>("");
  const [paralelja, setParalelja] = useState<string>("");
  const [studentFullName, setStudentFullName] = useState("");

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email: loginEmail, password: loginPassword });
    setLoading(false);
    if (error) return toast.error(t("auth.loginFailed") + ": " + error.message);
    toast.success(t("auth.welcome"));
    goAfterAuth();
  }

  async function handleGoogle() {
    if (next) sessionStorage.setItem("auth_next", next);
    const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin + "/auth" });
    if (result.error) return toast.error(t("auth.loginFailed"));
    if (result.redirected) return;
    sessionStorage.removeItem("auth_next");
    goAfterAuth();
  }

  async function handleForgot() {
    if (!loginEmail) return toast.error(t("auth.email"));
    const { error } = await supabase.auth.resetPasswordForEmail(loginEmail, {
      redirectTo: window.location.origin + "/reset-password",
    });
    if (error) return toast.error(error.message);
    toast.success(t("auth.resetSent"));
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    if (role === "parent" && (studentFullName.trim().split(/\s+/).length < 2)) return toast.error(t("parentAccess.legalName"));
    if (role === "student" && (!drejtimi || !klasa || !paralelja)) {
      return toast.error(t("auth.fillStudent"));
    }
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email: regEmail,
      password: regPassword,
      options: {
        emailRedirectTo: next ? window.location.origin + next : window.location.origin,
        data: {
          first_name: firstName,
          last_name: lastName,
          role,
          student_full_name: role === "parent" ? studentFullName.trim() : undefined,
          drejtimi: role === "student" ? drejtimi : "",
          klasa: role === "student" ? klasa : "",
          paralelja: role === "student" ? paralelja : "",
        },
      },
    });
    setLoading(false);
    if (error) return toast.error(t("auth.registerFailed") + ": " + error.message);
    toast.success(t("auth.created"));
    // auto sign in (auto_confirm is on)
    await supabase.auth.signInWithPassword({ email: regEmail, password: regPassword });
    goAfterAuth();
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10 bg-background">
      <div className="w-full max-w-md">
        <Link to="/" className="flex items-center gap-2 justify-center mb-6 font-semibold">
          <div className="size-8 rounded-lg gradient-hero flex items-center justify-center text-primary-foreground">
            <GraduationCap className="size-5" />
          </div>
          Suparaku
        </Link>

        <div className="card-soft p-6">
          <Tabs defaultValue={tab}>
            <TabsList className="grid grid-cols-2 w-full mb-4">
              <TabsTrigger value="login">{t("auth.login")}</TabsTrigger>
              <TabsTrigger value="register">{t("auth.register")}</TabsTrigger>
            </TabsList>

            <Button type="button" variant="outline" className="w-full mb-3" onClick={handleGoogle} disabled={loading}>
              <svg className="size-4 mr-2" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M21.35 11.1H12v2.9h5.35c-.23 1.5-1.68 4.4-5.35 4.4-3.22 0-5.85-2.67-5.85-5.95S8.78 6.5 12 6.5c1.83 0 3.06.78 3.76 1.45l2.57-2.47C16.68 3.94 14.55 3 12 3 7.03 3 3 7.03 3 12s4.03 9 9 9c5.2 0 8.64-3.65 8.64-8.8 0-.6-.07-1.05-.29-1.1z"/></svg>
              {t("auth.google")}
            </Button>
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
              <div className="h-px flex-1 bg-border" />{t("auth.or")}<div className="h-px flex-1 bg-border" />
            </div>

            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="le">{t("auth.email")}</Label>
                  <Input id="le" type="email" required value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="lp">{t("auth.password")}</Label>
                  <Input id="lp" type="password" required value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>{loading ? t("auth.signingIn") : t("auth.login")}</Button>
                <button type="button" onClick={handleForgot} className="text-sm text-primary hover:underline w-full text-center">
                  {t("auth.forgot")}
                </button>
              </form>
            </TabsContent>

            <TabsContent value="register">
              <form onSubmit={handleRegister} className="space-y-3">
                <div className="grid grid-cols-3 gap-2">
                  <Button type="button" variant={role === "student" ? "default" : "outline"} onClick={() => setRole("student")}>{t("role.student")}</Button>
                  <Button type="button" variant={role === "teacher" ? "default" : "outline"} onClick={() => setRole("teacher")}>{t("role.teacher")}</Button>
                  <Button type="button" variant={role === "parent" ? "default" : "outline"} onClick={() => setRole("parent")}>{t("role.parent")}</Button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="fn">{t("auth.firstName")}</Label>
                    <Input id="fn" required value={firstName} onChange={(e) => setFirstName(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="ln">{t("auth.lastName")}</Label>
                    <Input id="ln" required value={lastName} onChange={(e) => setLastName(e.target.value)} />
                  </div>
                </div>
                {role === "parent" && <div className="space-y-1.5">
                  <Label htmlFor="student-full-name">{t("parentAccess.studentName")}</Label>
                  <Input id="student-full-name" required maxLength={200} value={studentFullName} onChange={(e) => setStudentFullName(e.target.value)} placeholder={t("parentAccess.legalName")} />
                </div>}
                {role === "student" && (
                  <>
                    <div className="space-y-1.5">
                      <Label>{t("auth.drejtimi")}</Label>
                      <Select value={drejtimi} onValueChange={setDrejtimi}>
                        <SelectTrigger><SelectValue placeholder={t("auth.pickDrejtimi")} /></SelectTrigger>
                        <SelectContent>{DREJTIMET.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1.5">
                        <Label>{t("auth.klasa")}</Label>
                        <Select value={klasa} onValueChange={setKlasa}>
                          <SelectTrigger><SelectValue placeholder={t("auth.klasa")} /></SelectTrigger>
                          <SelectContent>{KLASAT.map((k) => <SelectItem key={k} value={k}>{k}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label>{t("auth.paralelja")}</Label>
                        <Select value={paralelja} onValueChange={setParalelja}>
                          <SelectTrigger><SelectValue placeholder={t("auth.paralelja")} /></SelectTrigger>
                          <SelectContent>{PARALELET.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                    </div>
                  </>
                )}
                <div className="space-y-1.5">
                  <Label htmlFor="re">{t("auth.email")}</Label>
                  <Input id="re" type="email" required value={regEmail} onChange={(e) => setRegEmail(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="rp">{t("auth.passwordHint")}</Label>
                  <Input id="rp" type="password" required minLength={8} value={regPassword} onChange={(e) => setRegPassword(e.target.value)} />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>{loading ? t("auth.registering") : t("auth.createAccount")}</Button>
              </form>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
