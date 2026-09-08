import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { BookOpen, ClipboardCheck, FileUp, Send, Sparkles, UserCheck, Users } from "lucide-react";
import type { NextAction } from "@/components/dashboard/next-actions";

/** Veprimet e radhës për mësuesin: kërkesa regjistrimi, testime për konfirmim, kurse draft. */
export function useTeacherNextActions(userId: string) {
  return useQuery({
    queryKey: ["next-actions", "teacher", userId],
    queryFn: async (): Promise<NextAction[]> => {
      const actions: NextAction[] = [];

      const { data: courses } = await supabase
        .from("courses")
        .select("id,title,status")
        .eq("teacher_id", userId)
        .is("deleted_at", null);
      const list = courses ?? [];
      const courseIds = list.map((c) => c.id);

      if (courseIds.length) {
        const { data: pending } = await supabase
          .from("enrollments")
          .select("course_id")
          .eq("status", "pending")
          .in("course_id", courseIds);

        const byCourse = new Map<string, number>();
        for (const e of pending ?? []) byCourse.set(e.course_id, (byCourse.get(e.course_id) ?? 0) + 1);
        for (const [courseId, count] of byCourse) {
          const c = list.find((x) => x.id === courseId);
          actions.push({
            id: `enroll-${courseId}`,
            icon: UserCheck,
            title: `${count} kërkesë regjistrimi në pritje`,
            description: c?.title,
            to: "/courses/$id",
            params: { id: courseId },
            tone: "urgent",
          });
        }

        // Testime semestri/final që presin konfirmimin e mësuesit
        const { data: topics } = await supabase
          .from("topics")
          .select("id,course_id")
          .in("course_id", courseIds)
          .is("deleted_at", null);
        const topicIds = (topics ?? []).map((t) => t.id);

        if (topicIds.length) {
          const { data: quizzes } = await supabase.from("quizzes").select("id,topic_id").in("topic_id", topicIds);
          const quizIds = (quizzes ?? []).map((q) => q.id);
          if (quizIds.length) {
            const { data: attempts } = await supabase
              .from("quiz_attempts")
              .select("id,quiz_id")
              .in("quiz_id", quizIds)
              .eq("needs_review", true)
              .eq("reviewed", false);

            const perCourse = new Map<string, number>();
            for (const a of attempts ?? []) {
              const q = quizzes?.find((x) => x.id === a.quiz_id);
              const t = topics?.find((x) => x.id === q?.topic_id);
              if (!t) continue;
              perCourse.set(t.course_id, (perCourse.get(t.course_id) ?? 0) + 1);
            }
            for (const [courseId, count] of perCourse) {
              actions.push({
                id: `review-${courseId}`,
                icon: ClipboardCheck,
                title: `${count} testime për konfirmim`,
                description: list.find((c) => c.id === courseId)?.title,
                to: "/courses/$id",
                params: { id: courseId },
                tone: "urgent",
              });
            }
          }
        }
      }

      for (const c of list.filter((x) => x.status === "draft").slice(0, 3)) {
        actions.push({
          id: `draft-${c.id}`,
          icon: Send,
          title: "Kurs draft — publikoje",
          description: c.title,
          to: "/courses/$id",
          params: { id: c.id },
        });
      }

      if (!list.length) {
        actions.push({
          id: "first-course",
          icon: Sparkles,
          title: "Krijo kursin tënd të parë",
          description: "Ngarko një PDF dhe AI ndërton temat automatikisht",
          to: "/courses/new",
          tone: "urgent",
        });
      }

      return actions.slice(0, 6);
    },
  });
}

/** Veprimet e radhës për nxënësin: tema e radhës, detyra pa dorëzim, kurse për të shfletuar. */
export function useStudentNextActions(userId: string) {
  return useQuery({
    queryKey: ["next-actions", "student", userId],
    queryFn: async (): Promise<NextAction[]> => {
      const actions: NextAction[] = [];

      const { data: enrollments } = await supabase
        .from("enrollments")
        .select("course_id,status,courses(id,title)")
        .eq("student_id", userId);

      const approved = (enrollments ?? []).filter((e) => e.status === "approved");
      const courseIds = approved.map((e) => e.course_id);

      if (courseIds.length) {
        const [{ data: topics }, { data: progress }] = await Promise.all([
          supabase
            .from("topics")
            .select("id,title,course_id,order_index")
            .in("course_id", courseIds)
            .is("deleted_at", null)
            .order("order_index"),
          supabase.from("topic_progress").select("topic_id").eq("student_id", userId),
        ]);
        const done = new Set((progress ?? []).map((p) => p.topic_id));

        for (const e of approved) {
          const next = (topics ?? []).find((t) => t.course_id === e.course_id && !done.has(t.id));
          if (!next) continue;
          actions.push({
            id: `topic-${next.id}`,
            icon: BookOpen,
            title: `Vazhdo: ${next.title}`,
            description: (e as { courses?: { title?: string } }).courses?.title,
            to: "/topics/$id",
            params: { id: next.id },
            tone: "urgent",
          });
        }

        // Detyra pa dorëzim
        const topicIds = (topics ?? []).map((t) => t.id);
        if (topicIds.length) {
          const { data: homework } = await supabase
            .from("homework")
            .select("id,due_date,topic_id")
            .in("topic_id", topicIds);
          const hwIds = (homework ?? []).map((h) => h.id);
          if (hwIds.length) {
            const { data: subs } = await supabase
              .from("homework_submissions")
              .select("homework_id")
              .eq("student_id", userId)
              .in("homework_id", hwIds);
            const submitted = new Set((subs ?? []).map((s) => s.homework_id));
            const missing = (homework ?? []).filter((h) => !submitted.has(h.id));
            if (missing.length) {
              actions.push({
                id: "homework",
                icon: FileUp,
                title: `${missing.length} detyra pa dorëzuar`,
                description: "Shiko afatet në kalendar",
                to: "/calendar",
                tone: "urgent",
              });
            }
          }
        }
      }

      if (!approved.length) {
        actions.push({
          id: "browse",
          icon: BookOpen,
          title: "Shfleto dhe regjistrohu në një kurs",
          description: (enrollments ?? []).some((e) => e.status === "pending")
            ? "Ke kërkesa në pritje aprovimi"
            : undefined,
          to: "/browse",
          tone: "urgent",
        });
      }

      return actions.slice(0, 6);
    },
  });
}

/** Veprimet e radhës për prindin: fëmijët e lidhur dhe notat e fundit. */
export function useParentNextActions(userId: string) {
  return useQuery({
    queryKey: ["next-actions", "parent", userId],
    queryFn: async (): Promise<NextAction[]> => {
      const { data: links } = await supabase
        .from("parent_links")
        .select("student_id")
        .eq("parent_id", userId);

      if (!(links ?? []).length) {
        return [
          {
            id: "no-kids",
            icon: Users,
            title: "Asnjë fëmijë i lidhur",
            description: "Kontakto administratën për lidhjen prind–nxënës",
            to: "/parent",
            tone: "urgent",
          },
        ];
      }

      return [
        {
          id: "portal",
          icon: Users,
          title: "Shiko ecurinë e fëmijës",
          description: `${links!.length} nxënës të lidhur`,
          to: "/parent",
        },
      ];
    },
  });
}
