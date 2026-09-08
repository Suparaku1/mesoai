import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const moveSchema = z.object({
  item_id: z.string().uuid(),
  delta: z.number().int(),
  reason: z.string().max(200).optional(),
});

export const addStockMovement = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => moveSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("stock_movements").insert({
      item_id: data.item_id,
      delta: data.delta,
      reason: data.reason ?? null,
      created_by: context.userId,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const poSchema = z.object({
  supplier: z.string().min(1).max(200),
  status: z.enum(["draft", "ordered", "received", "cancelled"]).default("draft"),
  total_amount: z.number().min(0),
  expected_at: z.string().optional(),
  notes: z.string().max(1000).optional(),
});

export const createPurchaseOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => poSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("purchase_orders")
      .insert({ ...data, created_by: context.userId })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: row.id };
  });

export const updatePurchaseOrderStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ id: z.string().uuid(), status: z.enum(["draft", "ordered", "received", "cancelled"]) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("purchase_orders").update({ status: data.status }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const budgetSchema = z.object({
  category: z.string().min(1).max(100),
  period_month: z.string(), // YYYY-MM-01
  planned_amount: z.number().min(0),
  spent_amount: z.number().min(0).optional(),
  notes: z.string().max(500).optional(),
});

export const upsertBudget = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => budgetSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("budgets")
      .upsert(data, { onConflict: "category,period_month" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
