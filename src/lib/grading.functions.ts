import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { clampGrade, isPassing, averageGrade, isCertificateEligible, GRADE_MIN, GRADE_MAX } from "./grading";

/**
 * AI-assisted correction of a single homework submission (PDF/Word file).
 * Returns a suggested grade 4-10 plus feedback in Albanian; the teacher decides.
 */
export const aiGradeHomeworkSubmission = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ submissionId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: sub } = await supabase
      .from("homework_submissions")
      .select("id, file_path, homework_id")
      .eq("id", data.submissionId)
      .maybeSingle();
    if (!sub) throw new Error("Dorëzimi nuk u gjet");

    const { data: hw } = await supabase
      .from("homework")
      .select("instructions, topics(title)")
      .eq("id", sub.homework_id)
      .maybeSingle();

    const { data: file } = await supabase.storage.from("homework").download(sub.file_path);
    if (!file) throw new Error("Skedari i detyrës nuk u gjet");
    const bytes = new Uint8Array(await file.arrayBuffer());
    let binary = "";
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i] as number);
    const base64 = btoa(binary);
    const filename = sub.file_path.split("/").pop() ?? "detyre.pdf";
    const mime = filename.toLowerCase().endsWith(".pdf")
      ? "application/pdf"
      : "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) throw new Error("Mungon konfigurimi i AI-së");

    const topicTitle = (hw as { topics?: { title?: string } } | null)?.topics?.title ?? "";
    const system = `Ti je mësues i shkollës profesionale shqiptare. Korrigjo detyrën e nxënësit.
Notat janë 4-10 (4 = ngelur, 10 = shkëlqyeshëm).
Kthe VETËM JSON valid: {"grade": <numër 4-10>, "feedback": "<koment konstruktiv 2-4 fjali në shqip>"}`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Lovable-API-Key": apiKey },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: system },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Tema: ${topicTitle}\nUdhëzimet e detyrës: ${hw?.instructions ?? "-"}\n\nVlerëso punën e bashkangjitur.`,
              },
              { type: "file", file: { filename, file_data: `data:${mime};base64,${base64}` } },
            ],
          },
        ],
      }),
    });
    if (!res.ok) throw new Error(`Gabim AI ${res.status}`);
    const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const text = (json.choices?.[0]?.message?.content ?? "").trim();
    const match = text.match(/\{[\s\S]*\}/);
    let parsed: { grade?: number; feedback?: string } = {};
    try {
      parsed = JSON.parse(match ? match[0] : text);
    } catch {
      throw new Error("AI nuk ktheu vlerësim të vlefshëm");
    }
    const grade = clampGrade(Number(parsed.grade ?? GRADE_MIN));
    return { grade, feedback: String(parsed.feedback ?? "") };
  });

/**
 * Teacher records ONE overall homework grade per student per course.
 * Grade 4 blocks the student from entering the semester exam.
 */
export const setCourseHomeworkGrade = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        courseId: z.string().uuid(),
        studentId: z.string().uuid(),
        grade: z.number().int().min(GRADE_MIN).max(GRADE_MAX),
        feedback: z.string().max(2000).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { assertCourseOwner } = await import("./grading.server");
    await assertCourseOwner(supabase, data.courseId, userId);

    const { error } = await supabase.from("course_homework_grades").upsert(
      {
        course_id: data.courseId,
        student_id: data.studentId,
        grade: data.grade,
        feedback: data.feedback ?? null,
        graded_by: userId,
      },
      { onConflict: "course_id,student_id" },
    );
    if (error) throw new Error(error.message);

    const { dispatchCourseEvent } = await import("./notify.server");
    await dispatchCourseEvent(supabase, {
      courseId: data.courseId,
      studentId: data.studentId,
      event: "homework_overall_graded",
      grade: data.grade,
      feedback: data.feedback ?? null,
    });
    await dispatchCourseEvent(supabase, {
      courseId: data.courseId,
      studentId: data.studentId,
      event: isPassing(data.grade) ? "exam_unlocked" : "exam_blocked",
    });
    return { ok: true, canTakeExam: isPassing(data.grade) };
  });

/**
 * Teacher confirms (or adjusts) the auto-graded semester / final test result.
 */
export const reviewExamAttempt = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        attemptId: z.string().uuid(),
        grade: z.number().int().min(GRADE_MIN).max(GRADE_MAX),
        feedback: z.string().max(2000).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: attempt } = await supabase
      .from("quiz_attempts")
      .select("id, student_id, quizzes(topic_id, topics(title, course_id))")
      .eq("id", data.attemptId)
      .maybeSingle();
    if (!attempt) throw new Error("Testimi nuk u gjet");
    const topic = (attempt as any).quizzes?.topics as { title?: string; course_id?: string } | undefined;
    if (!topic?.course_id) throw new Error("Kursi nuk u gjet");
    const { assertCourseOwner } = await import("./grading.server");
    await assertCourseOwner(supabase, topic.course_id, userId);

    const { error } = await supabase
      .from("quiz_attempts")
      .update({
        final_grade: data.grade,
        teacher_feedback: data.feedback ?? null,
        reviewed: true,
        needs_review: false,
        reviewed_by: userId,
      })
      .eq("id", data.attemptId);
    if (error) throw new Error(error.message);

    const { dispatchCourseEvent } = await import("./notify.server");
    await dispatchCourseEvent(supabase, {
      courseId: topic.course_id,
      studentId: (attempt as any).student_id,
      event: "exam_reviewed",
      topicTitle: topic.title ?? null,
      grade: data.grade,
      feedback: data.feedback ?? null,
    });
    return { ok: true };
  });

/**
 * Checks whether a student passed the course (avg >= 7) and, if so, emails
 * everyone that the certificate has been issued.
 */
export const issueCertificate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ courseId: z.string().uuid(), studentId: z.string().uuid().optional() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const studentId = data.studentId ?? userId;

    const { data: topics } = await supabase.from("topics").select("id").eq("course_id", data.courseId);
    const topicIds = (topics ?? []).map((t) => t.id);
    if (!topicIds.length) return { eligible: false, average: null };

    const { data: quizzes } = await supabase.from("quizzes").select("id").in("topic_id", topicIds);
    const quizIds = (quizzes ?? []).map((q) => q.id);
    const { data: attempts } = quizIds.length
      ? await supabase
          .from("quiz_attempts")
          .select("grade, final_grade, needs_review")
          .eq("student_id", studentId)
          .in("quiz_id", quizIds)
      : { data: [] as Array<{ grade: number; final_grade: number | null; needs_review: boolean }> };

    const { data: hwGrade } = await supabase
      .from("course_homework_grades")
      .select("grade")
      .eq("course_id", data.courseId)
      .eq("student_id", studentId)
      .maybeSingle();

    const pending = (attempts ?? []).some((a) => a.needs_review);
    const grades = [
      ...(attempts ?? []).map((a) => a.final_grade ?? a.grade),
      ...(hwGrade ? [hwGrade.grade] : []),
    ];
    const average = averageGrade(grades);
    const eligible = isCertificateEligible(average, pending);

    if (eligible) {
      const { dispatchCourseEvent } = await import("./notify.server");
      await dispatchCourseEvent(supabase, {
        courseId: data.courseId,
        studentId,
        event: "certificate_issued",
        grade: Number(average!.toFixed(2)),
      });
    }
    return { eligible, average, pendingReview: pending };
  });
