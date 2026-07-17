import { useTranslation } from "react-i18next";
import { Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SUPPORTED_LANGUAGES, type SupportedLanguage } from "@/i18n";

interface LanguageSwitcherProps {
  variant?: "icon" | "compact" | "full";
  className?: string;
}

export default function LanguageSwitcher({ variant = "compact", className }: LanguageSwitcherProps) {
  const { i18n, t } = useTranslation();
  const current = (i18n.language?.split("-")[0] as SupportedLanguage) || "pt";
  const next: SupportedLanguage = current === "pt" ? "en" : "pt";

  const toggle = () => {
    void i18n.changeLanguage(next);
  };

  if (variant === "full") {
    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={toggle}
        aria-label={`${t("lang.label")}: ${t("lang.current")} — ${t("lang.switchTo")}`}
        className={className}
      >
        <Globe className="mr-2 h-4 w-4" />
        {SUPPORTED_LANGUAGES.map((lng, i) => (
          <span
            key={lng}
            className={`text-xs font-bold uppercase ${
              lng === current ? "text-foreground" : "text-muted-foreground/50"
            }`}
          >
            {lng}
            {i === 0 && <span className="mx-1 text-muted-foreground/30">/</span>}
          </span>
        ))}
      </Button>
    );
  }

  if (variant === "icon") {
    return (
      <Button
        variant="ghost"
        size="icon"
        onClick={toggle}
        aria-label={`${t("lang.label")} (${current.toUpperCase()})`}
        className={`h-9 w-9 ${className ?? ""}`}
      >
        <Globe className="h-4 w-4" />
      </Button>
    );
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={toggle}
      aria-label={`${t("lang.label")}: ${t("lang.current")} — ${t("lang.switchTo")}`}
      className={`h-8 px-2.5 gap-1.5 text-xs font-bold uppercase tracking-wide ${className ?? ""}`}
    >
      <Globe className="h-3.5 w-3.5" />
      <span className="text-foreground">{current}</span>
      <span className="text-muted-foreground/40">/</span>
      <span className="text-muted-foreground/60">{next}</span>
    </Button>
  );
}
