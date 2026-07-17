import AppNavbar from "@/components/AppNavbar";
import { GuideDecisionProvider } from "@/hooks/useGuideDecision";
import PropertyDiagnosticoSection from "@/components/ferramentas/PropertyDiagnosticoSection";
import PropertyRecomendacaoSection from "@/components/ferramentas/PropertyRecomendacaoSection";
import PropertyPlanoAcaoSection from "@/components/ferramentas/PropertyPlanoAcaoSection";
import PropertySimuladorSection from "@/components/ferramentas/PropertySimuladorSection";
import EventsRevenueSimulator from "@/components/ferramentas/EventsRevenueSimulator";
import PropertyBenchmarkSection from "@/components/ferramentas/PropertyBenchmarkSection";
import MarketIntelSection from "@/components/MarketIntelSection";
import RentabilidadeSection from "@/components/guide/RentabilidadeSection";
import ChecklistSection from "@/components/guide/ChecklistSection";
import AntiChecklistSection from "@/components/guide/AntiChecklistSection";
import DecoracaoSection from "@/components/guide/DecoracaoSection";
import ReformaSection from "@/components/guide/ReformaSection";
import AnuncioPrecificacaoSection from "@/components/guide/AnuncioPrecificacaoSection";
import ReservasSection from "@/components/guide/ReservasSection";
import { Button } from "@/components/ui/button";
import { ArrowRight, Building2, MessageCircle } from "lucide-react";
import { Link } from "react-router-dom";
import bwildLogo from "@/assets/bwild-logo.png";
import { useEffect } from "react";

export default function Ferramentas() {
  useEffect(() => {
    document.title = "Ferramentas do Investidor · Urban Flex Bela Cintra · Bwild";
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
              <span className="text-sm font-semibold text-primary">LM Urban Flex Bela Cintra</span>
            </div>
            <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-2">
              Ferramentas do Investidor
            </h1>
            <p className="text-muted-foreground text-lg font-body max-w-2xl">
              Análise de mercado ao vivo, simulador de receita por tipologia, diagnóstico de perfil e plano de ação — tudo focado no potencial do empreendimento.
            </p>
          </div>
        </div>

        {/* Market Intel — Perplexity */}
        <div className="w-full">
          <div className="max-w-[1280px] mx-auto px-5 lg:px-10">
            <MarketIntelSection />
          </div>
        </div>

        {/* Diagnóstico */}
        <div className="w-full bg-muted/20">
          <div className="max-w-[1280px] mx-auto px-5 lg:px-10">
            <PropertyDiagnosticoSection />
          </div>
        </div>

        {/* Recomendação / Vantagens */}
        <div className="w-full">
          <div className="max-w-[1280px] mx-auto px-5 lg:px-10">
            <PropertyRecomendacaoSection />
          </div>
        </div>

        {/* Simulador */}
        <div className="w-full bg-muted/20">
          <div className="max-w-[1280px] mx-auto px-5 lg:px-10">
            <PropertySimuladorSection />
          </div>
        </div>

        {/* Simulador de Eventos */}
        <div className="w-full">
          <div className="max-w-[1280px] mx-auto px-5 lg:px-10">
            <EventsRevenueSimulator />
          </div>
        </div>

        {/* Benchmark vs renda fixa */}
        <div className="w-full bg-muted/20">
          <div className="max-w-[1280px] mx-auto px-5 lg:px-10">
            <PropertyBenchmarkSection />
          </div>
        </div>

        {/* Rentabilidade — waterfall + cenários */}
        <div className="w-full bg-muted/20">
          <div className="max-w-[1280px] mx-auto px-5 lg:px-10">
            <RentabilidadeSection />
          </div>
        </div>

        {/* Decoração + Reforma */}
        <div className="w-full">
          <div className="max-w-[1280px] mx-auto px-5 lg:px-10">
            <DecoracaoSection />
          </div>
        </div>

        <div className="w-full bg-muted/20">
          <div className="max-w-[1280px] mx-auto px-5 lg:px-10">
            <ReformaSection />
          </div>
        </div>

        {/* Anúncio & Precificação + Reservas */}
        <div className="w-full">
          <div className="max-w-[1280px] mx-auto px-5 lg:px-10">
            <AnuncioPrecificacaoSection />
          </div>
        </div>

        <div className="w-full bg-muted/20">
          <div className="max-w-[1280px] mx-auto px-5 lg:px-10">
            <ReservasSection />
          </div>
        </div>

        {/* Checklist + Anti-checklist */}
        <div className="w-full">
          <div className="max-w-[1280px] mx-auto px-5 lg:px-10">
            <ChecklistSection />
          </div>
        </div>

        <div className="w-full bg-muted/20">
          <div className="max-w-[1280px] mx-auto px-5 lg:px-10">
            <AntiChecklistSection />
          </div>
        </div>

        {/* Plano de ação */}
        <div className="w-full">
          <div className="max-w-[1280px] mx-auto px-5 lg:px-10">
            <PropertyPlanoAcaoSection />
          </div>
        </div>

        {/* CTA */}
        <div className="w-full bg-muted/20">
          <div className="max-w-[1280px] mx-auto px-5 lg:px-10 py-12 text-center">
            <h2 className="font-display text-2xl font-bold text-foreground mb-3">
              Pronto para garantir sua unidade?
            </h2>
            <p className="text-muted-foreground mb-6 max-w-lg mx-auto">
              Você já analisou o mercado e simulou a receita. Fale direto com a equipe e negocie as melhores condições.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <a href="https://wa.me/5591984804821?text=Olá!%20Analisei%20o%20Urban%20Flex%20Bela%20Cintra%20nas%20ferramentas%20e%20quero%20saber%20mais." target="_blank" rel="noopener noreferrer">
                <Button size="lg" className="min-h-[48px] gap-2 w-full sm:w-auto">
                  <MessageCircle className="h-4 w-4" />
                  Falar no WhatsApp
                </Button>
              </a>
              <Link to="/urban-flex-bela-cintra">
                <Button size="lg" variant="outline" className="min-h-[48px] gap-2 w-full sm:w-auto">
                  Ver o empreendimento
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
              <img src={bwildLogo} alt="Bwild" className="h-6 w-auto mx-auto mb-3 opacity-60" />
              © 2026 Bwild · Ferramentas do Investidor
            </footer>
          </div>
        </div>
      </main>
    </GuideDecisionProvider>
  );
}
