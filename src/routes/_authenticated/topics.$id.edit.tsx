import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Save } from "lucide-react";
import { pageMeta } from "@/lib/seo";
import { useI18n } from "@/i18n";

export const Route = createFileRoute("/_authenticated/topics/$id/edit")({
  head: () => ({ meta: pageMeta("Redakto Temën", "Riperpuno manualisht shpjegimet dhe kuizet e gjeneruara nga AI.") }),
  component: EditTopic,
});

function EditTopic() {
  const { t } = useI18n();
  const { id } = Route.useParams();
  const { user } = Route.useRouteContext();
  const qc = useQueryClient();
  const navigate = useNavigate();

  const { data: topic, isLoading } = useQuery({
    queryKey: ["topic", id],
    queryFn: async () => (await supabase.from("topics").select("*").eq("id", id).maybeSingle()).data,
  });
  const { data: course } = useQuery({
    queryKey: ["topic-course", topic?.course_id],
    enabled: !!topic?.course_id,
    queryFn: async () => (await supabase.from("courses").select("teacher_id,title").eq("id", topic!.course_id).maybeSingle()).data,
  });
  const { data: quiz } = useQuery({
    queryKey: ["quiz", id],
    queryFn: async () => (await supabase.from("quizzes").select("*").eq("topic_id", id).maybeSingle()).data,
  });

  const [form, setForm] = useState({
    title: "", summary: "", objectives: "", explanation: "",
    examples: "", exercises: "", exercises_solved: "",
  });
  const [quizJson, setQuizJson] = useState("[]");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (topic) {
      setForm({
        title: topic.title ?? "",
        summary: topic.summary ?? "",
        objectives: topic.objectives ?? "",
        explanation: topic.explanation ?? "",
        examples: topic.examples ?? "",
        exercises: topic.exercises ?? "",
        exercises_solved: topic.exercises_solved ?? "",
      });
    }
  }, [topic]);
  useEffect(() => {
    if (quiz?.questions) setQuizJson(JSON.stringify(quiz.questions, null, 2));
  }, [quiz]);

  if (isLoading || !topic) return <div className="text-muted-foreground">{t("common.loading")}</div>;
  if (course && course.teacher_id !== user.id) {
    return <div className="card-soft p-6 text-destructive">{t("topic.edit.noPerm")}</div>;
  }

  async function save() {
    setSaving(true);
    try {
      let parsedQuiz: unknown = null;
      if (quizJson.trim()) {
        try { parsedQuiz = JSON.parse(quizJson); }
        catch { throw new Error(t("topic.edit.invalidQuizJson")); }
      }
      const { error } = await supabase.from("topics").update(form).eq("id", id);
      if (error) throw new Error(error.message);

      if (parsedQuiz && Array.isArray(parsedQuiz)) {
        if (quiz) {
          await supabase.from("quizzes").update({ questions: parsedQuiz as never }).eq("id", quiz.id);
        } else if (parsedQuiz.length) {
          await supabase.from("quizzes").insert({ topic_id: id, title: `Quiz: ${form.title}`, questions: parsedQuiz as never });
        }
      }
      toast.success(t("topic.edit.saved"));
      qc.invalidateQueries({ queryKey: ["topic", id] });
      qc.invalidateQueries({ queryKey: ["quiz", id] });
      qc.invalidateQueries({ queryKey: ["topics", topic!.course_id] });
      navigate({ to: "/topics/$id", params: { id } });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("common.error"));
    } finally { setSaving(false); }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Link to="/topics/$id" params={{ id }} className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
        <ArrowLeft className="size-4" /> {t("topic.edit.backToTopic")}
      </Link>
      <div>
        <div className="text-xs text-muted-foreground uppercase tracking-wide">{t("topic.edit.eyebrow")}</div>
        <h1 className="text-2xl font-bold">{t("topic.edit.title")}</h1>
      </div>

      <div className="card-soft p-6 space-y-4">
        <Field label={t("topic.edit.field.title")}><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></Field>
        <Field label={t("topic.edit.field.summary")}><Textarea rows={3} value={form.summary} onChange={(e) => setForm({ ...form, summary: e.target.value })} /></Field>
        <Field label={t("topic.edit.field.objectives")}><Textarea rows={4} value={form.objectives} onChange={(e) => setForm({ ...form, objectives: e.target.value })} /></Field>
        <Field label={t("topic.edit.field.explanation")}><Textarea rows={8} value={form.explanation} onChange={(e) => setForm({ ...form, explanation: e.target.value })} /></Field>
        <Field label={t("topic.edit.field.examples")}><Textarea rows={5} value={form.examples} onChange={(e) => setForm({ ...form, examples: e.target.value })} /></Field>
        <Field label={t("topic.edit.field.exercises")}><Textarea rows={5} value={form.exercises} onChange={(e) => setForm({ ...form, exercises: e.target.value })} /></Field>
        <Field label={t("topic.edit.field.exercisesSolved")}><Textarea rows={5} value={form.exercises_solved} onChange={(e) => setForm({ ...form, exercises_solved: e.target.value })} /></Field>

        <div className="space-y-1.5">
          <Label>{t("topic.edit.field.quizJson")}</Label>
          <Textarea rows={10} value={quizJson} onChange={(e) => setQuizJson(e.target.value)} className="font-mono text-xs" />
          <p className="text-[11px] text-muted-foreground">{t("topic.edit.quizHint")}</p>
        </div>

        <div className="flex gap-2 pt-2">
          <Button onClick={save} disabled={saving}><Save className="size-4 mr-1" />{saving ? t("common.saving") : t("topic.edit.saveChanges")}</Button>
          <Link to="/topics/$id" params={{ id }}><Button variant="outline">{t("common.cancel")}</Button></Link>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
