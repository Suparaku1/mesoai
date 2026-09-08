import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { pageMeta } from "@/lib/seo";
import { useI18n } from "@/i18n";

export const Route = createFileRoute("/_authenticated/browse")({
  head: () => ({ meta: pageMeta("Shfleto Kurset", "Të gjitha kurset e disponueshme për Elektroteknikë dhe TIK, me kërkesë regjistrimi.") }),
  component: Browse,
});

function Browse() {
  const { t } = useI18n();
  const { user } = Route.useRouteContext();
  const { data: profile } = useQuery({
    queryKey: ["profile", user.id],
    queryFn: async () => (await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle()).data,
  });
  const { data: courses } = useQuery({
    queryKey: ["browse", profile?.drejtimi, profile?.klasa],
    enabled: !!profile,
    queryFn: async () => {
      let q = supabase.from("courses").select("*").eq("status", "published");
      if (profile?.drejtimi) q = q.eq("drejtimi", profile.drejtimi);
      if (profile?.klasa) q = q.eq("klasa", profile.klasa);
      return (await q.order("created_at", { ascending: false })).data ?? [];
    },
  });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">{t("browse.title")}</h1>
        <p className="text-sm text-muted-foreground">{t("browse.desc")}</p>
      </div>
      {!courses?.length ? (
        <div className="card-soft p-10 text-center text-muted-foreground">{t("browse.empty")}</div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {courses.map((c) => (
            <Link key={c.id} to="/courses/$id" params={{ id: c.id }} className="card-soft p-5 hover:border-primary/50 transition">
              <span className="text-xs px-2 py-0.5 rounded-full bg-accent text-accent-foreground">{c.drejtimi} · {c.klasa}</span>
              <h3 className="font-semibold mt-2">{c.title}</h3>
              {c.description && <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{c.description}</p>}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
