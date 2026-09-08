import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, ok, fail } from "../supabase";

export default defineTool({
  name: "review_enrollment",
  title: "Aprovo ose refuzo regjistrim",
  description: "Ndryshon statusin e një kërkese regjistrimi (approved/rejected) për një kurs të mësuesit të lidhur.",
  inputSchema: {
    enrollment_id: z.string().uuid().describe("ID e regjistrimit"),
    decision: z.enum(["approved", "rejected"]).describe("Vendimi"),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  handler: async ({ enrollment_id, decision }, ctx) => {
    if (!ctx.isAuthenticated()) return fail("Nuk je i autentikuar.");
    const supa = supabaseForUser(ctx);
    const { data, error } = await supa
      .from("enrollments")
      .update({ status: decision })
      .eq("id", enrollment_id)
      .select("id,status,student_id,course_id")
      .maybeSingle();
    if (error) return fail(error.message);
    if (!data) return fail("Regjistrimi nuk u gjet ose nuk ke të drejtë ta ndryshosh.");
    return { ...ok(data), structuredContent: { enrollment: data } };
  },
});
