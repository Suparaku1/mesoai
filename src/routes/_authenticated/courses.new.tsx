import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DREJTIMET, KLASAT, PARALELET } from "@/lib/constants";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { generateCourseFromPdf } from "@/lib/ai.functions";
import { Sparkles, Upload } from "lucide-react";
import { pageMeta } from "@/lib/seo";
import { useI18n } from "@/i18n";

export const Route = createFileRoute("/_authenticated/courses/new")({
  head: () => ({ meta: pageMeta("Kurs i Ri", "Krijo një kurs të ri dhe gjenero tema e kuize nga libri PDF me AI.") }),
  component: NewCourse,
});

function NewCourse() {
  const { t } = useI18n();
  const { user } = Route.useRouteContext();
  const navigate = useNavigate();
  const generateFn = useServerFn(generateCourseFromPdf);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [drejtimi, setDrejtimi] = useState("");
  const [klasa, setKlasa] = useState("");
  const [paralelja, setParalelja] = useState("");
  const [pdf, setPdf] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title || !drejtimi || !klasa || !pdf) return toast.error(t("course.new.errFillFields"));
    setBusy(true);
    try {
      setStage(t("course.new.stageCreating"));
      const { data: course, error } = await supabase
        .from("courses")
        .insert({
          teacher_id: user.id,
          title,
          description,
          drejtimi: drejtimi as never,
          klasa: klasa as never,
          paralelja: paralelja ? (paralelja as never) : null,
        })
        .select("*")
        .single();
      if (error || !course) throw new Error(error?.message ?? t("course.new.errCreate"));

      setStage(t("course.new.stageUploading"));
      const path = `${user.id}/${course.id}-${pdf.name}`;
      const { error: upErr } = await supabase.storage.from("course-pdfs").upload(path, pdf, { upsert: true });
      if (upErr) throw new Error(upErr.message);
      await supabase.from("courses").update({ pdf_path: path }).eq("id", course.id);

      setStage(t("course.new.stageAi"));
      const res = await generateFn({ data: { courseId: course.id, pdfPath: path } });
      toast.success(t("course.new.generatedTopics", { count: res.count }));
      navigate({ to: "/courses/$id", params: { id: course.id } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("common.error"));
    } finally {
      setBusy(false);
      setStage("");
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-1">{t("course.new.title")}</h1>
      <p className="text-sm text-muted-foreground mb-6">{t("course.new.subtitle")}</p>

      <form onSubmit={submit} className="card-soft p-6 space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="t">{t("course.new.field.title")}</Label>
          <Input id="t" required value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t("course.new.field.titlePlaceholder")} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="d">{t("course.new.field.description")}</Label>
          <Textarea id="d" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
        </div>
        <div className="grid sm:grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <Label>{t("course.new.field.drejtimi")}</Label>
            <Select value={drejtimi} onValueChange={setDrejtimi}>
              <SelectTrigger><SelectValue placeholder={t("course.new.field.pick")} /></SelectTrigger>
              <SelectContent>{DREJTIMET.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>{t("course.new.field.klasa")}</Label>
            <Select value={klasa} onValueChange={setKlasa}>
              <SelectTrigger><SelectValue placeholder={t("course.new.field.klasa")} /></SelectTrigger>
              <SelectContent>{KLASAT.map((k) => <SelectItem key={k} value={k}>{k}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>{t("course.new.field.paralelja")}</Label>
            <Select value={paralelja} onValueChange={setParalelja}>
              <SelectTrigger><SelectValue placeholder={t("course.new.field.all")} /></SelectTrigger>
              <SelectContent>{PARALELET.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="pdf"><Upload className="size-4 inline mr-1" />{t("course.new.field.pdf")}</Label>
          <Input id="pdf" type="file" accept="application/pdf" required onChange={(e) => setPdf(e.target.files?.[0] ?? null)} />
          {pdf && <p className="text-xs text-muted-foreground">{pdf.name} · {(pdf.size / 1024 / 1024).toFixed(1)} MB</p>}
        </div>
        <Button type="submit" disabled={busy} className="w-full">
          <Sparkles className="size-4 mr-1" />
          {busy ? stage || t("course.new.processing") : t("course.new.submit")}
        </Button>
      </form>
    </div>
  );
}
