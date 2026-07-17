import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { motion } from "framer-motion";
import { ArrowDown, TrendingUp, TrendingDown, Minus, AlertCircle, Lightbulb, DollarSign, Percent, Building2, Zap } from "lucide-react";
import SectionBlock from "./SectionBlock";

/* ── Base constants ── */
const RECEITA_BRUTA = 9000;
const COMISSAO_PCT = 0.15;
const IMPOSTOS_PCT = 0.06;

/* ── Waterfall item config ── */
type WaterfallItem = {
  label: string;
  desc: string;
  type: "revenue" | "cost" | "fixed" | "result";
  editable?: boolean;
  stateKey?: "gestao" | "limpeza" | "condominio" | "iptu";
  getValue: (vals: Record<string, number>) => number;
};

const WATERFALL_CONFIG: WaterfallItem[] = [
  { label: "Receita Bruta", desc: "ADR × noites ocupadas/mês", type: "revenue", getValue: () => RECEITA_BRUTA },
  { label: "Comissão plataforma", desc: "~15% (Airbnb + processamento)", type: "cost", getValue: () => RECEITA_BRUTA * COMISSAO_PCT },
  { label: "Gestão operacional", desc: "~10% (se terceirizada)", type: "cost", editable: true, stateKey: "gestao", getValue: (v) => v.gestao },
  { label: "Limpeza", desc: "Custo fixo mensal", type: "cost", editable: true, stateKey: "limpeza", getValue: (v) => v.limpeza },
  { label: "Condomínio", desc: "Custo fixo mensal", type: "fixed", editable: true, stateKey: "condominio", getValue: (v) => v.condominio },
  { label: "IPTU", desc: "Custo fixo mensal", type: "fixed", editable: true, stateKey: "iptu", getValue: (v) => v.iptu },
  { label: "Impostos", desc: "~6% (Simples/MEI)", type: "cost", getValue: () => RECEITA_BRUTA * IMPOSTOS_PCT },
  {
    label: "Receita Líquida",
    desc: "O que sobra no bolso",
    type: "result",
    getValue: (v) =>
      RECEITA_BRUTA -
      (RECEITA_BRUTA * COMISSAO_PCT) -
      v.gestao -
      v.limpeza -
      v.condominio -
      v.iptu -
      (RECEITA_BRUTA * IMPOSTOS_PCT),
  },
];

function fmtCurrency(n: number) {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

/* ── Scenarios ── */
const SCENARIOS = [
  {
    key: "conservador",
    label: "Conservador",
    icon: TrendingDown,
    color: "border-amber-500/30 bg-amber-500/[0.03]",
    badgeColor: "bg-amber-100 text-amber-800",
    metrics: { ocupacao: "65%", adr: "R$ 280", receitaBruta: "R$ 5.460", receitaLiquida: "R$ 1.200", yield: "~5%", payback: "~14 anos" },
    desc: "Primeiros meses, baixa temporada ou bairro menos aquecido.",
  },
  {
    key: "base",
    label: "Base",
    icon: Minus,
    color: "border-primary/30 bg-primary/[0.03]",
    badgeColor: "bg-primary/10 text-primary",
    metrics: { ocupacao: "75%", adr: "R$ 350", receitaBruta: "R$ 7.875", receitaLiquida: "R$ 2.560", yield: "~8%", payback: "~8 anos" },
    desc: "Operação estabilizada com boa gestão e produto adequado.",
  },
  {
    key: "agressivo",
    label: "Otimista",
    icon: TrendingUp,
    color: "border-emerald-500/30 bg-emerald-500/[0.03]",
    badgeColor: "bg-emerald-100 text-emerald-800",
    metrics: { ocupacao: "85%", adr: "R$ 420", receitaBruta: "R$ 10.710", receitaLiquida: "R$ 4.100", yield: "~12%", payback: "~5 anos" },
    desc: "Studio premium, fotos profissionais, preço dinâmico e localização top.",
  },
];

/* ── Sensitivity drivers ── */
const SENSITIVITY = [
  { driver: "Ocupação", impact: "Alto", desc: "Cada 5pp de ocupação = ~R$ 500/mês de receita bruta", icon: Percent, color: "text-primary" },
  { driver: "Diária média (ADR)", impact: "Alto", desc: "Cada R$ 50 a mais na diária = ~R$ 1.125/mês bruto a 75% de ocupação", icon: DollarSign, color: "text-primary" },
  { driver: "Condomínio", impact: "Médio", desc: "Custo fixo que não escala — condomínios > R$ 1.200 comprimem margem", icon: Building2, color: "text-amber-600" },
  { driver: "Gestão + Limpeza", impact: "Médio", desc: "Operação própria economiza ~25%, mas exige tempo e processo", icon: Zap, color: "text-amber-600" },
];

type ActiveScenario = "conservador" | "base" | "agressivo";

export default function RentabilidadeSection() {
  const [activeScenario, setActiveScenario] = useState<ActiveScenario>("base");
  const [gestao, setGestao] = useState(900);
  const [limpeza, setLimpeza] = useState(400);
  const [condominio, setCondominio] = useState(500);
  const [iptu, setIptu] = useState(300);

  const scenario = SCENARIOS.find((s) => s.key === activeScenario)!;

  const vals = useMemo(() => ({ gestao, limpeza, condominio, iptu }), [gestao, limpeza, condominio, iptu]);

  const setters: Record<string, (v: number) => void> = {
    gestao: setGestao,
    limpeza: setLimpeza,
    condominio: setCondominio,
    iptu: setIptu,
  };

  return (
    <SectionBlock
      id="rentabilidade"
      title="A Matemática do Investimento"
      takeaway="Entenda como a conta é formada antes de abrir o simulador. Receita bruta ≠ o que vai para o bolso."
    >
      {/* ── Revenue Waterfall ── */}
      <h3 className="font-display text-xl font-bold text-foreground mb-4">Da receita bruta ao bolso: a cascata do retorno</h3>
      <Card className="border-border mb-10">
        <CardContent className="p-5 md:p-6">
          <div className="space-y-0">
            {WATERFALL_CONFIG.map((item, i) => {
              const isRevenue = item.type === "revenue";
              const isResult = item.type === "result";
              const isCost = item.type === "cost" || item.type === "fixed";
              const value = item.getValue(vals);
              const formatted = isRevenue || isResult ? fmtCurrency(value) : `- ${fmtCurrency(value)}`;

              return (
                <motion.div
                  key={item.label}
                  initial={{ opacity: 0, x: -12 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.04 }}
                >
                  {isResult && <div className="border-t-2 border-primary/30 my-3" />}
                  <div className={`flex items-center gap-3 py-2.5 px-3 rounded-lg ${isResult ? "bg-primary/5" : isRevenue ? "bg-muted/30" : ""}`}>
                    {isCost && <ArrowDown size={12} className="text-destructive/60 shrink-0" />}
                    {isRevenue && <TrendingUp size={12} className="text-primary shrink-0" />}
                    {isResult && <DollarSign size={14} className="text-primary shrink-0" />}
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-body ${isResult ? "font-bold text-foreground" : "font-medium text-foreground"}`}>{item.label}</p>
                      <p className="text-xs text-muted-foreground font-body">{item.desc}</p>
                    </div>
                    {item.editable && item.stateKey ? (
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-sm text-muted-foreground">R$</span>
                        <Input
                          type="number"
                          min={0}
                          value={vals[item.stateKey]}
                          onChange={(e) => {
                            const num = Number(e.target.value);
                            if (!Number.isNaN(num) && num >= 0) setters[item.stateKey!](num);
                          }}
                          className="w-20 h-8 text-sm font-mono text-right px-2"
                        />
                      </div>
                    ) : (
                      <span className={`text-sm font-mono font-semibold shrink-0 ${isResult ? "text-primary" : isCost ? "text-destructive/70" : "text-foreground"}`}>
                        {formatted}
                      </span>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
          <div className="mt-4 bg-muted/50 rounded-lg p-3 flex items-start gap-2.5">
            <AlertCircle size={14} className="text-muted-foreground mt-0.5 shrink-0" />
            <p className="text-xs text-muted-foreground font-body">
              Exemplo baseado em studio de 30m² em Pinheiros, ADR R$ 350, ocupação 75%. Valores reais variam por unidade e operação.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* ── Scenarios ── */}
      <h3 className="font-display text-xl font-bold text-foreground mb-2">Cenários de retorno</h3>
      <p className="text-muted-foreground text-sm font-body mb-4">Clique em cada cenário para ver as métricas. O cenário base é o mais provável para uma operação bem executada.</p>

      <div className="flex flex-wrap gap-2 mb-4">
        {SCENARIOS.map((s) => (
          <Button
            key={s.key}
            size="sm"
            variant={activeScenario === s.key ? "default" : "outline"}
            onClick={() => setActiveScenario(s.key as ActiveScenario)}
            className={`min-h-[44px] px-4 ${activeScenario === s.key ? "bg-primary text-primary-foreground" : ""}`}
          >
            <s.icon size={14} className="mr-1.5" />
            {s.label}
          </Button>
        ))}
      </div>

      <Card className={`border-2 ${scenario.color} mb-10`}>
        <CardContent className="p-5 md:p-6">
          <div className="flex items-center gap-2 mb-3">
            <Badge className={`${scenario.badgeColor} font-body text-xs`}>{scenario.label}</Badge>
            <p className="text-sm text-muted-foreground font-body">{scenario.desc}</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-center">
            {Object.entries(scenario.metrics).map(([key, val]) => {
              const labels: Record<string, string> = {
                ocupacao: "Ocupação",
                adr: "Diária média",
                receitaBruta: "Receita bruta/mês",
                receitaLiquida: "Receita líquida/mês",
                yield: "Yield anual",
                payback: "Payback estimado",
              };
              return (
                <div key={key} className="py-2">
                  <p className="text-xl md:text-2xl font-display font-bold text-foreground">{val}</p>
                  <p className="text-xs text-muted-foreground font-body">{labels[key]}</p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* ── Sensitivity ── */}
      <h3 className="font-display text-xl font-bold text-foreground mb-4">O que mais mexe no retorno</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        {SENSITIVITY.map((s, i) => (
          <motion.div
            key={s.driver}
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.08 }}
          >
            <Card className="border-border h-full">
              <CardContent className="p-4 flex items-start gap-3">
                <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
                  <s.icon className={s.color} size={18} />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="font-semibold text-foreground text-sm font-body">{s.driver}</p>
                    <Badge variant="secondary" className="text-[10px] font-body">{s.impact}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground font-body leading-snug">{s.desc}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* ── Key Insight ── */}
      <div className="bg-primary/5 border border-primary/20 rounded-xl p-5 flex items-start gap-3 mb-4">
        <Lightbulb className="text-primary mt-0.5 flex-shrink-0" size={20} />
        <div>
          <p className="font-display font-bold text-foreground text-sm mb-1">O segredo está na composição, não em um fator isolado</p>
          <p className="text-sm text-muted-foreground font-body">Um studio com ADR médio mas 85% de ocupação pode render mais que um com diária alta e 60% de ocupação. Da mesma forma, um condomínio barato em bairro bom pode compensar uma diária menor. Use o simulador para testar seus cenários específicos.</p>
        </div>
      </div>

      <Accordion type="multiple" className="font-body">
        <AccordionItem value="roi-vs-yield">
          <AccordionTrigger className="text-primary font-semibold min-h-[48px]">ROI vs. Yield: qual métrica usar</AccordionTrigger>
          <AccordionContent>
            <div className="text-sm text-muted-foreground leading-relaxed space-y-2">
              <p><strong className="text-foreground">Yield bruto</strong> = receita anual bruta ÷ valor do imóvel. Útil para comparações rápidas entre ativos e regiões. Não considera custos operacionais.</p>
              <p><strong className="text-foreground">Yield líquido</strong> = receita anual líquida ÷ valor do imóvel. Mais realista, mas depende de premissas de custo que variam por operação.</p>
              <p><strong className="text-foreground">ROI (Return on Investment)</strong> = lucro líquido ÷ capital investido total (inclui reforma, mobília, ITBI). É a métrica mais completa, mas exige dados detalhados de implantação.</p>
              <p><strong className="text-foreground">Payback</strong> = capital investido ÷ lucro líquido mensal. Indica em quantos meses o investimento se paga. Para short stay em SP, paybacks entre 5 e 10 anos são considerados saudáveis.</p>
            </div>
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="custos-ocultos">
          <AccordionTrigger className="text-primary font-semibold min-h-[48px]">Custos que investidores iniciantes esquecem</AccordionTrigger>
          <AccordionContent>
            <div className="text-sm text-muted-foreground leading-relaxed space-y-2">
              <p>• <strong className="text-foreground">ITBI</strong>: ~3% do valor do imóvel na compra</p>
              <p>• <strong className="text-foreground">Registro e escritura</strong>: ~1.5% adicional</p>
              <p>• <strong className="text-foreground">Fundo de reserva</strong>: cobrado em muitos condomínios além da taxa ordinária</p>
              <p>• <strong className="text-foreground">Reposição de enxoval</strong>: toalhas, roupas de cama e itens de cozinha a cada 6-12 meses</p>
              <p>• <strong className="text-foreground">Manutenção corretiva</strong>: ~5% da receita anual para reparos inesperados</p>
              <p>• <strong className="text-foreground">Vacância sazonal</strong>: janeiro e períodos entre feriados podem ter ocupação 20-30% menor</p>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </SectionBlock>
  );
}
