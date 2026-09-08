import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, ok, fail } from "../supabase";

export default defineTool({
  name: "upcoming_homework",
  title: "Detyrat e ardhshme",
  description: "Detyrat me afat në ditët e ardhshme, të filtruara sipas të drejtave të përdoruesit.",
  inputSchema: { days: z.number().int().min(1).max(90).optional().describe("Ditë përpara (default 14)") },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ days }, ctx) => {
    if (!ctx.isAuthenticated()) return fail("Nuk je i autentikuar.");
    const supa = supabaseForUser(ctx);
    const n = days ?? 14;
    const until = new Date(Date.now() + n * 86400_000).toISOString();
    const { data, error } = await supa
      .from("homework")
      .select("id,instructions,due_date,topic_id")
      .gte("due_date", new Date().toISOString())
      .lte("due_date", until)
      .order("due_date", { ascending: true })
      .limit(50);
    if (error) return fail(error.message);
    return ok(data ?? []);
  },
});
