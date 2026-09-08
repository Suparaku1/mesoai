import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useCourse(courseId: string | undefined) {
  return useQuery({
    queryKey: ["course", courseId],
    enabled: !!courseId,
    queryFn: async () => {
      const { data, error } = await supabase.from("courses").select("*").eq("id", courseId!).maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useTopics(courseId: string | undefined, opts?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ["topics", courseId],
    enabled: !!courseId && (opts?.enabled ?? true),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("topics")
        .select("*")
        .eq("course_id", courseId!)
        .order("order_index");
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useMyEnrollment(courseId: string | undefined, userId: string | undefined) {
  return useQuery({
    queryKey: ["my-enrollment", courseId, userId],
    enabled: !!courseId && !!userId,
    queryFn: async () => {
      const { data } = await supabase
        .from("enrollments")
        .select("*")
        .eq("course_id", courseId!)
        .eq("student_id", userId!)
        .maybeSingle();
      return data;
    },
  });
}

export function useMyProgress(userId: string | undefined, opts?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ["my-progress", userId],
    enabled: !!userId && (opts?.enabled ?? true),
    queryFn: async () => {
      const { data } = await supabase.from("topic_progress").select("topic_id").eq("student_id", userId!);
      return new Set((data ?? []).map((d) => d.topic_id));
    },
  });
}
