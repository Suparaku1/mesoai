import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, ok, fail } from "../supabase";

export default defineTool({
  name: "create_course",
  title: "Krijo kurs",
  description: "Krijon një kurs të ri draft për mësuesin e lidhur.",
  inputSchema: {
    title: z.string().trim().min(3).describe("Titulli i kursit"),
    description: z.string().trim().optional().describe("Përshkrimi i shkurtër"),
    drejtimi: z.string().trim().describe("Drejtimi, p.sh. 'tik' ose 'elektroteknike'"),
    klasa: z.string().trim().describe("Klasa, p.sh. '10'"),
    paralelja: z.string().trim().optional().describe("Paralelja, p.sh. 'A'"),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
  handler: async ({ title, description, drejtimi, klasa, paralelja }, ctx) => {
    if (!ctx.isAuthenticated()) return fail("Nuk je i autentikuar.");
    const userId = ctx.getUserId();
    if (!userId) return fail("Mungon identiteti i përdoruesit.");
    const supa = supabaseForUser(ctx);
    const { data, error } = await supa
      .from("courses")
      .insert({
        teacher_id: userId,
        title,
        description: description ?? null,
        drejtimi,
        klasa,
        paralelja: paralelja ?? null,
      })
      .select("id,title,status")
      .single();
    if (error) return fail(error.message);
    return { ...ok(data), structuredContent: { course: data } };
  },
});
