import { useState } from "react";
import { ArrowLeft, Menu, MessageCircle } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import AuthMenu from "@/components/auth/AuthMenu";
import { WHATSAPP_PHONE } from "@/data/surroundings";

function Logo() {
  return (
    <span className="flex items-baseline gap-1 font-display text-xl leading-none">
      <span className="text-foreground">Vila</span>
      <span className="text-accent">Park</span>
      <span className="hidden md:inline text-[11px] uppercase tracking-[0.18em] font-body font-medium text-muted-foreground ml-2">Vila Mariana</span>
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
    { to: "/oportunidades", label: t("nav.opportunities", "Oportunidades") },
    { to: "/guia-investidor", label: t("nav.guideInvestor") },
    { to: "/guia-comprador", label: t("nav.guideBuyer") },
    { to: "/ferramentas", label: t("nav.ferramentas") },
    { to: "/insights", label: t("nav.insights") },
  ];

  const wa = `https://api.whatsapp.com/send?phone=${WHATSAPP_PHONE}&text=${encodeURIComponent(t("whatsapp.message"))}`;

  return (
    <header className="sticky top-0 z-40 glass-nav border-b border-border/50">
      <div className="max-w-7xl mx-auto px-4 md:px-6 flex items-center justify-between h-16 md:h-[72px]">
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

        <div className="hidden md:flex items-center gap-1">
          {navLinks.map((link) => {
            const active = pathname === link.to;
            return (
              <Link key={link.to} to={link.to}>
                <Button
                  variant="ghost"
                  size="sm"
                  className={`h-9 px-3 text-sm font-medium ${active ? "text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                >
                  {link.label}
                </Button>
              </Link>
            );
          })}
          <a href={wa} target="_blank" rel="noopener noreferrer" className="ml-2">
            <Button variant="outline" size="sm" className="h-9 gap-1.5 border-border">
              <MessageCircle className="h-3.5 w-3.5" />
              {t("nav.talkSpecialist", "Falar com especialista")}
            </Button>
          </a>
          <LanguageSwitcher variant="compact" className="ml-2" />
          <AuthMenu />
        </div>

        <div className="flex items-center gap-1 md:hidden">
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
        <SheetContent side="right" className="w-72 p-0">
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
                      ? "bg-secondary text-foreground font-semibold"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
            <div className="pt-4 mt-3 border-t border-border/40 space-y-2">
              <a href={wa} target="_blank" rel="noopener noreferrer" onClick={() => setMobileOpen(false)}>
                <Button variant="outline" className="w-full justify-start gap-2 min-h-[44px]">
                  <MessageCircle className="h-4 w-4" />
                  {t("nav.talkSpecialist", "Falar com especialista")}
                </Button>
              </a>
              <AuthMenu variant="mobile" onNavigate={() => setMobileOpen(false)} />
              <LanguageSwitcher variant="full" className="w-full justify-start" />
            </div>
          </nav>
        </SheetContent>
      </Sheet>
    </header>
  );
}
