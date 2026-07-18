import { useEffect, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import MarketIntelSection from "@/components/MarketIntelSection";
import AppNavbar from "@/components/AppNavbar";
import InvestorQuizCard from "@/components/investor/InvestorQuizCard";
import InvestorSimulator from "@/components/investor/InvestorSimulator";
import EventsCalendar from "@/components/insights/EventsCalendar";
import MarketDataSection from "@/components/investor/MarketDataSection";
import IllustrativeCaseSection from "@/components/investor/IllustrativeCaseSection";
import TotalReturnSection from "@/components/investor/TotalReturnSection";
import ScenariosSection from "@/components/investor/ScenariosSection";
import MonthlyRevenueEventsSection from "@/components/investor/MonthlyRevenueEventsSection";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Separator } from "@/components/ui/separator";
import { POIS, WHATSAPP_PHONE } from "@/data/surroundings";
import {
  Briefcase,
  Building2,
  Calculator,
  CheckCircle2,
  Compass,
  Dumbbell,
  GraduationCap,
  KeyRound,
  MessageCircle,
  Quote,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Sofa,
  Train,
  Trees,
  TrendingUp,
  Utensils,
} from "lucide-react";

type SectionId =
  | "hero"
  | "diagnostico"
  | "tese"
  | "nearby"
  | "typologies"
  | "matematica"
  | "simulador"
  | "avaliar"
  | "marketData"
  | "case"
  | "totalReturn"
  | "scenarios"
  | "eventos"
  | "monthlyEvents"
  | "amenities"
  | "market"
  | "confianca"
  | "faq"
  | "cta";

const sectionIds: SectionId[] = [
  "hero", "diagnostico", "tese", "nearby", "typologies", "matematica",
  "simulador", "avaliar", "marketData", "case", "totalReturn", "scenarios",
  "eventos", "monthlyEvents", "amenities", "market", "confianca", "faq", "cta",
];

const navSectionIds: SectionId[] = [
  "hero", "diagnostico", "tese", "typologies", "matematica",
  "simulador", "avaliar", "marketData", "case", "totalReturn", "scenarios",
  "eventos", "monthlyEvents", "amenities", "market", "faq", "cta",
];

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-accent mb-3">{children}</p>
  );
}

function KpiCard({ value, label, highlight = false }: { value: string; label: string; highlight?: boolean }) {
  return (
    <Card className={cn("card-elevated border-border/60 overflow-hidden", highlight && "border-accent/30 bg-accent/5")}>
      <CardContent className="p-4 sm:p-5">
        <p className={cn(
          "font-display font-bold leading-tight text-xl sm:text-2xl xl:text-3xl",
          highlight ? "text-accent" : "text-foreground",
        )}>
          {value}
        </p>
        <p className="mt-2 text-sm text-muted-foreground">{label}</p>
      </CardContent>
    </Card>
  );
}

export default function InvestorGuide() {
  const { t, i18n } = useTranslation();
  const [activeSection, setActiveSection] = useState<SectionId>("hero");
  const [preferredTypoId, setPreferredTypoId] = useState<string | undefined>(undefined);

  const whatsappLink = `https://api.whatsapp.com/send?phone=${WHATSAPP_PHONE}&text=${encodeURIComponent(
    "Olá! Vi o Guia do Investidor do Vila Park e quero mais informações.",
  )}`;

  useEffect(() => {
    const isEn = i18n.language?.startsWith("en");
    document.title = isEn
      ? "Investor Guide · Vila Park Vila Mariana"
      : "Guia do Investidor · Vila Park Vila Mariana";
  }, [i18n.language]);

  const prefersReducedMotion =
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;

  const scrollTo = (id: SectionId, updateHash = true) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.scrollIntoView({ behavior: prefersReducedMotion ? "auto" : "smooth", block: "start" });
    if (updateHash) {
      if (id === "hero") {
        // Clear hash without leaving " " or %20 in the URL.
        window.history.replaceState(null, "", window.location.pathname + window.location.search);
      } else {
        window.history.replaceState(null, "", `#${id}`);
      }
    }
    setActiveSection(id);
  };

  useEffect(() => {
    const raw = window.location.hash.replace("#", "");
    if (!raw) return;
    const hash = raw as SectionId;
    if (!sectionIds.includes(hash)) return;
    let cancelled = false;
    const run = () => {
      if (cancelled) return;
      const el = document.getElementById(hash);
      if (!el) return;
      el.scrollIntoView({ behavior: prefersReducedMotion ? "auto" : "smooth", block: "start" });
      setActiveSection(hash);
    };
    requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(run, 60)));
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    let ticking = false;
    const update = () => {
      ticking = false;
      const offset = 128 + 8;
      let currentId: SectionId = "hero";
      let bestTop = -Infinity;
      for (const id of sectionIds) {
        const el = document.getElementById(id);
        if (!el) continue;
        const top = el.getBoundingClientRect().top - offset;
        if (top <= 0 && top > bestTop) {
          bestTop = top;
          currentId = id;
        }
      }
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4) {
        currentId = sectionIds[sectionIds.length - 1];
      }
      setActiveSection((prev) => (prev === currentId ? prev : currentId));
    };
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  // Location pillars (used both as hero titles and as the full "tese" section body).
  const locationItems = [
    { icon: Train, titleKey: "investorGuide.location.mobility.title", textKey: "investorGuide.location.mobility.text" },
    { icon: GraduationCap, titleKey: "investorGuide.location.university.title", textKey: "investorGuide.location.university.text" },
    { icon: Briefcase, titleKey: "investorGuide.location.jobs.title", textKey: "investorGuide.location.jobs.text" },
    { icon: KeyRound, titleKey: "investorGuide.location.product.title", textKey: "investorGuide.location.product.text" },
  ];

  const typologyCards = [{ key: "studio" }, { key: "garden" }, { key: "terrace" }];

  const matematicaItems = ["invest", "revenue", "yield", "payback"] as const;
  const avaliarItems = t("investorGuide.avaliar.items", { returnObjects: true }) as string[];
  const trustSignals = [
    { icon: Building2, key: "units" },
    { icon: Sofa, key: "amenities" },
    { icon: Train, key: "metro" },
    { icon: ShieldCheck, key: "builder" },
  ];
  const amenitiesItems = [
    { icon: Sofa, key: "leisure" },
    { icon: Building2, key: "lobby" },
    { icon: Dumbbell, key: "infra" },
    { icon: ShieldCheck, key: "ac" },
  ];
  const faqKeys = ["q1", "q2", "q3", "q4", "q5"];
  const extraFaqKeys = ["f1", "f2", "f3", "f4", "f5"];

  return (
    <div className="min-h-screen bg-background page-enter">
      <AppNavbar />

      <nav
        aria-label={t("investorGuide.nav.aria")}
        className="sticky top-16 z-30 glass-nav border-t border-border/40"
      >
        <div className="max-w-7xl mx-auto px-4 md:px-6 overflow-x-auto scrollbar-none">
          <div className="flex items-center gap-2 min-w-max py-2">
            <span className="font-display font-bold text-base mr-1 shrink-0">{t("investorGuide.nav.brand")}</span>
            <Separator orientation="vertical" className="h-5 mr-1" />
            {navSectionIds.map((id) => {
              const isActive = activeSection === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => scrollTo(id)}
                  aria-current={isActive ? "true" : undefined}
                  className={cn(
                    "inline-flex items-center rounded-full px-3 min-h-[36px] text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                    isActive
                      ? "bg-accent text-accent-foreground"
                      : "bg-transparent text-muted-foreground hover:text-foreground hover:bg-secondary",
                  )}
                >
                  {t(`investorGuide.sectionLabels.${id}`)}
                </button>
              );
            })}
          </div>
        </div>
      </nav>

      <main className="pb-24">
        {/* HERO */}
        <section id="hero" className="scroll-mt-32 border-b border-border/50 bg-hero-gradient-subtle">
          <div className="max-w-7xl mx-auto px-4 md:px-6 py-14 md:py-20">
            <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
              <motion.div
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.5 }}
              >
                <div className="flex flex-wrap gap-2 mb-5">
                  <Badge className="bg-accent/10 text-accent border-accent/20 hover:bg-accent/10">Vila Park</Badge>
                  <Badge variant="outline">Vila Mariana</Badge>
                  <Badge variant="outline">{t("investorGuide.hero.badge")}</Badge>
                </div>

                <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold leading-tight text-foreground max-w-4xl">
                  {t("investorGuide.hero.titleA")}{" "}
                  <span className="text-gradient-premium">{t("investorGuide.hero.titleB")}</span>
                </h1>

                <p className="mt-5 max-w-2xl text-lg text-muted-foreground leading-relaxed">
                  {t("investorGuide.hero.subtitle")}
                </p>

                <div className="mt-8 flex flex-col sm:flex-row gap-3">
                  <Button
                    size="lg"
                    className="min-h-[46px] bg-accent hover:bg-accent/90 text-accent-foreground"
                    onClick={() => scrollTo("diagnostico")}
                  >
                    <Sparkles className="mr-2 h-4 w-4" />
                    {t("investorGuide.hero.ctaDiag")}
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    className="min-h-[46px]"
                    onClick={() => window.open(whatsappLink, "_blank")}
                  >
                    <MessageCircle className="mr-2 h-4 w-4" />
                    {t("investorGuide.hero.ctaTalk")}
                  </Button>
                </div>

                <div className="mt-10 grid gap-3 grid-cols-2 lg:grid-cols-4">
                  <KpiCard value="900 m" label={t("investorGuide.hero.kpi.metro")} highlight />
                  <KpiCard value="850 m" label={t("investorGuide.hero.kpi.fmu")} />
                  <KpiCard value="2,5 km" label={t("investorGuide.hero.kpi.paulista")} />
                  <KpiCard value="950 m" label={t("investorGuide.hero.kpi.park")} />
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.55, delay: 0.1 }}
              >
                <Card className="card-elevated overflow-hidden border-accent/10">
                  <CardHeader className="pb-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <CardTitle className="text-2xl">{t("invest.why.title")}</CardTitle>
                        <CardDescription className="mt-2">{t("investorGuide.hero.cardEyebrow")}</CardDescription>
                      </div>
                      <TrendingUp className="h-8 w-8 text-accent" />
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {locationItems.map((item) => (
                      <div key={item.titleKey} className="flex items-start gap-3 rounded-xl border border-border/60 p-3">
                        <item.icon className="mt-0.5 h-4 w-4 text-accent shrink-0" />
                        <p className="text-sm font-medium leading-relaxed text-foreground">{t(item.titleKey)}</p>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </motion.div>
            </div>
          </div>
        </section>

        {/* DIAGNÓSTICO */}
        <section id="diagnostico" className="scroll-mt-32">
          <div className="max-w-4xl mx-auto px-4 md:px-6 py-16 md:py-20">
            <SectionLabel>{t("investorGuide.diag.eyebrow")}</SectionLabel>
            <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-3">
              {t("investorGuide.diag.title")}
            </h2>
            <p className="text-muted-foreground mb-8 max-w-2xl">{t("investorGuide.diag.subtitle")}</p>
            <InvestorQuizCard onResult={(id) => setPreferredTypoId(id)} />
          </div>
        </section>

        {/* TESE (merged with location — full pillar texts) */}
        <section id="tese" className="scroll-mt-32 bg-muted/25 border-y border-border/40">
          <div className="max-w-7xl mx-auto px-4 md:px-6 py-16 md:py-20">
            <SectionLabel>{t("investorGuide.tese.eyebrow")}</SectionLabel>
            <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-3 max-w-3xl">
              {t("investorGuide.tese.title")}
            </h2>
            <p className="text-muted-foreground max-w-2xl mb-8">{t("investorGuide.tese.subtitle")}</p>

            <div className="grid gap-4 md:grid-cols-2">
              {locationItems.map((item) => (
                <Card key={item.titleKey} className="card-elevated h-full border-border/60">
                  <CardContent className="p-5">
                    <div className="h-10 w-10 rounded-xl bg-accent/10 flex items-center justify-center mb-3">
                      <item.icon className="h-5 w-5 text-accent" />
                    </div>
                    <h3 className="font-semibold text-foreground mb-2">{t(item.titleKey)}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{t(item.textKey)}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* ENTORNO */}
        <section id="nearby" className="scroll-mt-32">
          <div className="max-w-7xl mx-auto px-4 md:px-6 py-16 md:py-20">
            <SectionLabel>{t("investorGuide.nearby.eyebrow")}</SectionLabel>
            <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-3 max-w-3xl">
              {t("investorGuide.nearby.title")}
            </h2>
            <p className="text-muted-foreground max-w-2xl mb-8">{t("investorGuide.nearby.subtitle")}</p>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[
                { icon: Train, title: t("investorGuide.nearby.groups.mobility"), items: POIS.filter((p) => p.category === "mobility") },
                { icon: GraduationCap, title: t("investorGuide.nearby.groups.edu"), items: POIS.filter((p) => p.category === "education") },
                { icon: Trees, title: t("investorGuide.nearby.groups.parks"), items: POIS.filter((p) => p.category === "leisure").slice(0, 4) },
                { icon: ShoppingBag, title: t("investorGuide.nearby.groups.services"), items: POIS.filter((p) => p.category === "services").slice(0, 5) },
                { icon: Utensils, title: t("investorGuide.nearby.groups.gastronomy"), items: POIS.filter((p) => p.category === "gastronomy") },
                {
                  icon: Briefcase,
                  title: t("investorGuide.nearby.groups.jobs"),
                  items: [
                    { name: t("investorGuide.nearby.jobsPaulista"), distance: t("investorGuide.nearby.jobsPaulistaDist") },
                    { name: t("investorGuide.nearby.jobsCorredor"), distance: t("investorGuide.nearby.jobsCorredorDist") },
                  ],
                },
              ].map((group) => (
                <Card key={group.title} className="card-elevated border-border/60 h-full">
                  <CardContent className="p-5">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="h-9 w-9 rounded-lg bg-accent/10 flex items-center justify-center">
                        <group.icon className="h-4 w-4 text-accent" />
                      </div>
                      <h3 className="font-semibold text-foreground">{group.title}</h3>
                    </div>
                    <ul className="space-y-2">
                      {group.items.map((item) => (
                        <li key={item.name} className="flex items-start justify-between gap-3 text-sm border-b border-border/40 pb-2 last:border-0 last:pb-0">
                          <span className="text-foreground">{item.name}</span>
                          <span className="text-muted-foreground shrink-0">{item.distance}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="mt-8 rounded-xl border border-accent/20 bg-accent/5 p-5 flex items-start gap-3">
              <Compass className="mt-0.5 h-5 w-5 text-accent shrink-0" />
              <p className="text-sm text-foreground leading-relaxed">{t("investorGuide.nearby.note")}</p>
            </div>
          </div>
        </section>

        {/* TIPOLOGIAS */}
        <section id="typologies" className="scroll-mt-32 bg-muted/25 border-y border-border/40">
          <div className="max-w-7xl mx-auto px-4 md:px-6 py-16 md:py-20">
            <SectionLabel>{t("investorGuide.typologies.eyebrow")}</SectionLabel>
            <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground">
              {t("investorGuide.typologies.title")}
            </h2>
            <p className="mt-3 text-muted-foreground max-w-2xl">
              {t("investorGuide.typologies.subtitle")}
            </p>

            <div className="mt-8 grid gap-4 lg:grid-cols-3">
              {typologyCards.map((typ) => (
                <Card key={typ.key} className="card-elevated h-full border-border/60">
                  <CardContent className="p-5 flex h-full flex-col">
                    <h3 className="text-xl font-semibold text-foreground">
                      {t(`investorGuide.typologies.${typ.key}.title`)}
                    </h3>
                    <p className="mt-4 text-sm text-muted-foreground leading-relaxed">
                      {t(`investorGuide.typologies.${typ.key}.profile`)}
                    </p>
                    <div className="mt-5 pt-4 border-t border-border/40">
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={() => {
                          setPreferredTypoId(typ.key);
                          scrollTo("simulador");
                        }}
                      >
                        {t("investorGuide.typologies.simulate")}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="mt-8 rounded-xl border border-dashed border-accent/30 bg-accent/5 p-5">
              <p className="text-sm font-medium text-foreground flex items-start gap-2">
                <Sparkles className="mt-0.5 h-4 w-4 text-accent shrink-0" />
                {t("investorGuide.typologies.recommendation")}
              </p>
            </div>
          </div>
        </section>

        {/* MATEMÁTICA */}
        <section id="matematica" className="scroll-mt-32">
          <div className="max-w-7xl mx-auto px-4 md:px-6 py-16 md:py-20">
            <SectionLabel>{t("investorGuide.matematica.eyebrow")}</SectionLabel>
            <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-3 max-w-3xl">
              {t("investorGuide.matematica.title")}
            </h2>
            <p className="text-muted-foreground max-w-2xl mb-8">{t("investorGuide.matematica.subtitle")}</p>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {matematicaItems.map((k) => (
                <Card key={k} className="card-elevated border-border/60 h-full">
                  <CardContent className="p-5">
                    <div className="h-10 w-10 rounded-xl bg-accent/10 flex items-center justify-center mb-3">
                      <Calculator className="h-5 w-5 text-accent" />
                    </div>
                    <h3 className="font-semibold text-foreground mb-2">
                      {t(`investorGuide.matematica.items.${k}.title`)}
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {t(`investorGuide.matematica.items.${k}.text`)}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* SIMULADOR */}
        <section id="simulador" className="scroll-mt-32 bg-muted/25 border-y border-border/40">
          <div className="max-w-5xl mx-auto px-4 md:px-6 py-16 md:py-20">
            <SectionLabel>{t("investorGuide.simuladorSection.eyebrow")}</SectionLabel>
            <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-3">
              {t("investorGuide.simuladorSection.title")}
            </h2>
            <p className="text-muted-foreground mb-8 max-w-2xl">
              {t("investorGuide.simuladorSection.subtitle")}
            </p>
            <InvestorSimulator initialTypologyId={preferredTypoId} />
          </div>
        </section>

        {/* AVALIAR */}
        <section id="avaliar" className="scroll-mt-32">
          <div className="max-w-5xl mx-auto px-4 md:px-6 py-16 md:py-20">
            <SectionLabel>{t("investorGuide.avaliar.eyebrow")}</SectionLabel>
            <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-3 max-w-3xl">
              {t("investorGuide.avaliar.title")}
            </h2>
            <p className="text-muted-foreground max-w-2xl mb-8">{t("investorGuide.avaliar.subtitle")}</p>

            <Card className="card-elevated border-border/60">
              <CardContent className="p-5 md:p-6">
                <ul className="grid gap-3 md:grid-cols-2">
                  {avaliarItems.map((item) => (
                    <li key={item} className="flex items-start gap-3">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 text-accent shrink-0" />
                      <span className="text-sm text-foreground leading-relaxed">{item}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* EVENTOS */}
        <section id="eventos" className="scroll-mt-32 bg-muted/25 border-y border-border/40">
          <div className="max-w-7xl mx-auto px-4 md:px-6 py-16 md:py-20">
            <SectionLabel>{t("investorGuide.eventos.eyebrow")}</SectionLabel>
            <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-3 max-w-3xl">
              {t("investorGuide.eventos.title")}
            </h2>
            <p className="text-muted-foreground max-w-2xl mb-8">{t("investorGuide.eventos.subtitle")}</p>
            <EventsCalendar
              regionLabel="Vila Mariana"
              title={t("investorGuide.eventos.calendarTitle")}
              subtitle={t("investorGuide.eventos.calendarSubtitle")}
            />
          </div>
        </section>

        {/* ÁREAS COMUNS */}
        <section id="amenities" className="scroll-mt-32">
          <div className="max-w-7xl mx-auto px-4 md:px-6 py-16 md:py-20">
            <SectionLabel>{t("investorGuide.amenities.eyebrow")}</SectionLabel>
            <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-3 max-w-3xl">
              {t("investorGuide.amenities.title")}
            </h2>
            <p className="text-muted-foreground max-w-2xl mb-8">{t("investorGuide.amenities.subtitle")}</p>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {amenitiesItems.map((a) => (
                <Card key={a.key} className="card-elevated border-border/60 h-full">
                  <CardContent className="p-5">
                    <div className="h-10 w-10 rounded-xl bg-accent/10 flex items-center justify-center mb-3">
                      <a.icon className="h-5 w-5 text-accent" />
                    </div>
                    <h3 className="font-semibold text-foreground mb-2">
                      {t(`investorGuide.amenities.items.${a.key}.title`)}
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {t(`investorGuide.amenities.items.${a.key}.text`)}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>

            <p className="mt-6 text-xs text-muted-foreground">{t("investorGuide.amenities.disclaimer")}</p>
          </div>
        </section>

        {/* MARKET */}
        <section id="market" className="scroll-mt-32 bg-muted/25 border-y border-border/40">
          <div className="max-w-7xl mx-auto px-4 md:px-6 py-16 md:py-20">
            <SectionLabel>{t("investorGuide.market.eyebrow")}</SectionLabel>
            <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">
              {t("investorGuide.market.title")}
            </h2>
            <MarketIntelSection />
          </div>
        </section>

        {/* CONFIANÇA */}
        <section id="confianca" className="scroll-mt-32">
          <div className="max-w-7xl mx-auto px-4 md:px-6 py-16 md:py-20">
            <SectionLabel>{t("investorGuide.confianca.eyebrow")}</SectionLabel>
            <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-3 max-w-3xl">
              {t("investorGuide.confianca.title")}
            </h2>
            <p className="text-muted-foreground max-w-2xl mb-8">{t("investorGuide.confianca.subtitle")}</p>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
              {trustSignals.map((s) => (
                <Card key={s.key} className="card-elevated border-border/60 h-full">
                  <CardContent className="p-5">
                    <div className="h-10 w-10 rounded-xl bg-accent/10 flex items-center justify-center mb-3">
                      <s.icon className="h-5 w-5 text-accent" />
                    </div>
                    <p className="font-semibold text-foreground">{t(`investorGuide.confianca.items.${s.key}.label`)}</p>
                    <p className="text-sm text-muted-foreground mt-1">{t(`investorGuide.confianca.items.${s.key}.note`)}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card className="card-elevated border-accent/20 bg-accent/5">
              <CardContent className="p-5 md:p-7">
                <Quote className="h-6 w-6 text-accent mb-3" />
                <p className="font-display text-lg md:text-xl text-foreground leading-relaxed">
                  “{t("investorGuide.confianca.quote")}”
                </p>
                <p className="mt-3 text-sm text-muted-foreground">
                  {t("investorGuide.confianca.quoteNote")}
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="scroll-mt-32 bg-muted/25 border-y border-border/40">
          <div className="max-w-4xl mx-auto px-4 md:px-6 py-16 md:py-20">
            <SectionLabel>{t("investorGuide.faq.eyebrow")}</SectionLabel>
            <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-8">
              {t("investorGuide.faq.title")}
            </h2>

            <Card className="card-elevated border-border/60">
              <CardContent className="p-0">
                <Accordion type="single" collapsible className="px-6">
                  {faqKeys.map((key, index) => (
                    <AccordionItem key={key} value={`item-${index}`}>
                      <AccordionTrigger className="text-left text-base">
                        {t(`investorGuide.faq.${key}`)}
                      </AccordionTrigger>
                      <AccordionContent className="text-sm text-muted-foreground leading-relaxed">
                        {t(`investorGuide.faq.a${key.slice(1)}`)}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                  {extraFaqKeys.map((k, i) => (
                    <AccordionItem key={`extra-${i}`} value={`extra-${i}`}>
                      <AccordionTrigger className="text-left text-base">
                        {t(`investorGuide.extraFaq.${k}.q`)}
                      </AccordionTrigger>
                      <AccordionContent className="text-sm text-muted-foreground leading-relaxed">
                        {t(`investorGuide.extraFaq.${k}.a`)}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* CTA */}
        <section id="cta" className="scroll-mt-32 bg-hero-gradient-subtle border-y border-border/40">
          <div className="max-w-4xl mx-auto px-4 md:px-6 py-16 md:py-20 text-center">
            <Badge className="bg-accent/10 text-accent border-accent/20 hover:bg-accent/10 mb-4">
              {t("investorGuide.ctaFinal.badge")}
            </Badge>
            <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">
              {t("investorGuide.ctaFinal.title")}
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto mb-8">
              {t("investorGuide.ctaFinal.subtitle")}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button
                size="lg"
                className="min-h-[46px] bg-accent hover:bg-accent/90 text-accent-foreground"
                onClick={() => window.open(whatsappLink, "_blank")}
              >
                <MessageCircle className="mr-2 h-4 w-4" />
                {t("investorGuide.ctaFinal.wa")}
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="min-h-[46px]"
                onClick={() => scrollTo("simulador")}
              >
                <Calculator className="mr-2 h-4 w-4" />
                {t("investorGuide.ctaFinal.backSim")}
              </Button>
            </div>
          </div>
        </section>

        <section className="scroll-mt-32 border-t border-border/40">
          <div className="max-w-7xl mx-auto px-4 md:px-6 py-10">
            <p className="text-xs text-muted-foreground leading-relaxed max-w-4xl">
              {t("investorGuide.disclaimer")}
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
