import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, ok, fail } from "../supabase";

export default defineTool({
  name: "list_courses",
  title: "Listo kurset",
  description: "Kthen kurset që përdoruesi i lidhur ka të drejtë të shohë (mësuesi të vetat, nxënësi ato ku është regjistruar).",
  inputSchema: { limit: z.number().int().min(1).max(100).optional().describe("Numri maksimal i kurseve") },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ limit }, ctx) => {
    if (!ctx.isAuthenticated()) return fail("Nuk je i autentikuar.");
    const supa = supabaseForUser(ctx);
    const { data, error } = await supa
      .from("courses")
      .select("id,title,drejtimi,klasa,status,created_at")
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(limit ?? 20);
    if (error) return fail(error.message);
    return ok(data ?? []);
  },
});
