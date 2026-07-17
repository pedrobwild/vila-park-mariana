import { Link } from "react-router-dom";
import { GraduationCap, Train, Trees, Briefcase, ArrowRight, Info } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { POIS } from "@/data/surroundings";

// Purely QUALITATIVE section — no fabricated KPIs, no ADR / occupancy / price
// per sqm hardcoded. Quantitative market numbers come from MarketIntelSection
// (Perplexity) rendered right below this component on the home page.

function findDistance(name: string): string | null {
  const p = POIS.find((x) => x.name.toLowerCase().includes(name.toLowerCase()));
  return p?.distance ?? null;
}

export default function VilaMarianaYieldSection() {
  const reasons = [
    {
      icon: Train,
      title: "Mobilidade que sustenta locação",
      text: `A ${findDistance("Metrô Vila Mariana") ?? "poucos metros"} do metrô Vila Mariana (Linha 1-Azul) e a ${
        findDistance("Ana Rosa") ?? "curta distância"
      } do Ana Rosa (integração com a Linha 2-Verde). Imóveis a pé do metrô tendem a apresentar menor vacância.`,
    },
    {
      icon: GraduationCap,
      title: "Demanda universitária recorrente",
      text: `Universidades no raio de caminhada — FMU (${findDistance("FMU") ?? "próxima"}), ESPM (${
        findDistance("ESPM") ?? "próxima"
      }) e Univ. Belas Artes (${findDistance("Belas Artes") ?? "próxima"}) — geram fluxo constante de inquilinos para 1 dorm./studios.`,
    },
    {
      icon: Briefcase,
      title: "Perto do polo de empregos da Paulista",
      text: `Av. Paulista a ${
        findDistance("Paulista") ?? "curta distância"
      } — um dos maiores corredores de escritórios de SP. Trabalhadores que usam transporte público valorizam morar próximo do metrô sem depender de carro.`,
    },
    {
      icon: Trees,
      title: "Qualidade de vida que retém inquilino",
      text: `Parque da Aclimação a ${
        findDistance("Aclimação") ?? "curta distância"
      } e Parque Ibirapuera a ${findDistance("Ibirapuera") ?? "poucos km"}. Bairro consolidado, com comércio, serviços e gastronomia no entorno.`,
    },
  ];

  return (
    <div className="space-y-8 md:space-y-10">
      <div>
        <h3 className="font-display text-2xl md:text-4xl font-bold text-foreground max-w-3xl leading-tight">
          Por que a Vila Mariana é um bairro estratégico para quem investe em locação.
        </h3>
        <p className="mt-3 text-muted-foreground max-w-2xl">
          Argumentos de localização — validados por dados públicos e pela vocação histórica do bairro.
          Os números de mercado (preço/m², aluguel médio, valorização) aparecem logo abaixo,
          buscados em tempo real.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {reasons.map((r) => (
          <Card key={r.title} className="border-border/60 hover:border-accent/30 transition-colors">
            <CardContent className="p-5">
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-xl bg-accent/10 flex items-center justify-center shrink-0">
                  <r.icon className="h-5 w-5 text-accent" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-foreground mb-1">{r.title}</h4>
                  <p className="text-sm text-muted-foreground leading-relaxed">{r.text}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-dashed border-accent/30 bg-accent/5">
        <CardContent className="p-5 flex flex-col md:flex-row md:items-center gap-4 justify-between">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-accent mt-0.5 shrink-0" />
            <p className="text-sm text-foreground leading-relaxed max-w-2xl">
              Quer aprofundar? Veja no <strong>Guia do Investidor</strong> como escolher tipologia para renda e
              simule seu financiamento em <strong>Ferramentas</strong>.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 shrink-0">
            <Link to="/guia-investidor">
              <Button size="sm" variant="outline" className="w-full sm:w-auto">
                Guia do Investidor <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
              </Button>
            </Link>
            <Link to="/ferramentas">
              <Button size="sm" className="w-full sm:w-auto bg-accent hover:bg-accent/90 text-accent-foreground">
                Simular financiamento <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center gap-2">
        <Badge variant="outline" className="text-xs text-muted-foreground border-border/60">
          Fontes públicas · sem promessa de rentabilidade
        </Badge>
      </div>
    </div>
  );
}
