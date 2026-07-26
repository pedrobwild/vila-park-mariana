import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useRole } from "@/hooks/useIsAdmin";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ArrowLeft, LogOut, Building2, Lock, Menu, FileText, Upload, Briefcase, ShieldCheck, Users, UserCog } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import UnitsManager from "@/components/admin/UnitsManager";
import CrmSection from "@/components/crm/CrmSection";
import BrokersManager from "@/components/admin/BrokersManager";
import LossReasonsManager from "@/components/admin/LossReasonsManager";
import bwildLogo from "@/assets/bwild-logo.png";

type SectionKey = "units" | "crm" | "comercial" | "extrato" | "upload" | "auditoria";

interface SectionDef {
  key: SectionKey;
  label: string;
  icon: typeof Building2;
  href?: string;
  bewildOnly?: boolean;
}

const ALL_sections: SectionDef[] = [
  { key: "units", label: "Unidades à venda", icon: Building2 },
  { key: "crm", label: "CRM", icon: Users },
  { key: "comercial", label: "Equipe comercial", icon: UserCog },
  { key: "extrato", label: "Extrato do cliente", icon: FileText, href: "/admin/extrato" },
  { key: "upload", label: "Painel — upload de plantas", icon: Upload, href: "/admin/upload", bewildOnly: true },
  { key: "auditoria", label: "Log de auditoria", icon: ShieldCheck, href: "/admin/auditoria" },
];

const COMING_SOON = ["Leads", "Relatórios", "Configurações"];

function Logo() {
  return (
    <span className="flex items-baseline gap-1 font-display text-lg font-bold leading-none">
      <span className="text-foreground">Vila</span>
      <span className="text-accent">Park</span>
      <span className="hidden sm:inline text-xs font-medium text-muted-foreground ml-1">Admin</span>
    </span>
  );
}

function RoleBadge({ role }: { role: "admin" | "incorporadora" | null }) {
  if (role === "admin") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-foreground text-background px-2.5 py-1 text-[11px] font-medium">
        <img src={bwildLogo} alt="" className="h-3 w-auto opacity-90" />
        Bewild · administração geral
      </span>
    );
  }
  if (role === "incorporadora") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-accent/60 text-accent bg-accent/5 px-2.5 py-1 text-[11px] font-medium">
        <Briefcase className="h-3 w-3" />
        Incorporadora · acesso do cliente (demo)
      </span>
    );
  }
  return null;
}


export default function Admin() {
  const { session, role } = useRole();
  const [active, setActive] = useState<SectionKey>("units");
  const [menuOpen, setMenuOpen] = useState(false);

  const sections = useMemo(
    () => ALL_sections.filter((s) => !s.bewildOnly || role === "admin"),
    [role],
  );

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };


  const SidebarContent = ({ onNavigate }: { onNavigate?: () => void }) => (
    <nav className="space-y-1 p-3">
      {sections.map((s) => {
        const isActive = active === s.key;
        const className = `w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm min-h-[44px] transition-colors ${
          isActive
            ? "bg-primary text-primary-foreground font-semibold"
            : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
        }`;
        if (s.href) {
          return (
            <Link key={s.key} to={s.href} onClick={onNavigate} className={className}>
              <s.icon className="h-4 w-4 shrink-0" />
              {s.label}
            </Link>
          );
        }
        return (
          <button
            key={s.key}
            onClick={() => {
              setActive(s.key as SectionKey);
              onNavigate?.();
            }}
            className={className}
          >
            <s.icon className="h-4 w-4 shrink-0" />
            {s.label}
          </button>
        );
      })}
      <p className="px-3 pt-4 pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
        Em breve
      </p>
      {COMING_SOON.map((label) => (
        <div
          key={label}
          className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm text-muted-foreground/60 cursor-not-allowed"
          aria-disabled="true"
        >
          <Lock className="h-4 w-4 shrink-0" />
          {label}
        </div>
      ))}
    </nav>
  );

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-40 glass-nav border-b border-border/40">
        <div className="max-w-7xl mx-auto px-4 md:px-6 flex items-center justify-between h-16 gap-3">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden h-9 w-9"
              onClick={() => setMenuOpen(true)}
              aria-label="Abrir menu"
            >
              <Menu className="h-5 w-5" />
            </Button>
            <Link to="/" aria-label="Vila Park — Vila Mariana">
              <Logo />
            </Link>
          </div>

          <div className="flex items-center gap-2">
            <RoleBadge role={role} />
            <span className="hidden lg:inline text-xs text-muted-foreground truncate max-w-[180px]">
              {session?.user.email}
            </span>
            <Link to="/">
              <Button variant="ghost" size="sm" className="h-8">
                <ArrowLeft className="h-3.5 w-3.5 mr-1" /> <span className="hidden sm:inline">Voltar ao site</span>
              </Button>
            </Link>
            <Button variant="outline" size="sm" className="h-8" onClick={handleLogout}>
              <LogOut className="h-3.5 w-3.5 mr-1" /> Sair
            </Button>
          </div>
        </div>
      </header>

      <div className="flex-1 max-w-7xl w-full mx-auto flex">
        <aside className="hidden md:block w-60 shrink-0 border-r border-border/40">
          <SidebarContent />
        </aside>

        <main className="flex-1 min-w-0 px-4 md:px-6 py-6 md:py-8 space-y-6">
          <div className="md:hidden">
            <Tabs value={active} onValueChange={(v) => setActive(v as SectionKey)}>
              <TabsList>
                {sections.filter((s) => !s.href).map((s) => (
                  <TabsTrigger key={s.key} value={s.key}>
                    {s.label}
                  </TabsTrigger>
                ))}
              </TabsList>
              <TabsContent value="units" />
              <TabsContent value="crm" />
              <TabsContent value="comercial" />
            </Tabs>
            <div className="mt-3">
              <Link to="/admin/extrato">
                <Button variant="outline" size="sm" className="h-9">
                  <FileText className="h-3.5 w-3.5 mr-2" /> Extrato do cliente
                </Button>
              </Link>
            </div>
          </div>

          <header>
            <h1 className="font-display text-2xl md:text-3xl font-bold">
              {sections.find((s) => s.key === active)?.label}
            </h1>
            <p className="text-sm text-muted-foreground">
              {active === "crm"
                ? "Pipeline de negócios e cadastro de pessoas."
                : active === "comercial"
                  ? "Corretores, roleta de distribuição, SLA e motivos de perda."
                  : "Gestão das unidades à venda do Vila Park Mariana."}
            </p>
          </header>

          {active === "units" && <UnitsManager />}
          {active === "crm" && <CrmSection onOpenUnits={() => setActive("units")} />}
          {active === "comercial" && (
            <div className="space-y-8">
              <BrokersManager />
              <LossReasonsManager />
            </div>
          )}
        </main>
      </div>

      <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
        <SheetContent side="left" className="w-64 p-0">
          <SheetHeader className="px-5 pt-5 pb-4 border-b border-border/40">
            <SheetTitle>
              <Logo />
            </SheetTitle>
          </SheetHeader>
          <SidebarContent onNavigate={() => setMenuOpen(false)} />
        </SheetContent>
      </Sheet>
    </div>
  );
}
