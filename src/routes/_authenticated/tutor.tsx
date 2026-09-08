import { createFileRoute } from "@tanstack/react-router";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputTextarea,
  PromptInputFooter,
  PromptInputSubmit,
} from "@/components/ai-elements/prompt-input";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { Tool, ToolHeader, ToolContent, ToolInput, ToolOutput } from "@/components/ai-elements/tool";
import { BookOpen, GraduationCap } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { pageMeta } from "@/lib/seo";
import { useI18n } from "@/i18n";

export const Route = createFileRoute("/_authenticated/tutor")({
  head: () => ({ meta: pageMeta("Tutor AI", "Tutori me inteligjencë artificiale që përgjigjet mbi materialet e kurseve të tua.") }),
  component: TutorPage,
});

function TutorPage() {
  const { t } = useI18n();
  const { user } = Route.useRouteContext();
  const [courseId, setCourseId] = useState<string>("all");

  const { data: courses } = useQuery({
    queryKey: ["my-approved-courses", user.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("enrollments")
        .select("course_id, courses(id,title)")
        .eq("student_id", user.id)
        .eq("status", "approved");
      return (data ?? [])
        .map((r) => r.courses as { id: string; title: string } | null)
        .filter(Boolean) as Array<{ id: string; title: string }>;
    },
  });

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        fetch: async (url, init) => {
          const { data } = await supabase.auth.getSession();
          const token = data.session?.access_token;
          const headers = new Headers(init?.headers);
          if (token) headers.set("Authorization", `Bearer ${token}`);
          headers.set("Content-Type", "application/json");
          return fetch(url, { ...init, headers });
        },
        prepareSendMessagesRequest: ({ messages, body }) => ({
          body: { messages, courseId: courseId === "all" ? null : courseId, ...body },
        }),
      }),
    [courseId],
  );

  const { messages, sendMessage, status, error } = useChat({
    transport,
    onError: (e) => toast.error(e.message),
  });

  const isLoading = status === "submitted" || status === "streaming";

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <GraduationCap className="size-6 text-primary" /> {t("tutor.title")}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t("tutor.desc")}
          </p>
        </div>
        <Select value={courseId} onValueChange={setCourseId}>
          <SelectTrigger className="w-[220px]">
            <SelectValue placeholder={t("tutor.pickCourse")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("tutor.allCourses")}</SelectItem>
            {courses?.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="card-soft flex flex-col h-[72vh] overflow-hidden">
        <Conversation className="flex-1">
          <ConversationContent>
            {messages.length === 0 && (
              <ConversationEmptyState
                icon={<BookOpen className="size-6" />}
                title={t("tutor.emptyTitle")}
                description={t("tutor.emptyDesc")}
              />
            )}
            {messages.map((m) => (
              <Message key={m.id} from={m.role as "user" | "assistant"}>
                <MessageContent>
                  {m.parts.map((p, i) => {
                    if (p.type === "text") {
                      return m.role === "assistant" ? (
                        <MessageResponse key={i}>{p.text}</MessageResponse>
                      ) : (
                        <p key={i} className="whitespace-pre-wrap">{p.text}</p>
                      );
                    }
                    if (p.type.startsWith("tool-") || p.type === "dynamic-tool") {
                      const part = p as never as {
                        type: `tool-${string}`;
                        state: "input-streaming" | "input-available" | "output-available" | "output-error";
                        input?: unknown;
                        output?: unknown;
                        errorText?: string;
                      };
                      return (
                        <Tool key={i} defaultOpen={false}>
                          <ToolHeader type={part.type} state={part.state} />
                          <ToolContent>
                            <ToolInput input={part.input} />
                            <ToolOutput output={part.output} errorText={part.errorText} />
                          </ToolContent>
                        </Tool>
                      );
                    }
                    return null;
                  })}
                </MessageContent>
              </Message>
            ))}
            {status === "submitted" && (
              <Message from="assistant">
                <MessageContent>
                  <Shimmer>{t("tutor.thinking")}</Shimmer>
                </MessageContent>
              </Message>
            )}
            {error && (
              <div className="text-sm text-destructive px-2">{t("tutor.error")}: {error.message}</div>
            )}
          </ConversationContent>
          <ConversationScrollButton />
        </Conversation>

        <div className="border-t border-border p-3">
          <PromptInput
            onSubmit={(msg) => {
              const text = msg.text.trim();
              if (!text || isLoading) return;
              void sendMessage({ text });
            }}
          >
            <PromptInputTextarea placeholder={t("tutor.placeholder")} autoFocus />
            <PromptInputFooter className="justify-end">
              <PromptInputSubmit status={status} disabled={isLoading} />
            </PromptInputFooter>
          </PromptInput>
        </div>
      </div>
    </div>
  );
}
