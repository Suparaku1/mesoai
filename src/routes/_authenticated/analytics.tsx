import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { LineChartBlock, BarChartBlock, PieChartBlock } from "@/components/charts";
import { motion } from "framer-motion";
import { BookOpen, Users, GraduationCap, TrendingUp } from "lucide-react";
import { pageMeta } from "@/lib/seo";
import { useRole } from "@/hooks/use-role";
import { useI18n } from "@/i18n";

export const Route = createFileRoute("/_authenticated/analytics")({
  head: () => ({ meta: pageMeta("Analitika", "Grafikë të performancës së klasës dhe progresit individual të nxënësve.") }),
  component: AnalyticsPage,
});

function AnalyticsPage() {
  const { user } = Route.useRouteContext();
  const { data: primary, isLoading } = useRole(user.id);
  const { t } = useI18n();

  if (isLoading || !primary) return <div className="text-muted-foreground">{t("an.loading")}</div>;
  const role = primary === "admin" ? "teacher" : primary;
  return role === "teacher" ? <TeacherAnalytics /> : <StudentAnalytics />;
}

function StatCard({ icon: Icon, label, value, hint }: { icon: typeof BookOpen; label: string; value: string | number; hint?: string }) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="card-soft p-5">
      <div className="flex items-center gap-3">
        <div className="size-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
          <Icon className="size-5" />
        </div>
        <div>
          <div className="text-xs text-muted-foreground">{label}</div>
          <div className="text-2xl font-bold">{value}</div>
          {hint && <div className="text-[11px] text-muted-foreground">{hint}</div>}
        </div>
      </div>
    </motion.div>
  );
}

function TeacherAnalytics() {
  const { user } = Route.useRouteContext();
  const { t } = useI18n();

  const { data } = useQuery({
    queryKey: ["teacher-analytics", user.id],
    queryFn: async () => {
      const { data: courses } = await supabase.from("courses").select("id,title,drejtimi,klasa").eq("teacher_id", user.id);
      const courseIds = (courses ?? []).map((c) => c.id);
      if (!courseIds.length) return { courses: [], enrollments: [], attempts: [], topicCounts: {} as Record<string, number>, progress: [] };

      const [{ data: enrollments }, { data: topics }, { data: progress }] = await Promise.all([
        supabase.from("enrollments").select("id,course_id,student_id,status,created_at").in("course_id", courseIds),
        supabase.from("topics").select("id,course_id").in("course_id", courseIds),
        supabase.from("topic_progress").select("topic_id,student_id"),
      ]);

      const topicIds = (topics ?? []).map((t) => t.id);
      const { data: attempts } = topicIds.length
        ? await supabase.from("quiz_attempts").select("grade,quiz_id,created_at,student_id")
        : { data: [] as any[] };

      const topicsByCourse: Record<string, string[]> = {};
      (topics ?? []).forEach((t) => {
        (topicsByCourse[t.course_id] ||= []).push(t.id);
      });

      return { courses: courses ?? [], enrollments: enrollments ?? [], attempts: attempts ?? [], topicsByCourse, progress: progress ?? [] };
    },
  });

  if (!data) return <div className="text-muted-foreground">{t("an.loading")}</div>;

  const totalStudents = new Set(data.enrollments.filter((e) => e.status === "approved").map((e) => e.student_id)).size;
  const pending = data.enrollments.filter((e) => e.status === "pending").length;
  const grades = data.attempts.map((a) => a.grade).filter((g: number) => typeof g === "number");
  const avgGrade = grades.length ? grades.reduce((s: number, g: number) => s + g, 0) / grades.length : 0;

  // Enrollments by month
  const byMonth: Record<string, number> = {};
  data.enrollments.forEach((e) => {
    const m = new Date(e.created_at).toLocaleDateString("sq-AL", { month: "short", year: "2-digit" });
    byMonth[m] = (byMonth[m] || 0) + 1;
  });
  const enrollSeries = Object.entries(byMonth).map(([month, count]) => ({ month, count }));

  // Avg grade per course
  const perCourse = (data.courses as any[]).map((c) => {
    const tIds = new Set(data.topicsByCourse?.[c.id] ?? []);
    const cGrades = data.attempts.filter((a) => tIds.has(a.quiz_id)).map((a) => a.grade);
    const avg = cGrades.length ? cGrades.reduce((s: number, g: number) => s + g, 0) / cGrades.length : 0;
    return { name: c.title.slice(0, 18), mesatare: Number(avg.toFixed(2)) };
  });

  // Grade distribution
  const dist = [4, 5, 6, 7, 8, 9, 10].map((n) => ({
    nota: n.toString(),
    nxenes: grades.filter((g: number) => Math.round(g) === n).length,
  }));

  // Enrollment status pie
  const statusPie = [
    { name: t("an.status.approved"), value: data.enrollments.filter((e) => e.status === "approved").length, color: "hsl(var(--success))" },
    { name: t("an.status.pending"), value: pending, color: "hsl(var(--warning))" },
    { name: t("an.status.rejected"), value: data.enrollments.filter((e) => e.status === "rejected").length, color: "hsl(var(--destructive))" },
  ].filter((s) => s.value > 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t("an.teacher.title")}</h1>
        <p className="text-sm text-muted-foreground">{t("an.teacher.subtitle")}</p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={BookOpen} label={t("an.stat.courses")} value={data.courses.length} />
        <StatCard icon={Users} label={t("an.stat.activeStudents")} value={totalStudents} hint={`${pending} ${t("an.stat.pending")}`} />
        <StatCard icon={GraduationCap} label={t("an.stat.tests")} value={data.attempts.length} />
        <StatCard icon={TrendingUp} label={t("an.stat.avgGrade")} value={avgGrade.toFixed(2)} hint={t("an.of10")} />
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="card-soft p-5">
          <h3 className="font-semibold mb-3">{t("an.chart.enrollByMonth")}</h3>
          <LineChartBlock data={enrollSeries} xKey="month" yKey="count" />
        </div>

        <div className="card-soft p-5">
          <h3 className="font-semibold mb-3">{t("an.chart.requestStatus")}</h3>
          <PieChartBlock data={statusPie} />
        </div>

        <div className="card-soft p-5">
          <h3 className="font-semibold mb-3">{t("an.chart.avgGradeCourse")}</h3>
          <BarChartBlock data={perCourse} xKey="name" yKey="mesatare" domain={[0, 10]} />
        </div>

        <div className="card-soft p-5">
          <h3 className="font-semibold mb-3">{t("an.chart.gradeDist")}</h3>
          <BarChartBlock data={dist} xKey="nota" yKey="nxenes" color="hsl(var(--accent-foreground))" />
        </div>
      </div>
    </div>
  );
}

function StudentAnalytics() {
  const { user } = Route.useRouteContext();
  const { t } = useI18n();
  const { data } = useQuery({
    queryKey: ["student-analytics", user.id],
    queryFn: async () => {
      const [{ data: enrollments }, { data: attempts }, { data: progress }] = await Promise.all([
        supabase.from("enrollments").select("id,course_id,status,courses(title)").eq("student_id", user.id),
        supabase.from("quiz_attempts").select("grade,created_at,quiz_id").eq("student_id", user.id),
        supabase.from("topic_progress").select("topic_id").eq("student_id", user.id),
      ]);
      return { enrollments: enrollments ?? [], attempts: attempts ?? [], progress: progress ?? [] };
    },
  });

  if (!data) return <div className="text-muted-foreground">{t("an.loading")}</div>;

  const grades = data.attempts.map((a) => a.grade);
  const avg = grades.length ? grades.reduce((s, g) => s + g, 0) / grades.length : 0;
  const approved = data.enrollments.filter((e) => e.status === "approved").length;

  const timeline = [...data.attempts]
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    .map((a, i) => ({ i: i + 1, nota: a.grade }));

  const dist = [4, 5, 6, 7, 8, 9, 10].map((n) => ({
    nota: n.toString(),
    teste: grades.filter((g) => Math.round(g) === n).length,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t("an.student.title")}</h1>
        <p className="text-sm text-muted-foreground">{t("an.student.subtitle")}</p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={BookOpen} label={t("an.stat.activeCourses")} value={approved} />
        <StatCard icon={GraduationCap} label={t("an.stat.finishedTopics")} value={data.progress.length} />
        <StatCard icon={TrendingUp} label={t("an.stat.tests")} value={data.attempts.length} />
        <StatCard icon={Users} label={t("an.stat.avgGrade")} value={avg.toFixed(2)} hint={t("an.of10")} />
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="card-soft p-5">
          <h3 className="font-semibold mb-3">{t("an.chart.gradeEvolution")}</h3>
          <LineChartBlock data={timeline} xKey="i" yKey="nota" domain={[0, 10]} />
        </div>

        <div className="card-soft p-5">
          <h3 className="font-semibold mb-3">{t("an.chart.gradeDist")}</h3>
          <BarChartBlock data={dist} xKey="nota" yKey="teste" />
        </div>
      </div>
    </div>
  );
}
