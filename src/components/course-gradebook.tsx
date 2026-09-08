import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import { toast } from "sonner";
import { Award, ClipboardCheck, Loader2, ShieldCheck } from "lucide-react";
import { setCourseHomeworkGrade, reviewExamAttempt } from "@/lib/grading.functions";
import { useI18n } from "@/i18n";

type Student = {
  id: string;
  first_name: string;
  last_name: string;
  klasa: string | null;
  paralelja: string | null;
};

/**
 * Teacher gradebook for a course:
 * - one overall homework grade per student (4-10; 4 blocks the exam),
 * - confirmation of auto-graded semester / final tests.
 */
export function CourseGradebook({ courseId }: { courseId: string }) {
  const { t } = useI18n();
  const qc = useQueryClient();

  const { data: students } = useQuery({
    queryKey: ["gradebook-students", courseId],
    queryFn: async () => {
      const { data: enrolls } = await supabase
        .from("enrollments")
        .select("student_id")
        .eq("course_id", courseId)
        .eq("status", "approved");
      const ids = (enrolls ?? []).map((e) => e.student_id);
      if (!ids.length) return [] as Student[];
      const { data } = await supabase
        .from("profiles")
        .select("id,first_name,last_name,klasa,paralelja")
        .in("id", ids);
      return (data ?? []) as Student[];
    },
  });

  const { data: hwGrades } = useQuery({
    queryKey: ["gradebook-hw", courseId],
    queryFn: async () => {
      const { data } = await supabase
        .from("course_homework_grades")
        .select("student_id,grade,feedback")
        .eq("course_id", courseId);
      return new Map((data ?? []).map((g) => [g.student_id, g]));
    },
  });

  const { data: pending } = useQuery({
    queryKey: ["gradebook-review", courseId],
    queryFn: async () => {
      const { data: topics } = await supabase
        .from("topics")
        .select("id,title")
        .eq("course_id", courseId);
      const ids = (topics ?? []).map((t) => t.id);
      if (!ids.length) return [];
      const titles = new Map((topics ?? []).map((t) => [t.id, t.title]));
      const { data: quizzes } = await supabase.from("quizzes").select("id,topic_id").in("topic_id", ids);
      const qIds = (quizzes ?? []).map((q) => q.id);
      if (!qIds.length) return [];
      const qTopic = new Map((quizzes ?? []).map((q) => [q.id, q.topic_id]));
      const { data: attempts } = await supabase
        .from("quiz_attempts")
        .select("id,student_id,quiz_id,grade,score,needs_review")
        .in("quiz_id", qIds)
        .eq("needs_review", true)
        .order("created_at", { ascending: false });
      if (!attempts?.length) return [];
      const { data: profs } = await supabase
        .from("profiles")
        .select("id,first_name,last_name")
        .in("id", attempts.map((a) => a.student_id));
      const pmap = new Map((profs ?? []).map((p) => [p.id, p]));
      return attempts.map((a) => ({
        ...a,
        topicTitle: titles.get(qTopic.get(a.quiz_id) ?? "") ?? t("grade.review.fallbackTopic"),
        profile: pmap.get(a.student_id),
      }));
    },
  });

  return (
    <div className="space-y-6">
      <section className="card-soft p-5 space-y-3">
        <h2 className="font-semibold flex items-center gap-2">
          <ClipboardCheck className="size-4" /> {t("grade.hw.title")}
        </h2>
        <p className="text-xs text-muted-foreground">
          {t("grade.hw.desc")}
        </p>
        {!students?.length && <div className="text-sm text-muted-foreground">{t("grade.hw.noStudents")}</div>}
        <div className="space-y-2">
          {students?.map((s) => (
            <HomeworkGradeRow
              key={s.id}
              courseId={courseId}
              student={s}
              existing={hwGrades?.get(s.id) ?? null}
              onSaved={() => qc.invalidateQueries({ queryKey: ["gradebook-hw", courseId] })}
            />
          ))}
        </div>
      </section>

      <section className="card-soft p-5 space-y-3">
        <h2 className="font-semibold flex items-center gap-2">
          <ShieldCheck className="size-4" /> {t("grade.review.title", { count: pending?.length ?? 0 })}
        </h2>
        <p className="text-xs text-muted-foreground">
          {t("grade.review.desc")}
        </p>
        {!pending?.length && <div className="text-sm text-muted-foreground">{t("grade.review.none")}</div>}
        {pending?.map((a) => (
          <ReviewRow
            key={a.id}
            attempt={a}
            onDone={() => qc.invalidateQueries({ queryKey: ["gradebook-review", courseId] })}
          />
        ))}
      </section>
    </div>
  );
}

function HomeworkGradeRow({
  courseId,
  student,
  existing,
  onSaved,
}: {
  courseId: string;
  student: Student;
  existing: { grade: number; feedback: string | null } | null;
  onSaved: () => void;
}) {
  const { t } = useI18n();
  const [grade, setGrade] = useState(existing?.grade?.toString() ?? "");
  const [feedback, setFeedback] = useState(existing?.feedback ?? "");
  const [busy, setBusy] = useState(false);
  const save = useServerFn(setCourseHomeworkGrade);

  async function submit() {
    const g = Number(grade);
    if (!Number.isInteger(g) || g < 4 || g > 10) return toast.error(t("grade.hw.range"));
    setBusy(true);
    try {
      const r = await save({ data: { courseId, studentId: student.id, grade: g, feedback } });
      toast.success(r.canTakeExam ? t("grade.hw.savedCanExam") : t("grade.hw.savedCantExam"));
      onSaved();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("common.error"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-md border border-border p-3 grid sm:grid-cols-[1fr_90px_1fr_auto] gap-2 items-start">
      <div className="text-sm">
        <div className="font-medium">
          {student.first_name} {student.last_name}
        </div>
        <div className="text-xs text-muted-foreground">
          {student.klasa ? `${t("course.new.field.klasa")} ${student.klasa}${student.paralelja ?? ""}` : ""}
          {existing ? t("grade.hw.current", { grade: existing.grade }) : t("grade.hw.none")}
        </div>
      </div>
      <Input type="number" min={4} max={10} placeholder={t("grade.hw.gradePlaceholder")} value={grade} onChange={(e) => setGrade(e.target.value)} />
      <Textarea rows={2} placeholder={t("grade.hw.feedbackPlaceholder")} value={feedback} onChange={(e) => setFeedback(e.target.value)} />
      <Button size="sm" onClick={submit} disabled={busy}>
        {busy ? <Loader2 className="size-3 mr-1 animate-spin" /> : <Award className="size-3 mr-1" />}{t("common.save")}
      </Button>
    </div>
  );
}

function ReviewRow({
  attempt,
  onDone,
}: {
  attempt: {
    id: string;
    grade: number;
    score: number;
    topicTitle: string;
    profile?: { first_name?: string; last_name?: string };
  };
  onDone: () => void;
}) {
  const { t } = useI18n();
  const [grade, setGrade] = useState(attempt.grade.toString());
  const [feedback, setFeedback] = useState("");
  const [busy, setBusy] = useState(false);
  const review = useServerFn(reviewExamAttempt);

  async function confirm() {
    const g = Number(grade);
    if (!Number.isInteger(g) || g < 4 || g > 10) return toast.error(t("grade.hw.range"));
    setBusy(true);
    try {
      await review({ data: { attemptId: attempt.id, grade: g, feedback } });
      toast.success(t("grade.review.confirmed"));
      onDone();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("common.error"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-md border border-border p-3 space-y-2">
      <div className="text-sm">
        <span className="font-medium">
          {attempt.profile?.first_name} {attempt.profile?.last_name}
        </span>{" "}
        · {attempt.topicTitle}{t("grade.review.aiSuggests", { grade: attempt.grade, pct: Math.round(attempt.score * 100) })}
      </div>
      <div className="grid sm:grid-cols-[90px_1fr_auto] gap-2 items-start">
        <Input type="number" min={4} max={10} value={grade} onChange={(e) => setGrade(e.target.value)} />
        <Textarea rows={2} placeholder={t("grade.review.feedbackPlaceholder")} value={feedback} onChange={(e) => setFeedback(e.target.value)} />
        <Button size="sm" onClick={confirm} disabled={busy}>
          {busy ? <Loader2 className="size-3 mr-1 animate-spin" /> : <ShieldCheck className="size-3 mr-1" />}{t("common.confirm")}
        </Button>
      </div>
    </div>
  );
}
