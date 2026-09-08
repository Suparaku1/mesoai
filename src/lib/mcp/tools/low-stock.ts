import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, ok, fail } from "../supabase";

export default defineTool({
  name: "low_stock_items",
  title: "Artikuj me stok të ulët",
  description: "Kthen artikujt e inventarit nën një prag të dhënë sasie (vetëm për përdorues me akses ERP).",
  inputSchema: { threshold: z.number().int().min(0).max(10000).optional().describe("Prag i sasisë (default 5)") },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ threshold }, ctx) => {
    if (!ctx.isAuthenticated()) return fail("Nuk je i autentikuar.");
    const supa = supabaseForUser(ctx);
    const { data, error } = await supa
      .from("inventory_items")
      .select("id,name,quantity,category")
      .lte("quantity", threshold ?? 5)
      .order("quantity", { ascending: true })
      .limit(50);
    if (error) return fail(error.message);
    return ok(data ?? []);
  },
});
