import { createFileRoute, Outlet, redirect, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/use-profile";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { LogOut, Menu } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import { ThemeToggle } from "@/components/theme-toggle";
import { NotificationsBell } from "@/components/notifications-bell";
import { AppSidebar } from "@/components/app-sidebar";
import { FloatingTutor } from "@/components/floating-tutor";
import { GlobalSearch } from "@/components/global-search";
import { LanguageSwitcher } from "@/components/language-switcher";
import { useI18n } from "@/i18n";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    // Përdorim sesionin lokal: getUser() bën thirrje rrjeti dhe një gabim kalimtar
    // (rrjet/limit) nxirrte përdoruesin jashtë. Serveri i validon gjithsesi token-at.
    const { data } = await supabase.auth.getSession();
    const user = data.session?.user;
    if (!user) throw redirect({ to: "/auth", search: { tab: "login" } as never });
    return { user };
  },
  component: AuthedLayout,
});

function AuthedLayout() {
  const { user } = Route.useRouteContext();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { t } = useI18n();

  const { data: profileData } = useProfile(user.id);
  const profile = profileData?.profile;
  const role = profileData?.role;
  const isAdmin = profileData?.isAdmin;

  async function signOut() {
    await supabase.auth.signOut();
    toast.success("Dolët me sukses");
    navigate({ to: "/auth", replace: true, search: { tab: "login" } as never });
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* Desktop sidebar */}
      <div className="hidden lg:flex w-64 shrink-0 border-r border-border sticky top-0 h-screen">
        <AppSidebar isAdmin={isAdmin} />
      </div>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="border-b border-border/60 bg-background/90 backdrop-blur sticky top-0 z-30">
          <div className="px-4 sm:px-6 h-14 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              {/* Mobile menu */}
              <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="lg:hidden" aria-label={t("action.menu")}>
                    <Menu className="size-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="p-0 w-72">
                  <SheetTitle className="sr-only">Menyja</SheetTitle>
                  <AppSidebar isAdmin={isAdmin} onNavigate={() => setMobileOpen(false)} />
                </SheetContent>
              </Sheet>
              <div className="text-sm font-medium truncate lg:hidden">Uendi Platform</div>
            </div>

            <div className="flex items-center gap-1 sm:gap-2 text-sm">
              <span className="text-muted-foreground hidden md:inline mr-2 truncate max-w-[200px]">
                {profile?.first_name} {profile?.last_name}
                {role && (
                  <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-accent text-accent-foreground">
                    {role === "teacher" || role === "admin" ? t("role.teacher") : role === "parent" ? t("role.parent") : t("role.student")}
                  </span>
                )}
              </span>
              <GlobalSearch />
              <LanguageSwitcher />
              <NotificationsBell userId={user.id} />
              <ThemeToggle />
              <Button variant="ghost" size="sm" onClick={signOut}>
                <LogOut className="size-4 sm:mr-1" />
                <span className="hidden sm:inline">{t("action.signOut")}</span>
              </Button>
            </div>
          </div>
        </header>

        <main className="flex-1 px-4 sm:px-6 py-6 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>

        <footer className="border-t border-border/60 py-4">
          <div className="px-4 sm:px-6 text-xs text-muted-foreground text-center">
            Ky website është krijuar nga <span className="font-medium text-foreground">Esmerald Suparaku</span> · © {new Date().getFullYear()} Uendi Platform
          </div>
        </footer>
      </div>
      <FloatingTutor />
    </div>
  );
}
