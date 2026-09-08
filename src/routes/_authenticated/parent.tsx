import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users } from "lucide-react";
import { pageMeta } from "@/lib/seo";
import { useI18n } from "@/i18n";

export const Route = createFileRoute("/_authenticated/parent")({
  head: () => ({ meta: pageMeta("Portali i Prindit", "Ndiq notat, frekuentimin dhe progresin e fëmijës tënd në kohë reale.") }),
  component: Page,
});

function Page() {
  const { user } = Route.useRouteContext();
  const { t } = useI18n();

  const { data: kids } = useQuery({
    queryKey: ["parent-kids", user.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("parent_links")
        .select("student:profiles!parent_links_student_id_fkey(id,first_name,last_name,email,drejtimi,klasa,paralelja)")
        .eq("parent_id", user.id);
      return (data ?? []).map((r: any) => r.student).filter(Boolean);
    },
  });

  const ids = (kids ?? []).map((k: any) => k.id);

  const { data: grades } = useQuery({
    queryKey: ["parent-grades", ids.join(",")],
    enabled: ids.length > 0,
    queryFn: async () => {
      const { data } = await supabase.from("quiz_attempts").select("student_id,grade,created_at,topics:topic_id(title)").in("student_id", ids).order("created_at", { ascending: false }).limit(50);
      return data ?? [];
    },
  });

  const { data: att } = useQuery({
    queryKey: ["parent-att", ids.join(",")],
    enabled: ids.length > 0,
    queryFn: async () => {
      const { data } = await supabase.from("attendance").select("student_id,date,status").in("student_id", ids).order("date", { ascending: false }).limit(50);
      return data ?? [];
    },
  });

  return (
    <div className="container mx-auto p-4 sm:p-6 space-y-4">
      <h1 className="text-2xl font-semibold flex items-center gap-2"><Users className="size-6"/> {t("par.title")}</h1>

      {!(kids ?? []).length && (
        <Card><CardContent className="p-6 text-sm text-muted-foreground">{t("par.noKids")}</CardContent></Card>
      )}

      {(kids ?? []).map((k: any) => (
        <Card key={k.id}>
          <CardHeader><CardTitle>{k.first_name} {k.last_name} <span className="text-xs text-muted-foreground">· {k.drejtimi} · {t("par.class")} {k.klasa}{k.paralelja}</span></CardTitle></CardHeader>
          <CardContent className="grid md:grid-cols-2 gap-4">
            <div>
              <h3 className="text-sm font-medium mb-2">{t("par.recentGrades")}</h3>
              {(grades ?? []).filter((g: any) => g.student_id === k.id).slice(0, 8).map((g: any, i: number) => (
                <div key={i} className="flex justify-between text-sm border-b border-border/40 py-1">
                  <span>{g.topics?.title ?? t("par.quiz")}</span><Badge>{g.grade}</Badge>
                </div>
              ))}
            </div>
            <div>
              <h3 className="text-sm font-medium mb-2">{t("par.recentAttendance")}</h3>
              {(att ?? []).filter((a: any) => a.student_id === k.id).slice(0, 8).map((a: any, i: number) => (
                <div key={i} className="flex justify-between text-sm border-b border-border/40 py-1">
                  <span>{a.date}</span><Badge variant="outline">{a.status}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
