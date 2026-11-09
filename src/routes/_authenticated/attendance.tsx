import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { pageMeta } from "@/lib/seo";
import { useI18n } from "@/i18n";

export const Route = createFileRoute("/_authenticated/attendance")({
  head: () => ({ meta: pageMeta("Frekuentimi", "Regjistrimi i pjesëmarrjes së nxënësve në orët mësimore, me raporte për mësuesit.") }),
  component: Page,
});

function Page() {
  const { t } = useI18n();
  const STATUSES = [
    { v: "present", label: t("att.status.present") },
    { v: "absent", label: t("att.status.absent") },
    { v: "late", label: t("att.status.late") },
    { v: "excused", label: t("att.status.excused") },
  ];
  const { user } = Route.useRouteContext();
  const qc = useQueryClient();
  const [date, setDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [courseId, setCourseId] = useState<string>("");

  const { data: roleInfo } = useQuery({
    queryKey: ["my-role", user.id],
    queryFn: async () => {
      const { data } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
      const roles = (data ?? []).map((r) => r.role);
      return { isTeacher: roles.includes("teacher") || roles.includes("admin"), isStudent: roles.includes("student") };
    },
  });

  const { data: courses } = useQuery({
    queryKey: ["att-courses", user.id, roleInfo?.isTeacher],
    enabled: !!roleInfo,
    queryFn: async () => {
      if (roleInfo?.isTeacher) {
        const { data } = await supabase.from("courses").select("id,title").eq("teacher_id", user.id);
        return data ?? [];
      } else {
        const { data } = await supabase
          .from("enrollments")
          .select("course_id, courses(id,title)")
          .eq("student_id", user.id)
          .eq("status", "approved");
        return (data ?? []).map((e) => e.courses).filter(Boolean);
      }
    },
  });

  const { data: students } = useQuery({
    queryKey: ["att-students", courseId],
    enabled: !!courseId && !!roleInfo?.isTeacher,
    queryFn: async () => {
      const { data } = await supabase
        .from("enrollments")
        .select("student_id")
        .eq("course_id", courseId)
        .eq("status", "approved");
      const ids = (data ?? []).map((e) => e.student_id);
      if (!ids.length) return [];
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, first_name, last_name, email")
        .in("id", ids);
      return profs ?? [];
    },
  });

  const { data: rows } = useQuery({
    queryKey: ["att-rows", courseId, date, user.id],
    enabled: !!courseId,
    queryFn: async () => {
      let q = supabase.from("attendance").select("*").eq("course_id", courseId).eq("date", date);
      if (!roleInfo?.isTeacher) q = q.eq("student_id", user.id);
      const { data } = await q;
      return data ?? [];
    },
  });

  const mapByStudent = useMemo(() => {
    const m: Record<string, any> = {};
    (rows ?? []).forEach((r) => (m[r.student_id] = r));
    return m;
  }, [rows]);

  const mark = useMutation({
    mutationFn: async ({ studentId, status }: { studentId: string; status: string }) => {
      const existing = mapByStudent[studentId];
      if (existing) {
        const { error } = await supabase.from("attendance").update({ status }).eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("attendance").insert({ course_id: courseId, student_id: studentId, teacher_id: user.id, date, status });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["att-rows", courseId, date] });
      toast.success(t("att.saved"));
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="container mx-auto p-4 sm:p-6 space-y-4">
      <h1 className="text-2xl font-semibold">{t("att.title")}</h1>
      <div className="flex flex-wrap gap-3">
        <Select value={courseId} onValueChange={setCourseId}>
          <SelectTrigger className="w-72"><SelectValue placeholder={t("att.pickCourse")} /></SelectTrigger>
          <SelectContent>
            {(courses ?? []).map((c) => <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}
          </SelectContent>
        </Select>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="border border-input bg-background rounded-md px-3 py-2 text-sm" />
      </div>

      {courseId && roleInfo?.isTeacher && (
        <Card>
          <CardHeader><CardTitle>{t("att.studentsListTitle")}</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {(students ?? []).map((s) => {
              const cur = mapByStudent[s.id]?.status;
              return (
                <div key={s.id} className="flex items-center justify-between gap-3 border-b border-border/40 pb-2">
                  <div className="text-sm font-medium">{s.first_name} {s.last_name} <span className="text-muted-foreground">· {s.email}</span></div>
                  <div className="flex gap-1">
                    {STATUSES.map((st) => (
                      <Button key={st.v} size="sm" variant={cur === st.v ? "default" : "outline"} onClick={() => mark.mutate({ studentId: s.id, status: st.v })}>{st.label}</Button>
                    ))}
                  </div>
                </div>
              );
            })}
            {!(students ?? []).length && <p className="text-sm text-muted-foreground">{t("att.noStudents")}</p>}
          </CardContent>
        </Card>
      )}

      {courseId && !roleInfo?.isTeacher && (
        <Card>
          <CardHeader><CardTitle>{t("att.myStatusTitle")}</CardTitle></CardHeader>
          <CardContent>
            {(rows ?? []).map((r) => (
              <div key={r.id} className="flex justify-between border-b border-border/40 py-2 text-sm">
                <span>{r.date}</span>
                <Badge>{STATUSES.find((s) => s.v === r.status)?.label ?? r.status}</Badge>
              </div>
            ))}
            {!(rows ?? []).length && <p className="text-sm text-muted-foreground">{t("att.noRecords")}</p>}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
