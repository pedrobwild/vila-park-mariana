import { useState } from "react";
import { TrendingUp, Wrench, ArrowLeft, Menu, Sparkles, Building2 } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import AuthMenu from "@/components/auth/AuthMenu";

function Logo() {
  return (
    <span className="flex items-baseline gap-1 font-display text-lg font-bold leading-none">
      <span className="text-foreground">Vila</span>
      <span className="text-accent">Park</span>
      <span className="hidden sm:inline text-xs font-medium text-muted-foreground ml-1">Vila Mariana</span>
    </span>
  );
}

export default function AppNavbar() {
  const { pathname } = useLocation();
  const { t } = useTranslation();
  const isHome = pathname === "/";
  const [mobileOpen, setMobileOpen] = useState(false);
  const isMobile = typeof window !== "undefined" && window.innerWidth < 768;

  const navLinks = [
    { to: "/oportunidades", label: "Oportunidades", icon: Building2 },
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
          <Link to="/" aria-label="Vila Park — Vila Mariana">
            <Logo />
          </Link>
        </div>

        <div className="hidden sm:flex items-center gap-2">
          {navLinks.map((link) => (
            <Link key={link.to} to={link.to}>
              <Button variant={pathname === link.to ? "secondary" : "ghost"} size="sm">
                <link.icon className="mr-1.5 h-3.5 w-3.5" />
                {link.label}
              </Button>
            </Link>
          ))}
          <Link to="/guia-investidor">
            <Button variant={pathname === "/guia-investidor" ? "secondary" : "ghost"} size="sm" className="h-7">{t("nav.guideInvestor")}</Button>
          </Link>
          <LanguageSwitcher variant="compact" className="ml-1" />
          <AuthMenu />
        </div>

        <div className="flex items-center gap-1 sm:hidden">
          <LanguageSwitcher variant="icon" />
          <AuthMenu />
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

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="right" className="w-64 p-0">
          <SheetHeader className="px-5 pt-5 pb-4 border-b border-border/40">
            <SheetTitle>
              <Logo />
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
            <p className="px-3 pt-2 pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
              {t("nav.guidesGroup")}
            </p>
            <Link
              to="/guia-investidor"
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 px-3 py-3 rounded-lg text-sm transition-colors min-h-[44px] ${
                pathname === "/guia-investidor"
                  ? "bg-primary text-primary-foreground font-semibold"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
              }`}
            >
              <TrendingUp className="h-4 w-4 shrink-0" />
              {t("nav.guideInvestor")}
            </Link>
            <div className="pt-3 mt-3 border-t border-border/40 space-y-2">
              <AuthMenu variant="mobile" onNavigate={() => setMobileOpen(false)} />
              <LanguageSwitcher variant="full" className="w-full justify-start" />
            </div>
          </nav>
        </SheetContent>
      </Sheet>
    </header>
  );
}
