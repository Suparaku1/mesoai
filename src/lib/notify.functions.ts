import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

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
      .select("student_id, homework_id")
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

    const { dispatchCourseEvent } = await import("./notify.server");
    const r = await dispatchCourseEvent(supabase, {
      courseId: topic.course_id,
      studentId: sub.student_id,
      event: "homework_graded",
      topicTitle: topic.title ?? null,
      grade: data.grade,
      feedback: data.feedback ?? null,
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
  .handler(async ({ data }) => {
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
