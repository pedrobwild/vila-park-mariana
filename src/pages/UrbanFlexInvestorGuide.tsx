import { useEffect, useState, type ReactNode } from "react";
import SiteFooter from "@/components/shared/SiteFooter";
import NeighborhoodSection from "@/components/shared/NeighborhoodSection";
import { WHATSAPP_PHONE } from "@/data/surroundings";
import { motion } from "framer-motion";
import AppNavbar from "@/components/AppNavbar";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  ArrowRight,
  Building2,
  ChevronRight,
  Compass,
  Dumbbell,
  Hammer,
  HeartPulse,
  LayoutGrid,
  MapPin,
  MessageCircle,
  Phone,
  ShieldCheck,
  ShoppingBag,
  Sofa,
  Sprout,
  Store,
  TrainFront,
  Trees,
  UtensilsCrossed,
  Waves,
} from "lucide-react";

type SectionId =
  | "hero"
  | "visao-geral"
  | "tipologias"
  | "diferenciais"
  | "localizacao"
  | "obra"
  | "etapas"
  | "faq"
  | "contato";

type UnitType = {
  id: string;
  title: string;
  blurb: string;
};

const sections: Array<{ id: SectionId; label: string }> = [
  { id: "hero", label: "Início" },
  { id: "visao-geral", label: "Visão geral" },
  { id: "tipologias", label: "Tipologias" },
  { id: "diferenciais", label: "Diferenciais" },
  { id: "localizacao", label: "Localização" },
  { id: "obra", label: "Obra" },
  { id: "etapas", label: "Etapas" },
  { id: "faq", label: "FAQ" },
  { id: "contato", label: "Contato" },
];

const unitTypes: UnitType[] = [
  {
    id: "studio",
    title: "1 dormitório / Studio",
    blurb: "Apartamento compacto e funcional, pensado para o dia a dia com praticidade e boa relação de custo-benefício.",
  },
  {
    id: "garden",
    title: "Apartamento com garden privativo",
    blurb: "Unidade com área externa exclusiva ao nível do jardim, ideal para quem valoriza espaço ao ar livre próprio.",
  },
  {
    id: "terraco",
    title: "Apartamento com terraço descoberto",
    blurb: "Área externa privativa integrada à unidade, perfeita para ampliar o convívio e aproveitar o clima da cidade.",
  },
];

const nearbyByCategory: Array<{ category: string; icon: any; points: { name: string; distance: string }[] }> = [
  {
    category: "Lazer",
    icon: Trees,
    points: [
      { name: "Parque da Aclimação", distance: "950 m" },
      { name: "Museu da Matemática", distance: "1 km" },
      { name: "Comedy Sampa Club", distance: "1,4 km" },
      { name: "SESC", distance: "2,2 km" },
      { name: "Av. Paulista", distance: "2,5 km" },
      { name: "Parque Ibirapuera", distance: "3,1 km" },
      { name: "MASP", distance: "4,2 km" },
    ],
  },
  {
    category: "Mobilidade",
    icon: TrainFront,
    points: [
      { name: "Metrô Vila Mariana", distance: "900 m" },
      { name: "Metrô Ana Rosa", distance: "1,1 km" },
    ],
  },
  {
    category: "Educação",
    icon: Building2,
    points: [
      { name: "FMU", distance: "850 m" },
      { name: "Universidade Belas Artes", distance: "1,5 km" },
      { name: "ESPM", distance: "1,5 km" },
    ],
  },
  {
    category: "Serviços",
    icon: ShoppingBag,
    points: [
      { name: "Drogasil", distance: "500 m" },
      { name: "Smart Fit", distance: "950 m" },
      { name: "Vila das Frutas", distance: "1 km" },
      { name: "Kalunga", distance: "1 km" },
      { name: "Leroy Merlin", distance: "1,9 km" },
      { name: "Shopping Santa Cruz", distance: "2,2 km" },
      { name: "Shopping Paulista", distance: "2,5 km" },
    ],
  },
  {
    category: "Gastronomia",
    icon: UtensilsCrossed,
    points: [
      { name: "Veloso Bar", distance: "700 m" },
      { name: "Quintal do Espeto", distance: "1,8 km" },
      { name: "Bráz Quintal", distance: "2,4 km" },
    ],
  },
];

const faqItems = [
  {
    question: "Onde fica o Vila Park?",
    answer:
      "O empreendimento fica na R. Baltazar Lisboa, 543, no bairro Vila Mariana, em São Paulo, a cerca de 900 metros da estação de metrô Vila Mariana.",
  },
  {
    question: "Quantos apartamentos tem o empreendimento?",
    answer:
      "O Vila Park é uma torre única, com 10 pavimentos e 33 apartamentos, totalizando 1.600 m² de área construída.",
  },
  {
    question: "O apartamento tem vaga de garagem?",
    answer:
      "Não. O empreendimento foi projetado sem vagas de garagem, com foco em mobilidade a pé e por transporte público — a estação de metrô Vila Mariana fica a apenas 900 metros.",
  },
  {
    question: "Quais tipologias estão disponíveis?",
    answer:
      "O Vila Park oferece apartamentos de 1 dormitório/studio, unidades com garden privativo e unidades com terraço descoberto.",
  },
  {
    question: "As áreas comuns já estão prontas?",
    answer:
      "As áreas comuns serão entregues decoradas e mobiliadas, no térreo e no 5º pavimento, para uso imediato dos moradores.",
  },
  {
    question: "Em que fase está a obra?",
    answer:
      "A obra está em andamento, com última atualização registrada em 07/07/2026. Para informações detalhadas sobre o cronograma, fale com a equipe comercial.",
  },
  {
    question: "Como faço para reservar uma unidade?",
    answer:
      "Preencha o formulário de reserva nesta página ou fale com a equipe comercial pelo WhatsApp. O time entrará em contato para apresentar as condições e dar sequência ao processo, conforme o Registro de Incorporação Imobiliária.",
  },
  {
    question: "Posso instalar ar-condicionado no apartamento?",
    answer:
      "Sim. As unidades contam com infraestrutura preparada para instalação de ar-condicionado.",
  },
];

const whatsappLink = `https://api.whatsapp.com/send?phone=${WHATSAPP_PHONE}&text=${encodeURIComponent("Olá! Vi o Guia do Comprador do Vila Park Vila Mariana e quero mais informações.")}`;

function SectionLabel({ children }: { children: ReactNode }) {
  return <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[hsl(var(--accent))]/80 mb-3">{children}</p>;
}

function KpiCard({ value, label, highlight = false }: { value: string; label: string; highlight?: boolean }) {
  return (
    <Card className={cn("card-elevated border-border/60 overflow-hidden", highlight && "border-primary/20 bg-primary/5")}>
      <CardContent className="p-4 sm:p-5">
        <p className={cn(
          "font-display font-bold leading-tight whitespace-nowrap",
          "text-xl sm:text-2xl xl:text-3xl",
          highlight ? "text-primary" : "text-foreground"
        )}>
          {value}
        </p>
        <p className="mt-2 text-sm text-muted-foreground">{label}</p>
      </CardContent>
    </Card>
  );
}

export default function UrbanFlexInvestorGuide() {
  const [activeSection, setActiveSection] = useState<SectionId>("hero");
  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formMessage, setFormMessage] = useState("");

  useEffect(() => {
    document.title = "Guia do Comprador · Vila Park Vila Mariana";
  }, []);

  useEffect(() => {
    const ids = sections.map((section) => section.id);
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

        if (visible?.target?.id) {
          setActiveSection(visible.target.id as SectionId);
        }
      },
      {
        rootMargin: "-20% 0px -55% 0px",
        threshold: [0.15, 0.35, 0.65],
      },
    );

    ids.forEach((id) => {
      const element = document.getElementById(id);
      if (element) observer.observe(element);
    });

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const hash = window.location.hash.replace("#", "");
    if (hash) {
      const t = setTimeout(() => {
        document.getElementById(hash)?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 300);
      return () => clearTimeout(t);
    }
  }, []);

  const scrollTo = (id: SectionId) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const text = `Olá! Quero fazer uma reserva no Vila Park Vila Mariana.%0ANome: ${formName}%0AE-mail: ${formEmail}%0ATelefone: ${formPhone}%0AMensagem: ${formMessage}`;
    window.open(`https://wa.me/5511961007687?text=${text}`, "_blank");
  };

  return (
    <div className="min-h-screen bg-background page-enter">
      <AppNavbar />

      <div className="sticky top-16 z-30 glass-nav border-t border-border/40">
        <div className="max-w-7xl mx-auto px-4 md:px-6 overflow-x-auto scrollbar-none">
          <div className="flex items-center gap-2 min-w-max py-3">
            <span className="font-display font-bold text-base mr-1 shrink-0">Vila Park</span>
            <Separator orientation="vertical" className="h-5 mr-1" />
            {sections.map((section) => (
              <button
                key={section.id}
                type="button"
                onClick={() => scrollTo(section.id)}
                className={cn(
                  "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                  activeSection === section.id
                    ? "bg-[hsl(var(--accent))] text-white"
                    : "bg-transparent text-muted-foreground hover:text-foreground hover:bg-secondary",
                )}
              >
                {section.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <main className="pb-24">
        {/* ═══════ HERO ═══════ */}
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
                  <Badge className="bg-[hsl(var(--accent))]/10 text-[hsl(var(--accent))] border-[hsl(var(--accent))]/20 hover:bg-[hsl(var(--accent))]/10">Vila Park</Badge>
                  <Badge variant="outline">Vila Mariana</Badge>
                  <Badge variant="outline">Guia do Comprador</Badge>
                </div>

                <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold leading-tight text-foreground max-w-4xl">
                  Viva na
                  <span className="text-gradient-premium"> Vila Mariana</span>, a 900 metros do metrô.
                </h1>

                <p className="mt-5 max-w-2xl text-lg text-muted-foreground leading-relaxed">
                  Conheça o Vila Park: torre única com 33 apartamentos, áreas comuns entregues decoradas e mobiliadas,
                  em um dos bairros mais completos de São Paulo para quem busca qualidade de vida e mobilidade.
                </p>

                <div className="mt-8 flex flex-col sm:flex-row gap-3">
                  <Button size="lg" className="min-h-[46px] bg-[hsl(var(--accent))] hover:bg-[hsl(var(--accent-strong))] text-white" onClick={() => scrollTo("contato")}>
                    <ArrowRight className="mr-2 h-4 w-4" />
                    Fazer minha reserva
                  </Button>
                  <Button size="lg" variant="outline" className="min-h-[46px]" onClick={() => window.open(whatsappLink, "_blank")}>
                    <MessageCircle className="mr-2 h-4 w-4" />
                    Falar com a equipe
                  </Button>
                </div>

                <div className="mt-10 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <KpiCard value="R. Baltazar Lisboa, 543" label="Endereço · Vila Mariana" />
                  <KpiCard value="33 apartamentos" label="Torre única · 10 pavimentos" />
                  <KpiCard value="900 m" label="Do metrô Vila Mariana" highlight />
                  <KpiCard value="1.600 m²" label="Área construída" />
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.55, delay: 0.1 }}
              >
                <Card className="card-elevated overflow-hidden border-primary/10">
                  <CardHeader className="pb-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <CardTitle className="text-2xl">Por que morar aqui</CardTitle>
                        <CardDescription className="mt-2">
                          Os fundamentos que tornam o Vila Park uma boa escolha para morar.
                        </CardDescription>
                      </div>
                      <ShieldCheck className="h-8 w-8 text-primary" />
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    {[
                      "Localização na Vila Mariana, a 900m do metrô, com fácil acesso a educação, saúde, comércio e lazer.",
                      "Preço acessível para um bairro consolidado e bem servido de infraestrutura urbana.",
                      "Áreas comuns entregues decoradas e mobiliadas, no térreo e no 5º pavimento, prontas para uso.",
                      "Arquitetura contemporânea e infraestrutura preparada para ar-condicionado nas unidades.",
                    ].map((item) => (
                      <div key={item} className="flex items-start gap-3 rounded-xl border border-border/60 p-4">
                        <div className="mt-1 h-2.5 w-2.5 rounded-full bg-primary" />
                        <p className="text-sm leading-relaxed text-foreground">{item}</p>
                      </div>
                    ))}

                    <div className="rounded-xl border border-dashed border-primary/25 bg-primary/5 p-4">
                      <p className="text-sm font-medium text-foreground">
                        Este guia reúne as informações mais relevantes para você conhecer o empreendimento e dar o
                        próximo passo rumo à sua reserva.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </div>
          </div>
        </section>

        {/* ═══════ VISÃO GERAL ═══════ */}
        <section id="visao-geral" className="scroll-mt-32">
          <div className="max-w-7xl mx-auto px-4 md:px-6 py-16 md:py-20">
            <SectionLabel>Visão geral</SectionLabel>
            <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
              <div>
                <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground">
                  Um novo jeito de morar na Vila Mariana, com praticidade do início ao fim.
                </h2>
                <p className="mt-4 text-muted-foreground leading-relaxed">
                  O Vila Park é desenvolvido pela Matere Bittar Incorporações e foi pensado para quem busca morar bem,
                  perto de tudo e com o conforto de áreas comuns já decoradas e mobiliadas para o dia a dia.
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                {[
                  {
                    icon: MapPin,
                    title: "Localização estratégica",
                    text: "Vila Mariana é um dos bairros mais completos de São Paulo, com fácil acesso a metrô, escolas, comércio e lazer.",
                  },
                  {
                    icon: LayoutGrid,
                    title: "Tipologias variadas",
                    text: "Apartamentos de 1 dormitório/studio, com garden privativo ou com terraço descoberto, para diferentes estilos de vida.",
                  },
                  {
                    icon: Sofa,
                    title: "Áreas comuns prontas",
                    text: "Térreo e 5º pavimento entregues decorados e mobiliados, para você aproveitar desde o primeiro dia.",
                  },
                  {
                    icon: Hammer,
                    title: "Obra em andamento",
                    text: "Acompanhe o avanço da construção e converse com a equipe comercial para saber mais sobre o cronograma.",
                  },
                ].map((item) => (
                  <Card key={item.title} className="card-elevated h-full border-border/60">
                    <CardContent className="p-5">
                      <item.icon className="h-5 w-5 text-primary mb-3" />
                      <h3 className="font-semibold text-foreground mb-2">{item.title}</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">{item.text}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ═══════ TIPOLOGIAS ═══════ */}
        <section id="tipologias" className="scroll-mt-32 bg-muted/25 border-y border-border/40">
          <div className="max-w-7xl mx-auto px-4 md:px-6 py-16 md:py-20">
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between mb-8">
              <div>
                <SectionLabel>Tipologias</SectionLabel>
                <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground">Escolha a planta que combina com o seu jeito de morar</h2>
                <p className="mt-3 text-muted-foreground max-w-2xl">
                  O Vila Park oferece diferentes tipologias para atender a diferentes perfis de moradores.
                </p>
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
              {unitTypes.map((unit) => (
                <Card key={unit.id} className="card-elevated h-full border-border/60">
                  <CardContent className="p-5 flex h-full flex-col">
                    <h3 className="text-xl font-semibold text-foreground">{unit.title}</h3>
                    <p className="mt-4 text-sm text-muted-foreground leading-relaxed">{unit.blurb}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="mt-8 flex flex-col sm:flex-row gap-3">
              <Button size="lg" variant="outline" className="min-h-[46px]" onClick={() => window.open(whatsappLink, "_blank")}>
                Solicitar plantas detalhadas
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        </section>

        {/* ═══════ DIFERENCIAIS ═══════ */}
        <section id="diferenciais" className="scroll-mt-32">
          <div className="max-w-7xl mx-auto px-4 md:px-6 py-16 md:py-20">
            <SectionLabel>Diferenciais</SectionLabel>
            <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-8">O que faz do Vila Park uma boa escolha</h2>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[
                { icon: Store, title: "Preço acessível", text: "Uma oportunidade de morar na Vila Mariana com um investimento inicial mais acessível." },
                { icon: TrainFront, title: "Mobilidade", text: "A 900 metros da estação de metrô Vila Mariana, facilitando o deslocamento pela cidade." },
                { icon: Sofa, title: "Lazer decorado e equipado", text: "Áreas comuns entregues decoradas e mobiliadas, no térreo e no 5º pavimento." },
                { icon: Building2, title: "Arquitetura contemporânea", text: "Projeto com identidade visual moderna, pensado para o morador atual." },
                { icon: Dumbbell, title: "Infraestrutura para ar-condicionado", text: "Unidades preparadas para receber instalação de ar-condicionado." },
                { icon: Sprout, title: "Garden e terraço privativos", text: "Opções de plantas com área externa exclusiva para quem busca mais espaço ao ar livre." },
              ].map((item) => (
                <Card key={item.title} className="card-elevated h-full border-border/60">
                  <CardContent className="p-5">
                    <item.icon className="h-5 w-5 text-primary mb-3" />
                    <h3 className="font-semibold text-foreground mb-2">{item.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{item.text}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* ═══════ LOCALIZAÇÃO — shared ═══════ */}
        <section id="localizacao" className="scroll-mt-32 bg-muted/25 border-y border-border/40">
          <NeighborhoodSection variant="full" />
        </section>

        {/* ═══════ OBRA ═══════ */}
        <section id="obra" className="scroll-mt-32">
          <div className="max-w-7xl mx-auto px-4 md:px-6 py-16 md:py-20">
            <SectionLabel>Obra</SectionLabel>
            <div className="grid gap-6 lg:grid-cols-2">
              <Card className="card-elevated border-border/60">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3">
                    <Hammer className="h-8 w-8 text-primary" />
                    <div>
                      <p className="text-sm uppercase tracking-[0.18em] text-muted-foreground">Situação</p>
                      <p className="font-display text-2xl font-bold text-foreground">Obra em andamento</p>
                    </div>
                  </div>
                  <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
                    Última atualização registrada em 07/07/2026. Para informações detalhadas sobre o cronograma de
                    obra, fale diretamente com a equipe comercial.
                  </p>
                </CardContent>
              </Card>

              <Card className="card-elevated border-border/60">
                <CardHeader>
                  <CardTitle className="text-2xl">Sobre a incorporadora</CardTitle>
                  <CardDescription>Matere Bittar Incorporações</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Responsável pelo desenvolvimento do Vila Park, empreendimento residencial de torre única na Vila
                    Mariana, com 10 pavimentos e 33 apartamentos.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Inteligência de mercado removida — pertence ao Guia do Investidor */}

        {/* ═══════ ETAPAS ATÉ A RESERVA ═══════ */}
        <section id="etapas" className="scroll-mt-32">
          <div className="max-w-7xl mx-auto px-4 md:px-6 py-16 md:py-20">
            <SectionLabel>Etapas até a reserva</SectionLabel>
            <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-8">Como funciona o processo</h2>

            <div className="grid gap-4 md:grid-cols-4">
              {[
                { step: "1", title: "Preencha o formulário", text: "Envie seus dados de contato pelo formulário desta página." },
                { step: "2", title: "Fale com o time comercial", text: "Nossa equipe entra em contato para tirar dúvidas e apresentar as condições." },
                { step: "3", title: "Registro de Incorporação", text: "A comercialização segue conforme o Registro de Incorporação Imobiliária." },
                { step: "4", title: "Contrato", text: "Com tudo alinhado, seguimos para a formalização do contrato de compra." },
              ].map((item) => (
                <Card key={item.step} className="card-elevated h-full border-border/60">
                  <CardContent className="p-5">
                    <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-display font-bold mb-3">
                      {item.step}
                    </div>
                    <h3 className="font-semibold text-foreground mb-2">{item.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{item.text}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* ═══════ FAQ ═══════ */}
        <section id="faq" className="scroll-mt-32 bg-muted/25 border-y border-border/40">
          <div className="max-w-4xl mx-auto px-4 md:px-6 py-16 md:py-20">
            <SectionLabel>FAQ</SectionLabel>
            <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-8">Perguntas frequentes</h2>

            <Card className="card-elevated border-border/60">
              <CardContent className="p-0">
                <Accordion type="single" collapsible className="px-6">
                  {faqItems.map((item, index) => (
                    <AccordionItem key={item.question} value={`item-${index}`}>
                      <AccordionTrigger className="text-left text-base">{item.question}</AccordionTrigger>
                      <AccordionContent className="text-sm text-muted-foreground leading-relaxed">
                        {item.answer}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* ═══════ CTA FINAL / FORMULÁRIO ═══════ */}
        <section id="contato" className="scroll-mt-32 border-t border-border/40">
          <div className="max-w-7xl mx-auto px-4 md:px-6 py-16 md:py-20">
            <Card className="overflow-hidden border-primary/15 bg-hero-gradient-subtle">
              <CardContent className="p-8 md:p-10">
                <div className="grid gap-8 lg:grid-cols-[1fr_1fr] lg:items-start">
                  <div>
                    <SectionLabel>Próximo passo</SectionLabel>
                    <h2 className="font-display text-3xl md:text-5xl font-bold text-foreground max-w-3xl">
                      Faça sua reserva no Vila Park
                    </h2>
                    <p className="mt-4 text-lg text-muted-foreground max-w-2xl leading-relaxed">
                      Preencha o formulário ao lado ou fale com a equipe comercial para tirar dúvidas, conhecer as
                      tipologias disponíveis e dar o próximo passo.
                    </p>

                    <div className="mt-8 flex flex-col sm:flex-row gap-3">
                      <Button size="lg" className="min-h-[48px] bg-[hsl(var(--accent))] hover:bg-[hsl(var(--accent-strong))] text-white" onClick={() => window.open(whatsappLink, "_blank")}>
                        <MessageCircle className="mr-2 h-4 w-4" />
                        Falar com a equipe comercial
                      </Button>
                      <Button size="lg" variant="outline" className="min-h-[48px]" onClick={() => window.location.href = "tel:+5511961007687"}>
                        <Phone className="mr-2 h-4 w-4" />
                        Ligar agora
                      </Button>
                    </div>
                  </div>

                  <Card className="border-border/60 bg-background/90 backdrop-blur-sm">
                    <CardContent className="p-5">
                      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground mb-4">Formulário de reserva</p>
                      <form className="space-y-3" onSubmit={handleSubmit}>
                        <Input
                          placeholder="Nome"
                          value={formName}
                          onChange={(e) => setFormName(e.target.value)}
                          required
                        />
                        <Input
                          type="email"
                          placeholder="E-mail"
                          value={formEmail}
                          onChange={(e) => setFormEmail(e.target.value)}
                          required
                        />
                        <Input
                          type="tel"
                          placeholder="Telefone"
                          value={formPhone}
                          onChange={(e) => setFormPhone(e.target.value)}
                          required
                        />
                        <Textarea
                          placeholder="Mensagem"
                          value={formMessage}
                          onChange={(e) => setFormMessage(e.target.value)}
                          rows={4}
                        />
                        <Button type="submit" className="w-full min-h-[46px] bg-[hsl(var(--accent))] hover:bg-[hsl(var(--accent-strong))] text-white">
                          Enviar
                        </Button>
                      </form>
                    </CardContent>
                  </Card>
                </div>
              </CardContent>
            </Card>

            <p className="mt-10 text-xs text-muted-foreground leading-relaxed max-w-4xl">
              Apenas para reserva. O empreendimento só será comercializado após o Registro de Incorporação Imobiliária.
              Imagens ilustrativas sujeitas a alterações. As plantas apresentadas são meramente ilustrativas, sendo que
              a decoração é apenas uma sugestão. Os móveis e utensílios contemplados não farão parte do contrato de
              compra e venda do imóvel. Os acabamentos serão entregues conforme o memorial descritivo.
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
