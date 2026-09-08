import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { pageMeta } from "@/lib/seo";
import { useI18n } from "@/i18n";

export const Route = createFileRoute("/_authenticated/schedule")({
  head: () => ({ meta: pageMeta("Orari", "Orari javor i mësimit sipas drejtimit, klasës dhe paraleles.") }),
  component: Page,
});



function Page() {
  const { t } = useI18n();
  const DAYS = [t("sched.day.mon"), t("sched.day.tue"), t("sched.day.wed"), t("sched.day.thu"), t("sched.day.fri"), t("sched.day.sat"), t("sched.day.sun")];
  const { user } = Route.useRouteContext();
  const qc = useQueryClient();
  const [form, setForm] = useState({ course_id: "", day_of_week: 1, start_time: "08:00", end_time: "09:00", room: "" });

  const { data: roleInfo } = useQuery({
    queryKey: ["role-sched", user.id],
    queryFn: async () => {
      const { data } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
      const roles = (data ?? []).map((r: any) => r.role);
      return { canEdit: roles.includes("teacher") || roles.includes("admin") };
    },
  });

  const { data: courses } = useQuery({
    queryKey: ["sched-courses", user.id, roleInfo?.canEdit],
    enabled: !!roleInfo,
    queryFn: async () => {
      if (roleInfo?.canEdit) {
        const { data } = await supabase.from("courses").select("id,title").eq("teacher_id", user.id);
        return data ?? [];
      }
      const { data } = await supabase.from("enrollments").select("courses(id,title)").eq("student_id", user.id).eq("status", "approved");
      return (data ?? []).map((e: any) => e.courses).filter(Boolean);
    },
  });

  const { data: items } = useQuery({
    queryKey: ["sched", courses?.map((c: any) => c.id).join(",")],
    enabled: !!courses?.length,
    queryFn: async () => {
      const ids = (courses ?? []).map((c: any) => c.id);
      const { data } = await supabase.from("schedule").select("*, courses(title)").in("course_id", ids).order("day_of_week").order("start_time");
      return data ?? [];
    },
  });

  const add = useMutation({
    mutationFn: async () => {
      if (!form.course_id) throw new Error(t("sched.pickCourse"));
      const { error } = await supabase.from("schedule").insert({ ...form, teacher_id: user.id });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["sched"] }); toast.success(t("sched.added")); },
    onError: (e: any) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("schedule").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sched"] }),
  });

  const byDay = (d: number) => (items ?? []).filter((i: any) => i.day_of_week === d);

  return (
    <div className="container mx-auto p-4 sm:p-6 space-y-4">
      <h1 className="text-2xl font-semibold">{t("sched.title")}</h1>

      {roleInfo?.canEdit && (
        <Card>
          <CardHeader><CardTitle>{t("sched.addTitle")}</CardTitle></CardHeader>
          <CardContent className="grid sm:grid-cols-6 gap-2">
            <Select value={form.course_id} onValueChange={(v) => setForm({ ...form, course_id: v })}>
              <SelectTrigger className="sm:col-span-2"><SelectValue placeholder={t("sched.coursePlaceholder")} /></SelectTrigger>
              <SelectContent>{(courses ?? []).map((c: any) => <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={String(form.day_of_week)} onValueChange={(v) => setForm({ ...form, day_of_week: Number(v) })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{DAYS.map((d, i) => <SelectItem key={i} value={String(i + 1)}>{d}</SelectItem>)}</SelectContent>
            </Select>
            <Input type="time" value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} />
            <Input type="time" value={form.end_time} onChange={(e) => setForm({ ...form, end_time: e.target.value })} />
            <Input placeholder={t("sched.roomPlaceholder")} value={form.room} onChange={(e) => setForm({ ...form, room: e.target.value })} />
            <Button className="sm:col-span-6" onClick={() => add.mutate()} disabled={add.isPending}>{t("sched.add")}</Button>
          </CardContent>
        </Card>
      )}

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {DAYS.map((d, i) => (
          <Card key={i}>
            <CardHeader><CardTitle className="text-base">{d}</CardTitle></CardHeader>
            <CardContent className="space-y-1.5">
              {byDay(i + 1).map((it: any) => (
                <div key={it.id} className="flex items-center justify-between text-sm border-b border-border/40 pb-1">
                  <div>
                    <div className="font-medium">{it.courses?.title}</div>
                    <div className="text-xs text-muted-foreground">{it.start_time?.slice(0,5)}–{it.end_time?.slice(0,5)} {it.room ? `· ${it.room}` : ""}</div>
                  </div>
                  {roleInfo?.canEdit && <Button size="icon" variant="ghost" onClick={() => del.mutate(it.id)}><Trash2 className="size-4" /></Button>}
                </div>
              ))}
              {!byDay(i + 1).length && <p className="text-xs text-muted-foreground">{t("sched.noneForDay")}</p>}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
