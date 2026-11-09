import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useSuspenseQuery, useQueryClient, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";
import { useI18n } from "@/i18n";
import { pageMeta } from "@/lib/seo";
import { tutorThreadsOptions } from "@/lib/tutor-queries";
import { createTutorThread, deleteTutorThread } from "@/lib/tutor-history.functions";
import { useState } from "react";
import { toast } from "sonner";
import logo from "@/assets/logo.png";
import { supabase } from "@/integrations/supabase/client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
export const Route = createFileRoute("/_authenticated/tutor")({
  head: () => ({
    meta: pageMeta(
      "Tutor AI",
      "Bisedat private me Tutorin AI, burimet e kursit dhe përdorimi ditor.",
    ),
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(tutorThreadsOptions()),
  component: TutorLayout,
});
function TutorLayout() {
  const { t, locale } = useI18n();
  const { data } = useSuspenseQuery(tutorThreadsOptions());
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { location } = useRouterState();
  const [creating, setCreating] = useState(false);
  const [courseId, setCourseId] = useState("all");
  const { data: courses } = useQuery({
    queryKey: ["tutor-visible-courses"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses")
        .select("id,title")
        .is("deleted_at", null)
        .order("title");
      if (error) throw error;
      return data;
    },
  });
  async function create() {
    setCreating(true);
    try {
      const thread = await createTutorThread({
        data: { courseId: courseId === "all" ? null : courseId },
      });
      await qc.invalidateQueries({ queryKey: ["tutor-threads"] });
      await navigate({ to: "/tutor/$threadId", params: { threadId: thread.id } });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("tutor.error"));
    } finally {
      setCreating(false);
    }
  }
  async function remove(id: string) {
    if (!confirm(t("tutor.confirmDelete"))) return;
    try {
      await deleteTutorThread({ data: { id } });
      await qc.invalidateQueries({ queryKey: ["tutor-threads"] });
      if (location.pathname.endsWith(id)) await navigate({ to: "/tutor" });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("tutor.error"));
    }
  }
  return (
    <div className="space-y-5 min-w-0">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-3 items-center min-w-0">
          <img src={logo} alt="Uendi Platform" className="size-10 rounded-full shrink-0" />
          <div>
            <h1 className="text-2xl font-bold">{t("tutor.title")}</h1>
            <p className="text-xs text-muted-foreground">
              {t("tutor.usage", { used: data.used, limit: data.limit })}
            </p>
          </div>
        </div>
        <div className="flex w-full flex-wrap gap-2 sm:w-auto">
          <Select value={courseId} onValueChange={setCourseId}>
            <SelectTrigger className="w-full sm:w-52" aria-label={t("tutor.pickCourse")}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("tutor.allCourses")}</SelectItem>
              {courses?.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={create} disabled={creating}>
            <Plus className="size-4" />
            {t("tutor.new")}
          </Button>
        </div>
      </div>
      <div className="grid min-w-0 gap-5 lg:grid-cols-[220px_minmax(0,1fr)]">
        <details
          open={location.pathname === "/tutor" || location.pathname === "/tutor/"}
          className="min-w-0 border-b border-border pb-3 lg:border-b-0 lg:border-r lg:pr-4"
        >
          <summary className="cursor-pointer text-sm font-semibold mb-3">
            {t("tutor.history")}
          </summary>
          <div className="max-h-36 lg:max-h-[65dvh] overflow-y-auto space-y-1">
            {!data.threads.length && (
              <p className="text-xs text-muted-foreground">{t("tutor.noHistory")}</p>
            )}
            {data.threads.map((thread) => (
              <div key={thread.id} className="flex items-center gap-1 min-w-0">
                <Link
                  to="/tutor/$threadId"
                  params={{ threadId: thread.id }}
                  className={`flex-1 min-w-0 rounded-md p-2 text-sm ${location.pathname.endsWith(thread.id) ? "bg-accent text-accent-foreground" : "hover:bg-muted"}`}
                >
                  <span className="block truncate">
                    {thread.title === "Bisedë e re" ? t("tutor.new") : thread.title}
                  </span>
                  <time className="text-[10px] text-muted-foreground">
                    {new Date(thread.updated_at).toLocaleDateString(locale)}
                  </time>
                </Link>
                <Button
                  size="icon"
                  variant="ghost"
                  className="shrink-0 size-8"
                  aria-label={t("tutor.delete")}
                  onClick={() => remove(thread.id)}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            ))}
          </div>
        </details>
        <div className="min-w-0">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
