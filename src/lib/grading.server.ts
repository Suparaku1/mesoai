/** Server-only helpers for grading flows. */
export async function assertCourseOwner(
  supabase: { from: (t: string) => any },
  courseId: string,
  userId: string,
) {
  const { data } = await supabase.from("courses").select("id, title, teacher_id").eq("id", courseId).maybeSingle();
  if (!data) throw new Error("Kursi nuk u gjet");
  if (data.teacher_id !== userId) throw new Error("Nuk keni leje për këtë kurs");
  return data as { id: string; title: string; teacher_id: string };
}
