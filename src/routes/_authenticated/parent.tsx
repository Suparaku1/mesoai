import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, Download } from "lucide-react";
import { pageMeta } from "@/lib/seo";
import { useI18n, type TranslationKey } from "@/i18n";
import { useProfile } from "@/hooks/use-profile";
import { ParentRequests } from "@/components/parent-requests";
import type { ParentChild } from "@/lib/parent-data";
import { averageGrade, isCertificateEligible } from "@/lib/grading";
import { generateCertificatePDF } from "@/lib/certificate";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/parent")({
  head: () => ({
    meta: pageMeta(
      "Portali i Prindit",
      "Kërkesat e prindërve dhe ecuria akademike e fëmijëve me miratim nga mësuesi.",
    ),
  }),
  component: Page,
});
const sections = [
  "courses",
  "grades",
  "homework",
  "calendar",
  "attendance",
  "certificates",
] as const;
function Page() {
  const { user } = Route.useRouteContext();
  const { t, locale } = useI18n();
  const qc = useQueryClient();
  const profile = useProfile(user.id);
  const isParent = profile.data?.roles.includes("parent");
  const [name, setName] = useState("");
  const kids = useQuery({
    queryKey: ["parent-overview", user.id],
    enabled: !!isParent,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("parent_academic_overview");
      if (error) throw error;
      return data as unknown as ParentChild[];
    },
  });
  const requests = useQuery({
    queryKey: ["parent-own-requests", user.id],
    enabled: !!isParent,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("parent_access_requests")
        .select("*")
        .eq("parent_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
  const request = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc("create_parent_access_request", { p_name: name });
      if (error) throw error;
    },
    onSuccess: () => {
      setName("");
      toast.success(t("parentAccess.sent"));
      qc.invalidateQueries({ queryKey: ["parent-own-requests"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const date = (value: string | null) =>
    value
      ? new Date(value).toLocaleString(locale, { dateStyle: "medium", timeStyle: "short" })
      : "—";
  const empty = <p className="text-sm text-muted-foreground">{t("parentAccess.empty")}</p>;
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold flex gap-2 items-center">
        <Users className="size-6" />
        {t("par.title")}
      </h1>
      {profile.data?.isTeacher && <ParentRequests />}
      {isParent && (
        <>
          {(kids.isPending || requests.isPending) && <p>{t("parentAccess.loading")}</p>}
          {(kids.isError || requests.isError) && (
            <p className="text-destructive">{t("parentAccess.error")}</p>
          )}
          {requests.data
            ?.filter((r) => r.status !== "approved")
            .map((r) => (
              <div key={r.id} className="border-l-2 border-primary pl-3">
                <strong>{r.student_full_name}</strong>
                <p className="text-sm text-muted-foreground">
                  {t(r.status === "pending" ? "parentAccess.waiting" : "parentAccess.rejected")}
                </p>
              </div>
            ))}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              request.mutate();
            }}
            className="flex flex-wrap gap-2 items-end"
          >
            <div className="space-y-2 w-full sm:w-96">
              <Label htmlFor="child-request">{t("parentAccess.studentName")}</Label>
              <Input
                id="child-request"
                required
                maxLength={200}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t("parentAccess.legalName")}
              />
            </div>
            <Button disabled={request.isPending}>{t("parentAccess.request")}</Button>
          </form>
          {kids.data?.map((k) => (
            <section key={k.id} className="space-y-4 border-t border-border pt-6">
              <h2 className="text-xl font-semibold">
                {k.first_name} {k.last_name}
                <span className="block text-sm font-normal text-muted-foreground">
                  {k.drejtimi} · {k.klasa}
                  {k.paralelja}
                </span>
              </h2>
              <Tabs defaultValue="courses">
                <TabsList className="flex h-auto flex-wrap justify-start gap-1">
                  {sections.map((s) => (
                    <TabsTrigger key={s} value={s}>
                      {t(`parentAccess.${s}` as TranslationKey)}
                    </TabsTrigger>
                  ))}
                </TabsList>
                <TabsContent value="courses">
                  <div className="divide-y divide-border">
                    {k.courses.length
                      ? k.courses.map((c) => (
                          <div key={c.id} className="py-3">
                            <strong>{c.title}</strong>
                            <p className="text-sm text-muted-foreground">
                              {c.teacher} · {c.completed}/{c.topics} ·{" "}
                              {t(`status.${c.status}` as TranslationKey)}
                            </p>
                            <progress
                              value={c.completed}
                              max={Math.max(c.topics, 1)}
                              className="w-full accent-primary"
                            />
                          </div>
                        ))
                      : empty}
                  </div>
                </TabsContent>
                <TabsContent value="grades">
                  <div className="space-y-3">
                    {!k.grades.length && !k.homeworkGrades.length && empty}
                    {k.grades.map((g) => (
                      <div key={g.id} className="border-b border-border py-2">
                        <div className="flex justify-between gap-2">
                          <span>{g.title}</span>
                          <Badge>{g.grade}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {date(g.date)} · {g.feedback}
                        </p>
                        {g.pending && (
                          <p className="text-sm text-muted-foreground">
                            {t("parentAccess.pendingReview")}
                          </p>
                        )}
                      </div>
                    ))}
                    {k.homeworkGrades.map((g) => (
                      <div key={g.course_id} className="flex justify-between gap-2">
                        <span>
                          {t("parentAccess.homework")} ·{" "}
                          {k.courses.find((c) => c.id === g.course_id)?.title}
                          <p className="text-sm text-muted-foreground">{g.feedback}</p>
                        </span>
                        <Badge>{g.grade}</Badge>
                      </div>
                    ))}
                  </div>
                </TabsContent>
                <TabsContent value="homework">
                  <div className="space-y-4">
                    {k.homework.length
                      ? k.homework.map((h) => (
                          <div key={h.id} className="border-b border-border pb-3">
                            <strong>{h.title}</strong>
                            <p className="text-sm whitespace-pre-wrap break-words">
                              {h.instructions}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {date(h.due_date)} ·{" "}
                              {t(
                                h.submissions.length
                                  ? "parentAccess.submitted"
                                  : "parentAccess.notSubmitted",
                              )}
                            </p>
                            {h.submissions.map((s) => (
                              <p key={s.id} className="text-sm">
                                {date(s.date)} · {s.grade ?? "—"} · {s.feedback}
                              </p>
                            ))}
                          </div>
                        ))
                      : empty}
                  </div>
                </TabsContent>
                <TabsContent value="calendar">
                  <div className="space-y-3">
                    {!k.exams.length &&
                      !k.schedule.length &&
                      !k.homework.some((h) => h.due_date) &&
                      empty}
                    {k.homework
                      .filter((h) => h.due_date)
                      .map((h) => (
                        <p key={h.id}>
                          {date(h.due_date)} · {h.title}
                        </p>
                      ))}
                    {k.exams.map((x) => (
                      <p key={x.id}>
                        {date(x.scheduled_at)} · {x.title} · {x.duration_min} min · {x.room}
                      </p>
                    ))}
                    {k.schedule.map((s, i) => (
                      <p key={i}>
                        {new Intl.DateTimeFormat(locale, { weekday: "long" }).format(
                          new Date(2026, 0, 4 + s.day),
                        )}{" "}
                        · {s.start}–{s.end} · {s.course} · {s.room}
                      </p>
                    ))}
                  </div>
                </TabsContent>
                <TabsContent value="attendance">
                  <div className="divide-y divide-border">
                    {k.attendance.length
                      ? k.attendance.map((a, i) => (
                          <div key={i} className="flex justify-between gap-3 py-2">
                            <span>
                              {a.date} · {k.courses.find((c) => c.id === a.course_id)?.title}
                              <p className="text-sm text-muted-foreground">{a.note}</p>
                            </span>
                            <Badge variant="outline">{a.status}</Badge>
                          </div>
                        ))
                      : empty}
                  </div>
                </TabsContent>
                <TabsContent value="certificates">
                  <div className="space-y-3">
                    {k.courses.length
                      ? k.courses.map((c) => {
                          const grades = k.grades.filter((g) => g.course_id === c.id);
                          const avg = averageGrade([
                            ...grades.map((g) => g.grade),
                            ...k.homeworkGrades
                              .filter((g) => g.course_id === c.id)
                              .map((g) => g.grade),
                          ]);
                          const eligible = isCertificateEligible(
                            avg,
                            grades.some((g) => g.pending),
                          );
                          return (
                            <div
                              key={c.id}
                              className="flex flex-wrap justify-between items-center gap-2 border-b border-border py-3"
                            >
                              <span>
                                {c.title}
                                <p className="text-sm text-muted-foreground">
                                  {avg?.toFixed(2) ?? "—"} / 10
                                  {!eligible && ` · ${t("parentAccess.notEligible")}`}
                                </p>
                              </span>
                              <Button
                                variant="outline"
                                disabled={!eligible}
                                onClick={() =>
                                  generateCertificatePDF({
                                    studentName: `${k.first_name} ${k.last_name}`,
                                    courseTitle: c.title,
                                    averageGrade: avg,
                                    teacherName: c.teacher,
                                    drejtimi: k.drejtimi,
                                    klasa: k.klasa,
                                  }).catch((e: Error) => toast.error(e.message))
                                }
                              >
                                <Download className="size-4 mr-2" />
                                {t("course.downloadCertificate")}
                              </Button>
                            </div>
                          );
                        })
                      : empty}
                  </div>
                </TabsContent>
              </Tabs>
            </section>
          ))}
        </>
      )}
    </div>
  );
}
