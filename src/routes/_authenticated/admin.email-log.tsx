import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Mail, RefreshCw, Send } from "lucide-react";
import { pageMeta } from "@/lib/seo";
import { useI18n } from "@/i18n";
import { checkConnectors, retryFailedEmail } from "@/lib/delivery.functions";
import { canRetryDelivery } from "@/lib/staff-access";

export const Route = createFileRoute("/_authenticated/admin/email-log")({
  head: () => ({
    meta: pageMeta(
      "Regjistri i emaileve",
      "Statusi i dërgimit të email-eve dhe gjendja e lidhjeve Gmail dhe Google Calendar.",
    ),
  }),
  component: Page,
});

type Row = {
  channel: string;
  id: string;
  recipient: string;
  subject: string;
  event: string | null;
  status: string;
  attempts: number;
  error: string | null;
  created_at: string;
};

function statusVariant(status: string) {
  if (status === "sent") return "default" as const;
  if (status === "failed") return "destructive" as const;
  return "secondary" as const;
}

function Page() {
  const { t } = useI18n();
  const [busy, setBusy] = useState<string | null>(null);
  const check = useServerFn(checkConnectors);
  const retry = useServerFn(retryFailedEmail);

  const { data, refetch, isFetching } = useQuery({
    queryKey: ["email-log"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("email_log")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as Row[];
    },
  });

  const health = useQuery({
    queryKey: ["connector-health"],
    queryFn: () => check({ data: {} }),
  });

  const rows = data ?? [];
  const failed = rows.filter((r) => r.status !== "sent").length;

  return (
    <div className="container mx-auto p-4 sm:p-6 space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="text-2xl font-semibold flex items-center gap-2">
          <Mail className="size-6" /> {t("mail.log.title")}
        </h1>
        <Button variant="outline" size="sm" onClick={() => void refetch()} disabled={isFetching}>
          <RefreshCw className={`size-4 mr-1 ${isFetching ? "animate-spin" : ""}`} /> {t("mail.log.refresh")}
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">{t("mail.health.gmail")}</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant={health.data?.gmail ? "default" : "destructive"}>
              {health.data?.gmail ? t("mail.health.ok") : t("mail.health.off")}
            </Badge>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">{t("mail.health.calendar")}</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant={health.data?.calendar ? "default" : "destructive"}>
              {health.data?.calendar ? t("mail.health.ok") : t("mail.health.off")}
            </Badge>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">{t("mail.log.failedCount")}</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{failed}</CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("mail.log.recent")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 max-h-[60vh] overflow-y-auto">
          {rows.map((r) => (
            <div key={r.id} className="flex items-start justify-between gap-3 border-b border-border/40 py-2">
              <div className="min-w-0">
                <div className="text-sm font-medium truncate">{r.subject}</div>
                <div className="text-xs text-muted-foreground truncate">
                  {r.recipient} · {new Date(r.created_at).toLocaleString("sq-AL")} ·{" "}
                  {t("mail.log.attempts", { n: r.attempts })}
                </div>
                {r.error && <div className="text-xs text-destructive truncate">{r.error}</div>}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Badge variant={statusVariant(r.status)}>{r.status}</Badge>
                {canRetryDelivery(r) && (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busy === r.id}
                    onClick={async () => {
                      setBusy(r.id);
                      try {
                        await retry({ data: { id: r.id } });
                        toast.success(t("mail.log.retried"));
                        await refetch();
                      } catch (e) {
                        toast.error(e instanceof Error ? e.message : t("mail.log.retryFailed"));
                      } finally {
                        setBusy(null);
                      }
                    }}
                  >
                    <Send className="size-4 mr-1" /> {t("mail.log.retry")}
                  </Button>
                )}
              </div>
            </div>
          ))}
          {!rows.length && <p className="text-sm text-muted-foreground">{t("mail.log.empty")}</p>}
        </CardContent>
      </Card>
    </div>
  );
}
