import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useRole } from "@/hooks/use-role";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, MessageSquare } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { pageMeta } from "@/lib/seo";
import { useI18n } from "@/i18n";

export const Route = createFileRoute("/_authenticated/messages")({
  head: () => ({ meta: pageMeta("Mesazhet", "Bisedë e drejtpërdrejtë mes mësuesve, nxënësve dhe prindërve.") }),
  component: MessagesPage,
});

type Profile = { id: string; first_name: string; last_name: string; email: string };

function MessagesPage() {
  const { user } = Route.useRouteContext();
  const { t } = useI18n();
  const qc = useQueryClient();
  const [activeId, setActiveId] = useState<string | null>(null);

  // Conversations = distinct users I've messaged with + (for teachers) my enrolled students / (for students) my course teachers
  const { data: primary } = useRole(user.id);

  const { data: conversations } = useQuery({
    queryKey: ["conversations", user.id],
    enabled: !!primary,
    queryFn: async () => {
      const { data: msgs } = await supabase
        .from("messages")
        .select("sender_id,recipient_id,content,created_at,read")
        .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
        .order("created_at", { ascending: false });

      const otherIds = new Set<string>();
      const lastByUser = new Map<string, { content: string; at: string; unread: number }>();
      (msgs ?? []).forEach((m) => {
        const other = m.sender_id === user.id ? m.recipient_id : m.sender_id;
        otherIds.add(other);
        const existing = lastByUser.get(other);
        if (!existing) lastByUser.set(other, { content: m.content, at: m.created_at, unread: 0 });
        if (m.recipient_id === user.id && !m.read) {
          const e = lastByUser.get(other)!;
          e.unread += 1;
        }
      });

      // Also include contacts: teachers see their approved students; students see their course teachers.
      if (primary === "teacher" || primary === "admin") {
        const { data: enrolls } = await supabase
          .from("enrollments")
          .select("student_id, courses!inner(teacher_id)")
          .eq("status", "approved")
          .eq("courses.teacher_id", user.id);
        (enrolls ?? []).forEach((e: any) => otherIds.add(e.student_id));
      } else {
        const { data: enrolls } = await supabase
          .from("enrollments")
          .select("courses(teacher_id)")
          .eq("student_id", user.id)
          .eq("status", "approved");
        (enrolls ?? []).forEach((e: any) => {
          if (e.courses?.teacher_id) otherIds.add(e.courses.teacher_id);
        });
      }
      otherIds.delete(user.id);

      const ids = Array.from(otherIds);
      if (!ids.length) return [];
      const { data: profiles } = await supabase.from("profiles").select("id,first_name,last_name,email").in("id", ids);
      return (profiles ?? []).map((p) => ({
        profile: p as Profile,
        last: lastByUser.get(p.id),
      })).sort((a, b) => (b.last?.at ?? "").localeCompare(a.last?.at ?? ""));
    },
  });

  useEffect(() => {
    const ch = supabase
      .channel(`messages-list-${user.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        () => qc.invalidateQueries({ queryKey: ["conversations", user.id] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [user.id, qc]);

  const active = conversations?.find((c) => c.profile.id === activeId) ?? conversations?.[0];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">{t("msg.title")}</h1>
        <p className="text-sm text-muted-foreground">{t("msg.subtitle")}</p>
      </div>
      <div className="grid md:grid-cols-[280px_1fr] gap-4 h-[70vh]">
        <div className="card-soft overflow-hidden">
          <ScrollArea className="h-full">
            {!conversations?.length ? (
              <div className="p-6 text-sm text-muted-foreground text-center">
                <MessageSquare className="size-8 mx-auto mb-2 opacity-50" />
                {t("msg.noContacts")}
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {conversations.map((c) => (
                  <li key={c.profile.id}>
                    <button
                      onClick={() => setActiveId(c.profile.id)}
                      className={`w-full text-left p-3 hover:bg-muted/40 transition ${active?.profile.id === c.profile.id ? "bg-primary/5" : ""}`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="font-medium text-sm truncate">
                          {c.profile.first_name} {c.profile.last_name}
                        </div>
                        {c.last && c.last.unread > 0 && (
                          <span className="text-[10px] bg-primary text-primary-foreground rounded-full px-1.5">{c.last.unread}</span>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground truncate">{c.last?.content ?? "—"}</div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </ScrollArea>
        </div>
        <div className="card-soft overflow-hidden flex flex-col">
          {active ? (
            <Thread me={user.id} other={active.profile} />
          ) : (
            <div className="m-auto text-sm text-muted-foreground">{t("msg.pickConversation")}</div>
          )}
        </div>
      </div>
    </div>
  );
}

function Thread({ me, other }: { me: string; other: Profile }) {
  const { t } = useI18n();
  const qc = useQueryClient();
  const [text, setText] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const { data: msgs } = useQuery({
    queryKey: ["thread", me, other.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("messages")
        .select("*")
        .or(`and(sender_id.eq.${me},recipient_id.eq.${other.id}),and(sender_id.eq.${other.id},recipient_id.eq.${me})`)
        .order("created_at", { ascending: true });
      // mark received as read
      await supabase.from("messages").update({ read: true }).eq("sender_id", other.id).eq("recipient_id", me).eq("read", false);
      return data ?? [];
    },
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs?.length]);

  useEffect(() => {
    const ch = supabase
      .channel(`thread-${me}-${other.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload: any) => {
          const m = payload.new;
          if (
            (m.sender_id === me && m.recipient_id === other.id) ||
            (m.sender_id === other.id && m.recipient_id === me)
          ) {
            qc.invalidateQueries({ queryKey: ["thread", me, other.id] });
          }
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [me, other.id, qc]);

  async function send() {
    const content = text.trim();
    if (!content) return;
    setText("");
    const { error } = await supabase.from("messages").insert({ sender_id: me, recipient_id: other.id, content });
    if (error) toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["thread", me, other.id] });
    qc.invalidateQueries({ queryKey: ["conversations", me] });
  }

  return (
    <>
      <div className="px-4 py-3 border-b border-border">
        <div className="font-semibold">{other.first_name} {other.last_name}</div>
        <div className="text-xs text-muted-foreground">{other.email}</div>
      </div>
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-2">
          {msgs?.map((m) => {
            const mine = m.sender_id === me;
            return (
              <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap ${mine ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                  {m.content}
                  <div className={`text-[10px] mt-1 ${mine ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                    {new Date(m.created_at).toLocaleTimeString("sq-AL", { hour: "2-digit", minute: "2-digit" })}
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>
      </ScrollArea>
      <div className="border-t border-border p-3 flex gap-2">
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          placeholder={t("msg.placeholder")}
        />
        <Button onClick={send} disabled={!text.trim()}>
          <Send className="size-4" />
        </Button>
      </div>
    </>
  );
}
