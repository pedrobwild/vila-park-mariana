import { useEffect } from "react";
import { Link } from "react-router-dom";
import AppNavbar from "@/components/AppNavbar";
import { GuideDecisionProvider } from "@/hooks/useGuideDecision";
import FinancingSimulator from "@/components/ferramentas/FinancingSimulator";
import SiteFooter from "@/components/shared/SiteFooter";
import { Button } from "@/components/ui/button";
import { ArrowRight, MessageCircle } from "lucide-react";
import { WHATSAPP_PHONE } from "@/data/surroundings";

export default function Ferramentas() {
  useEffect(() => {
    document.title = "Ferramentas · Vila Park Vila Mariana";
  }, []);

  const wa = `https://api.whatsapp.com/send?phone=${WHATSAPP_PHONE}&text=${encodeURIComponent(
    "Olá! Simulei o financiamento do Vila Park Vila Mariana e quero saber mais.",
  )}`;

  return (
    <GuideDecisionProvider>
      <AppNavbar />
      <main className="w-full flex flex-col items-center pb-12 pt-8 lg:pt-12">
        <div className="w-full">
          <div className="max-w-[1280px] mx-auto px-5 lg:px-10 pt-4 pb-6">
            <p className="eyebrow mb-3">Vila Park · Vila Mariana</p>
            <h1 className="font-display text-4xl md:text-5xl font-medium text-foreground mb-3 tracking-tight">
              Ferramentas do comprador
            </h1>
            <p className="text-muted-foreground text-lg max-w-2xl">
              Simule seu financiamento e entenda todos os custos para planejar a compra do seu apartamento com tranquilidade.
            </p>
          </div>
        </div>

        <div className="w-full">
          <div className="max-w-[1280px] mx-auto px-5 lg:px-10">
            <FinancingSimulator />
          </div>
        </div>

        <div className="w-full bg-muted/30 mt-12">
          <div className="max-w-[1280px] mx-auto px-5 lg:px-10 py-16 text-center">
            <p className="eyebrow mb-3">Próximo passo</p>
            <h2 className="font-display text-3xl md:text-4xl font-medium text-foreground mb-4 tracking-tight">
              Pronto para conhecer o Vila Park?
            </h2>
            <p className="text-muted-foreground mb-8 max-w-lg mx-auto">
              Fale com a equipe para conhecer as condições, disponibilidade por andar e agendar uma visita.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <a href={wa} target="_blank" rel="noopener noreferrer">
                <Button size="lg" className="min-h-[48px] gap-2 w-full sm:w-auto bg-accent hover:bg-accent/90 text-accent-foreground">
                  <MessageCircle className="h-4 w-4" />
                  Falar com especialista
                </Button>
              </a>
              <Link to="/guia-investidor">
                <Button size="lg" variant="outline" className="min-h-[48px] gap-2 w-full sm:w-auto">
                  Ver Guia do Investidor
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </main>
      <SiteFooter />
    </GuideDecisionProvider>
  );
}
