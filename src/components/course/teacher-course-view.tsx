import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  BookOpen,
  Users,
  Sparkles,
  Loader2,
  Bell,
  BellOff,
  Trash2,
  Pencil,
  Database,
} from "lucide-react";
import { toast } from "sonner";
import { generateCourseCover } from "@/lib/cover.functions";
import { ingestCourseKnowledge } from "@/lib/rag.functions";
import { notifyCourseEvent } from "@/lib/notify.functions";
import { CourseGradebook } from "@/components/course-gradebook";
import { CourseHeader } from "./course-header";
import { useI18n } from "@/i18n";

export function TeacherCourseView({ courseId }: { courseId: string }) {
  const { t } = useI18n();
  const qc = useQueryClient();
  const navigate = useNavigate();

  const { data: course } = useQuery({
    queryKey: ["course", courseId],
    queryFn: async () => (await supabase.from("courses").select("*").eq("id", courseId).maybeSingle()).data,
  });
  const { data: topics } = useQuery({
    queryKey: ["topics", courseId],
    queryFn: async () =>
      (await supabase.from("topics").select("*").eq("course_id", courseId).order("order_index")).data ?? [],
  });
  const { data: requests } = useQuery({
    queryKey: ["enrollments", courseId],
    queryFn: async () => {
      const { data: enrolls } = await supabase
        .from("enrollments")
        .select("*")
        .eq("course_id", courseId)
        .order("created_at", { ascending: false });
      if (!enrolls?.length) return [];
      const ids = enrolls.map((e) => e.student_id);
      const { data: profs } = await supabase.from("profiles").select("*").in("id", ids);
      const map = new Map((profs ?? []).map((p) => [p.id, p]));
      return enrolls.map((e) => ({ ...e, profile: map.get(e.student_id) }));
    },
  });

  const notify = useServerFn(notifyCourseEvent);

  async function decide(enrollmentId: string, studentId: string, status: "approved" | "rejected") {
    const { error } = await supabase.from("enrollments").update({ status }).eq("id", enrollmentId);
    if (error) return toast.error(error.message);
    toast.success(status === "approved" ? t("course.enrollments.approved") : t("course.enrollments.rejected"));
    qc.invalidateQueries({ queryKey: ["enrollments", courseId] });
    notify({
      data: { courseId, studentId, event: status === "approved" ? "enrollment_approved" : "enrollment_rejected" },
    }).catch(() => {});
  }

  async function toggleEmails() {
    const next = !course?.email_notifications;
    const { error } = await supabase.from("courses").update({ email_notifications: next }).eq("id", courseId);
    if (error) return toast.error(error.message);
    toast.success(next ? t("course.emails.on") : t("course.emails.off"));
    qc.invalidateQueries({ queryKey: ["course", courseId] });
  }

  async function deleteCourse() {
    if (!window.confirm(t("course.delete.confirm"))) return;
    const { error } = await supabase
      .from("courses")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", courseId);
    if (error) return toast.error(error.message);
    toast.success(t("course.delete.done"));
    navigate({ to: "/dashboard" });
  }

  const genCover = useServerFn(generateCourseCover);
  const coverMut = useMutation({
    mutationFn: () =>
      genCover({ data: { courseId, prompt: `${course?.title ?? "Kurs"} - ${course?.drejtimi ?? ""}` } }),
    onSuccess: () => {
      toast.success(t("course.cover.generated"));
      qc.invalidateQueries({ queryKey: ["course", courseId] });
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : t("common.error")),
  });

  const ingest = useServerFn(ingestCourseKnowledge);
  const ingestMut = useMutation({
    mutationFn: () => ingest({ data: { courseId } }),
    onSuccess: (r) => toast.success(t("course.ingest.success", { count: r.chunks })),
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : t("course.ingest.error")),
  });

  const pendingCount = requests?.filter((r) => r.status === "pending").length ?? 0;

  return (
    <div className="space-y-6">
      <CourseHeader
        title={course?.title}
        subtitle={`${course?.drejtimi ?? ""} · ${t("course.new.field.klasa")} ${course?.klasa ?? ""}${course?.paralelja ? ` ${course.paralelja}` : ""}`}
        coverUrl={course?.cover_image_url ?? null}
        actions={
          <>
            <Button variant="outline" size="sm" onClick={() => coverMut.mutate()} disabled={coverMut.isPending}>
              {coverMut.isPending ? (
                <Loader2 className="size-4 mr-1 animate-spin" />
              ) : (
                <Sparkles className="size-4 mr-1" />
              )}
              {course?.cover_image_url ? t("course.cover.regenerate") : t("course.cover.generate")}
            </Button>
            <Button variant="outline" size="sm" onClick={() => ingestMut.mutate()} disabled={ingestMut.isPending}>
              {ingestMut.isPending ? (
                <Loader2 className="size-4 mr-1 animate-spin" />
              ) : (
                <Database className="size-4 mr-1" />
              )}
              {t("course.ingest.action")}
            </Button>
            <Button variant="outline" size="sm" onClick={toggleEmails}>
              {course?.email_notifications ? <Bell className="size-4 mr-1" /> : <BellOff className="size-4 mr-1" />}
              {course?.email_notifications ? t("course.emails.active") : t("course.emails.inactive")}
            </Button>
            <Button variant="outline" size="sm" className="text-destructive" onClick={deleteCourse}>
              <Trash2 className="size-4 mr-1" /> {t("course.delete.action")}
            </Button>
          </>
        }
      />

      <section>
        <h2 className="font-semibold mb-2 flex items-center gap-2">
          <Users className="size-4" /> {t("course.enrollments.title", { count: pendingCount })}
        </h2>
        <div className="card-soft divide-y divide-border">
          {!requests?.length && <div className="p-4 text-sm text-muted-foreground">{t("course.enrollments.none")}</div>}
          {requests?.map((r) => (
            <div key={r.id} className="p-3 flex items-center justify-between gap-3">
              <div className="text-sm">
                <div className="font-medium">
                  {r.profile?.first_name} {r.profile?.last_name}
                </div>
                <div className="text-xs text-muted-foreground">
                  {r.profile?.klasa ? `Klasa ${r.profile.klasa}${r.profile.paralelja ?? ""}` : ""} ·{" "}
                  <span
                    className={
                      r.status === "approved"
                        ? "text-success"
                        : r.status === "pending"
                          ? "text-warning-foreground"
                          : "text-destructive"
                    }
                  >
                    {r.status}
                  </span>
                </div>
              </div>
              {r.status === "pending" && (
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => decide(r.id, r.student_id, "approved")}>
                    {t("course.enrollments.approve")}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => decide(r.id, r.student_id, "rejected")}>
                    {t("course.enrollments.reject")}
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="font-semibold mb-2 flex items-center gap-2">
          <BookOpen className="size-4" /> {t("course.topics.title", { count: topics?.length ?? 0 })}
        </h2>
        <div className="card-soft divide-y divide-border">
          {!topics?.length && (
            <div className="p-4 text-sm text-muted-foreground">{t("course.topics.none")}</div>
          )}
          {topics?.map((topic) => (
            <div key={topic.id} className="p-3 flex items-center justify-between gap-2">
              <div>
                <div className="text-xs text-muted-foreground">
                  {t("course.topic.nth", { n: topic.order_index + 1 })}
                  {topic.is_test ? " · TEST" : ""}
                  {topic.is_final ? " · FINAL" : ""}
                </div>
                <div className="font-medium">{topic.title}</div>
              </div>
              <Link to="/topics/$id/edit" params={{ id: topic.id }}>
                <Button size="sm" variant="outline">
                  <Pencil className="size-3 mr-1" />
                  {t("course.topics.redo")}
                </Button>
              </Link>
            </div>
          ))}
        </div>
      </section>

      <CourseGradebook courseId={courseId} />
    </div>
  );
}
