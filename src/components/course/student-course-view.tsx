import { Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Lock, CheckCircle2, ClipboardList, Award } from "lucide-react";
import { toast } from "sonner";
import { generateCertificatePDF } from "@/lib/certificate";
import { notifyCourseEvent } from "@/lib/notify.functions";
import { issueCertificate } from "@/lib/grading.functions";
import { canTakeExam, CERTIFICATE_MIN_AVG } from "@/lib/grading";
import { CourseHeader } from "./course-header";
import { useI18n } from "@/i18n";

export function StudentCourseView({ courseId, userId }: { courseId: string; userId: string }) {
  const { t } = useI18n();
  const qc = useQueryClient();

  const { data: course } = useQuery({
    queryKey: ["course", courseId],
    queryFn: async () => (await supabase.from("courses").select("*").eq("id", courseId).maybeSingle()).data,
  });
  const { data: enrollment } = useQuery({
    queryKey: ["my-enrollment", courseId, userId],
    queryFn: async () =>
      (
        await supabase
          .from("enrollments")
          .select("*")
          .eq("course_id", courseId)
          .eq("student_id", userId)
          .maybeSingle()
      ).data,
  });
  const approved = enrollment?.status === "approved";

  const { data: topics } = useQuery({
    queryKey: ["topics", courseId],
    enabled: approved,
    queryFn: async () =>
      (await supabase.from("topics").select("*").eq("course_id", courseId).order("order_index")).data ?? [],
  });
  const { data: progress } = useQuery({
    queryKey: ["my-progress", courseId, userId],
    enabled: approved,
    queryFn: async () => {
      const { data } = await supabase.from("topic_progress").select("topic_id").eq("student_id", userId);
      return new Set((data ?? []).map((d) => d.topic_id));
    },
  });
  const { data: hwGrade } = useQuery({
    queryKey: ["my-hw-grade", courseId, userId],
    enabled: approved,
    queryFn: async () =>
      (
        await supabase
          .from("course_homework_grades")
          .select("grade,feedback")
          .eq("course_id", courseId)
          .eq("student_id", userId)
          .maybeSingle()
      ).data,
  });

  const notify = useServerFn(notifyCourseEvent);
  const checkCert = useServerFn(issueCertificate);

  async function requestEnroll() {
    const { error } = await supabase.from("enrollments").insert({ student_id: userId, course_id: courseId });
    if (error) return toast.error(error.message);
    toast.success(t("course.enroll.requested"));
    qc.invalidateQueries({ queryKey: ["my-enrollment", courseId, userId] });
    notify({ data: { courseId, event: "enrollment_requested" } }).catch(() => {});
  }

  async function downloadCertificate() {
    const check = await checkCert({ data: { courseId } });
    if (!check.eligible) {
      return toast.error(
        check.pendingReview
          ? t("course.cert.pendingReview")
          : t("course.cert.needAverage", { min: CERTIFICATE_MIN_AVG, avg: check.average?.toFixed(2) ?? "-" }),
      );
    }
    const [{ data: prof }, { data: teacher }] = await Promise.all([
      supabase.from("profiles").select("first_name,last_name,drejtimi,klasa").eq("id", userId).maybeSingle(),
      course?.teacher_id
        ? supabase.from("profiles").select("first_name,last_name").eq("id", course.teacher_id).maybeSingle()
        : Promise.resolve({ data: null }),
    ]);
    await generateCertificatePDF({
      studentName: `${prof?.first_name ?? ""} ${prof?.last_name ?? ""}`.trim() || t("course.cert.studentFallback"),
      courseTitle: course?.title ?? "",
      drejtimi: prof?.drejtimi,
      klasa: prof?.klasa,
      averageGrade: check.average,
      teacherName: teacher ? `${teacher.first_name} ${teacher.last_name}` : null,
    });
    toast.success(t("course.cert.downloaded"));
  }

  if (!enrollment) {
    return (
      <div className="max-w-xl mx-auto card-soft p-8 text-center">
        <h1 className="text-xl font-bold">{course?.title}</h1>
        <p className="text-sm text-muted-foreground mt-2 mb-4">{course?.description}</p>
        <Button onClick={requestEnroll}>{t("course.enroll.request")}</Button>
      </div>
    );
  }
  if (enrollment.status === "pending") {
    return (
      <div className="card-soft p-6 text-center">
        <h1 className="font-semibold">{course?.title}</h1>
        <p className="text-sm text-muted-foreground mt-2">
          {t("course.enroll.pending")}
        </p>
      </div>
    );
  }
  if (enrollment.status === "rejected") {
    return (
      <div className="card-soft p-6 text-center">
        <p className="text-destructive">{t("course.enroll.rejected")}</p>
      </div>
    );
  }

  let firstUncompletedIdx = topics?.findIndex((t) => !progress?.has(t.id)) ?? -1;
  if (firstUncompletedIdx === -1) firstUncompletedIdx = topics?.length ?? 0;
  const allDone = !!topics?.length && (progress?.size ?? 0) >= topics.length;
  const examAllowed = canTakeExam(hwGrade?.grade);

  return (
    <div className="space-y-6">
      <CourseHeader
        title={course?.title}
        subtitle={t("course.progress", { done: progress?.size ?? 0, total: topics?.length ?? 0 })}
        coverUrl={course?.cover_image_url ?? null}
        actions={
          allDone ? (
            <Button onClick={downloadCertificate} className="gap-2">
              <Award className="size-4" /> {t("course.downloadCertificate")}
            </Button>
          ) : null
        }
      />

      <div className={`card-soft p-4 text-sm ${examAllowed ? "" : "border-destructive/40"}`}>
        {hwGrade ? (
          <>
            <span className="font-medium">{t("course.hwGrade.label", { grade: hwGrade.grade })}</span>
            {hwGrade.feedback ? <span className="text-muted-foreground"> · {hwGrade.feedback}</span> : null}
            <div className={examAllowed ? "text-success text-xs mt-1" : "text-destructive text-xs mt-1"}>
              {examAllowed
                ? t("course.hwGrade.allowed")
                : t("course.hwGrade.blocked")}
            </div>
          </>
        ) : (
          <span className="text-muted-foreground">
            {t("course.hwGrade.notGraded")}
          </span>
        )}
      </div>

      <div className="card-soft divide-y divide-border">
        {topics?.map((topic, i) => {
          const completed = progress?.has(topic.id);
          const isExam = topic.is_test || topic.is_final;
          const locked = i > firstUncompletedIdx || (isExam && !examAllowed);
          return (
            <div key={topic.id} className="p-3 flex items-center gap-3">
              <div
                className={`size-8 rounded-full flex items-center justify-center text-xs font-semibold ${completed ? "bg-success text-success-foreground" : locked ? "bg-muted text-muted-foreground" : "bg-primary text-primary-foreground"}`}
              >
                {completed ? <CheckCircle2 className="size-4" /> : locked ? <Lock className="size-4" /> : i + 1}
              </div>
              <div className="flex-1">
                <div className="text-xs text-muted-foreground">
                  {topic.is_test ? t("course.topic.test") : topic.is_final ? t("course.topic.final") : t("course.topic.nth", { n: i + 1 })}
                </div>
                <div className="font-medium">{topic.title}</div>
                {isExam && !examAllowed && (
                  <div className="text-xs text-destructive">{t("course.topic.blockedExplain")}</div>
                )}
              </div>
              {!locked ? (
                <Link to="/topics/$id" params={{ id: topic.id }}>
                  <Button size="sm" variant={completed ? "outline" : "default"}>
                    {completed ? (
                      t("course.topic.retry")
                    ) : isExam ? (
                      <>
                        <ClipboardList className="size-3 mr-1" />
                        {t("course.topic.startTest")}
                      </>
                    ) : (
                      t("course.topic.open")
                    )}
                  </Button>
                </Link>
              ) : (
                <Button size="sm" variant="outline" disabled>
                  {t("course.topic.locked")}
                </Button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
