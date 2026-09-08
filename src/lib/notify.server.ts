import { sendMail, mailTemplate, escapeHtml } from "./gmail.server";

export type CourseEvent =
  | "enrollment_requested"
  | "enrollment_approved"
  | "enrollment_rejected"
  | "topic_completed"
  | "homework_submitted"
  | "homework_graded"
  | "homework_overall_graded"
  | "exam_unlocked"
  | "exam_blocked"
  | "exam_submitted"
  | "exam_pending_review"
  | "exam_reviewed"
  | "certificate_issued";

type Ctx = {
  courseTitle: string;
  studentName: string;
  teacherName: string;
  topicTitle?: string | null;
  grade?: number | null;
  feedback?: string | null;
  message?: string | null;
};

type Built = { subject: string; heading: string; body: string; highlight?: string; note?: string };

export function buildEventContent(event: CourseEvent, c: Ctx): Built {
  const course = escapeHtml(c.courseTitle);
  const student = escapeHtml(c.studentName);
  const topic = escapeHtml(c.topicTitle ?? "");
  const fb = c.feedback ? `<p><strong>Komenti i mësuesit:</strong><br>${escapeHtml(c.feedback)}</p>` : "";

  switch (event) {
    case "enrollment_requested":
      return {
        subject: `Kërkesë e re regjistrimi — ${c.courseTitle}`,
        heading: "Kërkesë e re regjistrimi",
        body: `<p><strong>${student}</strong> ka kërkuar të regjistrohet në kursin <strong>${course}</strong>.</p>`,
      };
    case "enrollment_approved":
      return {
        subject: `U aprovove në kursin ${c.courseTitle}`,
        heading: "Regjistrimi u aprovua",
        body: `<p>Regjistrimi i nxënësit <strong>${student}</strong> në kursin <strong>${course}</strong> u aprovua. Mësimi mund të fillojë.</p>`,
      };
    case "enrollment_rejected":
      return {
        subject: `Regjistrimi u refuzua — ${c.courseTitle}`,
        heading: "Regjistrimi u refuzua",
        body: `<p>Kërkesa e nxënësit <strong>${student}</strong> për kursin <strong>${course}</strong> u refuzua.</p>`,
      };
    case "topic_completed":
      return {
        subject: `Temë e përfunduar — ${c.courseTitle}`,
        heading: "Tema u përfundua",
        body: `<p><strong>${student}</strong> përfundoi temën <strong>${topic}</strong> në kursin <strong>${course}</strong>.</p>`,
      };
    case "homework_submitted":
      return {
        subject: `Detyrë e dorëzuar — ${c.courseTitle}`,
        heading: "Detyrë e re e dorëzuar",
        body: `<p><strong>${student}</strong> dorëzoi detyrën për temën <strong>${topic}</strong> në kursin <strong>${course}</strong>.</p>`,
      };
    case "homework_graded":
      return {
        subject: `Detyra u vlerësua: ${c.grade}/10`,
        heading: "Detyra u vlerësua",
        body: `<p>Detyra e nxënësit <strong>${student}</strong> për temën <strong>${topic}</strong> mori notën:</p>`,
        highlight: String(c.grade ?? ""),
        note: fb,
      };
    case "homework_overall_graded":
      return {
        subject: `Nota përfundimtare e detyrave — ${c.courseTitle}`,
        heading: "Nota e detyrave të shtëpisë",
        body: `<p>Mësuesi vendosi notën përmbledhëse të detyrave për <strong>${student}</strong> në kursin <strong>${course}</strong>:</p>`,
        highlight: String(c.grade ?? ""),
        note:
          (c.grade ?? 0) <= 4
            ? `<p style="color:#b91c1c"><strong>Me notën 4 nxënësi ka ngelur dhe nuk lejohet të hyjë në provim.</strong></p>${fb}`
            : `<p>Tani nxënësi lejohet të hyjë në testimin e semestrit.</p>${fb}`,
      };
    case "exam_unlocked":
      return {
        subject: `Testimi u hap — ${c.courseTitle}`,
        heading: "Testimi është i hapur",
        body: `<p>Detyrat u korrigjuan. <strong>${student}</strong> mund të hyjë në testimin e kursit <strong>${course}</strong>.</p>`,
      };
    case "exam_blocked":
      return {
        subject: `Nuk lejohet hyrja në provim — ${c.courseTitle}`,
        heading: "Hyrja në provim e bllokuar",
        body: `<p><strong>${student}</strong> nuk mund të hyjë në provimin e kursit <strong>${course}</strong> derisa detyrat të korrigjohen me notë mbi 4.</p>`,
      };
    case "exam_submitted":
      return {
        subject: `Testim i dorëzuar — ${c.courseTitle}`,
        heading: "Testim i dorëzuar",
        body: `<p><strong>${student}</strong> dorëzoi testimin <strong>${topic}</strong> në kursin <strong>${course}</strong>.</p>`,
      };
    case "exam_pending_review":
      return {
        subject: `Testim semestri pret konfirmimin tuaj — ${c.courseTitle}`,
        heading: "Testim në pritje konfirmimi",
        body: `<p>Testimi i semestrit i nxënësit <strong>${student}</strong> (${topic}) u korrigjua automatikisht me notën propozuar <strong>${c.grade}</strong>. Kërkohet konfirmimi juaj.</p>`,
      };
    case "exam_reviewed":
      return {
        subject: `Nota e testimit u konfirmua: ${c.grade}/10`,
        heading: "Nota e testimit u konfirmua",
        body: `<p>Mësuesi konfirmoi notën e testimit <strong>${topic}</strong> për <strong>${student}</strong>:</p>`,
        highlight: String(c.grade ?? ""),
        note: fb,
      };
    case "certificate_issued":
      return {
        subject: `Certifikatë përfundimi — ${c.courseTitle}`,
        heading: "Certifikata u lëshua",
        body: `<p><strong>${student}</strong> përfundoi kursin <strong>${course}</strong> me mesatare ${c.grade ?? "-"} dhe përfitoi certifikatën e përfundimit.</p>`,
        note: `<p>Certifikata mund të shkarkohet nga faqja e kursit në platformë.</p>`,
      };
  }
}

export async function sendEventMail(
  to: string[],
  event: CourseEvent,
  ctx: Ctx,
): Promise<{ sent: number }> {
  const built = buildEventContent(event, ctx);
  const html = mailTemplate({
    heading: built.heading,
    body: built.body,
    ...(built.highlight ? { highlight: built.highlight } : {}),
    ...(built.note ? { note: built.note } : {}),
  });
  let sent = 0;
  for (const addr of Array.from(new Set(to.filter(Boolean)))) {
    try {
      await sendMail(addr, built.subject, html, event);
      sent++;
    } catch {
      /* ignore individual failures */
    }
  }
  return { sent };
}

type AnyClient = {
  from: (t: string) => any;
};

/**
 * Resolves recipients for a course event and emails them (student, linked
 * parents, teacher). Server-only; pass an authenticated supabase client.
 */
export async function dispatchCourseEvent(
  supabase: AnyClient,
  params: {
    courseId: string;
    studentId: string;
    event: CourseEvent;
    topicTitle?: string | null;
    grade?: number | null;
    feedback?: string | null;
  },
) {
  const teacherOnly: CourseEvent[] = [
    "enrollment_requested",
    "topic_completed",
    "homework_submitted",
    "exam_submitted",
    "exam_pending_review",
  ];
  const { data: course } = await supabase
    .from("courses")
    .select("id, title, teacher_id, email_notifications")
    .eq("id", params.courseId)
    .maybeSingle();
  if (!course) return { sent: 0 };

  const [{ data: teacher }, { data: student }, { data: links }] = await Promise.all([
    supabase.from("profiles").select("email, first_name, last_name").eq("id", course.teacher_id).maybeSingle(),
    supabase.from("profiles").select("email, first_name, last_name").eq("id", params.studentId).maybeSingle(),
    supabase.from("parent_links").select("parent_id").eq("student_id", params.studentId),
  ]);
  let parentEmails: string[] = [];
  if (links?.length) {
    const { data: parents } = await supabase
      .from("profiles")
      .select("email")
      .in("id", links.map((l: { parent_id: string }) => l.parent_id));
    parentEmails = (parents ?? []).map((p: { email: string }) => p.email).filter(Boolean);
  }

  const ctx = {
    courseTitle: course.title as string,
    studentName: `${student?.first_name ?? ""} ${student?.last_name ?? ""}`.trim() || "Nxënësi",
    teacherName: `${teacher?.first_name ?? ""} ${teacher?.last_name ?? ""}`.trim() || "Mësuesi",
    topicTitle: params.topicTitle ?? null,
    grade: params.grade ?? null,
    feedback: params.feedback ?? null,
  };
  const built = buildEventContent(params.event, ctx);

  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("notifications").insert({
      user_id: teacherOnly.includes(params.event) ? course.teacher_id : params.studentId,
      title: built.heading,
      message: built.subject,
      type: "course",
      link: `/courses/${course.id}`,
    });
  } catch {
    /* non-fatal */
  }

  if (!course.email_notifications) return { sent: 0 };

  const recipients = teacherOnly.includes(params.event)
    ? [teacher?.email]
    : [teacher?.email, student?.email, ...parentEmails];
  return await sendEventMail(recipients.filter((e: string | undefined): e is string => !!e), params.event, ctx);
}
