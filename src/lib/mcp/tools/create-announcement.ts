import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, ok, fail } from "../supabase";

export default defineTool({
  name: "create_announcement",
  title: "Krijo njoftim",
  description: "Publikon një njoftim për një audiencë të caktuar (all, students, teachers, parents).",
  inputSchema: {
    title: z.string().trim().min(3).describe("Titulli i njoftimit"),
    body: z.string().trim().min(3).describe("Përmbajtja e njoftimit"),
    audience: z.enum(["all", "students", "teachers", "parents"]).optional().describe("Audienca (default all)"),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
  handler: async ({ title, body, audience }, ctx) => {
    if (!ctx.isAuthenticated()) return fail("Nuk je i autentikuar.");
    const userId = ctx.getUserId();
    if (!userId) return fail("Mungon identiteti i përdoruesit.");
    const supa = supabaseForUser(ctx);
    const { data, error } = await supa
      .from("announcements")
      .insert({ title, body, audience: audience ?? "all", author_id: userId })
      .select("id,title,audience,created_at")
      .single();
    if (error) return fail(error.message);
    return { ...ok(data), structuredContent: { announcement: data } };
  },
});
