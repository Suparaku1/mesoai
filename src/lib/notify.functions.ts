import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertStaff } from "./staff-access";

const EVENTS = [
  "enrollment_requested",
  "enrollment_approved",
  "enrollment_rejected",
  "topic_completed",
  "homework_submitted",
  "homework_graded",
  "homework_overall_graded",
  "exam_unlocked",
  "exam_blocked",
  "exam_submitted",
  "exam_pending_review",
  "exam_reviewed",
  "certificate_issued",
] as const;

const EventSchema = z.object({
  courseId: z.string().uuid(),
  studentId: z.string().uuid().optional(),
  event: z.enum(EVENTS),
  topicTitle: z.string().max(200).optional(),
  grade: z.number().optional(),
  feedback: z.string().max(4000).optional(),
});

/**
 * Central hub: emails everyone involved in a course event (student, linked
 * parents and the course teacher) via Gmail, plus an in-app notification.
 */
export const notifyCourseEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => EventSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { dispatchCourseEvent } = await import("./notify.server");
    const studentId = data.studentId ?? context.userId;
    const { data: course, error: courseError } = await context.supabase.from("courses")
      .select("teacher_id").eq("id", data.courseId).maybeSingle();
    if (courseError) throw courseError;
    if (!course) throw new Error("Kursi nuk u gjet.");
    if (course.teacher_id === context.userId && studentId !== context.userId) {
      const { data: enr, error: enrErr } = await context.supabase.from("enrollments").select("id")
        .eq("course_id", data.courseId).eq("student_id", studentId).maybeSingle();
      if (enrErr) throw enrErr;
      if (!enr) throw new Error("Nxënësi nuk është i regjistruar në këtë kurs.");
    }
    if (course.teacher_id !== context.userId) {
      if (studentId !== context.userId || !["enrollment_requested", "topic_completed", "homework_submitted", "exam_pending_review", "exam_submitted"].includes(data.event)) throw new Error("Nuk keni leje për këtë njoftim.");
      const { data: enrollment } = await context.supabase.from("enrollments").select("status")
        .eq("course_id", data.courseId).eq("student_id", context.userId).maybeSingle();
      if (!enrollment || (data.event === "enrollment_requested" ? enrollment.status !== "pending" : enrollment.status !== "approved")) throw new Error("Ngjarja nuk përputhet me regjistrimin.");
      if (data.event !== "enrollment_requested") {
        const { data: topics } = await context.supabase.from("topics").select("id,title")
          .eq("course_id", data.courseId).eq("title", data.topicTitle ?? "").is("deleted_at", null);
        if (topics?.length !== 1) throw new Error("Tema e njoftimit nuk u identifikua.");
        const topic = topics[0];
        if (!topic) throw new Error("Tema nuk u gjet.");
        if (data.event === "topic_completed") {
          const { data: progress } = await context.supabase.from("topic_progress").select("id").eq("topic_id", topic.id).eq("student_id", studentId).maybeSingle();
          if (!progress) throw new Error("Tema nuk është përfunduar.");
          data.grade = undefined;
        } else if (data.event === "homework_submitted") {
          const { data: homework } = await context.supabase.from("homework").select("id").eq("topic_id", topic.id).maybeSingle();
          const { data: submission } = homework ? await context.supabase.from("homework_submissions").select("id").eq("homework_id", homework.id).eq("student_id", studentId).maybeSingle() : { data: null };
          if (!submission) throw new Error("Detyra nuk është dorëzuar.");
        } else {
          const { data: quizzes } = await context.supabase.from("quizzes").select("id").eq("topic_id", topic.id);
          const { data: attempts } = await context.supabase.from("quiz_attempts").select("grade,needs_review").in("quiz_id", (quizzes ?? []).map((q) => q.id)).eq("student_id", studentId).order("created_at", { ascending: false }).limit(1);
          const attempt = attempts?.[0];
          if (!attempt || (data.event === "exam_pending_review" && !attempt.needs_review)) throw new Error("Testimi nuk është dorëzuar.");
          data.grade = attempt.grade;
        }
        data.feedback = undefined;
      }
    }

    // CRM automation: keep contacts/leads in sync and fire automation rules.
    try {
      const { syncEnrollmentToCrm, runAutomationRules } = await import("./crm.server");
      if (
        data.event === "enrollment_requested" ||
        data.event === "enrollment_approved" ||
        data.event === "enrollment_rejected"
      ) {
        await syncEnrollmentToCrm({ event: data.event, courseId: data.courseId, studentId });
      }
      await runAutomationRules(data.event, { courseId: data.courseId, studentId, grade: data.grade ?? null });
    } catch {
      // automation must never block the notification
    }

    try {
      return await dispatchCourseEvent(context.supabase, {
        courseId: data.courseId,
        studentId,
        event: data.event,
        topicTitle: data.topicTitle ?? null,
        grade: data.grade ?? null,
        feedback: data.feedback ?? null,
      });
    } catch {
      return { sent: 0 };
    }
  });

/**
 * Notifies a graded homework submission (student + parents + teacher).
 */
export const notifyHomeworkGraded = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({ submissionId: z.string().uuid(), grade: z.number(), feedback: z.string().optional() })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: sub } = await supabase
      .from("homework_submissions")
      .select("student_id, homework_id, grade, feedback")
      .eq("id", data.submissionId)
      .maybeSingle();
    if (!sub) return { sent: false };

    const { data: hw } = await supabase
      .from("homework")
      .select("topics(title, course_id)")
      .eq("id", sub.homework_id)
      .maybeSingle();
    const topic = (hw as { topics?: { title?: string; course_id?: string } } | null)?.topics;
    if (!topic?.course_id) return { sent: false };
    const { assertCourseOwner } = await import("./grading.server");
    await assertCourseOwner(supabase, topic.course_id, context.userId);
    if (sub.grade === null) throw new Error("Detyra nuk është vlerësuar ende.");

    const { dispatchCourseEvent } = await import("./notify.server");
    const r = await dispatchCourseEvent(supabase, {
      courseId: topic.course_id,
      studentId: sub.student_id,
      event: "homework_graded",
      topicTitle: topic.title ?? null,
      grade: sub.grade,
      feedback: sub.feedback,
    });
    return { sent: r.sent > 0 };
  });

/**
 * Adds a homework due-date event to Google Calendar.
 */
export const addHomeworkToCalendar = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        topicTitle: z.string(),
        instructions: z.string(),
        dueISO: z.string(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    await assertStaff(context.supabase, context.userId);
    const { createCalendarEvent } = await import("./calendar.functions");
    const start = new Date(data.dueISO);
    const end = new Date(start.getTime() + 30 * 60 * 1000);
    try {
      const r = await createCalendarEvent({
        data: {
          summary: `Detyrë: ${data.topicTitle}`,
          description: data.instructions,
          startISO: start.toISOString(),
          endISO: end.toISOString(),
          calendarId: "primary",
        },
      });
      return r;
    } catch (e) {
      return { id: null, link: null, error: e instanceof Error ? e.message : "Gabim" };
    }
  });
