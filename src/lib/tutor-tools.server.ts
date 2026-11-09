import { tool } from "ai";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";

type Client = SupabaseClient<any, "public", any>;

/** Tools for the AI tutor. All queries run with the student's own token, so RLS applies. */
export function createTutorTools(supabase: Client, userId: string) {
  async function approvedCourses() {
    const { data } = await supabase
      .from("enrollments")
      .select("course_id, courses(id,title,description)")
      .eq("student_id", userId)
      .eq("status", "approved");
    return (data ?? [])
      .map((r) => r.courses)
      .filter(Boolean) as unknown as Array<{ id: string; title: string; description: string | null }>;
  }

  async function resolveCourse(courseTitle?: string | null) {
    const courses = await approvedCourses();
    if (!courses.length) return null;
    if (!courseTitle) return courses[0];
    const q = courseTitle.toLowerCase();
    return courses.find((c) => c.title.toLowerCase().includes(q)) ?? courses[0];
  }

  return {
    listaEKurseve: tool({
      description: "Liston kurset ku nxënësi është i regjistruar dhe i aprovuar.",
      inputSchema: z.object({}),
      execute: async () => {
        const courses = await approvedCourses();
        return { kurse: courses.map((c) => ({ titulli: c.title, pershkrimi: c.description })) };
      },
    }),

    progresiIKursit: tool({
      description:
        "Kthen progresin e nxënësit në një kurs: sa tema janë përfunduar, totali dhe cila është tema e radhës.",
      inputSchema: z.object({
        kursi: z.string().nullable().describe("Emri i kursit; null për kursin e parë."),
      }),
      execute: async ({ kursi }) => {
        const course = await resolveCourse(kursi);
        if (!course) return { gabim: "Nuk je i regjistruar në asnjë kurs të aprovuar." };
        const { data: topics } = await supabase
          .from("topics")
          .select("id,title,order_index")
          .eq("course_id", course.id)
          .is("deleted_at", null)
          .order("order_index");
        const list = topics ?? [];
        const { data: prog } = await supabase
          .from("topic_progress")
          .select("topic_id")
          .eq("student_id", userId);
        const done = new Set((prog ?? []).map((p) => p.topic_id));
        const next = list.find((t) => !done.has(t.id));
        return {
          kursi: course.title,
          temaTotale: list.length,
          temaTePerfunduara: list.filter((t) => done.has(t.id)).length,
          temaERadhes: next?.title ?? "Të gjitha temat janë përfunduar",
        };
      },
    }),

    notatEMia: tool({
      description: "Kthen notat e nxënësit nga testimet dhe nota përmbledhëse e detyrave (4–10).",
      inputSchema: z.object({
        kursi: z.string().nullable().describe("Emri i kursit; null për kursin e parë."),
      }),
      execute: async ({ kursi }) => {
        const course = await resolveCourse(kursi);
        if (!course) return { gabim: "Nuk je i regjistruar në asnjë kurs të aprovuar." };
        const { data: topics } = await supabase
          .from("topics")
          .select("id,title")
          .eq("course_id", course.id)
          .is("deleted_at", null);
        const topicIds = (topics ?? []).map((t) => t.id);
        const titleById = new Map((topics ?? []).map((t) => [t.id, t.title]));
        const { data: quizzes } = topicIds.length
          ? await supabase.from("quizzes").select("id,topic_id").in("topic_id", topicIds)
          : { data: [] as any[] };
        const quizIds = (quizzes ?? []).map((q) => q.id);
        const topicByQuiz = new Map((quizzes ?? []).map((q) => [q.id, q.topic_id]));
        const { data: attempts } = quizIds.length
          ? await supabase
              .from("quiz_attempts")
              .select("quiz_id,grade,final_grade,needs_review,reviewed")
              .eq("student_id", userId)
              .in("quiz_id", quizIds)
          : { data: [] as any[] };
        const { data: hw } = await supabase
          .from("course_homework_grades")
          .select("grade,feedback")
          .eq("student_id", userId)
          .eq("course_id", course.id)
          .maybeSingle();
        return {
          kursi: course.title,
          testime: (attempts ?? []).map((a) => ({
            tema: titleById.get(topicByQuiz.get(a.quiz_id)) ?? "—",
            nota: a.final_grade ?? a.grade,
            neShqyrtim: a.needs_review && !a.reviewed,
          })),
          notaEDetyrave: hw?.grade ?? null,
          komentiIMesuesit: hw?.feedback ?? null,
        };
      },
    }),

    detyratEPaperfunduara: tool({
      description: "Liston detyrat e shtëpisë që nxënësi ende nuk i ka dorëzuar, me afatet.",
      inputSchema: z.object({
        kursi: z.string().nullable().describe("Emri i kursit; null për kursin e parë."),
      }),
      execute: async ({ kursi }) => {
        const course = await resolveCourse(kursi);
        if (!course) return { gabim: "Nuk je i regjistruar në asnjë kurs të aprovuar." };
        const { data: topics } = await supabase
          .from("topics")
          .select("id,title")
          .eq("course_id", course.id)
          .is("deleted_at", null);
        const topicIds = (topics ?? []).map((t) => t.id);
        const titleById = new Map((topics ?? []).map((t) => [t.id, t.title]));
        if (!topicIds.length) return { kursi: course.title, detyra: [] };
        const { data: hw } = await supabase
          .from("homework")
          .select("id,instructions,due_date,topic_id")
          .in("topic_id", topicIds);
        const hwIds = (hw ?? []).map((h) => h.id);
        const { data: subs } = hwIds.length
          ? await supabase
              .from("homework_submissions")
              .select("homework_id")
              .eq("student_id", userId)
              .in("homework_id", hwIds)
          : { data: [] as any[] };
        const done = new Set((subs ?? []).map((s) => s.homework_id));
        return {
          kursi: course.title,
          detyra: (hw ?? [])
            .filter((h) => !done.has(h.id))
            .map((h) => ({
              tema: titleById.get(h.topic_id) ?? "—",
              udhezime: h.instructions,
              afati: h.due_date,
            })),
        };
      },
    }),
  };
}
