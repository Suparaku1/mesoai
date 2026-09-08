import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { pageMeta } from "@/lib/seo";
import { useI18n } from "@/i18n";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({ meta: pageMeta("Cilësimet", "Përditëso profilin, fjalëkalimin dhe preferencat e llogarisë.") }),
  component: Page,
});

function Page() {
  const { user } = Route.useRouteContext();
  const { t } = useI18n();
  const navigate = useNavigate();
  const [form, setForm] = useState({ first_name: "", last_name: "" });
  const [pw, setPw] = useState("");

  const { data: profile } = useQuery({
    queryKey: ["profile-edit", user.id],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
      return data;
    },
  });

  useEffect(() => { if (profile) setForm({ first_name: profile.first_name ?? "", last_name: profile.last_name ?? "" }); }, [profile]);

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("profiles").update(form).eq("id", user.id);
      if (error) throw error;
    },
    onSuccess: () => toast.success(t("set.saved")),
    onError: (e: any) => toast.error(e.message),
  });

  const changePw = useMutation({
    mutationFn: async () => {
      if (pw.length < 8) throw new Error(t("set.errPasswordLen"));
      const { error } = await supabase.auth.updateUser({ password: pw });
      if (error) throw error;
    },
    onSuccess: () => { setPw(""); toast.success(t("set.updated")); },
    onError: (e: any) => toast.error(e.message),
  });

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true, search: { tab: "login" } as never });
  }

  return (
    <div className="container mx-auto p-4 sm:p-6 max-w-2xl space-y-4">
      <h1 className="text-2xl font-semibold">{t("set.title")}</h1>

      <Card>
        <CardHeader><CardTitle>{t("set.profile")}</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div><Label>{t("set.email")}</Label><Input value={profile?.email ?? ""} disabled /></div>
          <div className="grid sm:grid-cols-2 gap-2">
            <div><Label>{t("set.firstName")}</Label><Input value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} /></div>
            <div><Label>{t("set.lastName")}</Label><Input value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} /></div>
          </div>
          <Button onClick={() => save.mutate()} disabled={save.isPending}>{t("set.save")}</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>{t("set.changePassword")}</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Input type="password" placeholder={t("set.newPassword")} value={pw} onChange={(e) => setPw(e.target.value)} />
          <Button onClick={() => changePw.mutate()} disabled={changePw.isPending || !pw}>{t("set.update")}</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>{t("set.session")}</CardTitle></CardHeader>
        <CardContent><Button variant="destructive" onClick={signOut}>{t("set.signOut")}</Button></CardContent>
      </Card>
    </div>
  );
}
