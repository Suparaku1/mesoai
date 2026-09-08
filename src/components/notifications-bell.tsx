import { useEffect } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useI18n } from "@/i18n";

export function NotificationsBell({ userId }: { userId: string }) {
  const { t } = useI18n();
  const qc = useQueryClient();
  const { data: notifications } = useQuery({
    queryKey: ["notifications", userId],
    queryFn: async () => {
      const { data } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(20);
      return data ?? [];
    },
  });

  useEffect(() => {
    const ch = supabase
      .channel(`notif-${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
        () => qc.invalidateQueries({ queryKey: ["notifications", userId] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [userId, qc]);

  const unread = notifications?.filter((n) => !n.read).length ?? 0;

  async function markAllRead() {
    await supabase.from("notifications").update({ read: true }).eq("user_id", userId).eq("read", false);
    qc.invalidateQueries({ queryKey: ["notifications", userId] });
  }
  async function markRead(id: string) {
    await supabase.from("notifications").update({ read: true }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["notifications", userId] });
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="size-5" />
          {unread > 0 && (
            <span className="absolute -top-0.5 -right-0.5 size-4 rounded-full bg-destructive text-destructive-foreground text-[10px] font-semibold flex items-center justify-center">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between p-3 border-b">
          <div className="font-semibold text-sm">{t("ui.notifications")}</div>
          {unread > 0 && (
            <Button variant="ghost" size="sm" onClick={markAllRead} className="text-xs h-7">
              <Check className="size-3 mr-1" /> {t("ui.markAllRead")}
            </Button>
          )}
        </div>
        <ScrollArea className="max-h-96">
          {!notifications?.length ? (
            <div className="p-6 text-center text-sm text-muted-foreground">{t("ui.noNotifications")}</div>
          ) : (
            <div className="divide-y divide-border">
              {notifications.map((n) => {
                const body = (
                  <div className={`p-3 hover:bg-muted/40 transition ${!n.read ? "bg-primary/5" : ""}`}>
                    <div className="flex items-start gap-2">
                      {!n.read && <span className="mt-1.5 size-2 rounded-full bg-primary shrink-0" />}
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium">{n.title}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">{n.message}</div>
                        <div className="text-[10px] text-muted-foreground mt-1">
                          {new Date(n.created_at).toLocaleString("sq-AL")}
                        </div>
                      </div>
                    </div>
                  </div>
                );
                return n.link ? (
                  <Link key={n.id} to={n.link} onClick={() => markRead(n.id)} className="block">
                    {body}
                  </Link>
                ) : (
                  <button key={n.id} onClick={() => markRead(n.id)} className="w-full text-left">
                    {body}
                  </button>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
