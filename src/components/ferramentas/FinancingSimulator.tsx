import { useEffect, useMemo, useState } from "react";
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip as RTooltip,
  ResponsiveContainer,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import {
  Calculator,
  Info,
  Printer,
  MessageCircle,
  TrendingDown,
  ChevronDown,
  Sparkles,
  RefreshCw,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { TYPOLOGIES } from "@/data/propertyData";
import { WHATSAPP_PHONE } from "@/data/surroundings";
import {
  BANK_PRESETS,
  BRL,
  BRL2,
  PCT,
  PCT_PT,
  acquisitionCosts,
  checkMCMV,
  incomeFit,
  requiredIncome,
  simulate,
  simulateWithExtras,
  type AmortSystem,
} from "@/lib/financing";

/** Enlarged touch target for slider thumbs (WCAG 44x44). */
const SLIDER_TOUCH =
  "[&_[role=slider]]:h-5 [&_[role=slider]]:w-5 [&_[role=slider]]:relative [&_[role=slider]]:after:content-[''] [&_[role=slider]]:after:absolute [&_[role=slider]]:after:-inset-3";

/* ---------- helpers ---------- */

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
const num = (s: string) => {
  const cleaned = s.replace(/[^\d,.-]/g, "").replace(/\.(?=\d{3}(\D|$))/g, "").replace(",", ".");
  const n = parseFloat(cleaned);
  return isNaN(n) ? 0 : n;
};
const fmtBRL = (v: number) => (v > 0 ? v.toLocaleString("pt-BR") : "");

function InfoHint({ text, label }: { text: string; label?: string }) {
  return (
    <TooltipProvider delayDuration={100}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            aria-label={label ? `Mais informações: ${label}` : "Mais informações"}
            className="inline-flex text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
          >
            <Info className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs text-xs leading-relaxed">{text}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function CurrencyInput({
  id,
  value,
  onChange,
  placeholder,
}: {
  id: string;
  value: number;
  onChange: (v: number) => void;
  placeholder?: string;
}) {
  const [text, setText] = useState(fmtBRL(value));
  return (
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">R$</span>
      <Input
        id={id}
        inputMode="numeric"
        className="pl-9"
        placeholder={placeholder}
        value={text}
        onFocus={() => setText(value ? String(value) : "")}
        onChange={(e) => {
          setText(e.target.value);
          onChange(num(e.target.value));
        }}
        onBlur={() => setText(fmtBRL(value))}
      />
    </div>
  );
}

/* ---------- main ---------- */

export default function FinancingSimulator() {
  // simple inputs
  const [typologyId, setTypologyId] = useState<string>("custom");
  const [propertyValue, setPropertyValue] = useState<number>(650_000);
  const [downPct, setDownPct] = useState<number>(20);
  const [downOverride, setDownOverride] = useState<number | null>(null);
  const [termMonths, setTermMonths] = useState<number>(360);
  const [financedPulse, setFinancedPulse] = useState(false);

  // advanced
  const [bankId, setBankId] = useState<string>("caixa");
  const [annualRate, setAnnualRate] = useState<number>(BANK_PRESETS[0].annualRate);
  const [system, setSystem] = useState<AmortSystem>("SAC");
  const [buyerAge, setBuyerAge] = useState<number>(35);
  const [monthlyIncome, setMonthlyIncome] = useState<number>(0);
  const [fgts, setFgts] = useState<number>(0);
  const [extraAnnual, setExtraAnnual] = useState<number>(0);
  const [extraStrategy, setExtraStrategy] = useState<"reduce-term" | "reduce-installment">("reduce-term");

  const [reportOpen, setReportOpen] = useState(false);

  const downPayment = useMemo(() => {
    const base = downOverride ?? Math.round((propertyValue * downPct) / 100);
    return clamp(base + fgts, 0, propertyValue);
  }, [downOverride, downPct, propertyValue, fgts]);

  const financedAmount = useMemo(() => Math.max(propertyValue - downPayment, 0), [propertyValue, downPayment]);
  const financedAmountInvalid = financedAmount <= 0;

  useEffect(() => {
    setFinancedPulse(true);
    const t = setTimeout(() => setFinancedPulse(false), 400);
    return () => clearTimeout(t);
  }, [financedAmount]);

  const ltvOk = propertyValue > 0 && (propertyValue - downPayment) / propertyValue <= 0.8;
  const mcmv = useMemo(() => checkMCMV(propertyValue, monthlyIncome || undefined), [propertyValue, monthlyIncome]);

  const inputBase = {
    propertyValue,
    downPayment,
    termMonths: clamp(Math.round(termMonths), 12, 420),
    annualRate,
    buyerAgeYears: buyerAge,
  };

  const sac = useMemo(() => simulate("SAC", inputBase), [propertyValue, downPayment, termMonths, annualRate, buyerAge]);
  const price = useMemo(() => simulate("PRICE", inputBase), [propertyValue, downPayment, termMonths, annualRate, buyerAge]);
  const active = system === "SAC" ? sac : price;

  const extras = useMemo(() => {
    if (extraAnnual <= 0) return {};
    const out: Record<number, number> = {};
    for (let y = 1; y * 12 < inputBase.termMonths; y++) out[y * 12] = extraAnnual;
    return out;
  }, [extraAnnual, inputBase.termMonths]);

  const extraSim = useMemo(
    () =>
      extraAnnual > 0
        ? simulateWithExtras({ system, base: inputBase, extras, strategy: extraStrategy })
        : null,
    [extraAnnual, system, propertyValue, downPayment, termMonths, annualRate, buyerAge, extraStrategy],
  );

  const costs = acquisitionCosts(propertyValue);
  const upfrontCash = downPayment - fgts + costs.total;

  const requiredMonthly = requiredIncome(active.firstInstallment);
  const fit = monthlyIncome > 0 ? incomeFit(active.firstInstallment, monthlyIncome) : null;

  /* chart data */
  const balanceData = useMemo(() => {
    const step = Math.max(1, Math.floor(inputBase.termMonths / 60));
    return sac.schedule
      .filter((_, i) => i % step === 0 || i === sac.schedule.length - 1)
      .map((row, idx) => ({
        month: row.n,
        SAC: Math.round(row.balance),
        PRICE: Math.round(price.schedule[sac.schedule.indexOf(row)]?.balance ?? 0),
        _idx: idx,
      }));
  }, [sac, price, inputBase.termMonths]);

  const compositionData = useMemo(() => {
    const step = Math.max(1, Math.floor(active.schedule.length / 60));
    return active.schedule
      .filter((_, i) => i % step === 0 || i === active.schedule.length - 1)
      .map((row) => ({
        month: row.n,
        Juros: Math.round(row.interest),
        Amortização: Math.round(row.amortization),
      }));
  }, [active]);

  const donutData = [
    { name: "Entrada + custos", value: Math.round(upfrontCash) },
    { name: "Principal financiado", value: Math.round(active.financedAmount) },
    { name: "Juros", value: Math.round(active.totalInterest) },
    { name: "Seguros + tarifas", value: Math.round(active.totalInsurance) },
  ];
  const donutColors = ["hsl(var(--primary))", "hsl(var(--muted-foreground))", "hsl(var(--destructive))", "hsl(var(--accent))"];

  const yearlySchedule = useMemo(() => {
    const rows: { year: number; totalPayment: number; totalInterest: number; balance: number }[] = [];
    for (let y = 1; y * 12 <= active.schedule.length; y++) {
      const slice = active.schedule.slice((y - 1) * 12, y * 12);
      rows.push({
        year: y,
        totalPayment: slice.reduce((a, r) => a + r.fullPayment, 0),
        totalInterest: slice.reduce((a, r) => a + r.interest, 0),
        balance: slice[slice.length - 1].balance,
      });
    }
    return rows;
  }, [active]);

  const whatsappMsg = encodeURIComponent(
    `Olá! Simulei um financiamento no Vila Park Vila Mariana:\n` +
      `• Imóvel: ${BRL(propertyValue)}\n` +
      `• Entrada: ${BRL(downPayment)} (${((downPayment / propertyValue) * 100).toFixed(0)}%)\n` +
      `• Prazo: ${inputBase.termMonths} meses (${system})\n` +
      `• 1ª parcela: ${BRL(active.firstInstallment)}\n` +
      `• CET: ${PCT(active.cetAnnual)} a.a.\n` +
      `Gostaria de mais informações.`,
  );

  return (
    <section className="scroll-mt-24 py-12 md:py-16">
      {/* Header */}
      <header className="mb-6">
        <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground flex items-center gap-2">
          <Calculator className="h-6 w-6 text-primary" />
          Simulador de financiamento imobiliário
        </h2>
        <p className="text-muted-foreground mt-1 max-w-2xl">
          Comparamos SAC e Price em tempo real, com seguros, tarifas, CET e custos de aquisição em São Paulo. Simulação
          estimativa — a proposta oficial é sempre do banco.
        </p>
      </header>

      <div className="grid lg:grid-cols-5 gap-6">
        {/* ------- Inputs ------- */}
        <div className="lg:col-span-2 space-y-4 lg:sticky lg:top-20 lg:self-start lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto lg:pr-1">
          <Card className="border-border/60">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                Modo simples
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Typology */}
              <div className="space-y-1.5">
                <Label>Unidade Vila Park</Label>
                <Select
                  value={typologyId}
                  onValueChange={(v) => {
                    setTypologyId(v);
                    const t = TYPOLOGIES.find((x) => x.id === v);
                    if (t && t.purchasePrice > 0) setPropertyValue(t.purchasePrice);
                  }}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="custom">Personalizado</SelectItem>
                    {TYPOLOGIES.map((t) => (
                      <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-muted-foreground">Preços por unidade sob consulta. Use o campo abaixo para simular qualquer valor.</p>
              </div>

              {/* Property value */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="pv" className="flex items-center gap-1.5">Valor do imóvel</Label>
                  <span className="text-sm font-semibold text-foreground">{BRL(propertyValue)}</span>
                </div>
                <CurrencyInput id="pv" value={propertyValue} onChange={setPropertyValue} placeholder="650000" />
                <Slider
                  value={[propertyValue]}
                  min={200_000}
                  max={3_000_000}
                  step={10_000}
                  onValueChange={(v) => setPropertyValue(v[0])}
                  className={SLIDER_TOUCH}
                />
              </div>


              {/* Down payment */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-1.5">
                    Entrada
                    <InfoHint text="Pelas regras SFH, a entrada mínima é 20% do valor do imóvel (LTV 80%)." />
                  </Label>
                  <span className="text-sm font-semibold text-foreground">
                    {BRL(downPayment)} ({((downPayment / propertyValue) * 100).toFixed(0)}%)
                  </span>
                </div>
                <Slider
                  value={[downPct]}
                  min={20}
                  max={80}
                  step={1}
                  onValueChange={(v) => {
                    setDownPct(v[0]);
                    setDownOverride(null);
                  }}
                  className={SLIDER_TOUCH}
                />
                <div className="flex justify-between text-[11px] text-muted-foreground px-0.5">
                  <span>20% (mín. SFH)</span>
                  <span>80%</span>
                </div>
                <CurrencyInput
                  id="dp"
                  value={downOverride ?? Math.round((propertyValue * downPct) / 100)}
                  onChange={(v) => {
                    const maxDown = Math.max(propertyValue - fgts, 0);
                    const clamped = clamp(v, 0, maxDown);
                    setDownOverride(clamped);
                    setDownPct(clamp((clamped / Math.max(propertyValue, 1)) * 100, 0, 100));
                  }}
                />
                {!ltvOk && (
                  <p className="text-xs text-destructive">Entrada abaixo de 20% — fora das regras do SFH.</p>
                )}
              </div>

              {/* Financed amount (auto) */}
              <div
                className={[
                  "space-y-1 rounded-lg border px-3 py-2.5",
                  financedAmountInvalid
                    ? "border-destructive bg-destructive/10"
                    : "border-border/60 bg-muted/30",
                ].join(" ")}
              >
                <div className="flex items-center justify-between">
                  <Label className="text-xs text-muted-foreground font-normal flex items-center">
                    Valor financiado
                    <InfoHint text="Calculado automaticamente: valor do imóvel menos entrada (inclui FGTS, quando informado)." />
                  </Label>
                  <span
                    className={[
                      "text-sm font-semibold tabular-nums",
                      financedAmountInvalid ? "text-destructive" : "text-foreground",
                    ].join(" ")}
                  >
                    {BRL(financedAmount)}
                  </span>
                </div>
                {financedAmountInvalid && (
                  <p className="text-xs text-destructive">
                    A entrada não pode ser igual ou maior que o valor do imóvel. Reduza a entrada ou o FGTS para financiar um valor positivo.
                  </p>
                )}
              </div>



              {/* Term */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Prazo</Label>
                  <span className="text-sm font-semibold text-foreground">{inputBase.termMonths} meses ({(inputBase.termMonths / 12).toFixed(0)} anos)</span>
                </div>
                <Slider
                  value={[termMonths]}
                  min={60}
                  max={420}
                  step={12}
                  onValueChange={(v) => setTermMonths(v[0])}
                  className={SLIDER_TOUCH}
                />
                <div className="flex justify-between text-[11px] text-muted-foreground px-0.5">
                  <span>5 anos (60 meses)</span>
                  <span>35 anos (420 meses)</span>
                </div>
              </div>

              {/* System */}
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5">
                  Sistema de amortização
                  <InfoHint text="SAC: parcelas decrescem, paga menos juros total. Price: parcelas fixas, mais previsível." />
                </Label>
                <Tabs value={system} onValueChange={(v) => setSystem(v as AmortSystem)}>
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="SAC">SAC</TabsTrigger>
                    <TabsTrigger value="PRICE">Price</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>

              {mcmv.eligible && (
                <div className="rounded-lg border border-primary/40 bg-primary/5 p-3">
                  <p className="text-sm font-semibold text-primary flex items-center gap-1.5">
                    <Sparkles className="h-4 w-4" /> Você pode se enquadrar no MCMV Faixa 4
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Imóvel até R$ 600 mil + renda familiar até R$ 13 mil dão acesso a taxas de {PCT_PT(mcmv.suggestedRateMin, 1)} a {PCT_PT(mcmv.suggestedRateMax, 1)} a.a. (regras 2026).
                  </p>
                  <Button variant="outline" size="sm" className="mt-2 h-8" onClick={() => setAnnualRate(10.25)}>
                    Aplicar taxa 10,25% a.a.
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Advanced */}
          <Card className="border-border/60">
            <Accordion type="single" collapsible>
              <AccordionItem value="adv" className="border-none">
                <AccordionTrigger className="px-6 py-4 hover:no-underline">
                  <span className="flex items-center gap-2 text-base font-semibold">
                    <ChevronDown className="h-4 w-4" /> Modo avançado
                  </span>
                </AccordionTrigger>
                <AccordionContent className="px-6 pb-6 space-y-5">
                  {/* Bank */}
                  <div className="space-y-1.5">
                    <Label>Banco (presets jul/2026)</Label>
                    <Select value={bankId} onValueChange={(v) => {
                      setBankId(v);
                      const p = BANK_PRESETS.find((b) => b.id === v);
                      if (p) setAnnualRate(p.annualRate);
                    }}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {BANK_PRESETS.map((b) => (
                          <SelectItem key={b.id} value={b.id}>{b.label} — {PCT_PT(b.annualRate)} a.a. + TR</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {/* Rate */}
                  <div className="space-y-1.5">
                    <Label htmlFor="rate" className="flex items-center gap-1.5">
                      Taxa de juros efetiva (a.a.)
                      <InfoHint text="Juros efetivos anuais + TR. Convertemos para mensal equivalente." />
                    </Label>
                    <Input id="rate" type="number" step="0.01" value={annualRate}
                      onChange={(e) => setAnnualRate(parseFloat(e.target.value) || 0)} />
                  </div>
                  {/* Age */}
                  <div className="space-y-1.5">
                    <Label htmlFor="age" className="flex items-center gap-1.5">
                      Idade do comprador
                      <InfoHint text="Usada para estimar o MIP (seguro por morte/invalidez). Quanto mais jovem, mais barato." />
                    </Label>
                    <Input id="age" type="number" min={18} max={80} value={buyerAge}
                      onChange={(e) => setBuyerAge(clamp(parseInt(e.target.value) || 35, 18, 80))} />
                  </div>
                  {/* Income */}
                  <div className="space-y-1.5">
                    <Label htmlFor="income">Renda familiar mensal (opcional)</Label>
                    <CurrencyInput id="income" value={monthlyIncome} onChange={setMonthlyIncome} placeholder="15000" />
                  </div>
                  {/* FGTS */}
                  <div className="space-y-1.5">
                    <Label htmlFor="fgts" className="flex items-center gap-1.5">
                      FGTS na entrada (opcional)
                      <InfoHint text="Somamos ao valor da entrada. Regras: 3 anos de contribuição e imóvel em SP até R$ 1,5 mi." />
                    </Label>
                    <CurrencyInput
                      id="fgts"
                      value={fgts}
                      onChange={(v) => {
                        const base = downOverride ?? Math.round((propertyValue * downPct) / 100);
                        const maxFgts = Math.max(propertyValue - base, 0);
                        setFgts(clamp(v, 0, maxFgts));
                      }}
                    />
                  </div>
                  {/* Extra */}
                  <div className="space-y-2 rounded-lg border border-border/60 p-3">
                    <Label className="flex items-center gap-1.5">
                      Amortização extraordinária anual
                      <InfoHint text="Aporte extra a cada 12 meses. Escolha se reduz o prazo ou a parcela." />
                    </Label>
                    <CurrencyInput id="extra" value={extraAnnual} onChange={setExtraAnnual} />
                    <Tabs value={extraStrategy} onValueChange={(v) => setExtraStrategy(v as typeof extraStrategy)}>
                      <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="reduce-term">Reduzir prazo</TabsTrigger>
                        <TabsTrigger value="reduce-installment">Reduzir parcela</TabsTrigger>
                      </TabsList>
                    </Tabs>
                    {extraSim && (
                      <div className="text-xs text-muted-foreground pt-1">
                        <span className="font-semibold text-primary">Economia estimada:</span> {BRL(extraSim.interestSaved)} em juros
                        {extraStrategy === "reduce-term" && ` · ${extraSim.monthsSaved} meses a menos`}
                      </div>
                    )}
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </Card>
        </div>

        {/* ------- Results ------- */}
        <div className="lg:col-span-3 space-y-4">
          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Kpi label="1ª parcela" value={BRL(active.firstInstallment)} highlight />
            <Kpi label={system === "SAC" ? "Última parcela" : "Parcela (fixa)"} value={BRL(active.lastInstallment)} />
            <Kpi label="CET a.a." value={PCT(active.cetAnnual)} hint="Custo Efetivo Total: inclui seguros e tarifas." />
            <Kpi label="Total pago" value={BRL(active.totalPaid)} />
          </div>

          {/* SAC vs PRICE compare */}
          <Card className="border-border/60 card-elevated">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">SAC × Price lado a lado</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead />
                    <TableHead className="text-right">SAC</TableHead>
                    <TableHead className="text-right">Price</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow><TableCell>1ª parcela</TableCell><TableCell className="text-right">{BRL(sac.firstInstallment)}</TableCell><TableCell className="text-right">{BRL(price.firstInstallment)}</TableCell></TableRow>
                  <TableRow><TableCell>Última parcela</TableCell><TableCell className="text-right">{BRL(sac.lastInstallment)}</TableCell><TableCell className="text-right">{BRL(price.lastInstallment)}</TableCell></TableRow>
                  <TableRow><TableCell>Total de juros</TableCell><TableCell className="text-right">{BRL(sac.totalInterest)}</TableCell><TableCell className="text-right">{BRL(price.totalInterest)}</TableCell></TableRow>
                  <TableRow><TableCell>Total pago</TableCell><TableCell className="text-right">{BRL(sac.totalPaid)}</TableCell><TableCell className="text-right">{BRL(price.totalPaid)}</TableCell></TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Income fit + upfront */}
          <div className="grid md:grid-cols-2 gap-3">
            <Card className="border-border/60">
              <CardHeader className="pb-2"><CardTitle className="text-base">Análise de renda</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm">Renda mínima necessária: <span className="font-semibold text-foreground">{BRL(requiredMonthly)}</span> <span className="text-xs text-muted-foreground">(comprometimento máx. 30%)</span></p>
                <div className="space-y-1.5">
                  <Label htmlFor="income-inline" className="text-xs">Sua renda familiar (opcional)</Label>
                  <CurrencyInput id="income-inline" value={monthlyIncome} onChange={setMonthlyIncome} placeholder="15000" />
                </div>
                {fit && (
                  <Badge className={
                    fit === "ok" ? "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border-emerald-600/40" :
                    fit === "tight" ? "bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-600/40" :
                    "bg-destructive/15 text-destructive border-destructive/40"
                  } variant="outline">
                    {fit === "ok" ? "Cabe no seu orçamento" : fit === "tight" ? "Apertado, próximo do limite" : "Acima do limite bancário"}
                  </Badge>
                )}
              </CardContent>
            </Card>
            <Card className="border-border/60">
              <CardHeader className="pb-2"><CardTitle className="text-base">Desembolso inicial</CardTitle></CardHeader>
              <CardContent className="space-y-1 text-sm">
                <Row label="Entrada (recursos próprios)" value={BRL(downPayment - fgts)} />
                {fgts > 0 && <Row label="FGTS aplicado" value={BRL(fgts)} muted />}
                <Row label={<>ITBI (3%) <InfoHint text="Imposto de Transmissão de Bens Imóveis, alíquota de SP." /></>} value={BRL(costs.itbi)} muted />
                <Row label="Escritura + registro (~1,5%)" value={BRL(costs.registry)} muted />
                <Row label="Avaliação bancária" value={BRL(costs.appraisal)} muted />
                <div className="border-t border-border/60 pt-2 mt-2">
                  <Row label={<span className="font-semibold">Total desembolsado</span>} value={<span className="font-display text-lg font-bold text-primary">{BRL(upfrontCash)}</span>} />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Charts */}
          <Tabs defaultValue="balance">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="balance">Saldo devedor</TabsTrigger>
              <TabsTrigger value="composition">Juros × amortização</TabsTrigger>
              <TabsTrigger value="donut">Desembolso total</TabsTrigger>
            </TabsList>
            <TabsContent value="balance">
              <Card className="border-border/60"><CardContent className="pt-6">
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart data={balanceData}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => (v / 1000).toFixed(0) + "k"} />
                    <RTooltip formatter={(v: number) => BRL(v)} />
                    <Legend />
                    <Line type="monotone" dataKey="SAC" stroke="hsl(var(--accent))" strokeWidth={2.5} dot={false} />
                    <Line type="monotone" dataKey="PRICE" stroke="hsl(215 12% 55%)" strokeWidth={2} strokeDasharray="5 4" dot={false} />

                  </LineChart>
                </ResponsiveContainer>
              </CardContent></Card>
            </TabsContent>
            <TabsContent value="composition">
              <Card className="border-border/60"><CardContent className="pt-6">
                <ResponsiveContainer width="100%" height={260}>
                  <AreaChart data={compositionData}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => (v / 1000).toFixed(0) + "k"} />
                    <RTooltip formatter={(v: number) => BRL(v)} />
                    <Legend />
                    <Area type="monotone" dataKey="Juros" stackId="1" stroke="hsl(var(--destructive))" fill="hsl(var(--destructive) / 0.4)" />
                    <Area type="monotone" dataKey="Amortização" stackId="1" stroke="hsl(var(--primary))" fill="hsl(var(--primary) / 0.4)" />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent></Card>
            </TabsContent>
            <TabsContent value="donut">
              <Card className="border-border/60"><CardContent className="pt-6">
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie data={donutData} innerRadius={60} outerRadius={100} paddingAngle={2} dataKey="value">
                      {donutData.map((_, i) => <Cell key={i} fill={donutColors[i]} />)}
                    </Pie>
                    <RTooltip formatter={(v: number) => BRL(v)} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent></Card>
            </TabsContent>
          </Tabs>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Button size="lg" className="flex-1 min-h-[48px] gap-2" onClick={() => setReportOpen(true)}>
              <Printer className="h-4 w-4" /> Gerar relatório completo
            </Button>
            <a href={`https://api.whatsapp.com/send?phone=${WHATSAPP_PHONE}&text=${whatsappMsg}`} target="_blank" rel="noopener noreferrer" className="flex-1">
              <Button size="lg" variant="outline" className="w-full min-h-[48px] gap-2">
                <MessageCircle className="h-4 w-4" /> Enviar simulação por WhatsApp
              </Button>
            </a>
          </div>
        </div>
      </div>

      {/* ------- Report dialog ------- */}
      <Dialog open={reportOpen} onOpenChange={setReportOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto print:max-w-none print:shadow-none">
          <DialogHeader className="print:hidden">
            <DialogTitle className="flex items-center justify-between">
              <span>Relatório da simulação</span>
              <Button size="sm" onClick={() => window.print()} className="gap-2">
                <Printer className="h-4 w-4" /> Imprimir / salvar em PDF
              </Button>
            </DialogTitle>
          </DialogHeader>

          <div className="print-report space-y-6 py-4">
            {/* Cover */}
            <div className="border-b border-border/60 pb-4">
              <p className="text-xs uppercase tracking-wider text-primary font-semibold">Vila Park · Vila Mariana</p>
              <h1 className="font-display text-2xl font-bold text-foreground mt-1">Relatório de simulação de financiamento</h1>
              <p className="text-sm text-muted-foreground mt-1">Emitido em {new Date().toLocaleDateString("pt-BR")}</p>
            </div>

            {/* Executive summary */}
            <section>
              <h2 className="font-display font-bold text-lg mb-3">Resumo executivo</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Kpi label="1ª parcela" value={BRL(active.firstInstallment)} highlight />
                <Kpi label="CET a.a." value={PCT(active.cetAnnual)} />
                <Kpi label="Total pago" value={BRL(active.totalPaid)} />
                <Kpi label="Desembolso inicial" value={BRL(upfrontCash)} />
              </div>
            </section>

            {/* Assumptions */}
            <section>
              <h2 className="font-display font-bold text-lg mb-2">Premissas</h2>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>• Valor do imóvel: <strong className="text-foreground">{BRL(propertyValue)}</strong></li>
                <li>• Entrada: <strong className="text-foreground">{BRL(downPayment)}</strong> ({((downPayment / propertyValue) * 100).toFixed(0)}%){fgts > 0 && ` — incluindo ${BRL(fgts)} de FGTS`}</li>
                <li>• Prazo: <strong className="text-foreground">{inputBase.termMonths} meses</strong> · Sistema: <strong className="text-foreground">{system}</strong></li>
                <li>• Taxa: <strong className="text-foreground">{PCT_PT(annualRate)} a.a.</strong> · Idade: {buyerAge} anos</li>
                <li>• Seguros: MIP + DFI + tarifa administrativa (R$ 25/mês)</li>
              </ul>
            </section>

            {/* SAC vs PRICE */}
            <section>
              <h2 className="font-display font-bold text-lg mb-2">Comparativo SAC × Price</h2>
              <Table>
                <TableHeader><TableRow><TableHead /><TableHead className="text-right">SAC</TableHead><TableHead className="text-right">Price</TableHead></TableRow></TableHeader>
                <TableBody>
                  <TableRow><TableCell>1ª parcela</TableCell><TableCell className="text-right">{BRL(sac.firstInstallment)}</TableCell><TableCell className="text-right">{BRL(price.firstInstallment)}</TableCell></TableRow>
                  <TableRow><TableCell>Última parcela</TableCell><TableCell className="text-right">{BRL(sac.lastInstallment)}</TableCell><TableCell className="text-right">{BRL(price.lastInstallment)}</TableCell></TableRow>
                  <TableRow><TableCell>Total de juros</TableCell><TableCell className="text-right">{BRL(sac.totalInterest)}</TableCell><TableCell className="text-right">{BRL(price.totalInterest)}</TableCell></TableRow>
                  <TableRow><TableCell>Total pago</TableCell><TableCell className="text-right">{BRL(sac.totalPaid)}</TableCell><TableCell className="text-right">{BRL(price.totalPaid)}</TableCell></TableRow>
                </TableBody>
              </Table>
            </section>

            {/* Costs */}
            <section>
              <h2 className="font-display font-bold text-lg mb-2">Custos de aquisição (São Paulo)</h2>
              <Table>
                <TableBody>
                  <TableRow><TableCell>ITBI (3%)</TableCell><TableCell className="text-right">{BRL(costs.itbi)}</TableCell></TableRow>
                  <TableRow><TableCell>Escritura + registro (~1,5%)</TableCell><TableCell className="text-right">{BRL(costs.registry)}</TableCell></TableRow>
                  <TableRow><TableCell>Avaliação bancária</TableCell><TableCell className="text-right">{BRL(costs.appraisal)}</TableCell></TableRow>
                  <TableRow className="font-semibold"><TableCell>Total</TableCell><TableCell className="text-right">{BRL(costs.total)}</TableCell></TableRow>
                </TableBody>
              </Table>
            </section>

            {/* Yearly schedule */}
            <section>
              <h2 className="font-display font-bold text-lg mb-2">Tabela de amortização (anualizada)</h2>
              <div className="max-h-80 overflow-y-auto border border-border/60 rounded-lg">
                <Table>
                  <TableHeader><TableRow><TableHead>Ano</TableHead><TableHead className="text-right">Pago no ano</TableHead><TableHead className="text-right">Juros</TableHead><TableHead className="text-right">Saldo devedor</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {yearlySchedule.map((r) => (
                      <TableRow key={r.year}>
                        <TableCell>{r.year}</TableCell>
                        <TableCell className="text-right">{BRL(r.totalPayment)}</TableCell>
                        <TableCell className="text-right">{BRL(r.totalInterest)}</TableCell>
                        <TableCell className="text-right">{BRL(r.balance)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </section>

            <p className="text-xs text-muted-foreground border-t border-border/60 pt-3">
              <strong>Aviso:</strong> esta é uma simulação estimativa, gerada com base em taxas de mercado de referência e regras do SFH. Não substitui a proposta oficial do banco, que depende de análise de crédito, avaliação do imóvel e enquadramento em programas como MCMV/SBPE.
            </p>

            <div className="print:hidden pt-2">
              <a href={`https://api.whatsapp.com/send?phone=${WHATSAPP_PHONE}&text=${whatsappMsg}`} target="_blank" rel="noopener noreferrer">
                <Button size="lg" className="w-full gap-2"><MessageCircle className="h-4 w-4" /> Falar com o time Vila Park</Button>
              </a>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Amortization preview table */}
      <Card className="border-border/60 mt-4">
        <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><TrendingDown className="h-4 w-4" />Primeiras 12 parcelas ({system})</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Nº</TableHead>
              <TableHead className="text-right">Parcela</TableHead>
              <TableHead className="text-right">Juros</TableHead>
              <TableHead className="text-right">Amortização</TableHead>
              <TableHead className="text-right">Seguros+tarifa</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="text-right">Saldo devedor</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {active.schedule.slice(0, 12).map((row) => (
                <TableRow key={row.n}>
                  <TableCell>{row.n}</TableCell>
                  <TableCell className="text-right">{BRL2(row.payment)}</TableCell>
                  <TableCell className="text-right text-foreground/80">{BRL2(row.interest)}</TableCell>
                  <TableCell className="text-right">{BRL2(row.amortization)}</TableCell>
                  <TableCell className="text-right text-foreground/80">{BRL2(row.mip + row.dfi + row.admin)}</TableCell>
                  <TableCell className="text-right font-semibold">{BRL2(row.fullPayment)}</TableCell>
                  <TableCell className="text-right">{BRL(row.balance)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
        <CardContent className="pt-0">
          <Accordion type="single" collapsible>
            <AccordionItem value="all" className="border-none">
              <AccordionTrigger className="py-2 text-sm hover:no-underline">
                Ver todas as parcelas (por ano)
              </AccordionTrigger>
              <AccordionContent>
                <Accordion type="multiple" className="space-y-1">
                  {Array.from({ length: Math.ceil(active.schedule.length / 12) }).map((_, yi) => {
                    const year = yi + 1;
                    const rows = active.schedule.slice(yi * 12, yi * 12 + 12);
                    const totalYear = rows.reduce((a, r) => a + r.fullPayment, 0);
                    return (
                      <AccordionItem key={year} value={`y${year}`} className="border border-border/50 rounded-md">
                        <AccordionTrigger className="px-3 py-2 text-sm hover:no-underline">
                          <span className="flex-1 text-left">Ano {year}</span>
                          <span className="text-xs text-muted-foreground mr-2">{BRL(totalYear)}</span>
                        </AccordionTrigger>
                        <AccordionContent className="px-2 overflow-x-auto">
                          <Table>
                            <TableHeader><TableRow>
                              <TableHead>Nº</TableHead>
                              <TableHead className="text-right">Parcela</TableHead>
                              <TableHead className="text-right">Juros</TableHead>
                              <TableHead className="text-right">Amortização</TableHead>
                              <TableHead className="text-right">Seg.+tarifa</TableHead>
                              <TableHead className="text-right">Total</TableHead>
                              <TableHead className="text-right">Saldo</TableHead>
                            </TableRow></TableHeader>
                            <TableBody>
                              {rows.map((row) => (
                                <TableRow key={row.n}>
                                  <TableCell>{row.n}</TableCell>
                                  <TableCell className="text-right">{BRL2(row.payment)}</TableCell>
                                  <TableCell className="text-right text-foreground/80">{BRL2(row.interest)}</TableCell>
                                  <TableCell className="text-right">{BRL2(row.amortization)}</TableCell>
                                  <TableCell className="text-right text-foreground/80">{BRL2(row.mip + row.dfi + row.admin)}</TableCell>
                                  <TableCell className="text-right font-semibold">{BRL2(row.fullPayment)}</TableCell>
                                  <TableCell className="text-right">{BRL(row.balance)}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </AccordionContent>
                      </AccordionItem>
                    );
                  })}
                </Accordion>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>

      {/* Print styles */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          .print-report, .print-report * { visibility: visible; }
          .print-report { position: absolute; left: 0; top: 0; width: 100%; padding: 24px; }
          .print-report .max-h-80,
          .print-report [class*="max-h-"] { max-height: none !important; overflow: visible !important; }
        }
      `}</style>

    </section>
  );
}

/* ---------- small presentational bits ---------- */

function Kpi({ label, value, hint, highlight }: { label: string; value: string; hint?: string; highlight?: boolean }) {
  return (
    <div
      className={`rounded-lg p-3 ${
        highlight
          ? "bg-card border border-accent/40 border-l-4 border-l-accent shadow-sm"
          : "bg-card border border-border/60"
      }`}
    >
      <p className="text-[11px] text-muted-foreground uppercase tracking-wide flex items-center gap-1">
        {label} {hint && <InfoHint text={hint} label={label} />}
      </p>
      <p className={`font-display font-bold mt-1 ${highlight ? "text-accent text-lg" : "text-foreground text-base"}`}>{value}</p>
    </div>
  );
}

function Row({ label, value, muted }: { label: React.ReactNode; value: React.ReactNode; muted?: boolean }) {
  return (
    <div className={`flex items-center justify-between ${muted ? "text-muted-foreground" : ""}`}>
      <span className="flex items-center gap-1">{label}</span>
      <span>{value}</span>
    </div>
  );
}
