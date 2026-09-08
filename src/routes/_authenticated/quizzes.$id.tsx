import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2, Plus, Save, ListChecks } from "lucide-react";
import { toast } from "sonner";
import { useEffect, useState } from "react";
import { pageMeta } from "@/lib/seo";
import { useI18n } from "@/i18n";

export const Route = createFileRoute("/_authenticated/quizzes/$id")({
  head: () => ({ meta: pageMeta("Ndërto Kuiz", "Ndërtues vizual i pyetjeve të kuizit me notim automatik 4–10.") }),
  component: QuizBuilder,
});

type Q = { id?: string; question: string; options: string[]; correct_index: number; position: number };

function QuizBuilder() {
  const { t } = useI18n();
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const [items, setItems] = useState<Q[]>([]);

  const { data: quiz } = useQuery({
    queryKey: ["quiz", id],
    queryFn: async () => {
      const { data } = await supabase.from("quizzes").select("*").eq("id", id).maybeSingle();
      return data;
    },
  });

  const { data: existing } = useQuery({
    queryKey: ["quiz-questions", id],
    queryFn: async () => {
      const { data } = await supabase.from("quiz_questions").select("*").eq("quiz_id", id).order("position");
      return (data ?? []) as Q[];
    },
  });

  useEffect(() => {
    if (existing) setItems(existing.map((q) => ({ ...q, options: (q.options as unknown as string[]) ?? [] })));
  }, [existing]);

  const save = useMutation({
    mutationFn: async () => {
      await supabase.from("quiz_questions").delete().eq("quiz_id", id);
      if (items.length) {
        const rows = items.map((q, idx) => ({
          quiz_id: id,
          question: q.question,
          options: q.options,
          correct_index: q.correct_index,
          position: idx,
        }));
        const { error } = await supabase.from("quiz_questions").insert(rows);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(t("quiz.builder.saved"));
      qc.invalidateQueries({ queryKey: ["quiz-questions", id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function addQ() {
    setItems([...items, { question: "", options: ["", ""], correct_index: 0, position: items.length }]);
  }
  function updateQ(i: number, patch: Partial<Q>) {
    setItems(items.map((q, idx) => (idx === i ? { ...q, ...patch } : q)));
  }
  function removeQ(i: number) {
    setItems(items.filter((_, idx) => idx !== i));
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><ListChecks className="size-6" /> {t("quiz.builder.title")}</h1>
          <p className="text-sm text-muted-foreground">{quiz?.title ?? t("quiz.builder.fallbackTitle")}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={addQ}><Plus className="size-4 mr-1" /> {t("quiz.builder.addQuestion")}</Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending}><Save className="size-4 mr-1" /> {t("common.save")}</Button>
        </div>
      </div>

      <div className="space-y-4">
        {items.map((q, i) => (
          <Card key={i}>
            <CardHeader className="flex-row justify-between items-center pb-2">
              <CardTitle className="text-sm">{t("quiz.builder.questionN", { n: i + 1 })}</CardTitle>
              <Button size="sm" variant="ghost" onClick={() => removeQ(i)}><Trash2 className="size-4" /></Button>
            </CardHeader>
            <CardContent className="space-y-3">
              <Input placeholder={t("quiz.builder.questionPlaceholder")} value={q.question} onChange={(e) => updateQ(i, { question: e.target.value })} />
              <div className="space-y-2">
                {q.options.map((opt, j) => (
                  <div key={j} className="flex items-center gap-2">
                    <input
                      type="radio"
                      checked={q.correct_index === j}
                      onChange={() => updateQ(i, { correct_index: j })}
                      className="size-4"
                    />
                    <Input
                      placeholder={t("quiz.builder.optionPlaceholder", { n: j + 1 })}
                      value={opt}
                      onChange={(e) => {
                        const newOpts = [...q.options];
                        newOpts[j] = e.target.value;
                        updateQ(i, { options: newOpts });
                      }}
                    />
                    <Button size="sm" variant="ghost" onClick={() => updateQ(i, { options: q.options.filter((_, k) => k !== j), correct_index: 0 })}>
                      <Trash2 className="size-3" />
                    </Button>
                  </div>
                ))}
                <Button size="sm" variant="outline" onClick={() => updateQ(i, { options: [...q.options, ""] })}>
                  <Plus className="size-3 mr-1" /> {t("quiz.builder.addOption")}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {!items.length && <p className="text-sm text-muted-foreground text-center py-8">{t("quiz.builder.empty")}</p>}
      </div>
    </div>
  );
}
