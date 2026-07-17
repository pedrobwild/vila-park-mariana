import { useState } from "react";
import { Building2, Wrench, ArrowLeft, Menu, Sparkles } from "lucide-react";
import lealMoreiraLogo from "@/assets/leal-moreira-logo.png";
import { Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import LanguageSwitcher from "@/components/LanguageSwitcher";

export default function AppNavbar() {
  const { pathname } = useLocation();
  const { t } = useTranslation();
  const isHome = pathname === "/";
  const [mobileOpen, setMobileOpen] = useState(false);
  const isMobile = typeof window !== "undefined" && window.innerWidth < 768;

  const navLinks = [
    { to: "/insights", label: t("nav.insights"), icon: Sparkles },
    { to: "/ferramentas", label: t("nav.ferramentas"), icon: Wrench },
  ];

  return (
    <header className="sticky top-0 z-40 glass-nav border-b border-border/40">
      <div className="max-w-7xl mx-auto px-4 md:px-6 flex items-center justify-between h-16">
        <div className="flex items-center gap-3">
          {!isHome && (
            <Link to="/">
              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" aria-label={t("nav.back")}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
          )}
          <Link to="/" className="flex items-center gap-2 font-display text-lg font-bold text-foreground">
            <img src={lealMoreiraLogo} alt="Leal Moreira" className="h-8 w-auto" />
          </Link>
        </div>

        {/* Desktop nav */}
        <div className="hidden sm:flex items-center gap-2">
          {navLinks.map((link) => (
            <Link key={link.to} to={link.to}>
              <Button variant={pathname === link.to ? "secondary" : "ghost"} size="sm">
                <link.icon className="mr-1.5 h-3.5 w-3.5" />
                {link.label}
              </Button>
            </Link>
          ))}
          <Link to="/urban-flex-bela-cintra">
            <Button variant="outline" size="sm">{t("nav.urbanFlex")}</Button>
          </Link>
          <LanguageSwitcher variant="compact" className="ml-1" />
        </div>

        {/* Mobile right side: language switcher always visible + hamburger */}
        <div className="flex items-center gap-1 sm:hidden">
          <LanguageSwitcher variant="icon" />
          {!(isHome && isMobile) && (
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9"
              onClick={() => setMobileOpen(true)}
              aria-label={t("nav.menu")}
            >
              <Menu className="h-5 w-5" />
            </Button>
          )}
        </div>
      </div>

      {/* Mobile sheet */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="right" className="w-64 p-0">
          <SheetHeader className="px-5 pt-5 pb-4 border-b border-border/40">
            <SheetTitle className="flex items-center gap-2 font-display text-lg font-bold">
              <img src={lealMoreiraLogo} alt="Leal Moreira" className="h-8 w-auto" />
            </SheetTitle>
          </SheetHeader>
          <nav className="px-4 py-5 space-y-1">
            {navLinks.map((link) => {
              const isActive = pathname === link.to;
              return (
                <Link
                  key={link.to}
                  to={link.to}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-3 px-3 py-3 rounded-lg text-sm transition-colors min-h-[44px] ${
                    isActive
                      ? "bg-primary text-primary-foreground font-semibold"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                  }`}
                >
                  <link.icon className="h-4 w-4 shrink-0" />
                  {link.label}
                </Link>
              );
            })}
            <Link
              to="/urban-flex-bela-cintra"
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 px-3 py-3 rounded-lg text-sm transition-colors min-h-[44px] ${
                pathname === "/urban-flex-bela-cintra"
                  ? "bg-primary text-primary-foreground font-semibold"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
              }`}
            >
              <Building2 className="h-4 w-4 shrink-0" />
              {t("nav.urbanFlex")}
            </Link>
            <div className="pt-3 mt-3 border-t border-border/40">
              <LanguageSwitcher variant="full" className="w-full justify-start" />
            </div>
          </nav>
        </SheetContent>
      </Sheet>
    </header>
  );
}
