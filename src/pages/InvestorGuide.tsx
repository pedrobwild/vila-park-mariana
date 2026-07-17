import { useEffect, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import MarketIntelSection from "@/components/MarketIntelSection";
import AppNavbar from "@/components/AppNavbar";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Separator } from "@/components/ui/separator";
import { PROPERTY } from "@/data/propertyData";
import { WHATSAPP_PHONE } from "@/data/surroundings";
import ReservationForm from "@/components/ReservationForm";
import { POIS } from "@/data/surroundings";
import {
  ArrowRight,
  Briefcase,
  Building2,
  Coffee,
  Compass,
  Dumbbell,
  GraduationCap,
  Hammer,
  KeyRound,
  MapPin,
  MessageCircle,
  Phone,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Sofa,
  Train,
  Trees,
  TrendingUp,
  Utensils,
  XCircle,
} from "lucide-react";

type SectionId =
  | "hero"
  | "location"
  | "typologies"
  | "market"
  | "howItWorks"
  | "antiChecklist"
  | "faq"
  | "contact";

const sectionIds: SectionId[] = ["hero", "location", "typologies", "market", "howItWorks", "antiChecklist", "faq", "contact"];

function SectionLabel({ children }: { children: ReactNode }) {
  return <p className="text-xs font-semibold uppercase tracking-[0.22em] text-accent mb-3">{children}</p>;
}

function KpiCard({ value, label, highlight = false }: { value: string; label: string; highlight?: boolean }) {
  return (
    <Card className={cn("card-elevated border-border/60 overflow-hidden", highlight && "border-accent/30 bg-accent/5")}>
      <CardContent className="p-4 sm:p-5">
        <p className={cn(
          "font-display font-bold leading-tight",
          "text-xl sm:text-2xl xl:text-3xl",
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

  const whatsappLink = `https://api.whatsapp.com/send?phone=${WHATSAPP_PHONE}&text=${encodeURIComponent(
    "Olá! Vi o Guia do Investidor do Vila Park e quero mais informações.",
  )}`;

  useEffect(() => {
    const isEn = i18n.language?.startsWith("en");
    document.title = isEn
      ? "Investor Guide · Vila Park Vila Mariana"
      : "Guia do Investidor · Vila Park Vila Mariana";
  }, [i18n.language]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible?.target?.id) setActiveSection(visible.target.id as SectionId);
      },
      { rootMargin: "-20% 0px -55% 0px", threshold: [0.15, 0.35, 0.65] },
    );
    sectionIds.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  const scrollTo = (id: SectionId) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const locationItems = [
    { icon: Train, titleKey: "investorGuide.location.mobility.title", textKey: "investorGuide.location.mobility.text" },
    { icon: GraduationCap, titleKey: "investorGuide.location.university.title", textKey: "investorGuide.location.university.text" },
    { icon: Briefcase, titleKey: "investorGuide.location.jobs.title", textKey: "investorGuide.location.jobs.text" },
    { icon: KeyRound, titleKey: "investorGuide.location.product.title", textKey: "investorGuide.location.product.text" },
  ];

  const typologyCards = [
    { key: "studio" },
    { key: "garden" },
    { key: "terrace" },
  ];

  const steps = [
    { key: "step1" },
    { key: "step2" },
    { key: "step3" },
    { key: "step4" },
  ];

  const antiItems = ["item1", "item2", "item3", "item4"];

  const faqKeys = ["q1", "q2", "q3", "q4", "q5"];

  return (
    <div className="min-h-screen bg-background page-enter">
      <AppNavbar />

      <div className="sticky top-16 z-30 glass-nav border-t border-border/40">
        <div className="max-w-7xl mx-auto px-4 md:px-6 overflow-x-auto scrollbar-none">
          <div className="flex items-center gap-2 min-w-max py-3">
            <span className="font-display font-bold text-base mr-1 shrink-0">Vila Park</span>
            <Separator orientation="vertical" className="h-5 mr-1" />
            {sectionIds.map((id) => (
              <button
                key={id}
                type="button"
                onClick={() => scrollTo(id)}
                className={cn(
                  "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                  activeSection === id
                    ? "bg-accent text-accent-foreground"
                    : "bg-transparent text-muted-foreground hover:text-foreground hover:bg-secondary",
                )}
              >
                {t(`investorGuide.nav.${id}`)}
              </button>
            ))}
          </div>
        </div>
      </div>

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
                  <Button size="lg" className="min-h-[46px] bg-accent hover:bg-accent/90 text-accent-foreground" onClick={() => scrollTo("contact")}>
                    <ArrowRight className="mr-2 h-4 w-4" />
                    {t("investorGuide.hero.ctaReserve")}
                  </Button>
                  <Button size="lg" variant="outline" className="min-h-[46px]" onClick={() => window.open(whatsappLink, "_blank")}>
                    <MessageCircle className="mr-2 h-4 w-4" />
                    {t("investorGuide.hero.ctaTalk")}
                  </Button>
                </div>

                <div className="mt-10 grid gap-3 sm:grid-cols-3">
                  <KpiCard value="900 m" label={t("investorGuide.hero.kpi.metro")} highlight />
                  <KpiCard value={PROPERTY.address} label={t("investorGuide.hero.kpi.address")} />
                  <KpiCard value={`${PROPERTY.units} apartamentos`} label={t("investorGuide.hero.kpi.units")} />
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
                        <CardDescription className="mt-2">{t("investorGuide.location.title")}</CardDescription>
                      </div>
                      <TrendingUp className="h-8 w-8 text-accent" />
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    {locationItems.map((item) => (
                      <div key={item.titleKey} className="flex items-start gap-3 rounded-xl border border-border/60 p-4">
                        <item.icon className="mt-0.5 h-4 w-4 text-accent shrink-0" />
                        <p className="text-sm leading-relaxed text-foreground">{t(item.titleKey)}</p>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </motion.div>
            </div>
          </div>
        </section>

        {/* LOCALIZAÇÃO */}
        <section id="location" className="scroll-mt-32">
          <div className="max-w-7xl mx-auto px-4 md:px-6 py-16 md:py-20">
            <SectionLabel>{t("investorGuide.location.eyebrow")}</SectionLabel>
            <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-8 max-w-3xl">
              {t("investorGuide.location.title")}
            </h2>

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

        {/* TIPOLOGIAS */}
        <section id="typologies" className="scroll-mt-32 bg-muted/25 border-y border-border/40">
          <div className="max-w-7xl mx-auto px-4 md:px-6 py-16 md:py-20">
            <SectionLabel>{t("investorGuide.typologies.eyebrow")}</SectionLabel>
            <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground">{t("investorGuide.typologies.title")}</h2>
            <p className="mt-3 text-muted-foreground max-w-2xl">{t("investorGuide.typologies.subtitle")}</p>

            <div className="mt-8 grid gap-4 lg:grid-cols-3">
              {typologyCards.map((typ) => (
                <Card key={typ.key} className="card-elevated h-full border-border/60">
                  <CardContent className="p-5 flex h-full flex-col">
                    <h3 className="text-xl font-semibold text-foreground">{t(`investorGuide.typologies.${typ.key}.title`)}</h3>
                    <p className="mt-4 text-sm text-muted-foreground leading-relaxed">{t(`investorGuide.typologies.${typ.key}.profile`)}</p>
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

        {/* MARKET */}
        <section id="market" className="scroll-mt-32">
          <div className="max-w-7xl mx-auto px-4 md:px-6 py-16 md:py-20">
            <SectionLabel>{t("investorGuide.market.eyebrow")}</SectionLabel>
            <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">{t("investorGuide.market.title")}</h2>
            <MarketIntelSection />
          </div>
        </section>

        {/* COMO FUNCIONA */}
        <section id="howItWorks" className="scroll-mt-32 bg-muted/25 border-y border-border/40">
          <div className="max-w-7xl mx-auto px-4 md:px-6 py-16 md:py-20">
            <SectionLabel>{t("investorGuide.howItWorks.eyebrow")}</SectionLabel>
            <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-8">{t("investorGuide.howItWorks.title")}</h2>

            <div className="grid gap-4 md:grid-cols-4">
              {steps.map((s, i) => (
                <Card key={s.key} className="card-elevated h-full border-border/60">
                  <CardContent className="p-5">
                    <div className="h-8 w-8 rounded-full bg-accent/10 text-accent flex items-center justify-center font-display font-bold mb-3">
                      {i + 1}
                    </div>
                    <h3 className="font-semibold text-foreground mb-2">{t(`investorGuide.howItWorks.${s.key}.title`)}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{t(`investorGuide.howItWorks.${s.key}.text`)}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* ANTI-CHECKLIST */}
        <section id="antiChecklist" className="scroll-mt-32">
          <div className="max-w-7xl mx-auto px-4 md:px-6 py-16 md:py-20">
            <SectionLabel>{t("investorGuide.anti.eyebrow")}</SectionLabel>
            <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-8">{t("investorGuide.anti.title")}</h2>

            <div className="grid gap-4 md:grid-cols-2">
              {antiItems.map((key) => (
                <Card key={key} className="card-elevated h-full border-destructive/20">
                  <CardContent className="p-5 flex items-start gap-3">
                    <XCircle className="mt-0.5 h-5 w-5 text-destructive shrink-0" />
                    <p className="text-sm text-foreground leading-relaxed">{t(`investorGuide.anti.${key}`)}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="mt-6">
              <a href="/ferramentas">
                <Button variant="outline" size="lg" className="min-h-[46px]">
                  {t("investorGuide.anti.ctaSimulate")}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </a>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="scroll-mt-32 bg-muted/25 border-y border-border/40">
          <div className="max-w-4xl mx-auto px-4 md:px-6 py-16 md:py-20">
            <SectionLabel>{t("investorGuide.faq.eyebrow")}</SectionLabel>
            <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-8">{t("investorGuide.faq.title")}</h2>

            <Card className="card-elevated border-border/60">
              <CardContent className="p-0">
                <Accordion type="single" collapsible className="px-6">
                  {faqKeys.map((key, index) => (
                    <AccordionItem key={key} value={`item-${index}`}>
                      <AccordionTrigger className="text-left text-base">{t(`investorGuide.faq.${key}`)}</AccordionTrigger>
                      <AccordionContent className="text-sm text-muted-foreground leading-relaxed">
                        {t(`investorGuide.faq.a${key.slice(1)}`)}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* CONTATO */}
        <section id="contact" className="scroll-mt-32 border-t border-border/40">
          <div className="max-w-7xl mx-auto px-4 md:px-6 py-16 md:py-20">
            <Card className="overflow-hidden border-accent/15 bg-hero-gradient-subtle">
              <CardContent className="p-8 md:p-10">
                <div className="grid gap-8 lg:grid-cols-[1fr_1fr] lg:items-start">
                  <div>
                    <SectionLabel>{t("investorGuide.contact.eyebrow")}</SectionLabel>
                    <h2 className="font-display text-3xl md:text-5xl font-bold text-foreground max-w-3xl">
                      {t("investorGuide.contact.title")}
                    </h2>
                    <p className="mt-4 text-lg text-muted-foreground max-w-2xl leading-relaxed">
                      {t("investorGuide.contact.subtitle")}
                    </p>

                    <div className="mt-6 space-y-2 text-sm text-muted-foreground">
                      <p className="flex items-center gap-2"><MapPin className="h-4 w-4 text-accent" />{PROPERTY.address} — {PROPERTY.neighborhood}, {PROPERTY.city}</p>
                    </div>

                    <div className="mt-8 flex flex-col sm:flex-row gap-3">
                      <Button size="lg" className="min-h-[48px] bg-accent hover:bg-accent/90 text-accent-foreground" onClick={() => window.open(whatsappLink, "_blank")}>
                        <MessageCircle className="mr-2 h-4 w-4" />
                        {t("investorGuide.contact.talk")}
                      </Button>
                      <Button size="lg" variant="outline" className="min-h-[48px]" onClick={() => window.location.href = "tel:+5511961007687"}>
                        <Phone className="mr-2 h-4 w-4" />
                        Ligar agora
                      </Button>
                    </div>
                  </div>

                  <Card className="border-border/60 bg-background/90 backdrop-blur-sm">
                    <CardContent className="p-5 md:p-7">
                      <ReservationForm />
                    </CardContent>
                  </Card>
                </div>
              </CardContent>
            </Card>

            <p className="mt-10 text-xs text-muted-foreground leading-relaxed max-w-4xl">
              {t("investorGuide.disclaimer")}
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
