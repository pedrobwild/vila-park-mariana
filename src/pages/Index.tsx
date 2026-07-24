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
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

import AppNavbar from "@/components/AppNavbar";
import MobileQuickNav from "@/components/MobileQuickNav";
import ReservationForm from "@/components/ReservationForm";
import WhatsAppFloat from "@/components/WhatsAppFloat";
import { PROPERTY } from "@/data/propertyData";
import { WHATSAPP_PHONE } from "@/data/surroundings";

import SiteFooter from "@/components/shared/SiteFooter";
import GalleryLightbox from "@/components/shared/GalleryLightbox";
import MobileGalleryCarousel from "@/components/shared/MobileGalleryCarousel";
import { trackGlobal } from "@/hooks/useGuideAnalytics";

const PlantasSection = lazy(() => import("@/components/PlantasSection"));
const VilaParkLocationMap = lazy(() => import("@/components/mapa/VilaParkLocationMap"));

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

import decorado4 from "@/assets/decorado/decorado-4.png.asset.json";
import decorado5 from "@/assets/decorado/decorado-5.png.asset.json";
import decorado6 from "@/assets/decorado/decorado-6.png.asset.json";
import decorado7 from "@/assets/decorado/decorado-7.png.asset.json";
import decorado8 from "@/assets/decorado/decorado-8.png.asset.json";
import decorado9 from "@/assets/decorado/decorado-9.png.asset.json";
import decorado10 from "@/assets/decorado/decorado-10.png.asset.json";
import decorado11 from "@/assets/decorado/decorado-11.png.asset.json";
import decorado12 from "@/assets/decorado/decorado-12.png.asset.json";
import decorado13 from "@/assets/decorado/decorado-13.png.asset.json";
import decorado13b from "@/assets/decorado/decorado-13-2.png.asset.json";
import decorado14 from "@/assets/decorado/decorado-14.png.asset.json";
import decorado15 from "@/assets/decorado/decorado-15.png.asset.json";
import decorado16 from "@/assets/decorado/decorado-16.png.asset.json";
import decorado17 from "@/assets/decorado/decorado-17.png.asset.json";
import decorado18 from "@/assets/decorado/decorado-18.png.asset.json";
import decorado19 from "@/assets/decorado/decorado-19.png.asset.json";
import decorado21 from "@/assets/decorado/decorado-21.png.asset.json";
import decorado23 from "@/assets/decorado/decorado-23.png.asset.json";
import decorado26 from "@/assets/decorado/decorado-26.png.asset.json";

const DECORADO_GALLERY: { url: string; alt: string }[] = [
  { url: decorado5.url, alt: "Vista integrada do studio decorado — sala, quarto e cozinha" },
  { url: decorado16.url, alt: "Perspectiva completa do studio com iluminação cênica e marcenaria integrada" },
  { url: decorado8.url, alt: "Painel de TV em pedra natural com nichos iluminados" },
  { url: decorado11.url, alt: "Quarto com cabeceira estofada e iluminação indireta" },
  { url: decorado13b.url, alt: "Suíte com ar-condicionado, arandelas escultóricas e varanda com vista" },
  { url: decorado6.url, alt: "Sala de estar com sofá curvo e adega vertical" },
  { url: decorado4.url, alt: "Cozinha compacta com marcenaria planejada e eletros premium" },
  { url: decorado17.url, alt: "Cozinha em travertino iluminado com geladeira black e forno embutido" },
  { url: decorado18.url, alt: "Cozinha aberta com estantes iluminadas e acabamento em madeira clara" },
  { url: decorado9.url, alt: "Living com painel de TV em pedra e adega decorativa" },
  { url: decorado15.url, alt: "Quarto integrado ao living com adega vertical e painel de TV em pedra" },
  { url: decorado21.url, alt: "Bancada de trabalho integrada ao quarto, com sala de estar ao fundo" },
  { url: decorado13.url, alt: "Suíte com varanda e vista para a cidade" },
  { url: decorado7.url, alt: "Home office integrado ao quarto com bancada suspensa" },
  { url: decorado14.url, alt: "Quarto com sanca de LED linear e cabideiros de madeira" },
  { url: decorado10.url, alt: "Perspectiva da bancada de trabalho e painel de TV" },
  { url: decorado12.url, alt: "Quarto principal com bancada e nichos laterais" },
  { url: decorado19.url, alt: "Nicho de cafeteria em marcenaria de madeira clara com iluminação embutida" },
  { url: decorado23.url, alt: "Banheiro com pastilhas verticais, bancada em travertino e toalheiro térmico" },
  { url: decorado26.url, alt: "Banheiro com nichos iluminados, espelheira e acabamentos em madeira e travertino" },
];




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
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
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
            <p
              className="mb-4 md:mb-6 text-[10px] md:text-[11px] font-medium uppercase tracking-[0.28em]"
              style={{ color: "hsl(var(--primary-foreground) / 0.72)" }}
            >
              {isMobile ? t("hero.badgeMobile") : t("hero.badgeDesktop")}
            </p>
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
            <a
              href="#tipologias"
              className="w-full sm:w-auto"
              onClick={() => trackGlobal("cta_click", { id: "hero_ctaPrimary", target: "#tipologias", location: "home:hero" })}
            >
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

      {/* DECORADO — galeria em imagens grandes */}
      <section id="decorado" className="border-b border-border/40 bg-background">
        <div className="max-w-7xl mx-auto px-5 md:px-6 py-14 md:py-24">
          <FadeIn>
            <p className="eyebrow mb-3">Decorado</p>
            <h2 className="font-display text-3xl md:text-4xl font-medium text-foreground max-w-2xl tracking-tight">
              Um studio pensado para render mais.
            </h2>
            <p className="mt-3 text-muted-foreground max-w-2xl">
              Projeto de interiores com marcenaria planejada, iluminação cênica e materiais nobres — a base visual que sustenta diárias premium e alta ocupação em short stay.
            </p>
          </FadeIn>

          {/* Mobile: horizontal carousel */}
          <MobileGalleryCarousel
            images={DECORADO_GALLERY}
            onImageClick={(i) => { setLightboxIndex(i); setLightboxOpen(true); }}
          />

          {/* Desktop: large grid */}
          <div className="hidden md:grid mt-10 grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            {DECORADO_GALLERY.map((img, i) => (
              <FadeIn key={img.url} delay={Math.min(i * 0.05, 0.3)} className={i === 0 ? "md:col-span-2" : ""}>
                <figure
                  role="button"
                  tabIndex={0}
                  aria-label={`Ampliar: ${img.alt}`}
                  className="group overflow-hidden rounded-2xl border border-border/60 bg-muted/25 cursor-zoom-in focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  onClick={() => { setLightboxIndex(i); setLightboxOpen(true); }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setLightboxIndex(i);
                      setLightboxOpen(true);
                    }
                  }}
                >
                  <div className={`w-full ${i === 0 ? "aspect-[21/9]" : "aspect-[16/10]"}`}>
                    <BlurImage
                      src={img.url}
                      alt={img.alt}
                      loading="lazy"
                      decoding="async"
                      fetchPriority={i < 2 ? "high" : "low"}
                      width={i === 0 ? 1600 : 800}
                      height={i === 0 ? 686 : 500}
                      sizes={i === 0 ? "(min-width: 768px) 1200px, 100vw" : "(min-width: 768px) 600px, 100vw"}
                      className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
                    />
                  </div>
                </figure>
              </FadeIn>
            ))}
          </div>

          <GalleryLightbox
            images={DECORADO_GALLERY}
            initialIndex={lightboxIndex}
            open={lightboxOpen}
            onOpenChange={setLightboxOpen}
          />
        </div>
      </section>

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

      {/* DADOS DE MERCADO — teaser premium */}
      <section className="border-b border-border/40 bg-muted/25">
        <div className="max-w-7xl mx-auto px-5 md:px-6 py-14 md:py-20">
          <FadeIn>
            <p className="eyebrow mb-3">{t("market.eyebrow")}</p>
            <h2 className="font-display text-3xl md:text-4xl font-medium text-foreground max-w-2xl tracking-tight">{t("market.title")}</h2>
            <p className="mt-3 text-muted-foreground max-w-2xl">{t("market.subtitle")}</p>
          </FadeIn>

          <FadeIn delay={0.08} className="mt-10">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 md:gap-10 max-w-3xl">
              {[
                { v: "900 m", l: t("hero.trust.metro") },
                { v: "33", l: t("hero.trust.units") },
                { v: "1.600 m²", l: t("hero.trust.area") },
              ].map((k) => (
                <div key={k.l}>
                  <p className="font-display text-4xl md:text-5xl font-medium tabular leading-none text-foreground">{k.v}</p>
                  <p className="mt-2 text-xs uppercase tracking-[0.14em] font-medium text-muted-foreground">{k.l}</p>
                </div>
              ))}
            </div>
          </FadeIn>

          <FadeIn delay={0.15} className="mt-10 flex flex-col sm:flex-row gap-3">
            <Link to="/guia-investidor">
              <Button size="lg" className="min-h-[48px] w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground">
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

      {/* ENTORNO — shared component */}
      <div id="comparativo" className="border-b border-border/40 bg-background">
        <div className="max-w-7xl mx-auto px-5 md:px-6 pt-12 md:pt-20">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-accent mb-3">{t("surroundings.eyebrow")}</p>
          <h2 className="font-display text-3xl md:text-4xl font-medium text-foreground max-w-2xl tracking-tight">
            {t("surroundings.title")}
          </h2>
          <p className="mt-3 text-muted-foreground max-w-2xl">{t("surroundings.subtitle")}</p>
          <div className="mt-8">
            <Suspense fallback={<div className="w-full h-[460px] md:h-[540px] rounded-[10px] bg-muted" />}>
              <VilaParkLocationMap />
            </Suspense>
          </div>
        </div>
        <div className="pb-12 md:pb-20" />
      </div>

      {/* ETAPAS — Como funciona a reserva */}
      <section id="etapas" className="border-b border-border/40 bg-background scroll-mt-24">
        <div className="max-w-7xl mx-auto px-5 md:px-6 py-14 md:py-24">
          <FadeIn>
            <p className="eyebrow mb-3">{t("home.etapas.eyebrow")}</p>
            <h2 className="font-display text-3xl md:text-4xl font-medium text-foreground max-w-2xl tracking-tight">
              {t("home.etapas.title")}
            </h2>
            <p className="mt-3 text-muted-foreground max-w-2xl">{t("home.etapas.subtitle")}</p>
          </FadeIn>

          <div className="mt-10 grid gap-0 md:grid-cols-4 md:gap-0 divide-y md:divide-y-0 md:divide-x divide-border/60">
            {(t("home.etapas.items", { returnObjects: true }) as Array<{ title: string; desc: string }>).map((item, i) => (
              <FadeIn key={item.title} delay={i * 0.06} className="p-6 md:px-8 first:pl-0 last:pr-0">
                <p className="font-display text-4xl md:text-5xl font-medium text-accent leading-none tabular">
                  {String(i + 1).padStart(2, "0")}
                </p>
                <h3 className="mt-4 text-base font-semibold text-foreground">{item.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ geral */}
      <section id="faq" className="border-b border-border/40 bg-muted/25 scroll-mt-24">
        <div className="max-w-4xl mx-auto px-5 md:px-6 py-14 md:py-24">
          <FadeIn>
            <p className="eyebrow mb-3">{t("home.faq.eyebrow")}</p>
            <h2 className="font-display text-3xl md:text-4xl font-medium text-foreground tracking-tight">
              {t("home.faq.title")}
            </h2>
          </FadeIn>

          <FadeIn delay={0.1} className="mt-8">
            <Accordion type="single" collapsible className="w-full">
              {(t("home.faq.items", { returnObjects: true }) as Array<{ q: string; a: string }>).map((item, i) => (
                <AccordionItem key={i} value={`faq-${i}`}>
                  <AccordionTrigger className="text-left text-base font-medium">
                    {item.q}
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground leading-relaxed">
                    {item.a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </FadeIn>
        </div>
      </section>

      {/* RESERVA */}
      <section id="reserva" className="border-b border-border/40 bg-background scroll-mt-24">
        <div className="max-w-3xl mx-auto px-5 md:px-6 py-14 md:py-24">
          <FadeIn>
            <p className="eyebrow mb-3">{t("reservation.eyebrow")}</p>
            <h2 className="font-display text-3xl md:text-4xl font-medium text-foreground tracking-tight">
              {t("reservation.title")}
            </h2>
            <p className="mt-3 text-muted-foreground">{t("reservation.subtitle")}</p>
          </FadeIn>
          <FadeIn delay={0.1} className="mt-8">
            <ReservationForm />
          </FadeIn>
        </div>
      </section>

      <SiteFooter />

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
            <a
              href="#reserva"
              className="block"
              onClick={() => trackGlobal("cta_click", { id: "sticky_reserva", target: "#reserva", location: "home:sticky-mobile" })}
            >
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
