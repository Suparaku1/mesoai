import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useRole } from "@/hooks/use-role";
import { CalendarClock, AlertCircle, CheckCircle2 } from "lucide-react";
import { pageMeta } from "@/lib/seo";
import { useI18n } from "@/i18n";

export const Route = createFileRoute("/_authenticated/calendar")({
  head: () => ({ meta: pageMeta("Kalendari", "Afatet e detyrave, provimet dhe ngjarjet e kurseve në një pamje të vetme.") }),
  component: CalendarPage,
});

function CalendarPage() {
  const { t } = useI18n();
  const { user } = Route.useRouteContext();

  const { data: primary } = useRole(user.id);

  const { data, isLoading } = useQuery({
    queryKey: ["calendar", user.id, primary],
    enabled: !!primary,
    queryFn: async () => {

      if (primary === "teacher" || primary === "admin") {
        // homework across teacher's courses
        const { data: courses } = await supabase.from("courses").select("id,title").eq("teacher_id", user.id);
        const cIds = (courses ?? []).map((c) => c.id);
        if (!cIds.length) return [];
        const { data: topics } = await supabase.from("topics").select("id,title,course_id").in("course_id", cIds);
        const tIds = (topics ?? []).map((t) => t.id);
        if (!tIds.length) return [];
        const { data: hw } = await supabase.from("homework").select("*").in("topic_id", tIds).not("due_date", "is", null);
        const topicMap = new Map((topics ?? []).map((t) => [t.id, t]));
        const courseMap = new Map((courses ?? []).map((c) => [c.id, c]));
        return (hw ?? []).map((h) => ({
          ...h,
          topic: topicMap.get(h.topic_id),
          course: courseMap.get(topicMap.get(h.topic_id)?.course_id ?? ""),
          submitted: false,
        }));
      }

      // student
      const { data: enrolls } = await supabase
        .from("enrollments")
        .select("course_id, courses(title)")
        .eq("student_id", user.id)
        .eq("status", "approved");
      const cIds = (enrolls ?? []).map((e) => e.course_id);
      if (!cIds.length) return [];
      const { data: topics } = await supabase.from("topics").select("id,title,course_id").in("course_id", cIds);
      const tIds = (topics ?? []).map((t) => t.id);
      if (!tIds.length) return [];
      const { data: hw } = await supabase.from("homework").select("*").in("topic_id", tIds).not("due_date", "is", null);
      const hwIds = (hw ?? []).map((h) => h.id);
      const { data: subs } = hwIds.length
        ? await supabase.from("homework_submissions").select("homework_id").eq("student_id", user.id).in("homework_id", hwIds)
        : { data: [] as any[] };
      const submittedSet = new Set((subs ?? []).map((s: any) => s.homework_id));
      const topicMap = new Map((topics ?? []).map((t) => [t.id, t]));
      const courseMap = new Map((enrolls ?? []).map((e: any) => [e.course_id, e.courses]));
      return (hw ?? []).map((h) => ({
        ...h,
        topic: topicMap.get(h.topic_id),
        course: courseMap.get(topicMap.get(h.topic_id)?.course_id ?? ""),
        submitted: submittedSet.has(h.id),
      }));
    },
  });

  const sorted = [...(data ?? [])].sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime());
  const now = Date.now();

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><CalendarClock className="size-6" /> {t("cal.title")}</h1>
        <p className="text-sm text-muted-foreground">{t("cal.subtitle")}</p>
      </div>
      {isLoading && <div className="text-muted-foreground">{t("common.loading")}</div>}
      {!isLoading && !sorted.length && <div className="card-soft p-10 text-center text-muted-foreground">{t("cal.empty")}</div>}
      <div className="space-y-2">
        {sorted.map((h) => {
          const due = new Date(h.due_date).getTime();
          const overdue = due < now && !h.submitted;
          return (
            <Link
              key={h.id}
              to="/topics/$id"
              params={{ id: h.topic_id }}
              className={`card-soft p-4 flex items-center gap-3 hover:border-primary/50 transition ${overdue ? "border-destructive/40" : ""}`}
            >
              <div className={`size-10 rounded-lg flex items-center justify-center ${h.submitted ? "bg-success/15 text-success" : overdue ? "bg-destructive/15 text-destructive" : "bg-primary/10 text-primary"}`}>
                {h.submitted ? <CheckCircle2 className="size-5" /> : overdue ? <AlertCircle className="size-5" /> : <CalendarClock className="size-5" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs text-muted-foreground truncate">{(h.course as any)?.title}</div>
                <div className="font-medium truncate">{(h.topic as any)?.title}</div>
                <div className="text-sm text-muted-foreground line-clamp-1">{h.instructions}</div>
              </div>
              <div className="text-right text-xs">
                <div className={overdue ? "text-destructive font-semibold" : "text-foreground"}>
                  {new Date(h.due_date).toLocaleDateString("sq-AL", { day: "2-digit", month: "short", year: "numeric" })}
                </div>
                <div className="text-muted-foreground">
                  {new Date(h.due_date).toLocaleTimeString("sq-AL", { hour: "2-digit", minute: "2-digit" })}
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
