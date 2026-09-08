import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useRole } from "@/hooks/use-role";
import { Button } from "@/components/ui/button";
import { BookOpen, FileText, Users, Plus, GraduationCap, ClipboardCheck } from "lucide-react";
import { OnboardingBanner } from "@/components/onboarding-banner";
import { NextActions } from "@/components/dashboard/next-actions";
import {
  useTeacherNextActions,
  useStudentNextActions,
  useParentNextActions,
} from "@/hooks/use-next-actions";
import { pageMeta } from "@/lib/seo";
import { useI18n } from "@/i18n";


export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: pageMeta("Paneli", "Veprimet e radhës, progresi dhe njoftimet për mësuesin, nxënësin dhe prindin.") }),
  component: Dashboard,
});

function Dashboard() {
  const { user } = Route.useRouteContext();
  const { data: roleData, isLoading } = useRole(user.id);
  const { t } = useI18n();

  if (isLoading) return <div className="text-muted-foreground">{t("dash.loading")}</div>;
  if (roleData === "parent") return <ParentDashboard />;
  const r = roleData === "teacher" || roleData === "admin" ? "teacher" : "student";
  return r === "teacher" ? <TeacherDashboard /> : <StudentDashboard />;
}

function ParentDashboard() {
  const { user } = Route.useRouteContext();
  const { data: actions } = useParentNextActions(user.id);
  const { t } = useI18n();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t("dash.parent.title")}</h1>
        <p className="text-sm text-muted-foreground">{t("dash.parent.desc")}</p>
      </div>
      <NextActions items={actions ?? []} emptyText={t("dash.parent.empty")} />
      <Link to="/parent">
        <Button variant="outline">
          <Users className="size-4 mr-1" /> {t("dash.parent.open")}
        </Button>
      </Link>
    </div>
  );
}


function TeacherDashboard() {
  const { user } = Route.useRouteContext();
  const { data: courses } = useQuery({
    queryKey: ["teacher-courses", user.id],
    queryFn: async () => {
      const { data } = await supabase.from("courses").select("*").eq("teacher_id", user.id).order("created_at", { ascending: false });
      return data ?? [];
    },
  });
  const { data: pendingCount } = useQuery({
    queryKey: ["pending-requests", user.id],
    queryFn: async () => {
      const { count } = await supabase.from("enrollments").select("*, courses!inner(teacher_id)", { count: "exact", head: true }).eq("status", "pending").eq("courses.teacher_id", user.id);
      return count ?? 0;
    },
  });
  const { data: nextActions } = useTeacherNextActions(user.id);
  const { t } = useI18n();


  return (
    <div className="space-y-6">
      <OnboardingBanner userId={user.id} />
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">{t("dash.teacher.title")}</h1>
          <p className="text-sm text-muted-foreground">{t("dash.teacher.desc")}</p>
        </div>
        <Link to="/courses/new"><Button><Plus className="size-4 mr-1" /> {t("dash.teacher.newCourse")}</Button></Link>
      </div>
      <NextActions items={nextActions ?? []} emptyText={t("dash.teacher.empty")} />

      <div className="grid sm:grid-cols-3 gap-4">
        <Stat icon={BookOpen} label={t("dash.teacher.courses")} value={courses?.length ?? 0} />
        <Stat icon={Users} label={t("dash.teacher.pending")} value={pendingCount ?? 0} accent />
        <Stat icon={ClipboardCheck} label={t("dash.teacher.published")} value={courses?.filter((c) => c.status === "published").length ?? 0} />
      </div>


      <div>
        <h2 className="text-lg font-semibold mb-3">{t("dash.teacher.yourCourses")}</h2>
        {!courses?.length ? (
          <div className="card-soft p-10 text-center text-muted-foreground">
            <FileText className="size-10 mx-auto mb-3 opacity-50" />
            {t("dash.teacher.noCourses")}
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {courses.map((c) => (
              <Link key={c.id} to="/courses/$id" params={{ id: c.id }} className="card-soft p-5 hover:border-primary/50 transition">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs px-2 py-0.5 rounded-full bg-accent text-accent-foreground">{c.drejtimi} · {c.klasa}{c.paralelja ?? ""}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${c.status === "published" ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"}`}>
                    {c.status === "published" ? t("status.published") : t("status.draft")}
                  </span>
                </div>
                <h3 className="font-semibold">{c.title}</h3>
                {c.description && <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{c.description}</p>}
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StudentDashboard() {
  const { user } = Route.useRouteContext();
  const { data: enrollments } = useQuery({
    queryKey: ["my-enrollments", user.id],
    queryFn: async () => {
      const { data } = await supabase.from("enrollments").select("*, courses(*)").eq("student_id", user.id).order("created_at", { ascending: false });
      return data ?? [];
    },
  });
  const { data: nextActions } = useStudentNextActions(user.id);
  const { t } = useI18n();

  const approved = enrollments?.filter((e) => e.status === "approved") ?? [];
  const pending = enrollments?.filter((e) => e.status === "pending") ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">{t("dash.student.title")}</h1>
          <p className="text-sm text-muted-foreground">{t("dash.student.desc")}</p>
        </div>
        <Link to="/browse"><Button variant="outline"><BookOpen className="size-4 mr-1" /> {t("dash.student.browse")}</Button></Link>
      </div>

      <NextActions items={nextActions ?? []} emptyText={t("dash.student.empty")} />



      <div className="grid sm:grid-cols-3 gap-4">
        <Stat icon={GraduationCap} label={t("dash.student.active")} value={approved.length} />
        <Stat icon={ClipboardCheck} label={t("dash.student.pending")} value={pending.length} accent />
        <Stat icon={BookOpen} label={t("dash.student.total")} value={enrollments?.length ?? 0} />
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-3">{t("dash.student.myCourses")}</h2>
        {!enrollments?.length ? (
          <div className="card-soft p-10 text-center text-muted-foreground">
            {t("dash.student.none")} <Link to="/browse" className="text-primary underline ml-1">{t("dash.student.browseLink")}</Link>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {enrollments.map((e) => (
              <div key={e.id} className="card-soft p-5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs px-2 py-0.5 rounded-full bg-accent text-accent-foreground">{e.courses?.drejtimi}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${e.status === "approved" ? "bg-success/15 text-success" : e.status === "pending" ? "bg-warning/20 text-warning-foreground" : "bg-destructive/15 text-destructive"}`}>
                    {e.status === "approved" ? t("status.approved") : e.status === "pending" ? t("status.pending") : t("status.rejected")}
                  </span>
                </div>
                <h3 className="font-semibold">{e.courses?.title}</h3>
                {e.status === "approved" && e.courses && (
                  <Link to="/courses/$id" params={{ id: e.courses.id }} className="mt-3 inline-block text-sm text-primary hover:underline">{t("dash.openCourse")}</Link>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ icon: Icon, label, value, accent }: { icon: typeof BookOpen; label: string; value: number; accent?: boolean }) {
  return (
    <div className="card-soft p-5 flex items-center gap-4">
      <div className={`size-11 rounded-lg flex items-center justify-center ${accent ? "bg-primary text-primary-foreground" : "bg-accent text-accent-foreground"}`}>
        <Icon className="size-5" />
      </div>
      <div>
        <div className="text-2xl font-bold">{value}</div>
        <div className="text-xs text-muted-foreground">{label}</div>
      </div>
    </div>
  );
}
