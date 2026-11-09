import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";
import { toast } from "sonner";
import { GraduationCap, Trash2 } from "lucide-react";
import { pageMeta } from "@/lib/seo";
import { useI18n } from "@/i18n";

export const Route = createFileRoute("/_authenticated/exams")({
  head: () => ({ meta: pageMeta("Provimet", "Orari dhe rezultatet e provimeve për nxënësit e Shkollës Teknike Elektrike “Gjergj Canco”.") }),
  component: Page,
});

function Page() {
  const { t } = useI18n();
  const { user } = Route.useRouteContext();
  const qc = useQueryClient();
  const [form, setForm] = useState({ course_id: "", title: "", scheduled_at: "", duration_min: 60, room: "" });

  const { data: roleInfo } = useQuery({
    queryKey: ["role-ex", user.id],
    queryFn: async () => {
      const { data } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
      const roles = (data ?? []).map((r) => r.role);
      return { canEdit: roles.includes("teacher") || roles.includes("admin") };
    },
  });

  const { data: courses } = useQuery({
    queryKey: ["ex-courses", user.id, roleInfo?.canEdit],
    enabled: !!roleInfo,
    queryFn: async () => {
      if (roleInfo?.canEdit) {
        const { data } = await supabase.from("courses").select("id,title").eq("teacher_id", user.id);
        return data ?? [];
      }
      const { data } = await supabase.from("enrollments").select("courses(id,title)").eq("student_id", user.id).eq("status", "approved");
      return (data ?? []).map((e) => e.courses).filter(Boolean);
    },
  });

  const { data: items } = useQuery({
    queryKey: ["exams", courses?.map((c) => c.id).join(",")],
    enabled: !!courses?.length,
    queryFn: async () => {
      const ids = (courses ?? []).map((c) => c.id);
      const { data } = await supabase.from("exams").select("*, courses(title)").in("course_id", ids).order("scheduled_at");
      return data ?? [];
    },
  });

  const add = useMutation({
    mutationFn: async () => {
      if (!form.course_id || !form.title || !form.scheduled_at) throw new Error(t("exam.fillFields"));
      const { error } = await supabase.from("exams").insert({ ...form, teacher_id: user.id, duration_min: Number(form.duration_min) });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["exams"] }); toast.success(t("exam.added")); },
    onError: (e: Error) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("exams").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["exams"] }),
  });

  return (
    <div className="container mx-auto p-4 sm:p-6 space-y-4">
      <h1 className="text-2xl font-semibold flex items-center gap-2"><GraduationCap className="size-6"/> {t("exam.title")}</h1>

      {roleInfo?.canEdit && (
        <Card>
          <CardHeader><CardTitle>{t("exam.scheduleTitle")}</CardTitle></CardHeader>
          <CardContent className="grid sm:grid-cols-6 gap-2">
            <Select value={form.course_id} onValueChange={(v) => setForm({ ...form, course_id: v })}>
              <SelectTrigger className="sm:col-span-2"><SelectValue placeholder={t("exam.coursePlaceholder")} /></SelectTrigger>
              <SelectContent>{(courses ?? []).map((c) => <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}</SelectContent>
            </Select>
            <Input className="sm:col-span-2" placeholder={t("exam.titlePlaceholder")} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            <Input type="datetime-local" value={form.scheduled_at} onChange={(e) => setForm({ ...form, scheduled_at: e.target.value })} />
            <Input type="number" min={15} value={form.duration_min} onChange={(e) => setForm({ ...form, duration_min: Number(e.target.value) })} />
            <Input className="sm:col-span-3" placeholder={t("exam.roomPlaceholder")} value={form.room} onChange={(e) => setForm({ ...form, room: e.target.value })} />
            <Button className="sm:col-span-3" onClick={() => add.mutate()} disabled={add.isPending}>{t("exam.schedule")}</Button>
          </CardContent>
        </Card>
      )}

      <div className="space-y-2">
        {(items ?? []).map((it) => (
          <Card key={it.id}><CardContent className="p-4 flex items-center justify-between">
            <div>
              <div className="font-medium">{it.title} <span className="text-muted-foreground">· {it.courses?.title}</span></div>
              <div className="text-xs text-muted-foreground">{new Date(it.scheduled_at).toLocaleString("sq-AL")} · {it.duration_min} min {it.room ? `· ${it.room}` : ""}</div>
            </div>
            {roleInfo?.canEdit && <Button size="icon" variant="ghost" onClick={() => del.mutate(it.id)}><Trash2 className="size-4"/></Button>}
          </CardContent></Card>
        ))}
        {!(items ?? []).length && <p className="text-sm text-muted-foreground">{t("exam.none")}</p>}
      </div>
    </div>
  );
}
