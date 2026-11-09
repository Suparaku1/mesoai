import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/hooks/use-theme";
import { useI18n } from "@/i18n";

export function ThemeToggle() {
  const { t } = useI18n();
  const { theme, toggle } = useTheme();
  return (
    <Button variant="ghost" size="icon" onClick={toggle} aria-label={t("ui.themeToggle")} title={theme === "dark" ? t("ui.themeLight") : t("ui.themeDark")}>
      {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </Button>
  );
}
