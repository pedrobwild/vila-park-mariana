import { useRef, useEffect } from "react";
import { motion, useInView } from "framer-motion";
import {
  CheckCircle2, Shield, TrendingUp, MapPin,
  ArrowRight, ChevronRight, MessageCircle, Building2, FileText, Wallet
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import AppNavbar from "@/components/AppNavbar";

const whatsappLink =
  "https://wa.me/5511961007687?text=Olá!%20Sou%20corretor%20parceiro%20e%20quero%20saber%20mais%20sobre%20o%20Vila%20Park%20Vila%20Mariana.";

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

/* ─── Objections (comprador final) ─── */
const OBJECTIONS = [
  {
    objection: "\"O preço está acima do que eu esperava\"",
    answer: "Apresente o simulador de financiamento e mostre o valor da parcela dentro da realidade do cliente, além dos diferenciais do empreendimento na região.",
    icon: Wallet,
  },
  {
    objection: "\"Não conheço bem a região da Vila Mariana\"",
    answer: "Destaque a proximidade com o metrô Vila Mariana, o Parque da Aclimação e a infraestrutura completa de comércio, escolas e serviços do bairro.",
    icon: MapPin,
  },
  {
    objection: "\"Tenho dúvidas sobre o financiamento\"",
    answer: "Use o Simulador de Financiamento nas Ferramentas do Comprador para mostrar parcela estimada e condições, e oriente o cliente a confirmar com o banco.",
    icon: Shield,
  },
  {
    objection: "\"Quero entender as plantas e diferenciais antes de decidir\"",
    answer: "Encaminhe o Guia do Comprador, com plantas, memorial e principais diferenciais do Vila Park Vila Mariana.",
    icon: CheckCircle2,
  },
];

export default function CorretorPage() {
  useEffect(() => {
    document.title = "Corretor Parceiro · Vila Park Vila Mariana";
  }, []);

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
                Área do Corretor Parceiro
              </Badge>
              <h1 className="font-display text-4xl md:text-5xl font-bold leading-[1.08] mb-5 text-balance">
                Vila Park Vila Mariana: tudo o que você precisa para vender
              </h1>
              <p className="text-lg text-primary-foreground/80 mb-8 max-w-xl text-pretty leading-relaxed">
                Material de vendas, respostas para as principais dúvidas do comprador final e suporte direto
                da equipe comercial para fechar mais negócios.
              </p>
              <div className="flex flex-wrap gap-3">
                <a href={whatsappLink} target="_blank" rel="noopener noreferrer">
                  <Button size="lg" className="bg-accent hover:bg-accent/90 text-accent-foreground gap-2 active:scale-[0.97] transition-transform">
                    <MessageCircle className="h-4 w-4" />
                    Falar com a equipe comercial
                  </Button>
                </a>
                <a href="#material">
                  <Button size="lg" variant="outline" className="border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10 gap-2">
                    Ver material de vendas
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </a>
              </div>
            </FadeIn>
            <FadeIn delay={0.15}>
              <div className="rounded-2xl overflow-hidden shadow-2xl ring-1 ring-white/10 bg-primary-foreground/5 flex items-center justify-center min-h-[280px]">
                <Building2 className="h-24 w-24 text-primary-foreground/30" />
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* ═══ MATERIAL DE VENDAS ═══ */}
      <section id="material" className="py-20 md:py-24 bg-background scroll-mt-20">
        <div className="max-w-7xl mx-auto px-4 md:px-6">
          <FadeIn>
            <p className="text-accent font-semibold text-sm uppercase tracking-wider mb-2">Material de apoio</p>
            <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-3 text-balance">
              Fotos, plantas e informações completas
            </h2>
            <p className="text-muted-foreground text-lg mb-10 max-w-2xl">
              Acesse o Guia do Comprador com plantas, fotos e diferenciais do empreendimento para apresentar
              ao seu cliente.
            </p>
          </FadeIn>
          <div className="grid sm:grid-cols-2 gap-5 max-w-3xl">
            <FadeIn>
              <Card className="border-border card-interactive h-full">
                <CardContent className="p-6 flex gap-4 items-center">
                  <div className="h-10 w-10 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0">
                    <FileText className="h-5 w-5 text-accent" />
                  </div>
                  <div>
                    <p className="font-display font-bold text-foreground mb-1">Guia do Comprador</p>
                    <p className="text-muted-foreground text-sm leading-relaxed mb-3">
                      Plantas, fotos e diferenciais do Vila Park Vila Mariana.
                    </p>
                    <a href="/guia-comprador">
                      <Button size="sm" variant="outline" className="gap-1.5">
                        Acessar
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Button>
                    </a>
                  </div>
                </CardContent>
              </Card>
            </FadeIn>
            <FadeIn delay={0.08}>
              <Card className="border-border card-interactive h-full">
                <CardContent className="p-6 flex gap-4 items-center">
                  <div className="h-10 w-10 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0">
                    <TrendingUp className="h-5 w-5 text-accent" />
                  </div>
                  <div>
                    <p className="font-display font-bold text-foreground mb-1">Ferramentas do Comprador</p>
                    <p className="text-muted-foreground text-sm leading-relaxed mb-3">
                      Simulador de financiamento para apresentar parcelas e condições ao cliente.
                    </p>
                    <a href="/ferramentas">
                      <Button size="sm" variant="outline" className="gap-1.5">
                        Acessar
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Button>
                    </a>
                  </div>
                </CardContent>
              </Card>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* ═══ OBJECTIONS ═══ */}
      <section className="py-20 md:py-24 bg-secondary/40">
        <div className="max-w-7xl mx-auto px-4 md:px-6">
          <FadeIn>
            <p className="text-accent font-semibold text-sm uppercase tracking-wider mb-2">Quebrando objeções</p>
            <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-3 text-balance">
              As dúvidas mais comuns do comprador final
            </h2>
            <p className="text-muted-foreground text-lg mb-12 max-w-2xl">
              Respostas prontas para as principais objeções na hora de decidir pela compra.
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

      {/* ═══ CTA FINAL ═══ */}
      <section className="py-20 md:py-28 bg-hero-gradient text-primary-foreground">
        <div className="max-w-3xl mx-auto px-4 md:px-6 text-center">
          <FadeIn>
            <Building2 className="h-10 w-10 mx-auto mb-6 text-accent" />
            <h2 className="font-display text-3xl md:text-4xl font-bold mb-4 text-balance">
              Vamos fechar mais negócios juntos
            </h2>
            <p className="text-primary-foreground/80 text-lg mb-8 max-w-xl mx-auto text-pretty leading-relaxed">
              Fale com a equipe comercial do Vila Park Vila Mariana para tirar dúvidas, alinhar condições e
              agendar visitas com seus clientes.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <a href={whatsappLink} target="_blank" rel="noopener noreferrer">
                <Button size="lg" className="bg-accent hover:bg-accent/90 text-accent-foreground gap-2 active:scale-[0.97] transition-transform">
                  <MessageCircle className="h-4 w-4" />
                  Falar com a equipe comercial
                </Button>
              </a>
              <a href="/guia-comprador">
                <Button size="lg" variant="outline" className="border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10 gap-2">
                  Ver o empreendimento
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
            © {new Date().getFullYear()} Vila Park Vila Mariana. Material exclusivo para corretores parceiros.
          </p>
        </div>
      </footer>
    </div>
  );
}
