import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useRole } from "@/hooks/useIsAdmin";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  ArrowLeft,
  LogOut,
  Building2,
  Menu,
  FileText,
  Upload,
  Briefcase,
  ShieldCheck,
  UserCog,
  UserPlus,
  BarChart3,
  Settings,
  ChevronDown,
} from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import UnitsManager from "@/components/admin/UnitsManager";
import CrmSection from "@/components/crm/CrmSection";
import RelatoriosSection from "@/components/crm/RelatoriosSection";

import LeadsSection from "@/components/crm/LeadsSection";
import BrokersManager from "@/components/admin/BrokersManager";
import LossReasonsManager from "@/components/admin/LossReasonsManager";
import bwildLogo from "@/assets/bwild-logo.png";

type SectionKey =
  | "units"
  | "crm"
  | "leads"
  | "comercial"
  | "relatorios"
  | "config"
  | "extrato"
  | "upload"
  | "auditoria";

interface SectionDef {
  key: SectionKey;
  label: string;
  icon: typeof Building2;
  href?: string;
  bewildOnly?: boolean;
}

interface SectionGroup {
  label: string;
  collapsible?: boolean;
  items: SectionDef[];
}

const GROUPS: SectionGroup[] = [
  {
    label: "Comercial",
    items: [
      { key: "units", label: "Unidades à venda", icon: Building2 },
      { key: "crm", label: "CRM", icon: Briefcase },
      { key: "leads", label: "Leads", icon: UserPlus },
      { key: "comercial", label: "Equipe comercial", icon: UserCog },
    ],
  },
  {
    label: "Análise",
    items: [{ key: "relatorios", label: "Relatórios", icon: BarChart3 }],
  },
  {
    label: "Configurações e ferramentas",
    collapsible: true,
    items: [
      { key: "config", label: "Configurações", icon: Settings },
      { key: "extrato", label: "Extrato do cliente", icon: FileText, href: "/admin/extrato" },
      { key: "auditoria", label: "Log de auditoria", icon: ShieldCheck, href: "/admin/auditoria" },
      {
        key: "upload",
        label: "Painel — upload de plantas",
        icon: Upload,
        href: "/admin/upload",
        bewildOnly: true,
      },
    ],
  },
];

const SECTION_KEYS: SectionKey[] = [
  "units",
  "crm",
  "leads",
  "comercial",
  "relatorios",
  "config",
  "extrato",
  "upload",
  "auditoria",
];

function isSectionKey(v: string | null): v is SectionKey {
  return !!v && (SECTION_KEYS as string[]).includes(v);
}

const DESCRIPTIONS: Partial<Record<SectionKey, string>> = {
  units: "Gestão das unidades à venda do Vila Park Mariana.",
  crm: "Pipeline de negócios e espelho de vendas.",
  leads: "Base de leads, qualificação e origem do contato.",
  comercial: "Corretores, roleta de distribuição e SLA.",
  relatorios: "Indicadores de funil, base de leads e comissões.",
  config: "Parâmetros do CRM, etapas do funil e padrões de proposta.",
};

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

const GROUP_LABEL_CLASS =
  "px-3 pt-4 pb-1 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/70";

export default function Admin() {
  const { session, role } = useRole();
  const [searchParams, setSearchParams] = useSearchParams();
  const [menuOpen, setMenuOpen] = useState(false);
  const [leadsAutoOpenNew, setLeadsAutoOpenNew] = useState(false);

  const param = searchParams.get("m");
  const active: SectionKey = isSectionKey(param) ? param : "units";

  const setActive = useCallback(
    (key: SectionKey) => {
      const next = new URLSearchParams(searchParams);
      next.delete("tab");
      if (key === "units") next.delete("m");
      else next.set("m", key);
      setSearchParams(next, { replace: true });
    },
    [searchParams, setSearchParams],
  );

  const groups = useMemo(
    () =>
      GROUPS.map((g) => ({
        ...g,
        items: g.items.filter((s) => !s.bewildOnly || role === "admin"),
      })).filter((g) => g.items.length > 0),
    [role],
  );

  const allSections = useMemo(() => groups.flatMap((g) => g.items), [groups]);
  const activeSection = allSections.find((s) => s.key === active);

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const itemClass = (isActive: boolean) =>
    `w-full flex items-center gap-2.5 px-3 h-9 rounded-lg text-sm transition-colors ${
      isActive
        ? "bg-primary text-primary-foreground font-semibold"
        : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
    }`;

  const SidebarItem = ({ s, onNavigate }: { s: SectionDef; onNavigate?: () => void }) => {
    if (s.href) {
      return (
        <Link to={s.href} onClick={onNavigate} className={itemClass(false)}>
          <s.icon className="h-4 w-4 shrink-0" />
          {s.label}
        </Link>
      );
    }
    return (
      <button
        onClick={() => {
          setActive(s.key);
          onNavigate?.();
        }}
        className={itemClass(active === s.key)}
      >
        <s.icon className="h-4 w-4 shrink-0" />
        {s.label}
      </button>
    );
  };

  const CollapsibleGroup = ({
    group,
    onNavigate,
  }: {
    group: SectionGroup;
    onNavigate?: () => void;
  }) => {
    const hasActive = group.items.some((s) => s.key === active && !s.href);
    const [open, setOpen] = useState(hasActive);
    useEffect(() => {
      if (hasActive) setOpen(true);
    }, [hasActive]);

    return (
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger className={`${GROUP_LABEL_CLASS} flex w-full items-center justify-between`}>
          {group.label}
          <ChevronDown
            className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`}
          />
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-1">
          {group.items.map((s) => (
            <SidebarItem key={s.key} s={s} onNavigate={onNavigate} />
          ))}
        </CollapsibleContent>
      </Collapsible>
    );
  };

  const SidebarContent = ({ onNavigate }: { onNavigate?: () => void }) => (
    <nav className="space-y-1 p-3">
      {groups.map((g) =>
        g.collapsible ? (
          <CollapsibleGroup key={g.label} group={g} onNavigate={onNavigate} />
        ) : (
          <div key={g.label} className="space-y-1">
            <p className={GROUP_LABEL_CLASS}>{g.label}</p>
            {g.items.map((s) => (
              <SidebarItem key={s.key} s={s} onNavigate={onNavigate} />
            ))}
          </div>
        ),
      )}
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
                <ArrowLeft className="h-3.5 w-3.5 mr-1" />{" "}
                <span className="hidden sm:inline">Voltar ao site</span>
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
              <TabsList className="flex-wrap h-auto">
                {allSections
                  .filter((s) => !s.href)
                  .map((s) => (
                    <TabsTrigger key={s.key} value={s.key}>
                      {s.label}
                    </TabsTrigger>
                  ))}
              </TabsList>
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
              {activeSection?.label}
            </h1>
            <p className="text-sm text-muted-foreground">{DESCRIPTIONS[active]}</p>
          </header>

          {active === "units" && <UnitsManager />}
          {active === "crm" && (
            <CrmSection
              onOpenUnits={() => setActive("units")}
              onOpenRelatorios={() => setActive("relatorios")}
              onOpenLeads={(opts) => {
                setActive("leads");
                if (opts?.novo) setLeadsAutoOpenNew(true);
              }}
            />
          )}
          {active === "leads" && (
            <LeadsSection
              onOpenDeal={(dealId) => {
                const next = new URLSearchParams(searchParams);
                next.delete("tab");
                next.set("m", "crm");
                next.set("deal", dealId);
                setSearchParams(next, { replace: true });
              }}
              onNewDealForPerson={() => setActive("crm")}
              autoOpenNew={leadsAutoOpenNew}
              onAutoOpenNewHandled={() => setLeadsAutoOpenNew(false)}
            />
          )}
          {active === "comercial" && (
            <div className="space-y-8">
              <BrokersManager />
              <LossReasonsManager />
            </div>
          )}
          {active === "relatorios" && (
            <RelatoriosSection
              onGoToPipeline={() => setActive("crm")}
              onGoToLeads={() => setActive("leads")}
            />
          )}
          {active === "config" && (
            <p className="rounded-lg border border-dashed border-border/60 px-4 py-8 text-center text-sm text-muted-foreground">
              Em construção — próxima etapa.
            </p>
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
