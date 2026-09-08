import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n";
import {
  Search,
  BookOpen,
  Users,
  CalendarClock,
  Megaphone,
  BarChart3,
  MessageSquare,
  Wallet,
  ClipboardList,
} from "lucide-react";

const QUICK_DEF = [
  { key: "ui.nav.dashboard", to: "/dashboard", icon: BarChart3 },
  { key: "ui.nav.browse", to: "/browse", icon: BookOpen },
  { key: "ui.nav.calendar", to: "/calendar", icon: CalendarClock },
  { key: "ui.nav.schedule", to: "/schedule", icon: CalendarClock },
  { key: "ui.nav.announcements", to: "/announcements", icon: Megaphone },
  { key: "ui.nav.messages", to: "/messages", icon: MessageSquare },
  { key: "ui.nav.analytics", to: "/analytics", icon: BarChart3 },
  { key: "ui.nav.finance", to: "/finance", icon: Wallet },
  { key: "ui.nav.crm", to: "/crm", icon: Users },
  { key: "ui.nav.library", to: "/library", icon: ClipboardList },
] as const;

export function GlobalSearch() {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((v) => !v);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const { data: results } = useQuery({
    queryKey: ["global-search", q],
    enabled: open && q.trim().length >= 2,
    queryFn: async () => {
      const term = `%${q.trim()}%`;
      const [courses, topics, ann] = await Promise.all([
        supabase.from("courses").select("id,title,drejtimi").ilike("title", term).limit(6),
        supabase.from("topics").select("id,title,course_id").ilike("title", term).limit(6),
        supabase.from("announcements").select("id,title").ilike("title", term).limit(4),
      ]);
      return {
        courses: courses.data ?? [],
        topics: topics.data ?? [],
        announcements: ann.data ?? [],
      };
    },
  });

  const QUICK = QUICK_DEF.map((q) => ({ label: t(q.key as any), to: q.to, icon: q.icon }));

  function go(to: string) {
    setOpen(false);
    setQ("");
    navigate({ to });
  }

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setOpen(true)}
        aria-label={t("ui.search")}
        title={t("ui.search")}
      >
        <Search className="size-5" />
      </Button>
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder={t("ui.searchPlaceholder")} value={q} onValueChange={setQ} />
        <CommandList>
          <CommandEmpty>{t("ui.noResults")}</CommandEmpty>

          {results?.courses.length ? (
            <CommandGroup heading={t("ui.courses")}>
              {results.courses.map((c) => (
                <CommandItem key={c.id} value={`course-${c.id}-${c.title}`} onSelect={() => go(`/courses/${c.id}`)}>
                  <BookOpen className="mr-2 size-4" />
                  <span className="truncate">{c.title}</span>
                  {c.drejtimi && <span className="ml-auto text-xs text-muted-foreground">{c.drejtimi}</span>}
                </CommandItem>
              ))}
            </CommandGroup>
          ) : null}

          {results?.topics.length ? (
            <CommandGroup heading={t("ui.topics")}>
              {results.topics.map((t) => (
                <CommandItem key={t.id} value={`topic-${t.id}-${t.title}`} onSelect={() => go(`/topics/${t.id}`)}>
                  <ClipboardList className="mr-2 size-4" />
                  <span className="truncate">{t.title}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          ) : null}

          {results?.announcements.length ? (
            <CommandGroup heading={t("ui.announcements")}>
              {results.announcements.map((a) => (
                <CommandItem key={a.id} value={`ann-${a.id}-${a.title}`} onSelect={() => go("/announcements")}>
                  <Megaphone className="mr-2 size-4" />
                  <span className="truncate">{a.title}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          ) : null}

          {(results?.courses.length || results?.topics.length || results?.announcements.length) && <CommandSeparator />}

          <CommandGroup heading={t("ui.goTo")}>
            {QUICK.map((item) => (
              <CommandItem key={item.to} value={item.label} onSelect={() => go(item.to)}>
                <item.icon className="mr-2 size-4" />
                {item.label}
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
}
