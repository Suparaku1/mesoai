import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { tutorUsageDay, TUTOR_DAILY_LIMIT } from "./tutor-policy";

export const listTutorThreads = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const [{ data, error }, usage] = await Promise.all([
      context.supabase
        .from("tutor_threads")
        .select("id,title,updated_at,course_id")
        .eq("user_id", context.userId)
        .order("updated_at", { ascending: false }),
      context.supabase
        .from("tutor_daily_usage")
        .select("requests")
        .eq("user_id", context.userId)
        .eq("usage_date", tutorUsageDay())
        .maybeSingle(),
    ]);
    if (error || usage.error) throw new Error(error?.message ?? usage.error?.message);
    return { threads: data ?? [], used: usage.data?.requests ?? 0, limit: TUTOR_DAILY_LIMIT };
  });
export const createTutorThread = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ courseId: z.string().uuid().nullable() }).parse(input),
  )
  .handler(async ({ data: input, context }) => {
    const { data, error } = await context.supabase
      .from("tutor_threads")
      .insert({ user_id: context.userId, course_id: input.courseId })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return data;
  });
export const getTutorThread = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: thread, error } = await context.supabase
      .from("tutor_threads")
      .select("*")
      .eq("id", data.id)
      .eq("user_id", context.userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!thread) throw new Error("Biseda nuk u gjet");
    return thread;
  });
export const deleteTutorThread = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("tutor_threads")
      .delete()
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
