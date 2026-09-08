import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useRole } from "@/hooks/use-role";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { toast } from "sonner";
import { scoreToGrade } from "@/lib/grading";
import { ArrowLeft, CheckCircle2, Pencil } from "lucide-react";
import { motion } from "framer-motion";
import { HomeworkSection } from "@/components/homework-section";
import { useServerFn } from "@tanstack/react-start";
import { notifyCourseEvent } from "@/lib/notify.functions";
import { pageMeta } from "@/lib/seo";
import { useI18n } from "@/i18n";


type Question =
  | { type: "mcq"; question: string; options: string[]; correct: number }
  | { type: "tf"; question: string; correct: boolean }
  | { type: "fill"; question: string; answer: string };

export const Route = createFileRoute("/_authenticated/topics/$id")({
  head: () => ({ meta: pageMeta("Tema", "Shpjegime, materiale dhe testim për temën aktuale të kursit.") }),
  component: TopicView,
});

function TopicView() {
  const { t } = useI18n();
  const { id } = Route.useParams();
  const { user } = Route.useRouteContext();
  const qc = useQueryClient();
  const navigate = useNavigate();

  const { data: topic } = useQuery({
    queryKey: ["topic", id],
    queryFn: async () => (await supabase.from("topics").select("*").eq("id", id).maybeSingle()).data,
  });
  const { data: quiz } = useQuery({
    queryKey: ["quiz", id],
    queryFn: async () => (await supabase.from("quizzes").select("*").eq("topic_id", id).maybeSingle()).data,
  });
  const { data: primaryRole } = useRole(user.id);
  const role = (primaryRole === "admin" ? "teacher" : primaryRole === "parent" ? "student" : primaryRole) as "teacher" | "student" | undefined;
  const { data: course } = useQuery({
    queryKey: ["topic-course", topic?.course_id],
    enabled: !!topic?.course_id,
    queryFn: async () => (await supabase.from("courses").select("teacher_id").eq("id", topic!.course_id).maybeSingle()).data,
  });

  const notify = useServerFn(notifyCourseEvent);
  const [answers, setAnswers] = useState<Record<number, unknown>>({});
  const [submitted, setSubmitted] = useState<{ grade: number; score: number } | null>(null);


  if (!topic) return <div className="text-muted-foreground">{t("common.loading")}</div>;

  const questions = (quiz?.questions as Question[] | null) ?? [];
  const isTestOnly = topic.is_test || topic.is_final;
  const courseId = topic.course_id;
  const isOwner = role === "teacher" && course?.teacher_id === user.id;

  async function markComplete() {
    await supabase.from("topic_progress").upsert({ student_id: user.id, topic_id: id }, { onConflict: "student_id,topic_id" });
    toast.success(t("topic.completed"));
    qc.invalidateQueries({ queryKey: ["my-progress"] });
    notify({ data: { courseId, event: "topic_completed", topicTitle: topic!.title } }).catch(() => {});
    navigate({ to: "/courses/$id", params: { id: courseId } });
  }

  async function submitQuiz() {
    if (!quiz) return;
    let correct = 0;
    questions.forEach((q, i) => {
      const a = answers[i];
      if (q.type === "mcq" && Number(a) === q.correct) correct++;
      else if (q.type === "tf" && a === q.correct) correct++;
      else if (q.type === "fill" && typeof a === "string" && a.trim().toLowerCase() === q.answer.trim().toLowerCase()) correct++;
    });
    const score = questions.length ? correct / questions.length : 0;
    const grade = scoreToGrade(score);
    // Small topic quizzes are graded by AI automatically; semester and final
    // tests need the teacher's confirmation before the grade counts.
    const needsReview = !!isTestOnly;
    const { error } = await supabase.from("quiz_attempts").insert({
      quiz_id: quiz.id, student_id: user.id, answers: answers as never, score, grade, needs_review: needsReview,
    });
    if (error) return toast.error(error.message);
    await supabase.from("topic_progress").upsert({ student_id: user.id, topic_id: id }, { onConflict: "student_id,topic_id" });
    setSubmitted({ grade, score });
    qc.invalidateQueries({ queryKey: ["my-progress"] });
    notify({
      data: {
        courseId,
        event: needsReview ? "exam_pending_review" : "topic_completed",
        topicTitle: topic!.title,
        grade,
      },
    }).catch(() => {});
  }


  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="max-w-3xl mx-auto space-y-6"
    >
      <div className="flex items-center justify-between">
        <Link to="/courses/$id" params={{ id: topic.course_id }} className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
          <ArrowLeft className="size-4" /> {t("topic.backToCourse")}
        </Link>
        {isOwner && (
          <Link to="/topics/$id/edit" params={{ id }}>
            <Button size="sm" variant="outline"><Pencil className="size-3 mr-1" />{t("topic.edit")}</Button>
          </Link>
        )}
      </div>
      <div>
        <div className="text-xs text-muted-foreground uppercase tracking-wide">{topic.is_final ? t("topic.badge.final") : topic.is_test ? t("topic.badge.test") : t("topic.badge.lesson")}</div>
        <h1 className="text-2xl font-bold">{topic.title}</h1>
      </div>

      {!isTestOnly && (
        <div className="space-y-4">
          {topic.summary && <Section title={t("topic.section.summary")} delay={0.05}>{topic.summary}</Section>}
          {topic.objectives && <Section title={t("topic.section.objectives")} delay={0.1}>{topic.objectives}</Section>}
          {topic.explanation && <Section title={t("topic.section.explanation")} delay={0.15}>{topic.explanation}</Section>}
          {topic.examples && <Section title={t("topic.section.examples")} delay={0.2}>{topic.examples}</Section>}
          {topic.exercises && <Section title={t("topic.section.exercises")} delay={0.25}>{topic.exercises}</Section>}
          {topic.exercises_solved && <Section title={t("topic.section.exercisesSolved")} delay={0.3}>{topic.exercises_solved}</Section>}
        </div>
      )}

      {questions.length > 0 && (
        <div className="card-soft p-6 space-y-4">
          <h2 className="font-semibold">{isTestOnly ? t("topic.test.title") : t("topic.quiz.title")}</h2>
          {questions.map((q, i) => (
            <div key={i} className="space-y-2">
              <div className="text-sm font-medium">{i + 1}. {q.question}</div>
              {q.type === "mcq" && q.options?.map((opt, oi) => (
                <label key={oi} className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="radio" name={`q${i}`} disabled={!!submitted} onChange={() => setAnswers((a) => ({ ...a, [i]: oi }))} />
                  {opt}
                  {submitted && oi === q.correct && <span className="text-success text-xs">{t("topic.answer.correct")}</span>}
                </label>
              ))}
              {q.type === "tf" && (
                <div className="flex gap-3">
                  {[true, false].map((v) => (
                    <label key={String(v)} className="flex items-center gap-2 text-sm cursor-pointer">
                      <input type="radio" name={`q${i}`} disabled={!!submitted} onChange={() => setAnswers((a) => ({ ...a, [i]: v }))} />
                      {v ? t("topic.answer.true") : t("topic.answer.false")}
                      {submitted && v === q.correct && <span className="text-success text-xs">✓</span>}
                    </label>
                  ))}
                </div>
              )}
              {q.type === "fill" && (
                <input type="text" disabled={!!submitted} className="border rounded px-2 py-1 text-sm w-full" onChange={(e) => setAnswers((a) => ({ ...a, [i]: e.target.value }))} placeholder={t("topic.answer.placeholder")} />
              )}
            </div>
          ))}
          {!submitted ? (
            <Button onClick={submitQuiz}>{t("topic.submit")}</Button>
          ) : (
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="rounded-lg bg-success/10 border border-success/30 p-4 text-center">
              <div className="text-3xl font-bold text-success">{submitted.grade}</div>
              <div className="text-sm text-muted-foreground">{t("topic.result.label", { pct: Math.round(submitted.score * 100) })}</div>
              <Link to="/courses/$id" params={{ id: topic.course_id }}><Button className="mt-3" size="sm">{t("topic.result.backToCourse")}</Button></Link>
            </motion.div>
          )}
        </div>
      )}

      {!isTestOnly && questions.length === 0 && role === "student" && (
        <Button onClick={markComplete}><CheckCircle2 className="size-4 mr-1" /> {t("topic.markComplete")}</Button>
      )}

      {!isTestOnly && (
        <HomeworkSection topicId={id} courseId={courseId} userId={user.id} role={role} />
      )}
    </motion.div>
  );
}

function Section({ title, children, delay = 0 }: { title: string; children: React.ReactNode; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay, ease: "easeOut" }}
      className="card-soft p-5"
    >
      <h2 className="font-semibold mb-2">{title}</h2>
      <div className="text-sm whitespace-pre-wrap text-foreground/90">{children}</div>
    </motion.div>
  );
}
