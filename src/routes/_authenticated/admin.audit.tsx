import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollText } from "lucide-react";
import { pageMeta } from "@/lib/seo";
import { useI18n } from "@/i18n";

export const Route = createFileRoute("/_authenticated/admin/audit")({
  head: () => ({ meta: pageMeta("Audit Log", "Regjistri i ngjarjeve dhe veprimeve administrative në platformë.") }),
  component: Page,
});

function Page() {
  const { t } = useI18n();
  const { data } = useQuery({
    queryKey: ["audit"],
    queryFn: async () => {
      const { data } = await supabase.from("audit_log").select("*").order("created_at", { ascending: false }).limit(200);
      return data ?? [];
    },
  });

  return (
    <div className="container mx-auto p-4 sm:p-6 space-y-4">
      <h1 className="text-2xl font-semibold flex items-center gap-2"><ScrollText className="size-6"/> {t("aud.title")}</h1>
      <Card>
        <CardHeader><CardTitle>{t("aud.recent")}</CardTitle></CardHeader>
        <CardContent>
          <div className="text-xs font-mono space-y-1 max-h-[70vh] overflow-y-auto">
            {(data ?? []).map((r: any) => (
              <div key={r.id} className="border-b border-border/40 py-1">
                <span className="text-muted-foreground">{new Date(r.created_at).toLocaleString("sq-AL")}</span> · <b>{r.action}</b> · {r.entity}{r.entity_id ? `#${r.entity_id}` : ""}
              </div>
            ))}
            {!(data ?? []).length && <p className="text-muted-foreground">{t("aud.none")}</p>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
