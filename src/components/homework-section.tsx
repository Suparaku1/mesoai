import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { toast } from "sonner";
import { Upload, FileText, Check, CalendarPlus } from "lucide-react";
import { notifyHomeworkGraded, addHomeworkToCalendar } from "@/lib/notify.functions";
import { useI18n } from "@/i18n";

/**
 * Homework section embedded inside the topic page.
 * - Teacher: create/edit homework instructions, list submissions, grade + feedback.
 * - Student (approved enrollment): see instructions, upload file, see grade & feedback.
 */
export function HomeworkSection({
  topicId, courseId, userId, role,
}: { topicId: string; courseId: string; userId: string; role: "teacher" | "student" | undefined }) {
  const qc = useQueryClient();

  const { data: homework } = useQuery({
    queryKey: ["homework", topicId],
    queryFn: async () => (await supabase.from("homework").select("*").eq("topic_id", topicId).maybeSingle()).data,
  });

  if (role === "teacher") {
    return <TeacherHomework topicId={topicId} courseId={courseId} homework={homework} qc={qc} />;
  }
  if (!homework) return null;
  return <StudentHomework homework={homework} userId={userId} qc={qc} />;
}

function TeacherHomework({ topicId, courseId, homework, qc }: {
  topicId: string; courseId: string; homework: { id: string; instructions: string; due_date?: string | null } | null | undefined; qc: ReturnType<typeof useQueryClient>;
}) {
  const { t } = useI18n();
  const [instructions, setInstructions] = useState(homework?.instructions ?? "");
  const [dueDate, setDueDate] = useState(homework?.due_date ? new Date(homework.due_date).toISOString().slice(0, 16) : "");
  const [saving, setSaving] = useState(false);
  const [addingCal, setAddingCal] = useState(false);
  const addToCal = useServerFn(addHomeworkToCalendar);

  const { data: submissions } = useQuery({
    queryKey: ["hw-submissions", homework?.id],
    enabled: !!homework?.id,
    queryFn: async () => {
      const { data } = await supabase.from("homework_submissions").select("*").eq("homework_id", homework!.id).order("created_at", { ascending: false });
      if (!data?.length) return [];
      const ids = data.map((s) => s.student_id);
      const { data: profs } = await supabase.from("profiles").select("id,first_name,last_name,klasa,paralelja").in("id", ids);
      const map = new Map((profs ?? []).map((p) => [p.id, p]));
      return data.map((s) => ({ ...s, profile: map.get(s.student_id) }));
    },
  });

  async function saveInstructions() {
    if (!instructions.trim()) return toast.error(t("hw.needInstructions"));
    setSaving(true);
    try {
      const payload = { instructions, due_date: dueDate ? new Date(dueDate).toISOString() : null };
      if (homework) {
        await supabase.from("homework").update(payload).eq("id", homework.id);
      } else {
        await supabase.from("homework").insert({ topic_id: topicId, ...payload });
      }
      toast.success(t("hw.saved"));
      qc.invalidateQueries({ queryKey: ["homework", topicId] });
    } finally { setSaving(false); }
  }

  return (
    <div className="card-soft p-6 space-y-4">
      <h2 className="font-semibold flex items-center gap-2"><FileText className="size-4" /> {t("hw.title")}</h2>
      <Textarea rows={3} placeholder={t("hw.instructionsPlaceholder")} value={instructions} onChange={(e) => setInstructions(e.target.value)} />
      <div className="grid sm:grid-cols-[1fr_auto] gap-2 items-end">
        <div>
          <label className="text-xs text-muted-foreground">{t("hw.dueOptional")}</label>
          <Input type="datetime-local" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
        </div>
        <Button size="sm" onClick={saveInstructions} disabled={saving}>{homework ? t("hw.update") : t("hw.create")}</Button>
      </div>
      {homework?.due_date && (
        <Button
          size="sm"
          variant="outline"
          disabled={addingCal}
          onClick={async () => {
            setAddingCal(true);
            try {
              const { data: top } = await supabase.from("topics").select("title").eq("id", topicId).maybeSingle();
              const r = await addToCal({
                data: {
                  topicTitle: top?.title ?? t("hw.fallbackTitle"),
                  instructions,
                  dueISO: new Date(homework.due_date!).toISOString(),
                },
              });
              if (r.id) toast.success(t("hw.addedToCalendar"));
              else toast.error(t("hw.notAddedToCalendar"));
            } catch (e: any) {
              toast.error(e?.message ?? t("hw.calendarError"));
            } finally {
              setAddingCal(false);
            }
          }}
        >
          <CalendarPlus className="size-4 mr-1" /> {t("hw.addToCalendar")}
        </Button>
      )}


      {homework && (
        <div className="pt-3 border-t border-border">
          <div className="text-sm font-medium mb-2">{t("hw.submissions", { count: submissions?.length ?? 0 })}</div>
          {!submissions?.length && <div className="text-xs text-muted-foreground">{t("hw.noSubmissions")}</div>}
          <div className="space-y-2">
            {submissions?.map((s) => <SubmissionRow key={s.id} sub={s} courseId={courseId} qc={qc} homeworkId={homework.id} />)}
          </div>
        </div>
      )}
    </div>
  );
}

function SubmissionRow({ sub, qc, homeworkId }: {
  sub: { id: string; file_path: string; grade: number | null; feedback: string | null; profile?: { first_name?: string; last_name?: string; klasa?: string | null; paralelja?: string | null } };
  courseId: string; qc: ReturnType<typeof useQueryClient>; homeworkId: string;
}) {
  const { t } = useI18n();
  const [grade, setGrade] = useState<string>(sub.grade?.toString() ?? "");
  const [feedback, setFeedback] = useState(sub.feedback ?? "");
  const [busy, setBusy] = useState(false);
  const notifyEmail = useServerFn(notifyHomeworkGraded);

  async function openFile() {
    const { data, error } = await supabase.storage.from("homework").createSignedUrl(sub.file_path, 60 * 10);
    if (error || !data) return toast.error(t("hw.fileNotOpened"));
    window.open(data.signedUrl, "_blank");
  }

  async function saveGrade() {
    const g = Number(grade);
    if (!Number.isFinite(g) || g < 4 || g > 10) return toast.error(t("hw.gradeRange"));
    setBusy(true);
    try {
      const { error } = await supabase.from("homework_submissions").update({ grade: g, feedback }).eq("id", sub.id);
      if (error) throw new Error(error.message);
      toast.success(t("hw.gradeSaved"));
      qc.invalidateQueries({ queryKey: ["hw-submissions", homeworkId] });
      // fire-and-forget email
      notifyEmail({ data: { submissionId: sub.id, grade: g, feedback } })
        .then((r) => r?.sent && toast.success(t("hw.emailSent")))
        .catch(() => {});
    } catch (e) { toast.error(e instanceof Error ? e.message : t("common.error")); }
    finally { setBusy(false); }
  }

  return (
    <div className="rounded-md border border-border p-3 space-y-2">
      <div className="flex items-center justify-between gap-2 text-sm">
        <div>
          <div className="font-medium">{sub.profile?.first_name} {sub.profile?.last_name}</div>
          <div className="text-xs text-muted-foreground">{sub.profile?.klasa ? t("hw.classLabel", { klasa: sub.profile.klasa, paralelja: sub.profile.paralelja ?? "" }) : ""}</div>
        </div>
        <Button size="sm" variant="outline" onClick={openFile}>{t("hw.viewFile")}</Button>
      </div>
      <div className="grid sm:grid-cols-[100px_1fr_auto] gap-2 items-start">
        <Input type="number" min={4} max={10} placeholder={t("grade.hw.gradePlaceholder")} value={grade} onChange={(e) => setGrade(e.target.value)} />
        <Textarea rows={2} placeholder={t("hw.commentPlaceholder")} value={feedback} onChange={(e) => setFeedback(e.target.value)} />
        <Button size="sm" onClick={saveGrade} disabled={busy}><Check className="size-3 mr-1" />{t("common.save")}</Button>
      </div>
    </div>
  );
}

function StudentHomework({ homework, userId, qc }: {
  homework: { id: string; instructions: string; due_date?: string | null }; userId: string; qc: ReturnType<typeof useQueryClient>;
}) {
  const { t } = useI18n();
  const { data: mine } = useQuery({
    queryKey: ["hw-mine", homework.id, userId],
    queryFn: async () => (await supabase.from("homework_submissions").select("*").eq("homework_id", homework.id).eq("student_id", userId).maybeSingle()).data,
  });

  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const overdue = homework.due_date ? new Date(homework.due_date).getTime() < Date.now() : false;


  async function upload() {
    if (!file) return toast.error(t("hw.chooseFile"));
    setBusy(true);
    try {
      const path = `${userId}/${homework.id}-${Date.now()}-${file.name}`;
      const { error: upErr } = await supabase.storage.from("homework").upload(path, file, { upsert: false });
      if (upErr) throw new Error(upErr.message);
      const { error } = await supabase.from("homework_submissions").insert({
        homework_id: homework.id, student_id: userId, file_path: path,
      });
      if (error) throw new Error(error.message);
      toast.success(t("hw.saved"));
      setFile(null);
      qc.invalidateQueries({ queryKey: ["hw-mine", homework.id, userId] });
    } catch (e) { toast.error(e instanceof Error ? e.message : t("common.error")); }
    finally { setBusy(false); }
  }

  return (
    <div className="card-soft p-6 space-y-3">
      <h2 className="font-semibold flex items-center gap-2"><FileText className="size-4" /> {t("hw.title")}</h2>
      <div className="text-sm whitespace-pre-wrap text-foreground/90">{homework.instructions}</div>
      {homework.due_date && (
        <div className={`text-xs ${overdue ? "text-destructive" : "text-muted-foreground"}`}>
          {t("hw.due", { date: new Date(homework.due_date).toLocaleString("sq-AL") })}
          {overdue && !mine && t("hw.overdue")}
        </div>
      )}


      {mine ? (
        <div className="rounded-md border border-border p-3 text-sm space-y-1">
          <div className="flex items-center gap-2 text-success"><Check className="size-4" /> {t("hw.submitted")}</div>
          {mine.grade != null && (
            <div className="text-sm">{t("hw.gradeLabel", { grade: "" })}<span className="font-bold text-lg text-success">{mine.grade}</span></div>
          )}
          {mine.feedback && <div className="text-xs text-muted-foreground"><span className="font-medium">{t("hw.commentLabel")}</span> {mine.feedback}</div>}
          {mine.grade == null && <div className="text-xs text-muted-foreground">{t("hw.awaitingGrade")}</div>}
        </div>
      ) : (
        <div className="space-y-2">
          <Input type="file" accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          <Button size="sm" onClick={upload} disabled={busy || !file}><Upload className="size-4 mr-1" />{busy ? t("hw.uploading") : t("hw.upload")}</Button>
        </div>
      )}
    </div>
  );
}
