import { useEffect, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import MarketIntelSection from "@/components/MarketIntelSection";
import AppNavbar from "@/components/AppNavbar";
import InvestorQuizCard from "@/components/investor/InvestorQuizCard";
import InvestorSimulator from "@/components/investor/InvestorSimulator";
import EventsCalendar from "@/components/insights/EventsCalendar";
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
  Calendar,
  CheckCircle2,
  Compass,
  Dumbbell,
  GraduationCap,
  KeyRound,
  MessageCircle,
  Quote,
  Ruler,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Sofa,
  Target,
  Train,
  Trees,
  TrendingUp,
  Utensils,
} from "lucide-react";

type SectionId =
  | "hero"
  | "diagnostico"
  | "tese"
  | "location"
  | "nearby"
  | "typologies"
  | "matematica"
  | "simulador"
  | "avaliar"
  | "eventos"
  | "amenities"
  | "confianca"
  | "faq"
  | "cta";

const sectionIds: SectionId[] = [
  "hero",
  "diagnostico",
  "tese",
  "location",
  "nearby",
  "typologies",
  "matematica",
  "simulador",
  "avaliar",
  "eventos",
  "amenities",
  "confianca",
  "faq",
  "cta",
];

const sectionLabels: Record<SectionId, string> = {
  hero: "Início",
  diagnostico: "Diagnóstico",
  tese: "Tese",
  location: "Localização",
  nearby: "Entorno",
  typologies: "Tipologias",
  matematica: "Retorno",
  simulador: "Simulador",
  avaliar: "Avaliar",
  eventos: "Eventos",
  amenities: "Áreas comuns",
  confianca: "Confiança",
  faq: "FAQ",
  cta: "Falar",
};

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-accent mb-3">{children}</p>
  );
}

function KpiCard({
  value,
  label,
  highlight = false,
}: {
  value: string;
  label: string;
  highlight?: boolean;
}) {
  return (
    <Card
      className={cn(
        "card-elevated border-border/60 overflow-hidden",
        highlight && "border-accent/30 bg-accent/5",
      )}
    >
      <CardContent className="p-4 sm:p-5">
        <p
          className={cn(
            "font-display font-bold leading-tight",
            "text-xl sm:text-2xl xl:text-3xl",
            highlight ? "text-accent" : "text-foreground",
          )}
        >
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

  // Deep link via hash
  useEffect(() => {
    const hash = window.location.hash.replace("#", "") as SectionId;
    if (hash && sectionIds.includes(hash)) {
      setTimeout(() => document.getElementById(hash)?.scrollIntoView({ behavior: "smooth", block: "start" }), 150);
    }
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible?.target?.id) {
          const id = visible.target.id as SectionId;
          setActiveSection(id);
          if (window.location.hash !== `#${id}`) {
            window.history.replaceState(null, "", `#${id}`);
          }
        }
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

  const typologyCards = [{ key: "studio" }, { key: "garden" }, { key: "terrace" }];

  const teseItems = [
    {
      icon: Train,
      title: "Bairro consolidado com mobilidade real",
      text: "Vila Mariana está a 900 m do metrô e a 2,5 km da Av. Paulista — um dos corredores de emprego mais líquidos de SP.",
    },
    {
      icon: GraduationCap,
      title: "Demanda educacional recorrente",
      text: "FMU, Belas Artes e ESPM concentram estudantes e professores que buscam locação próxima o ano todo.",
    },
    {
      icon: Building2,
      title: "Produto residencial escasso e novo",
      text: "Torre única com 33 unidades — oferta reduzida em uma região onde o estoque de novos residenciais é limitado.",
    },
    {
      icon: Sofa,
      title: "Áreas comuns entregues equipadas",
      text: "Térreo e 5º pavimento decorados e mobiliados na entrega, reduzindo custo de preparação para locação.",
    },
  ];

  const matematicaItems = [
    {
      icon: Calculator,
      title: "Investimento total",
      text: "Preço da unidade + capex de mobília/enxoval. Considere reserva para custos de aquisição (ITBI, registro, escritura).",
    },
    {
      icon: TrendingUp,
      title: "Receita líquida mensal",
      text: "Aluguel ou diária × ocupação, menos condomínio, IPTU, plataforma (~18%) e limpeza/gestão (~12% no short stay).",
    },
    {
      icon: Target,
      title: "Yield anual",
      text: "Receita líquida anual ÷ investimento total. Compare com CDI/IPCA + spread do imobiliário na região.",
    },
    {
      icon: Ruler,
      title: "Payback e valorização",
      text: "Tempo para recuperar o investimento com renda + potencial de valorização do imóvel entre planta e entrega.",
    },
  ];

  const avaliarItems = [
    "Distância real até metrô, faculdades e polos de emprego (não em linha reta).",
    "Andar, orientação solar e vista — impactam diária e velocidade de locação.",
    "Área privativa útil vs. área total anunciada.",
    "Condomínio previsto por m² e taxas extras (fundo de obra, reserva).",
    "Regras internas para locação por temporada (convenção do condomínio).",
    "Prazo de entrega e histórico da incorporadora responsável.",
    "Presença de infra para ar-condicionado, gás encanado e pontos de rede.",
    "Comparáveis (asking price e locação realizada) em raio de 1 km.",
  ];

  const trustSignals = [
    { icon: Building2, label: "Torre única, 33 unidades", note: "Oferta enxuta em região consolidada." },
    { icon: Sofa, label: "Áreas comuns equipadas", note: "Térreo e 5º pav. entregues decorados." },
    { icon: Train, label: "900 m do metrô", note: "Linha 1-Azul, Vila Mariana." },
    { icon: ShieldCheck, label: "Matere Bittar Incorporações", note: "Incorporadora responsável pelo empreendimento." },
  ];

  const faqKeys = ["q1", "q2", "q3", "q4", "q5"];

  const extraFaq = [
    {
      q: "Aluguel tradicional ou temporada — qual rende mais na Vila Mariana?",
      a: "Depende do perfil de gestão e da convenção do condomínio. Temporada tende a ter diárias maiores, mas custos operacionais (plataforma, limpeza) e vacância também são maiores. O simulador acima permite comparar ambos os cenários com os seus próprios números.",
    },
    {
      q: "Qual o custo médio de mobiliar uma unidade?",
      a: "Para studios e 1 dormitório na Vila Mariana, o capex de mobília e enxoval costuma variar entre R$ 25 mil (essencial), R$ 55 mil (premium) e R$ 95 mil+ (signature). Quanto maior o padrão do enxoval, maior a diária suportada — mas também o tempo de payback do capex.",
    },
    {
      q: "Como avalio se o preço da unidade está em linha com o mercado?",
      a: "Compare o preço por m² privativo com anúncios ativos e transações recentes em raio de 1 km, priorizando lançamentos com padrão de acabamento equivalente. Descontos por ausência de vaga são normais em produtos como o Vila Park.",
    },
    {
      q: "Preciso ter CNPJ para operar temporada?",
      a: "Não é obrigatório para começar, mas dependendo do volume e da estratégia tributária, a operação via PJ (Lucro Presumido) costuma ser mais eficiente. Consulte seu contador para modelar tributação e proteção patrimonial.",
    },
    {
      q: "O que muda no meu retorno se eu comprar na planta vs. pronto?",
      a: "Comprar na planta costuma envolver preço menor por m² e potencial de valorização até a entrega, com contrapartida de tempo sem renda e risco de execução. Pronto entrega renda imediata, mas com preço mais alto e sem ganho de curva.",
    },
  ];

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
                {sectionLabels[id]}
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
                  <Button
                    size="lg"
                    className="min-h-[46px] bg-accent hover:bg-accent/90 text-accent-foreground"
                    onClick={() => scrollTo("diagnostico")}
                  >
                    <Sparkles className="mr-2 h-4 w-4" />
                    Fazer diagnóstico do investidor
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
                  <KpiCard value="900 m" label="Metrô Vila Mariana" highlight />
                  <KpiCard value="850 m" label="FMU (universidade)" />
                  <KpiCard value="2,5 km" label="Av. Paulista" />
                  <KpiCard value="950 m" label="Parque da Aclimação" />
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

        {/* DIAGNÓSTICO — QUIZ */}
        <section id="diagnostico" className="scroll-mt-32">
          <div className="max-w-4xl mx-auto px-4 md:px-6 py-16 md:py-20">
            <SectionLabel>Diagnóstico do investidor</SectionLabel>
            <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-3">
              Descubra a tipologia do Vila Park mais alinhada ao seu perfil.
            </h2>
            <p className="text-muted-foreground mb-8 max-w-2xl">
              Quatro perguntas rápidas sobre objetivo, estratégia e tolerância a risco. Ao final, você vai direto
              para o simulador com a tipologia sugerida pré-selecionada.
            </p>
            <InvestorQuizCard onResult={(id) => setPreferredTypoId(id)} />
          </div>
        </section>

        {/* TESE COMERCIAL */}
        <section id="tese" className="scroll-mt-32 bg-muted/25 border-y border-border/40">
          <div className="max-w-7xl mx-auto px-4 md:px-6 py-16 md:py-20">
            <SectionLabel>Tese de investimento</SectionLabel>
            <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-3 max-w-3xl">
              Por que o Vila Park faz sentido para investidores em 2026.
            </h2>
            <p className="text-muted-foreground max-w-2xl mb-8">
              Quatro pilares objetivos que sustentam a compra da unidade como ativo de renda e valorização em uma
              das regiões mais estáveis da capital.
            </p>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {teseItems.map((item) => (
                <Card key={item.title} className="card-elevated border-border/60 h-full">
                  <CardContent className="p-5">
                    <div className="h-10 w-10 rounded-xl bg-accent/10 flex items-center justify-center mb-3">
                      <item.icon className="h-5 w-5 text-accent" />
                    </div>
                    <h3 className="font-semibold text-foreground mb-2">{item.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{item.text}</p>
                  </CardContent>
                </Card>
              ))}
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

        {/* ENTORNO */}
        <section id="nearby" className="scroll-mt-32 bg-muted/25 border-y border-border/40">
          <div className="max-w-7xl mx-auto px-4 md:px-6 py-16 md:py-20">
            <SectionLabel>Entorno estratégico</SectionLabel>
            <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-3 max-w-3xl">
              A Vila Mariana joga a favor da sua locação.
            </h2>
            <p className="text-muted-foreground max-w-2xl mb-8">
              Bairro consolidado, com metrô, universidades, polo de empregos e lazer no raio de caminhada — fatores
              que sustentam a demanda por moradia.
            </p>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[
                { icon: Train, title: "Mobilidade", items: POIS.filter((p) => p.category === "mobility") },
                { icon: GraduationCap, title: "Universidades", items: POIS.filter((p) => p.category === "education") },
                { icon: Trees, title: "Parques e lazer", items: POIS.filter((p) => p.category === "leisure").slice(0, 4) },
                { icon: ShoppingBag, title: "Serviços e compras", items: POIS.filter((p) => p.category === "services").slice(0, 5) },
                { icon: Utensils, title: "Gastronomia", items: POIS.filter((p) => p.category === "gastronomy") },
                {
                  icon: Briefcase,
                  title: "Polo de empregos",
                  items: [
                    { name: "Av. Paulista", distance: "2,5 km" },
                    { name: "Região da Paulista", distance: "corredor de escritórios" },
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
                        <li
                          key={item.name}
                          className="flex items-start justify-between gap-3 text-sm border-b border-border/40 pb-2 last:border-0 last:pb-0"
                        >
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
              <p className="text-sm text-foreground leading-relaxed">
                <strong>Por que isso importa para renda:</strong> imóveis próximos a metrô, universidades e polos de
                emprego historicamente apresentam menor vacância e giro mais rápido de inquilinos — perfil compatível
                com o produto Vila Park.
              </p>
            </div>
          </div>
        </section>

        {/* TIPOLOGIAS */}
        <section id="typologies" className="scroll-mt-32">
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
                        Simular retorno
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

        {/* MATEMÁTICA DO RETORNO */}
        <section id="matematica" className="scroll-mt-32 bg-muted/25 border-y border-border/40">
          <div className="max-w-7xl mx-auto px-4 md:px-6 py-16 md:py-20">
            <SectionLabel>Matemática do retorno</SectionLabel>
            <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-3 max-w-3xl">
              Como pensar retorno de forma honesta — sem promessas.
            </h2>
            <p className="text-muted-foreground max-w-2xl mb-8">
              Antes de rodar o simulador, entenda os quatro blocos que compõem qualquer análise de investimento em
              renda imobiliária.
            </p>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {matematicaItems.map((item) => (
                <Card key={item.title} className="card-elevated border-border/60 h-full">
                  <CardContent className="p-5">
                    <div className="h-10 w-10 rounded-xl bg-accent/10 flex items-center justify-center mb-3">
                      <item.icon className="h-5 w-5 text-accent" />
                    </div>
                    <h3 className="font-semibold text-foreground mb-2">{item.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{item.text}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* SIMULADOR */}
        <section id="simulador" className="scroll-mt-32">
          <div className="max-w-5xl mx-auto px-4 md:px-6 py-16 md:py-20">
            <SectionLabel>Simulador do investidor</SectionLabel>
            <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-3">
              Rode o cenário com os seus números.
            </h2>
            <p className="text-muted-foreground mb-8 max-w-2xl">
              Compare aluguel tradicional vs. temporada, ajuste o padrão de mobília e veja yield, payback e receita
              líquida em tempo real. Valores oficiais devem ser confirmados com o time de vendas.
            </p>
            <InvestorSimulator initialTypologyId={preferredTypoId} />
          </div>
        </section>

        {/* COMO AVALIAR O ATIVO */}
        <section id="avaliar" className="scroll-mt-32 bg-muted/25 border-y border-border/40">
          <div className="max-w-5xl mx-auto px-4 md:px-6 py-16 md:py-20">
            <SectionLabel>Como avaliar o ativo</SectionLabel>
            <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-3 max-w-3xl">
              Checklist do investidor antes de bater o martelo.
            </h2>
            <p className="text-muted-foreground max-w-2xl mb-8">
              Uma boa unidade é escolhida por critérios objetivos. Use este checklist na visita ao stand e na
              análise da tabela.
            </p>

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

        {/* EVENTOS & DEMANDA */}
        <section id="eventos" className="scroll-mt-32">
          <div className="max-w-7xl mx-auto px-4 md:px-6 py-16 md:py-20">
            <SectionLabel>Eventos & demanda</SectionLabel>
            <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-3 max-w-3xl">
              Calendário de eventos que aquece a locação em SP.
            </h2>
            <p className="text-muted-foreground max-w-2xl mb-8">
              Feiras, congressos e shows internacionais concentram picos de demanda por temporada. Vila Mariana está
              a poucos minutos do Ibirapuera, Anhembi e da Paulista.
            </p>
            <EventsCalendar
              regionLabel="Vila Mariana"
              title="Eventos em SP × demanda de locação"
              subtitle="Eventos confirmados e previstos em São Paulo (2025–2027) e como cada um pode impactar a demanda por temporada na Vila Mariana."
            />
          </div>
        </section>

        {/* ÁREAS COMUNS */}
        <section id="amenities" className="scroll-mt-32 bg-muted/25 border-y border-border/40">
          <div className="max-w-7xl mx-auto px-4 md:px-6 py-16 md:py-20">
            <SectionLabel>Áreas comuns entregues equipadas</SectionLabel>
            <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-3 max-w-3xl">
              Térreo e 5º pavimento decorados e mobiliados na entrega.
            </h2>
            <p className="text-muted-foreground max-w-2xl mb-8">
              Áreas comuns finalizadas reduzem o custo de preparação do imóvel para locação e melhoram a percepção
              de valor do inquilino desde a visita.
            </p>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {[
                { icon: Sofa, title: "Lazer decorado", text: "Espaços mobiliados no térreo e no 5º pavimento, entregues prontos para uso." },
                { icon: Building2, title: "Lobby de entrada", text: "Portaria e recepção que reforçam a percepção de padrão do empreendimento." },
                { icon: Dumbbell, title: "Infraestrutura de lazer", text: "Áreas de convivência que ampliam o apelo do apartamento para o inquilino." },
                { icon: ShieldCheck, title: "Infra para ar-condicionado", text: "Preparação técnica na unidade — um item a menos para o proprietário resolver." },
              ].map((a) => (
                <Card key={a.title} className="card-elevated border-border/60 h-full">
                  <CardContent className="p-5">
                    <div className="h-10 w-10 rounded-xl bg-accent/10 flex items-center justify-center mb-3">
                      <a.icon className="h-5 w-5 text-accent" />
                    </div>
                    <h3 className="font-semibold text-foreground mb-2">{a.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{a.text}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            <p className="mt-6 text-xs text-muted-foreground">
              Imagens e descrições ilustrativas. A decoração é apenas uma sugestão — móveis e utensílios não integram
              o contrato de compra e venda.
            </p>
          </div>
        </section>

        {/* MARKET */}
        <section id="market" className="scroll-mt-32">
          <div className="max-w-7xl mx-auto px-4 md:px-6 py-16 md:py-20">
            <SectionLabel>{t("investorGuide.market.eyebrow")}</SectionLabel>
            <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">
              {t("investorGuide.market.title")}
            </h2>
            <MarketIntelSection />
          </div>
        </section>

        {/* CONFIANÇA */}
        <section id="confianca" className="scroll-mt-32 bg-muted/25 border-y border-border/40">
          <div className="max-w-7xl mx-auto px-4 md:px-6 py-16 md:py-20">
            <SectionLabel>Sinais de confiança</SectionLabel>
            <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-3 max-w-3xl">
              Um produto de raiz, em um bairro de raiz.
            </h2>
            <p className="text-muted-foreground max-w-2xl mb-8">
              Elementos que reduzem a assimetria de informação típica de um lançamento e ajudam o investidor a
              qualificar a decisão.
            </p>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
              {trustSignals.map((s) => (
                <Card key={s.label} className="card-elevated border-border/60 h-full">
                  <CardContent className="p-5">
                    <div className="h-10 w-10 rounded-xl bg-accent/10 flex items-center justify-center mb-3">
                      <s.icon className="h-5 w-5 text-accent" />
                    </div>
                    <p className="font-semibold text-foreground">{s.label}</p>
                    <p className="text-sm text-muted-foreground mt-1">{s.note}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card className="card-elevated border-accent/20 bg-accent/5">
              <CardContent className="p-5 md:p-7">
                <Quote className="h-6 w-6 text-accent mb-3" />
                <p className="font-display text-lg md:text-xl text-foreground leading-relaxed">
                  “A Vila Mariana combina três fatores raros em São Paulo: metrô, universidades e bairro residencial
                  consolidado. Isso segura preço e reduz a chance de vacância prolongada.”
                </p>
                <p className="mt-3 text-sm text-muted-foreground">
                  Observação de mercado — não constitui recomendação de investimento.
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="scroll-mt-32">
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
                  {extraFaq.map((f, i) => (
                    <AccordionItem key={`extra-${i}`} value={`extra-${i}`}>
                      <AccordionTrigger className="text-left text-base">{f.q}</AccordionTrigger>
                      <AccordionContent className="text-sm text-muted-foreground leading-relaxed">
                        {f.a}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* CTA FINAL */}
        <section id="cta" className="scroll-mt-32 bg-hero-gradient-subtle border-y border-border/40">
          <div className="max-w-4xl mx-auto px-4 md:px-6 py-16 md:py-20 text-center">
            <Badge className="bg-accent/10 text-accent border-accent/20 hover:bg-accent/10 mb-4">
              Vila Park · Vila Mariana
            </Badge>
            <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">
              Pronto para conversar sobre a sua unidade?
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto mb-8">
              Fale com o time de vendas para receber tabela, disponibilidade por andar e condições de pagamento
              atualizadas.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button
                size="lg"
                className="min-h-[46px] bg-accent hover:bg-accent/90 text-accent-foreground"
                onClick={() => window.open(whatsappLink, "_blank")}
              >
                <MessageCircle className="mr-2 h-4 w-4" />
                Falar no WhatsApp
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="min-h-[46px]"
                onClick={() => scrollTo("simulador")}
              >
                <Calculator className="mr-2 h-4 w-4" />
                Voltar ao simulador
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
