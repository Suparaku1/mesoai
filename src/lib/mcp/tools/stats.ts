import { defineTool } from "@lovable.dev/mcp-js";
import { supabaseForUser, ok, fail } from "../supabase";

export default defineTool({
  name: "platform_stats",
  title: "Statistika të platformës",
  description: "Numri i kurseve, temave dhe detyrave që janë të dukshme për përdoruesin e lidhur.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    if (!ctx.isAuthenticated()) return fail("Nuk je i autentikuar.");
    const supa = supabaseForUser(ctx);
    const [courses, topics, homework, enrollments] = await Promise.all([
      supa.from("courses").select("*", { count: "exact", head: true }).is("deleted_at", null),
      supa.from("topics").select("*", { count: "exact", head: true }),
      supa.from("homework").select("*", { count: "exact", head: true }),
      supa.from("enrollments").select("*", { count: "exact", head: true }),
    ]);
    const stats = {
      kurse: courses.count ?? 0,
      tema: topics.count ?? 0,
      detyra: homework.count ?? 0,
      regjistrime: enrollments.count ?? 0,
    };
    return { ...ok(stats), structuredContent: stats };
  },
});
