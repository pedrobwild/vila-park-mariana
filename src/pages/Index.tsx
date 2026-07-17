import { useEffect, useMemo, useRef, useState, lazy, Suspense } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { motion, useInView, useScroll, useTransform, AnimatePresence } from "framer-motion";
import {
  ArrowRight, Building2, MapPin, MessageCircle, Eye, CheckCircle2, Sparkles,
  Shield, Trees, Train, GraduationCap, ShoppingBag, UtensilsCrossed, Briefcase, KeyRound,
} from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import AppNavbar from "@/components/AppNavbar";
import MobileQuickNav from "@/components/MobileQuickNav";
import ReservationForm from "@/components/ReservationForm";
import WhatsAppFloat from "@/components/WhatsAppFloat";
import { PROPERTY } from "@/data/propertyData";
import { POIS, CATEGORY_ORDER, WHATSAPP_PHONE, type PoiCategory } from "@/data/surroundings";

const PlantasSection = lazy(() => import("@/components/PlantasSection"));
const MarketIntelSection = lazy(() => import("@/components/MarketIntelSection"));

const HERO_IMG = "https://vilaparkmariana.com.br/wp-content/uploads/2023/03/frente-fachada-noite-vila-park-mariana.jpg";

const GALLERY = [
  { url: "https://vilaparkmariana.com.br/wp-content/uploads/2023/03/entrada-portaria-vila-park-mariana.jpg", alt: "Entrada e portaria" },
  { url: "https://vilaparkmariana.com.br/wp-content/uploads/2023/03/vista-dos-fundos-vila-park-mariana.jpg", alt: "Vista dos fundos" },
  { url: "https://vilaparkmariana.com.br/wp-content/uploads/2023/03/frente-fachada-noite-vila-park-mariana.jpg", alt: "Fachada à noite" },
  { url: "https://vilaparkmariana.com.br/wp-content/uploads/2023/03/frente-perspectiva-fachada-noite-vila-park-mariana.jpg", alt: "Perspectiva da fachada à noite" },
];

const PROGRESS_MAY_2025 = [
  "https://vilaparkmariana.com.br/wp-content/uploads/2025/06/obras_14_05-1.jpeg",
  "https://vilaparkmariana.com.br/wp-content/uploads/2025/06/obras_14_05-2.jpeg",
  "https://vilaparkmariana.com.br/wp-content/uploads/2025/06/obras_14_05-3.jpeg",
];
const PROGRESS_JUL_2026 = "https://vilaparkmariana.com.br/wp-content/uploads/2026/07/fachada_07_07.jpeg";

const CATEGORY_META: Record<PoiCategory, { icon: typeof Trees; key: string }> = {
  mobility: { icon: Train, key: "surroundings.mobility" },
  leisure: { icon: Trees, key: "surroundings.leisure" },
  education: { icon: GraduationCap, key: "surroundings.education" },
  services: { icon: ShoppingBag, key: "surroundings.services" },
  gastronomy: { icon: UtensilsCrossed, key: "surroundings.gastronomy" },
};

function FadeIn({ children, delay = 0, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, amount: 0.2 });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 16, filter: "blur(4px)" }}
      animate={inView ? { opacity: 1, y: 0, filter: "blur(0px)" } : {}}
      transition={{ duration: 0.6, delay, ease: [0.16, 1, 0.3, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export default function Index() {
  const { t, i18n } = useTranslation();
  const isMobile = useIsMobile();
  const [showStickyCta, setShowStickyCta] = useState(false);
  const heroRef = useRef<HTMLElement>(null);

  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const heroImgY = useTransform(scrollYProgress, [0, 1], ["0%", "25%"]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.7], [1, 0]);

  const whatsappLink = useMemo(
    () => `https://api.whatsapp.com/send?phone=${WHATSAPP_PHONE}&text=${encodeURIComponent(t("whatsapp.message"))}`,
    [t],
  );

  useEffect(() => {
    if (!isMobile) { setShowStickyCta(false); return; }
    const heroEl = heroRef.current;
    if (!heroEl) return;
    let heroOut = false, tipIn = false;
    const heroObs = new IntersectionObserver(([e]) => {
      heroOut = !e.isIntersecting;
      setShowStickyCta(heroOut && !tipIn);
    }, { threshold: 0 });
    const tipObs = new IntersectionObserver(([e]) => {
      tipIn = e.isIntersecting;
      setShowStickyCta(heroOut && !tipIn);
    }, { threshold: 0 });
    heroObs.observe(heroEl);
    const tryTip = () => {
      const el = document.getElementById("reserva");
      if (el) { tipObs.observe(el); return true; }
      return false;
    };
    if (!tryTip()) {
      const id = setTimeout(tryTip, 500);
      return () => { clearTimeout(id); heroObs.disconnect(); tipObs.disconnect(); };
    }
    return () => { heroObs.disconnect(); tipObs.disconnect(); };
  }, [isMobile]);

  useEffect(() => {
    const isEn = i18n.language?.startsWith("en");
    document.title = isEn
      ? "Vila Park — Vila Mariana · Residential Building"
      : "Vila Park — Vila Mariana · Edifício Residencial";
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute(
      "content",
      isEn
        ? "Vila Park — Vila Mariana. Single tower with 33 apartments, 900 m from Vila Mariana subway. Matere Bittar Incorporações."
        : "Vila Park — Vila Mariana. Torre única com 33 apartamentos a 900 m do metrô Vila Mariana. Incorporação Matere Bittar.",
    );
  }, [i18n.language]);

  const trustFacts = [
    { value: String(PROPERTY.floors), label: t("hero.trust.floors") },
    { value: String(PROPERTY.units), label: t("hero.trust.units") },
    { value: PROPERTY.builtAreaSqm.toLocaleString("pt-BR"), label: t("hero.trust.area") },
    { value: "900 m", label: t("hero.trust.metro") },
  ];

  const typologies = [
    { key: "garden", img: GALLERY[1].url },
    { key: "terrace", img: GALLERY[3].url },
    { key: "studio", img: GALLERY[0].url },
  ];

  const poisByCategory = useMemo(() => {
    const map = new Map<PoiCategory, typeof POIS>();
    for (const p of POIS) {
      if (!map.has(p.category)) map.set(p.category, []);
      map.get(p.category)!.push(p);
    }
    return map;
  }, []);

  return (
    <main className="min-h-screen bg-background">
      <AppNavbar />
      {isMobile && <MobileQuickNav />}

      {/* HERO */}
      <section
        ref={heroRef}
        className={`relative overflow-hidden flex flex-col ${
          isMobile ? "min-h-[85svh] justify-end" : "min-h-[100svh] justify-center"
        }`}
      >
        {isMobile ? (
          <div className="absolute inset-0">
            <img src={HERO_IMG} alt="Fachada Vila Park — Vila Mariana" className="h-full w-full object-cover" loading="eager" />
            <div className="absolute inset-0 bg-gradient-to-t from-foreground/90 via-foreground/50 to-foreground/20" />
          </div>
        ) : (
          <motion.div className="absolute inset-0" style={{ y: heroImgY }}>
            <img src={HERO_IMG} alt="Fachada Vila Park — Vila Mariana" className="h-[120%] w-full object-cover" loading="eager" />
            <div className="absolute inset-0 bg-gradient-to-b from-foreground/75 via-foreground/55 to-foreground/80" />
          </motion.div>
        )}

        <motion.div style={isMobile ? undefined : { opacity: heroOpacity }} className="relative max-w-7xl mx-auto px-5 md:px-6 pt-24 pb-8 md:pt-36 md:pb-24 w-full">
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.7, delay: 0.1 }}>
            <Badge className="bg-accent/90 text-accent-foreground border-accent/40 hover:bg-accent backdrop-blur-sm mb-3 md:mb-5 text-[11px] md:text-xs font-bold tracking-wide px-3 py-1.5">
              <Building2 className="h-3.5 w-3.5 mr-1.5" />
              {isMobile ? t("hero.badgeMobile") : t("hero.badgeDesktop")}
            </Badge>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30, filter: "blur(8px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ duration: 1, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="font-display text-[1.65rem] md:text-6xl lg:text-7xl font-bold leading-[1.12] md:leading-[1.02] max-w-4xl tracking-tight"
            style={{ color: "hsl(var(--primary-foreground))" }}
          >
            {t("hero.headlineDesktopA")}{" "}
            <span className="text-accent">{t("hero.headlineDesktopB")}</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="mt-3 md:mt-6 text-[14px] md:text-xl max-w-2xl leading-relaxed"
            style={{ color: "hsl(var(--primary-foreground) / 0.88)" }}
          >
            {isMobile ? t("hero.subMobile") : t("hero.subDesktop")}
          </motion.p>

          {/* Trust facts */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.55 }}
            className={isMobile ? "mt-5 flex flex-wrap gap-x-4 gap-y-2" : "mt-14 flex flex-wrap gap-8 md:gap-14"}
          >
            {trustFacts.map((s) => (
              <div key={s.label} className={isMobile ? "flex items-center gap-1.5" : ""}>
                <p
                  className={isMobile ? "font-display text-[13px] font-bold" : "font-display text-2xl md:text-3xl font-bold"}
                  style={{ color: "hsl(var(--primary-foreground))" }}
                >
                  {s.value}
                </p>
                <p
                  className={isMobile ? "text-[11px]" : "text-xs mt-0.5"}
                  style={{ color: "hsl(var(--primary-foreground) / 0.7)" }}
                >
                  {s.label}
                </p>
              </div>
            ))}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.65 }}
            className="mt-6 md:mt-10 flex flex-col sm:flex-row gap-3"
          >
            <a href="#tipologias" className="w-full sm:w-auto">
              <Button size="lg" className="min-h-[52px] w-full sm:w-auto text-base bg-accent hover:bg-accent/90 text-accent-foreground font-bold shadow-lg shadow-accent/25 active:scale-[0.97] transition-transform">
                <Eye className="mr-2 h-5 w-5" />
                {t("hero.ctaPrimary")}
              </Button>
            </a>
          </motion.div>
        </motion.div>
      </section>

      {/* DIFERENCIAIS */}
      <section className="border-b border-border/40 bg-background">
        <div className="max-w-7xl mx-auto px-5 md:px-6 py-12 md:py-24">
          <FadeIn>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-accent mb-3">{t("why.eyebrow")}</p>
            <h2 className="font-display text-2xl md:text-4xl font-bold text-foreground max-w-3xl leading-tight">
              {t("why.title")}
            </h2>
          </FadeIn>

          <div className="mt-8 md:mt-10 grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: MapPin, title: t("why.items.location.title"), desc: t("why.items.location.desc") },
              { icon: Sparkles, title: t("why.items.design.title"), desc: t("why.items.design.desc") },
              { icon: Shield, title: t("why.items.construction.title"), desc: t("why.items.construction.desc") },
              { icon: Building2, title: t("why.items.returnValidated.title"), desc: t("why.items.returnValidated.descWith") },
            ].map((item, i) => (
              <FadeIn key={item.title} delay={i * 0.06}>
                <Card className="h-full border-border/60 hover:border-accent/30 transition-colors">
                  <CardContent className="p-4 md:p-5">
                    <div className="h-10 w-10 rounded-xl bg-accent/10 flex items-center justify-center mb-3">
                      <item.icon className="h-5 w-5 text-accent" />
                    </div>
                    <h3 className="text-sm font-bold text-foreground mb-1">{item.title}</h3>
                    <p className="text-[13px] md:text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
                  </CardContent>
                </Card>
              </FadeIn>
            ))}
          </div>

          <FadeIn delay={0.3}>
            <div className="mt-6 md:mt-8 flex flex-wrap items-center gap-3 md:gap-4 text-[13px] md:text-sm text-muted-foreground">
              {[t("why.proof.incorporator"), t("why.proof.ready"), t("why.proof.amenities")].map((label) => (
                <span key={label} className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-accent" />
                  {label}
                </span>
              ))}
            </div>
          </FadeIn>
        </div>
      </section>

      {/* GALERIA */}
      <section className="border-b border-border/40 bg-muted/25">
        <div className="max-w-7xl mx-auto px-5 md:px-6 py-12 md:py-24">
          <FadeIn>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary/80 mb-3">Galeria</p>
            <h2 className="font-display text-2xl md:text-4xl font-bold text-foreground max-w-2xl">
              Fachada e ambientes do Vila Park.
            </h2>
          </FadeIn>
          <div className="mt-8 grid gap-4 grid-cols-1 md:grid-cols-2">
            {GALLERY.map((g, i) => (
              <FadeIn key={g.url} delay={i * 0.06}>
                <div className="overflow-hidden rounded-2xl border border-border/60 bg-background aspect-[4/3]">
                  <img src={g.url} alt={g.alt} className="h-full w-full object-cover" loading="lazy" />
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* TIPOLOGIAS (3 cards) */}
      <section id="tipologias" className="border-b border-border/40 bg-background">
        <div className="max-w-7xl mx-auto px-5 md:px-6 py-12 md:py-24">
          <FadeIn>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-accent mb-3">{t("typologies.eyebrow")}</p>
            <h2 className="font-display text-2xl md:text-4xl font-bold text-foreground max-w-2xl">{t("typologies.title")}</h2>
            <p className="mt-3 text-muted-foreground max-w-2xl">{t("typologies.subtitle")}</p>
          </FadeIn>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {typologies.map((typ, i) => (
              <FadeIn key={typ.key} delay={i * 0.06}>
                <Card className="h-full overflow-hidden border-border/60 hover:border-accent/30 transition-colors">
                  <div className="aspect-[4/3] overflow-hidden bg-muted">
                    <img src={typ.img} alt="" className="h-full w-full object-cover" loading="lazy" />
                  </div>
                  <CardContent className="p-5">
                    <h3 className="font-display text-lg font-bold text-foreground">{t(`typologies.${typ.key}.title`)}</h3>
                    <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{t(`typologies.${typ.key}.desc`)}</p>
                  </CardContent>
                </Card>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* PLANTAS (por pavimento) */}
      <Suspense fallback={<div className="min-h-[400px]" />}>
        <PlantasSection />
      </Suspense>

      {/* ANDAMENTO DA OBRA */}
      <section id="obra" className="border-b border-border/40 bg-muted/25">
        <div className="max-w-7xl mx-auto px-5 md:px-6 py-12 md:py-24">
          <FadeIn>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-accent mb-3">{t("progress.eyebrow")}</p>
            <h2 className="font-display text-2xl md:text-4xl font-bold text-foreground max-w-2xl">{t("progress.title")}</h2>
            <p className="mt-3 text-muted-foreground">{t("progress.subtitle")}</p>
          </FadeIn>

          <FadeIn delay={0.1} className="mt-8">
            <p className="text-sm font-semibold text-foreground mb-3">{t("progress.jul2026")}</p>
            <div className="overflow-hidden rounded-2xl border border-border/60 bg-background aspect-[16/10] md:aspect-[16/8]">
              <img src={PROGRESS_JUL_2026} alt="Fachada em 07/07/2026" className="h-full w-full object-cover" loading="lazy" />
            </div>
          </FadeIn>

          <FadeIn delay={0.15} className="mt-8">
            <p className="text-sm font-semibold text-foreground mb-3">{t("progress.may2025")}</p>
            <div className="grid gap-3 sm:grid-cols-3">
              {PROGRESS_MAY_2025.map((url) => (
                <div key={url} className="overflow-hidden rounded-2xl border border-border/60 bg-background aspect-[4/3]">
                  <img src={url} alt="Obras em 14/05/2025" className="h-full w-full object-cover" loading="lazy" />
                </div>
              ))}
            </div>
          </FadeIn>
        </div>
      </section>

      {/* DADOS DE MERCADO */}
      <section className="border-b border-border/40 bg-muted/25">
        <div className="max-w-7xl mx-auto px-5 md:px-6 py-12 md:py-24">
          <FadeIn>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-accent mb-3">{t("market.eyebrow")}</p>
            <h2 className="font-display text-2xl md:text-4xl font-bold text-foreground max-w-2xl">{t("market.title")}</h2>
            <p className="mt-3 text-muted-foreground max-w-2xl">{t("market.subtitle")}</p>
          </FadeIn>

          <FadeIn delay={0.1} className="mt-4">
            <MarketIntelSection />
          </FadeIn>

          <FadeIn delay={0.15} className="mt-4 flex flex-col sm:flex-row gap-3">
            <Link to="/guia-investidor">
              <Button size="lg" variant="outline" className="min-h-[48px] w-full sm:w-auto">
                {t("market.ctaGuide")}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link to="/ferramentas">
              <Button size="lg" variant="outline" className="min-h-[48px] w-full sm:w-auto">
                {t("market.ctaSimulate")}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </FadeIn>
        </div>
      </section>

      {/* POR QUE INVESTIR AQUI */}
      <section className="border-b border-border/40 bg-background">
        <div className="max-w-7xl mx-auto px-5 md:px-6 py-12 md:py-24">
          <FadeIn>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-accent mb-3">{t("invest.why.eyebrow")}</p>
            <h2 className="font-display text-2xl md:text-4xl font-bold text-foreground max-w-3xl leading-tight">{t("invest.why.title")}</h2>
          </FadeIn>

          <div className="mt-8 grid gap-4 grid-cols-1 sm:grid-cols-2">
            {[
              { icon: Train, titleKey: "invest.why.mobility.title", descKey: "invest.why.mobility.desc" },
              { icon: GraduationCap, titleKey: "invest.why.university.title", descKey: "invest.why.university.desc" },
              { icon: Briefcase, titleKey: "invest.why.jobs.title", descKey: "invest.why.jobs.desc" },
              { icon: KeyRound, titleKey: "invest.why.product.title", descKey: "invest.why.product.desc" },
            ].map((item, i) => (
              <FadeIn key={item.titleKey} delay={i * 0.06}>
                <Card className="h-full border-border/60 hover:border-accent/30 transition-colors">
                  <CardContent className="p-5">
                    <div className="h-10 w-10 rounded-xl bg-accent/10 flex items-center justify-center mb-3">
                      <item.icon className="h-5 w-5 text-accent" />
                    </div>
                    <h3 className="text-base font-bold text-foreground mb-1">{t(item.titleKey)}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{t(item.descKey)}</p>
                  </CardContent>
                </Card>
              </FadeIn>
            ))}
          </div>

          <FadeIn delay={0.3}>
            <p className="mt-6 text-xs text-muted-foreground/70 leading-relaxed max-w-3xl">
              {t("invest.why.disclaimer")}
            </p>
          </FadeIn>
        </div>
      </section>

      {/* ENTORNO */}
      <section id="comparativo" className="border-b border-border/40 bg-background">
        <div className="max-w-7xl mx-auto px-5 md:px-6 py-12 md:py-24">
          <FadeIn>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary/80 mb-3">{t("surroundings.eyebrow")}</p>
            <h2 className="font-display text-2xl md:text-4xl font-bold text-foreground max-w-2xl">{t("surroundings.title")}</h2>
            <p className="mt-3 text-muted-foreground max-w-2xl">{t("surroundings.subtitle")}</p>
          </FadeIn>

          <div className="mt-8 grid gap-6 lg:grid-cols-2">
            {CATEGORY_ORDER.map((cat) => {
              const items = poisByCategory.get(cat) ?? [];
              if (!items.length) return null;
              const meta = CATEGORY_META[cat];
              return (
                <FadeIn key={cat}>
                  <Card className="h-full border-border/60">
                    <CardContent className="p-5">
                      <div className="flex items-center gap-2 mb-4">
                        <div className="h-9 w-9 rounded-lg bg-accent/10 flex items-center justify-center">
                          <meta.icon className="h-4 w-4 text-accent" />
                        </div>
                        <h3 className="font-display text-base font-bold text-foreground">{t(meta.key)}</h3>
                      </div>
                      <ul className="grid gap-2">
                        {items.map((p) => (
                          <li key={p.name} className="flex items-center justify-between gap-3 text-sm">
                            <span className="text-foreground">{p.name}</span>
                            <span className="text-muted-foreground tabular-nums whitespace-nowrap">{p.distance}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                </FadeIn>
              );
            })}
          </div>
        </div>
      </section>

      {/* RESERVA / FORMULÁRIO */}
      <section id="reserva" className="border-b border-border/40 bg-muted/25">
        <div className="max-w-7xl mx-auto px-5 md:px-6 py-14 md:py-24">
          <div className="grid gap-10 lg:grid-cols-2 lg:gap-14 items-start">
            <FadeIn>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-accent mb-3">{t("reservation.eyebrow")}</p>
              <h2 className="font-display text-2xl md:text-4xl font-bold text-foreground">{t("reservation.title")}</h2>
              <p className="mt-3 text-muted-foreground leading-relaxed">{t("reservation.subtitle")}</p>
              <div className="mt-6 space-y-2 text-sm text-muted-foreground">
                <p className="flex items-center gap-2"><MapPin className="h-4 w-4 text-accent" />{PROPERTY.address} — {PROPERTY.neighborhood}, {PROPERTY.city}</p>
                <p className="flex items-center gap-2"><Building2 className="h-4 w-4 text-accent" />{PROPERTY.incorporator}</p>
              </div>
            </FadeIn>
            <FadeIn delay={0.1}>
              <Card className="border-border/60">
                <CardContent className="p-5 md:p-7">
                  <ReservationForm />
                </CardContent>
              </Card>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* GUIA DO COMPRADOR — quick links */}
      <section id="guia" className="border-b border-border/40 bg-background">
        <div className="max-w-7xl mx-auto px-5 md:px-6 py-14 md:py-24">
          <FadeIn>
            <Badge className="mb-3 bg-accent/10 text-accent border-accent/20 hover:bg-accent/15 text-xs font-semibold tracking-wide px-3 py-1">
              {t("guide.badge")}
            </Badge>
            <h2 className="font-display text-2xl md:text-4xl font-bold text-foreground leading-tight max-w-2xl">
              {t("guide.titleA")} <span className="text-accent">{t("guide.titleB")}</span>
            </h2>
            <p className="mt-3 text-muted-foreground max-w-lg">{t("guide.subtitle")}</p>
          </FadeIn>
          <FadeIn delay={0.15} className="mt-8">
            <Link to="/guia-comprador">
              <Button size="lg" className="min-h-[52px] font-bold bg-accent hover:bg-accent/90 text-accent-foreground shadow-lg shadow-accent/25">
                {t("guide.cta")}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </FadeIn>
        </div>
      </section>

      {/* CTA FINAL */}
      <section>
        <div className="max-w-7xl mx-auto px-5 md:px-6 py-14 md:py-24">
          <FadeIn className="text-center max-w-2xl mx-auto">
            <h2 className="font-display text-2xl md:text-4xl font-bold text-foreground">{t("finalCta.title")}</h2>
            <p className="mt-3 md:mt-4 text-muted-foreground text-[15px] md:text-lg leading-relaxed">{t("finalCta.subtitle")}</p>
            <div className="mt-6 md:mt-8 flex flex-col sm:flex-row gap-3 justify-center">
              <Button size="lg" className="min-h-[52px]" onClick={() => window.open(whatsappLink, "_blank")}>
                <MessageCircle className="mr-2 h-4 w-4" />
                {t("finalCta.talk")}
              </Button>
              <a href="#tipologias">
                <Button size="lg" variant="outline" className="min-h-[52px] w-full sm:w-auto">
                  {t("finalCta.viewPlans")}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </a>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-border/40 bg-muted/25">
        <div className="max-w-7xl mx-auto px-5 md:px-6 py-8 md:py-10 pb-24 md:pb-10">
          <div className="flex flex-col gap-4 md:flex-row md:justify-between md:items-center text-[13px] md:text-sm text-muted-foreground">
            <p>{t("footer.rights")}</p>
            <nav aria-label={t("footer.ariaLabel")} className="flex items-center gap-5">
              <Link to="/ferramentas" className="hover:text-foreground transition-colors min-h-[44px] flex items-center">{t("footer.tools")}</Link>
              <Link to="/guia-comprador" className="hover:text-foreground transition-colors min-h-[44px] flex items-center">{t("footer.guide")}</Link>
            </nav>
          </div>
          <p className="mt-6 text-[11px] leading-relaxed text-muted-foreground/70 max-w-4xl">
            {t("footer.disclaimer")}
          </p>
        </div>
      </footer>

      {/* STICKY MOBILE CTA */}
      <AnimatePresence>
        {isMobile && showStickyCta && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="fixed bottom-0 inset-x-0 z-40 bg-background/90 backdrop-blur-xl border-t border-border/40 px-5 pt-2.5"
            style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 8px) + 10px)" }}
          >
            <a href="#reserva" className="block">
              <Button size="lg" className="w-full min-h-[50px] text-[15px] bg-accent hover:bg-accent/90 text-accent-foreground font-bold shadow-lg shadow-accent/25">
                <Eye className="mr-2 h-5 w-5" />
                {t("reservation.submit")}
              </Button>
            </a>
          </motion.div>
        )}
      </AnimatePresence>

      <WhatsAppFloat />
    </main>
  );
}
