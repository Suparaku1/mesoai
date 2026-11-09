import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useEffect, useMemo, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
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
import {
  Tool,
  ToolHeader,
  ToolContent,
  ToolInput,
  ToolOutput,
} from "@/components/ai-elements/tool";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { useI18n } from "@/i18n";
import { Link, useRouterState } from "@tanstack/react-router";
import { BookOpen } from "lucide-react";
import { toast } from "sonner";
import { TUTOR_MESSAGE_LIMIT } from "@/lib/tutor-policy";

type Source = {
  id: string;
  title: string;
  snippet: string;
  topicId: string | null;
  courseId: string;
};
export type TutorMessage = UIMessage<{ sources?: Source[] }>;
export function TutorChat({
  id,
  initialMessages,
  courseId,
  title,
}: {
  id: string;
  initialMessages: TutorMessage[];
  courseId: string | null;
  title: string;
}) {
  const { t } = useI18n();
  const qc = useQueryClient();
  const textarea = useRef<HTMLTextAreaElement>(null);
  const transport = useMemo(
    () =>
      new DefaultChatTransport<TutorMessage>({
        api: "/api/chat",
        body: { threadId: id, courseId },
        fetch: async (url, init) => {
          const { data } = await supabase.auth.getSession();
          const headers = new Headers(init?.headers);
          if (data.session) headers.set("Authorization", `Bearer ${data.session.access_token}`);
          const response = await fetch(url, { ...init, headers });
          if (!response.ok) {
            const body = (await response.json().catch(() => ({}))) as { message?: string };
            throw new Error(body.message ?? `Gabim ${response.status}`);
          }
          return response;
        },
      }),
    [id, courseId],
  );
  const { messages, sendMessage, status, error, stop } = useChat<TutorMessage>({
    id,
    messages: initialMessages,
    transport,
    onError: (e) => toast.error(e.message),
    onFinish: () => {
      void qc.invalidateQueries({ queryKey: ["tutor-threads"] });
      void qc.invalidateQueries({ queryKey: ["tutor-thread", id] });
    },
  });
  const navigating = useRouterState({ select: (state) => state.status === "pending" });
  const busy = status === "submitted" || status === "streaming" || navigating;
  useEffect(() => {
    if (!busy) textarea.current?.focus();
  }, [busy, id]);
  return (
    <div className="flex min-w-0 flex-col h-[calc(100dvh-22rem)] lg:h-[calc(100dvh-14rem)] min-h-[360px] max-h-[900px]">
      <h2 className="mb-3 break-words text-base font-semibold">
        {title === "Bisedë e re" ? t("tutor.new") : title}
      </h2>
      <Conversation className="min-h-0 flex-1">
        <ConversationContent className="px-0 sm:px-3">
          {!messages.length && (
            <ConversationEmptyState
              icon={<BookOpen className="size-6" />}
              title={t("tutor.emptyTitle")}
              description={t("tutor.emptyDesc")}
            />
          )}
          {messages.map((message) => (
            <Message from={message.role} key={message.id}>
              <MessageContent>
                {message.parts.map((part, index) => {
                  if (part.type === "text")
                    return message.role === "assistant" ? (
                      <MessageResponse key={index}>{part.text}</MessageResponse>
                    ) : (
                      <p className="whitespace-pre-wrap break-words" key={index}>
                        {part.text}
                      </p>
                    );
                  if (part.type === "reasoning")
                    return (
                      <details key={index} className="text-muted-foreground text-xs">
                        <summary>{t("tutor.thinking")}</summary>
                        <MessageResponse>{part.text}</MessageResponse>
                      </details>
                    );
                  if (part.type.startsWith("tool-") || part.type === "dynamic-tool") {
                    const tool = part as {
                      type: `tool-${string}`;
                      state:
                        | "input-streaming"
                        | "input-available"
                        | "output-available"
                        | "output-error";
                      input?: unknown;
                      output?: unknown;
                      errorText?: string;
                    };
                    return (
                      <Tool key={index} defaultOpen={false}>
                        <ToolHeader type={tool.type} state={tool.state} />
                        <ToolContent>
                          <ToolInput input={tool.input} />
                          <ToolOutput output={tool.output} errorText={tool.errorText} />
                        </ToolContent>
                      </Tool>
                    );
                  }
                  return null;
                })}
                {message.role === "assistant" && Boolean(message.metadata?.sources?.length) && (
                  <details className="mt-2 border-t border-border pt-2 text-xs">
                    <summary className="cursor-pointer font-medium">
                      {t("tutor.sources")} ({message.metadata?.sources?.length})
                    </summary>
                    <ol className="space-y-3 mt-3">
                      {message.metadata?.sources?.map((source, i) => (
                        <li key={source.id}>
                          <Link
                            className="text-primary underline"
                            to={source.topicId ? "/topics/$id" : "/courses/$id"}
                            params={{ id: source.topicId ?? source.courseId }}
                          >
                            [{i + 1}] {source.title}
                          </Link>
                          <p className="mt-1 text-muted-foreground break-words">{source.snippet}</p>
                        </li>
                      ))}
                    </ol>
                  </details>
                )}
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
            <p role="alert" className="text-sm text-destructive">
              {error.message}
            </p>
          )}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>
      <div className="mt-3 border-t border-border pt-3 pb-[env(safe-area-inset-bottom)]">
        <PromptInput
          onSubmit={({ text }) => {
            if (!text.trim() || busy) return;
            void sendMessage({ text: text.trim() });
            textarea.current?.focus();
          }}
        >
          <PromptInputTextarea
            ref={textarea}
            placeholder={t("tutor.placeholder")}
            aria-label={t("tutor.placeholder")}
            maxLength={TUTOR_MESSAGE_LIMIT}
            disabled={navigating}
            autoFocus
          />
          <PromptInputFooter className="justify-end">
            <PromptInputSubmit status={status} disabled={navigating} onStop={() => stop()} />
          </PromptInputFooter>
        </PromptInput>
      </div>
    </div>
  );
}
