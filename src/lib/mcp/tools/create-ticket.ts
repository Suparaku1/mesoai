import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, ok, fail } from "../supabase";

export default defineTool({
  name: "create_ticket",
  title: "Krijo tiket CRM",
  description: "Hap një tiket të ri mbështetjeje në CRM në emër të përdoruesit të lidhur.",
  inputSchema: {
    subject: z.string().trim().min(3).describe("Subjekti i tiketit"),
    description: z.string().trim().optional().describe("Përshkrimi i problemit"),
    priority: z.enum(["low", "medium", "high", "urgent"]).optional().describe("Prioriteti (default medium)"),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
  handler: async ({ subject, description, priority }, ctx) => {
    if (!ctx.isAuthenticated()) return fail("Nuk je i autentikuar.");
    const userId = ctx.getUserId();
    if (!userId) return fail("Mungon identiteti i përdoruesit.");
    const supa = supabaseForUser(ctx);
    const { data, error } = await supa
      .from("crm_tickets")
      .insert({ subject, description: description ?? null, priority: priority ?? "medium", opened_by: userId })
      .select("id,subject,status,priority")
      .single();
    if (error) return fail(error.message);
    return { ...ok(data), structuredContent: { ticket: data } };
  },
});
