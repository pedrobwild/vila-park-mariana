import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import {
  CheckCircle2, Clock, Shield, TrendingUp, Hammer,
  Phone, ArrowRight, Star, CalendarCheck, Paintbrush,
  Package, ChevronRight, MessageCircle, Building2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import AppNavbar from "@/components/AppNavbar";
import reformaImg from "@/assets/reforma-antes-depois.jpg";

const whatsappLink =
  "https://wa.me/5591984804821?text=Olá!%20Sou%20corretor%20e%20quero%20saber%20mais%20sobre%20a%20parceria%20BWild.";

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

/* ─── Timeline steps ─── */
const TIMELINE = [
  { step: 1, icon: CalendarCheck, title: "Assinatura", desc: "Contrato fechado. BWild inicia o projeto em até 5 dias úteis.", days: "Dia 0" },
  { step: 2, icon: Paintbrush, title: "Projeto & Materiais", desc: "Design de interiores, especificação de materiais e cronograma aprovados pelo proprietário.", days: "Semana 1–2" },
  { step: 3, icon: Hammer, title: "Obra Completa", desc: "Execução com equipe própria. Acompanhamento por fotos e relatórios semanais.", days: "Semana 3–8" },
  { step: 4, icon: Package, title: "Entrega Mobiliada", desc: "Studio pronto para fotografar e anunciar. Chave na mão do proprietário.", days: "Semana 9–10" },
];

/* ─── Objections ─── */
const OBJECTIONS = [
  { objection: "\"Não tenho tempo para acompanhar obra\"", answer: "A BWild gerencia 100% da reforma — o proprietário só aprova o projeto e recebe a chave.", icon: Clock },
  { objection: "\"Não conheço bons profissionais\"", answer: "Equipe própria e fornecedores homologados pela incorporadora. Sem surpresas.", icon: Shield },
  { objection: "\"Tenho medo de estourar o orçamento\"", answer: "Preço fechado no contrato. Se algo mudar no escopo, é aprovado antes.", icon: CheckCircle2 },
  { objection: "\"Não sei se o investimento vale a pena\"", answer: "Studios reformados pela BWild rendem de 30% a 50% mais em diária do que unidades cruas.", icon: TrendingUp },
];

/* ─── Testimonials ─── */
const TESTIMONIALS = [
  { name: "Ricardo M.", role: "Investidor — 2 studios", quote: "Comprei os dois studios e a BWild entregou em 8 semanas. Já estou com 78% de ocupação no primeiro mês.", stars: 5 },
  { name: "Patrícia L.", role: "Primeira compra", quote: "Tinha medo de obra. A BWild resolveu tudo e eu nem precisei ir ao apartamento até a entrega.", stars: 5 },
  { name: "Carlos A.", role: "Investidor — 4 studios", quote: "O retorno foi 40% acima do que eu teria sem a reforma. Já fechei mais duas unidades.", stars: 5 },
];

/* ─── Investment numbers ─── */
const NUMBERS = [
  { label: "Investimento médio na reforma", value: "R$ 45–65 mil", sub: "dependendo da tipologia" },
  { label: "Prazo de entrega", value: "8–10 semanas", sub: "com mobília e decoração" },
  { label: "Aumento na diária", value: "+30% a +50%", sub: "vs unidade sem reforma" },
  { label: "Payback da reforma", value: "12–18 meses", sub: "com ocupação acima de 65%" },
];

export default function CorretorPage() {
  return (
    <div className="min-h-screen bg-background font-body">
      <AppNavbar />

      {/* ═══ HERO ═══ */}
      <section className="relative overflow-hidden bg-hero-gradient text-primary-foreground">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_20%,hsl(24_90%_50%/0.12),transparent_70%)]" />
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-20 md:py-28 relative z-10">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <FadeIn>
              <Badge className="bg-accent text-accent-foreground border-0 mb-4 text-xs tracking-wide uppercase">
                Parceria BWild × Leal Moreira
              </Badge>
              <h1 className="font-display text-4xl md:text-5xl font-bold leading-[1.08] mb-5 text-balance">
                Seu cliente não precisa ter medo da reforma
              </h1>
              <p className="text-lg text-primary-foreground/80 mb-8 max-w-xl text-pretty leading-relaxed">
                A BWild cuida de tudo — do projeto à entrega mobiliada — em até 10 semanas. 
                O proprietário só precisa aprovar o design e receber a chave.
              </p>
              <div className="flex flex-wrap gap-3">
                <a href={whatsappLink} target="_blank" rel="noopener noreferrer">
                  <Button size="lg" className="bg-accent hover:bg-accent/90 text-accent-foreground gap-2 active:scale-[0.97] transition-transform">
                    <MessageCircle className="h-4 w-4" />
                    Falar com a BWild
                  </Button>
                </a>
                <a href="#como-funciona">
                  <Button size="lg" variant="outline" className="border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10 gap-2">
                    Como funciona
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </a>
              </div>
            </FadeIn>
            <FadeIn delay={0.15}>
              <div className="rounded-2xl overflow-hidden shadow-2xl ring-1 ring-white/10">
                <img
                  src={reformaImg}
                  alt="Antes e depois: studio transformado pela BWild"
                  className="w-full h-auto object-cover"
                  loading="eager"
                  width={640}
                  height={360}
                />
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* ═══ OBJECTIONS ═══ */}
      <section className="py-20 md:py-24 bg-background">
        <div className="max-w-7xl mx-auto px-4 md:px-6">
          <FadeIn>
            <p className="text-accent font-semibold text-sm uppercase tracking-wider mb-2">Quebrando objeções</p>
            <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-3 text-balance">
              As 4 razões que fazem seu cliente desistir
            </h2>
            <p className="text-muted-foreground text-lg mb-12 max-w-2xl">
              E como a parceria BWild resolve cada uma delas antes que virem um "vou pensar".
            </p>
          </FadeIn>
          <div className="grid sm:grid-cols-2 gap-5">
            {OBJECTIONS.map((item, i) => (
              <FadeIn key={item.objection} delay={i * 0.08}>
                <Card className="border-border card-interactive h-full">
                  <CardContent className="p-6 flex gap-4">
                    <div className="h-10 w-10 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0">
                      <item.icon className="h-5 w-5 text-accent" />
                    </div>
                    <div>
                      <p className="font-display font-bold text-foreground mb-1 text-sm">{item.objection}</p>
                      <p className="text-muted-foreground text-sm leading-relaxed">{item.answer}</p>
                    </div>
                  </CardContent>
                </Card>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ TIMELINE ═══ */}
      <section id="como-funciona" className="py-20 md:py-24 bg-secondary/40 scroll-mt-20">
        <div className="max-w-7xl mx-auto px-4 md:px-6">
          <FadeIn>
            <p className="text-accent font-semibold text-sm uppercase tracking-wider mb-2">Processo simplificado</p>
            <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-3 text-balance">
              Da assinatura à chave em 10 semanas
            </h2>
            <p className="text-muted-foreground text-lg mb-12 max-w-2xl">
              O proprietário não precisa acompanhar obra. A BWild gerencia tudo com transparência total.
            </p>
          </FadeIn>
          <div className="grid md:grid-cols-4 gap-6">
            {TIMELINE.map((step, i) => (
              <FadeIn key={step.step} delay={i * 0.1}>
                <div className="relative h-full">
                  {i < TIMELINE.length - 1 && (
                    <div className="hidden md:block absolute top-8 left-[calc(50%+28px)] w-[calc(100%-56px)] h-[2px] bg-border z-0" />
                  )}
                  <Card className="border-border relative z-10 h-full">
                    <CardContent className="p-6 text-center">
                      <div className="h-14 w-14 rounded-2xl bg-accent/10 flex items-center justify-center mx-auto mb-4">
                        <step.icon className="h-6 w-6 text-accent" />
                      </div>
                      <Badge variant="secondary" className="mb-3 text-xs">{step.days}</Badge>
                      <h3 className="font-display font-bold text-foreground mb-2">{step.title}</h3>
                      <p className="text-muted-foreground text-sm leading-relaxed">{step.desc}</p>
                    </CardContent>
                  </Card>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ NUMBERS ═══ */}
      <section className="py-20 md:py-24 bg-background">
        <div className="max-w-7xl mx-auto px-4 md:px-6">
          <FadeIn>
            <p className="text-accent font-semibold text-sm uppercase tracking-wider mb-2">Números reais</p>
            <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-12 text-balance">
              Investimento, prazo e retorno
            </h2>
          </FadeIn>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {NUMBERS.map((item, i) => (
              <FadeIn key={item.label} delay={i * 0.08}>
                <Card className="border-border h-full">
                  <CardContent className="p-6">
                    <p className="text-sm text-muted-foreground mb-2">{item.label}</p>
                    <p className="font-display text-2xl md:text-3xl font-bold text-foreground mb-1">{item.value}</p>
                    <p className="text-xs text-muted-foreground">{item.sub}</p>
                  </CardContent>
                </Card>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ TESTIMONIALS ═══ */}
      <section className="py-20 md:py-24 bg-secondary/40">
        <div className="max-w-7xl mx-auto px-4 md:px-6">
          <FadeIn>
            <p className="text-accent font-semibold text-sm uppercase tracking-wider mb-2">Quem já investiu</p>
            <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-12 text-balance">
              Proprietários que confiaram na BWild
            </h2>
          </FadeIn>
          <div className="grid md:grid-cols-3 gap-6">
            {TESTIMONIALS.map((t, i) => (
              <FadeIn key={t.name} delay={i * 0.1}>
                <Card className="border-border h-full">
                  <CardContent className="p-6 flex flex-col justify-between h-full">
                    <div>
                      <div className="flex gap-0.5 mb-4">
                        {Array.from({ length: t.stars }).map((_, si) => (
                          <Star key={si} className="h-4 w-4 fill-accent text-accent" />
                        ))}
                      </div>
                      <p className="text-foreground leading-relaxed mb-6 italic">"{t.quote}"</p>
                    </div>
                    <div>
                      <p className="font-display font-bold text-foreground text-sm">{t.name}</p>
                      <p className="text-muted-foreground text-xs">{t.role}</p>
                    </div>
                  </CardContent>
                </Card>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ CTA FINAL ═══ */}
      <section className="py-20 md:py-28 bg-hero-gradient text-primary-foreground">
        <div className="max-w-3xl mx-auto px-4 md:px-6 text-center">
          <FadeIn>
            <Building2 className="h-10 w-10 mx-auto mb-6 text-accent" />
            <h2 className="font-display text-3xl md:text-4xl font-bold mb-4 text-balance">
              Feche mais negócios com a reforma resolvida
            </h2>
            <p className="text-primary-foreground/80 text-lg mb-8 max-w-xl mx-auto text-pretty leading-relaxed">
              Apresente a parceria BWild ao seu cliente e elimine a maior objeção de compra. 
              O studio sai pronto para rentabilizar em até 10 semanas.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <a href={whatsappLink} target="_blank" rel="noopener noreferrer">
                <Button size="lg" className="bg-accent hover:bg-accent/90 text-accent-foreground gap-2 active:scale-[0.97] transition-transform">
                  <MessageCircle className="h-4 w-4" />
                  Falar com a BWild
                </Button>
              </a>
              <a href="/urban-flex-bela-cintra">
                <Button size="lg" variant="outline" className="border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10 gap-2">
                  Ver o Urban Flex
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </a>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t border-border bg-background">
        <div className="max-w-7xl mx-auto px-4 md:px-6 text-center">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} BWild × Leal Moreira. Material exclusivo para corretores parceiros.
          </p>
        </div>
      </footer>
    </div>
  );
}
