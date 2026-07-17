import { useState, useMemo, useRef, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ArrowUpRight, FileText, Copy, Check, MapPin, Building2, TrendingUp, Percent } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { trackGlobal } from "@/hooks/useGuideAnalytics";
import SectionBlock from "@/components/guide/SectionBlock";
import { fmt } from "@/data/guide-data";
import { PROPERTY, TYPOLOGIES, calcFinancials } from "@/data/propertyData";
import YieldComparisonChart from "./YieldComparisonChart";

export default function PropertySimuladorSection() {
  const [selectedTypo, setSelectedTypo] = useState(1);
  const [simOcupacao, setSimOcupacao] = useState<number[]>([PROPERTY.avgOccupancy]);
  const [simDiariaAtual, setSimDiariaAtual] = useState("");
  const [rateBoost, setRateBoost] = useState(0);
  const [exportOpen, setExportOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const typo = TYPOLOGIES[selectedTypo];

  const sim = useMemo(() => {
    const customDaily = simDiariaAtual ? Number(simDiariaAtual) : undefined;
    const base = calcFinancials(typo, simOcupacao[0], rateBoost);

    // If user set custom daily, recalculate
    if (customDaily && customDaily > 0) {
      const nightsPerMonth = 30 * (simOcupacao[0] / 100);
      const boostedDaily = Math.round(customDaily * (1 + rateBoost / 100));
      const monthlyRevenue = Math.round(boostedDaily * nightsPerMonth);
      const annualRevenue = monthlyRevenue * 12;
      const totalInvestment = typo.purchasePrice;
      const grossYield = (annualRevenue / totalInvestment) * 100;
      const netYieldEstimate = grossYield * 0.75;
      const paybackYears = totalInvestment / annualRevenue;
      return {
        boostedDaily,
        monthlyRevenue,
        annualRevenue,
        totalInvestment,
        grossYield: Number(grossYield.toFixed(1)),
        netYieldEstimate: Number(netYieldEstimate.toFixed(1)),
        paybackYears: Number(paybackYears.toFixed(1)),
      };
    }

    return base;
  }, [typo, simOcupacao, rateBoost, simDiariaAtual]);

  const summaryText = useMemo(() => {
    return `📊 Simulação de Retorno — ${PROPERTY.name}\n\n` +
      `Tipologia: ${typo.label} (${typo.area} m²)\n` +
      `Investimento: R$ ${fmt(typo.purchasePrice)}\n\n` +
      `Ocupação: ${simOcupacao[0]}%\n` +
      `Diária: R$ ${fmt(sim.boostedDaily)}${rateBoost > 0 ? ` (+${rateBoost}%)` : ""}\n\n` +
      `Receita mensal: R$ ${fmt(sim.monthlyRevenue)}\n` +
      `Receita anual: R$ ${fmt(sim.annualRevenue)}\n` +
      `Yield bruto: ${sim.grossYield}%\n` +
      `Yield líquido est.: ${sim.netYieldEstimate}%\n` +
      `Payback: ${sim.paybackYears} anos\n\n` +
      `Simulação gerada para fins de estudo. Valores estimados.`;
  }, [typo, simOcupacao, sim, rateBoost]);

  const handleCopy = () => {
    navigator.clipboard.writeText(summaryText);
    setCopied(true);
    trackGlobal("export_simulation", { tipologia: typo.label, yield: sim.grossYield });
    setTimeout(() => setCopied(false), 2000);
  };

  const simTracked = useRef(false);
  useEffect(() => {
    if (simTracked.current) return;
    const t = setTimeout(() => {
      if (simDiariaAtual || rateBoost > 0) {
        trackGlobal("simulator_used", { tipologia: typo.label, yield: sim.grossYield });
        simTracked.current = true;
      }
    }, 2000);
    return () => clearTimeout(t);
  }, [sim.grossYield]);

  return (
    <SectionBlock
      id="simulador"
      title="Simulador de Retorno por Tipologia"
      takeaway={`Compare o retorno financeiro de cada tipologia do ${PROPERTY.name} e encontre a que melhor se encaixa no seu objetivo.`}
    >
      {/* Property badge */}
      <div className="flex items-center gap-2 mb-5 bg-primary/5 rounded-lg px-4 py-2.5">
        <MapPin className="h-4 w-4 text-primary shrink-0" />
        <span className="text-sm text-foreground font-medium">{PROPERTY.name}</span>
        <span className="text-xs text-muted-foreground">· {PROPERTY.address}</span>
      </div>

      <Card className="border-border">
        <CardContent className="p-6 space-y-5 font-body">
          {/* Typology selector — financial focus */}
          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">Escolha a tipologia</label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {TYPOLOGIES.map((t, i) => {
                const fin = calcFinancials(t, simOcupacao[0]);
                return (
                  <button
                    key={t.id}
                    onClick={() => { setSelectedTypo(i); setSimDiariaAtual(""); }}
                    className={`p-3 rounded-xl border-2 text-left transition-all ${
                      selectedTypo === i
                        ? "border-primary bg-primary/5 shadow-sm"
                        : "border-border hover:border-primary/30"
                    }`}
                  >
                    <Building2 className={`h-4 w-4 mb-1 ${selectedTypo === i ? "text-primary" : "text-muted-foreground"}`} />
                    <p className="text-sm font-semibold text-foreground">{t.label}</p>
                    <p className="text-xs text-muted-foreground">R$ {fmt(t.purchasePrice)}</p>
                    <p className="text-xs text-primary font-semibold mt-0.5">Yield {fin.grossYield}%</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Investment breakdown */}
          <div className="bg-muted/40 rounded-xl p-4">
            <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">Investimento</p>
            <div className="grid grid-cols-2 gap-3 text-center">
              <div>
                <p className="text-lg font-display font-bold text-foreground">R$ {fmt(typo.purchasePrice)}</p>
                <p className="text-[10px] text-muted-foreground">Preço da unidade</p>
              </div>
              <div>
                <p className="text-lg font-display font-bold text-muted-foreground">R$ {fmt(Math.round(typo.purchasePrice / typo.area))}/m²</p>
                <p className="text-[10px] text-muted-foreground">Preço por m²</p>
              </div>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">
              Ocupação estimada: <span className="font-bold text-primary">{simOcupacao[0]}%</span>
            </label>
            <Slider value={simOcupacao} onValueChange={setSimOcupacao} min={50} max={95} step={1} />
            <p className="text-xs text-muted-foreground mt-1">Média da região: {PROPERTY.avgOccupancy}%</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Diária personalizada (R$)</label>
              <Input
                type="number"
                placeholder={`Estimativa: R$ ${fmt(typo.dailyEstimate)}`}
                value={simDiariaAtual}
                onChange={(e) => setSimDiariaAtual(e.target.value)}
                className="min-h-[48px] text-base"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Valorização na diária</label>
              <div className="flex gap-2 flex-wrap">
                {[0, 10, 20, 30].map((v) => (
                  <Button
                    key={v}
                    size="sm"
                    variant={rateBoost === v ? "default" : "outline"}
                    onClick={() => setRateBoost(v)}
                    className={`min-h-[44px] min-w-[48px] ${rateBoost === v ? "bg-primary text-primary-foreground" : ""}`}
                  >
                    {v === 0 ? "Base" : `+${v}%`}
                  </Button>
                ))}
              </div>
            </div>
          </div>

          <Separator />

          {/* Results — financial return focused */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-display font-bold text-foreground">R$ {fmt(sim.monthlyRevenue)}</p>
              <p className="text-xs text-muted-foreground">Receita / mês</p>
            </div>
            <div>
              <p className="text-2xl font-display font-bold text-foreground">R$ {fmt(sim.annualRevenue)}</p>
              <p className="text-xs text-muted-foreground">Receita / ano</p>
            </div>
            <div className="col-span-2 md:col-span-1">
              <p className="text-3xl font-display font-bold text-primary">{sim.grossYield}%</p>
              <p className="text-xs text-muted-foreground">Yield bruto anual</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 text-center bg-muted/30 rounded-xl p-4">
            <div>
              <p className="text-lg font-display font-bold text-foreground">{sim.netYieldEstimate}%</p>
              <p className="text-[10px] text-muted-foreground">Yield líquido est.</p>
            </div>
            <div>
              <p className="text-lg font-display font-bold text-foreground">{sim.paybackYears} anos</p>
              <p className="text-[10px] text-muted-foreground">Payback investimento</p>
            </div>
            <div>
              <p className="text-lg font-display font-bold text-foreground">R$ {fmt(sim.boostedDaily)}</p>
              <p className="text-[10px] text-muted-foreground">Diária {rateBoost > 0 ? `(+${rateBoost}%)` : ""}</p>
            </div>
          </div>

          {/* Yield comparison chart */}
          <YieldComparisonChart
            occupancy={simOcupacao[0]}
            rateBoost={rateBoost}
            selectedTypoId={typo.id}
          />

          {rateBoost > 0 && (
            <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 flex items-start gap-3">
              <ArrowUpRight className="text-primary mt-0.5 flex-shrink-0" size={20} />
              <p className="text-sm text-muted-foreground">
                Com +{rateBoost}% na diária, o yield bruto do {typo.label} sobe para <span className="font-bold text-primary">{sim.grossYield}%</span> — {sim.grossYield > 8 ? "acima da maioria dos investimentos de renda fixa" : "competitivo com o mercado financeiro"}.
              </p>
            </div>
          )}

          <Dialog open={exportOpen} onOpenChange={setExportOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="w-full min-h-[44px]">
                <FileText size={16} className="mr-2" /> Exportar simulação
              </Button>
            </DialogTrigger>
            <DialogContent className="font-body">
              <DialogHeader><DialogTitle className="font-display">Resumo Financeiro</DialogTitle></DialogHeader>
              <pre className="bg-muted rounded-lg p-4 text-sm text-foreground whitespace-pre-wrap max-h-80 overflow-y-auto">{summaryText}</pre>
              <Button onClick={handleCopy} className="w-full bg-primary text-primary-foreground">
                {copied ? <><Check size={16} className="mr-2" /> Copiado!</> : <><Copy size={16} className="mr-2" /> Copiar texto</>}
              </Button>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>

      <Accordion type="multiple" className="mt-4 font-body">
        <AccordionItem value="yield">
          <AccordionTrigger className="text-primary font-semibold min-h-[48px]">Como calculamos o yield</AccordionTrigger>
          <AccordionContent>
            <p className="text-sm text-muted-foreground leading-relaxed">
              <strong className="text-foreground">Yield bruto</strong> = receita anual ÷ investimento total (unidade + setup). <strong className="text-foreground">Yield líquido</strong> = yield bruto × 0,75 — desconta ~25% de custos operacionais (condomínio, limpeza, plataformas, IPTU). O payback é o tempo para recuperar o investimento total com a receita bruta.
            </p>
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="boost">
          <AccordionTrigger className="text-primary font-semibold min-h-[48px]">O que impacta a diária</AccordionTrigger>
          <AccordionContent>
            <p className="text-sm text-muted-foreground leading-relaxed">
              <strong className="text-foreground">Base</strong> = diária estimada para a tipologia sem upgrades. <strong className="text-foreground">+10%</strong> = decoração básica melhorada. <strong className="text-foreground">+20%</strong> = decoração premium com fotos profissionais. <strong className="text-foreground">+30%</strong> = design autoral e operação otimizada. Os amenities do {PROPERTY.name} (coworking, lavanderia, rooftop) já contribuem para diárias acima da média da região.
            </p>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </SectionBlock>
  );
}
