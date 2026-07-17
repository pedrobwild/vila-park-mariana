import { useEffect } from "react";
import { Link } from "react-router-dom";
import AppNavbar from "@/components/AppNavbar";
import { GuideDecisionProvider } from "@/hooks/useGuideDecision";
import FinancingSimulator from "@/components/ferramentas/FinancingSimulator";
import { Button } from "@/components/ui/button";
import { ArrowRight, Building2, MessageCircle } from "lucide-react";

export default function Ferramentas() {
  useEffect(() => {
    document.title = "Ferramentas · Vila Park Vila Mariana";
  }, []);

  return (
    <GuideDecisionProvider>
      <AppNavbar />
      <main className="w-full flex flex-col items-center pb-24 pt-16 lg:pt-8">
        {/* Header */}
        <div className="w-full">
          <div className="max-w-[1280px] mx-auto px-5 lg:px-10 pt-8 pb-4">
            <div className="flex items-center gap-2 mb-3">
              <Building2 className="h-5 w-5 text-primary" />
              <span className="text-sm font-semibold text-primary">Vila Park Vila Mariana</span>
            </div>
            <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-2">
              Ferramentas do Comprador
            </h1>
            <p className="text-muted-foreground text-lg font-body max-w-2xl">
              Simule seu financiamento e entenda todos os custos para planejar a compra do seu novo apartamento
              com tranquilidade.
            </p>
          </div>
        </div>

        {/* Simulador de Financiamento */}
        <div className="w-full">
          <div className="max-w-[1280px] mx-auto px-5 lg:px-10">
            <FinancingSimulator />
          </div>
        </div>

        {/* CTA */}
        <div className="w-full bg-muted/20">
          <div className="max-w-[1280px] mx-auto px-5 lg:px-10 py-12 text-center">
            <h2 className="font-display text-2xl font-bold text-foreground mb-3">
              Pronto para conhecer o Vila Park?
            </h2>
            <p className="text-muted-foreground mb-6 max-w-lg mx-auto">
              Simule seu financiamento e fale com a equipe para conhecer as condições e agendar uma visita.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <a
                href="https://wa.me/5511961007687?text=Olá!%20Simulei%20o%20financiamento%20do%20Vila%20Park%20Vila%20Mariana%20e%20quero%20saber%20mais."
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button size="lg" className="min-h-[48px] gap-2 w-full sm:w-auto">
                  <MessageCircle className="h-4 w-4" />
                  Falar no WhatsApp
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

        {/* Footer */}
        <div className="w-full">
          <div className="max-w-[1280px] mx-auto px-5 lg:px-10">
            <footer className="text-center py-8 text-sm text-muted-foreground font-body">
              © 2026 Vila Park Vila Mariana · Ferramentas do Comprador
            </footer>
          </div>
        </div>
      </main>
    </GuideDecisionProvider>
  );
}
