import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
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

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email: loginEmail, password: loginPassword });
    setLoading(false);
    if (error) return toast.error(t("auth.loginFailed") + ": " + error.message);
    toast.success(t("auth.welcome"));
    goAfterAuth();
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
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
              </form>
            </TabsContent>

            <TabsContent value="register">
              <form onSubmit={handleRegister} className="space-y-3">
                <div className="grid grid-cols-3 gap-2">
                  <Button type="button" variant={role === "student" ? "default" : "outline"} onClick={() => setRole("student" as any)}>{t("role.student")}</Button>
                  <Button type="button" variant={role === "teacher" ? "default" : "outline"} onClick={() => setRole("teacher" as any)}>{t("role.teacher")}</Button>
                  <Button type="button" variant={(role as any) === "parent" ? "default" : "outline"} onClick={() => setRole("parent" as any)}>{t("role.parent")}</Button>
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
