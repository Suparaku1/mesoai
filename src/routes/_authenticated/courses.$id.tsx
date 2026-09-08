import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useRole } from "@/hooks/use-role";
import { TeacherCourseView } from "@/components/course/teacher-course-view";
import { StudentCourseView } from "@/components/course/student-course-view";
import { useI18n } from "@/i18n";

export const Route = createFileRoute("/_authenticated/courses/$id")({
  head: () => ({
    meta: [
      { title: "Kursi — Uendi Platform" },
      { name: "description", content: "Temat, detyrat, testimet dhe notat e kursit në Uendi Platform." },
      { property: "og:title", content: "Kursi — Uendi Platform" },
      { property: "og:description", content: "Temat, detyrat, testimet dhe notat e kursit." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CourseView,
});

function CourseView() {
  const { t } = useI18n();
  const { id } = Route.useParams();
  const { user } = Route.useRouteContext();

  const { data: course, isLoading } = useQuery({
    queryKey: ["course", id],
    queryFn: async () => (await supabase.from("courses").select("*").eq("id", id).maybeSingle()).data,
  });
  const { data: role } = useRole(user.id);

  if (isLoading) return <div className="text-muted-foreground">{t("common.loading")}</div>;
  if (!course) return <div>{t("course.notFound")}</div>;

  const isTeacher = (role === "teacher" || role === "admin") && course.teacher_id === user.id;
  return isTeacher ? <TeacherCourseView courseId={id} /> : <StudentCourseView courseId={id} userId={user.id} />;
}
