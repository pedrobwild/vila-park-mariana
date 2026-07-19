import { useEffect, useMemo, useRef, useState } from "react";
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
  CheckCircle2,
  AlertTriangle,
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
import BankComparator, { formatConsultDate } from "./BankComparator";
import FinancingGuide from "./FinancingGuide";

/** Enlarged touch target for slider thumbs (WCAG 44x44). */
const SLIDER_TOUCH =
  "[&_[role=slider]]:h-5 [&_[role=slider]]:w-5 [&_[role=slider]]:relative [&_[role=slider]]:after:content-[''] [&_[role=slider]]:after:absolute [&_[role=slider]]:after:-inset-3";

const RATES_CONSULT_DATE = "2026-07-19";

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
            className="inline-flex items-center justify-center text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm h-4 w-4"
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
  className,
}: {
  id: string;
  value: number;
  onChange: (v: number) => void;
  placeholder?: string;
  className?: string;
}) {
  const [text, setText] = useState(fmtBRL(value));
  useEffect(() => {
    // keep in sync when driven from the outside
    setText(fmtBRL(value));
  }, [value]);
  return (
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">R$</span>
      <Input
        id={id}
        inputMode="numeric"
        className={["pl-9 pr-3 h-11 text-right tabular-nums", className ?? ""].join(" ")}
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

/** Fieldset visual grouping with small caps title. */
function Fieldset({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="space-y-4 pt-4 border-t border-border/60 first:border-t-0 first:pt-0">
      <legend className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground mb-1">
        {title}
      </legend>
      {children}
    </fieldset>
  );
}

/** Small subtitle inside advanced accordion. */
function SubTitle({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground pt-2 first:pt-0">
      {children}
    </p>
  );
}

/** Value cell aligned decimal-right, tabular. */
function Val({ children, bold, top }: { children: React.ReactNode; bold?: boolean; top?: boolean }) {
  return (
    <TableCell
      className={[
        "text-right tabular-nums",
        bold ? "font-semibold text-foreground" : "text-foreground/90",
        top ? "border-t border-border" : "",
      ].join(" ")}
    >
      {children}
    </TableCell>
  );
}

function EstimatedBadge() {
  return (
    <Badge variant="outline" className="ml-1 h-4 px-1 text-[9px] uppercase tracking-wide text-muted-foreground border-muted-foreground/30">
      estimado
    </Badge>
  );
}

function generateSimCode(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const rand = Math.floor(Math.random() * 46655)
    .toString(36)
    .toUpperCase()
    .padStart(4, "0")
    .slice(0, 4);
  return `VP-${y}${m}${d}-${rand}`;
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
  const [eligibleProCotista, setEligibleProCotista] = useState<boolean>(false);
  const [fgts, setFgts] = useState<number>(0);
  const [extraAnnual, setExtraAnnual] = useState<number>(0);
  const [extraStrategy, setExtraStrategy] = useState<"reduce-term" | "reduce-installment">("reduce-term");

  const [reportOpen, setReportOpen] = useState(false);
  const simCodeRef = useRef<string>(generateSimCode());
  const [reportEmittedAt, setReportEmittedAt] = useState<Date>(new Date());

  const downPayment = useMemo(() => {
    const base = downOverride ?? Math.round((propertyValue * downPct) / 100);
    return clamp(base + fgts, 0, propertyValue);
  }, [downOverride, downPct, propertyValue, fgts]);

  const downPaymentOwn = Math.max(downPayment - fgts, 0);
  const financedAmount = useMemo(() => Math.max(propertyValue - downPayment, 0), [propertyValue, downPayment]);
  const financedAmountInvalid = financedAmount <= 0;
  const ltvPct = propertyValue > 0 ? (financedAmount / propertyValue) * 100 : 0;
  const downPctActual = propertyValue > 0 ? (downPayment / propertyValue) * 100 : 0;

  useEffect(() => {
    setFinancedPulse(true);
    const t = setTimeout(() => setFinancedPulse(false), 400);
    return () => clearTimeout(t);
  }, [financedAmount]);

  const ltvOk = propertyValue > 0 && financedAmount / propertyValue <= 0.8;
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
  const firstRow = active.schedule[0];

  // Discriminate MIP and DFI totals over the whole contract.
  const totalMip = useMemo(() => active.schedule.reduce((a, r) => a + r.mip, 0), [active]);
  const totalDfi = useMemo(() => active.schedule.reduce((a, r) => a + r.dfi, 0), [active]);
  const totalAdmin = useMemo(() => active.schedule.reduce((a, r) => a + r.admin, 0), [active]);

  // Automatic conference checks (sanity of composition).
  const conference = useMemo(() => {
    const sumAmort = active.schedule.reduce((a, r) => a + r.amortization, 0);
    const sumFull = active.schedule.reduce((a, r) => a + r.fullPayment, 0);
    const composed = active.totalInterest + sumAmort + totalMip + totalDfi + totalAdmin;
    const eps = Math.max(1, active.totalPaid * 1e-4);
    const checks = [
      { label: "Soma das amortizações = valor financiado", pass: Math.abs(sumAmort - active.financedAmount) < eps, detail: `${BRL2(sumAmort)} vs ${BRL2(active.financedAmount)}` },
      { label: "Total pago = juros + amortização + seguros + tarifas", pass: Math.abs(sumFull - composed) < eps, detail: `${BRL2(sumFull)} vs ${BRL2(composed)}` },
      { label: "Total pago (fluxo) = soma das prestações cheias", pass: Math.abs(sumFull - active.totalPaid) < eps, detail: `${BRL2(sumFull)} vs ${BRL2(active.totalPaid)}` },
    ];
    return { ok: checks.every((c) => c.pass), checks };
  }, [active, totalMip, totalDfi, totalAdmin]);

  useEffect(() => {
    if (!conference.ok) {
      // eslint-disable-next-line no-console
      console.warn("[FinancingSimulator] Conferência automática falhou", conference.checks);
    }
  }, [conference]);

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
  const upfrontCash = downPaymentOwn + costs.total;

  const requiredMonthly = requiredIncome(active.firstInstallment);
  const fit = monthlyIncome > 0 ? incomeFit(active.firstInstallment, monthlyIncome) : null;

  const bankLabel = BANK_PRESETS.find((b) => b.id === bankId)?.label ?? "—";

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
    `Olá! Simulei um financiamento no Vila Park Vila Mariana (${simCodeRef.current}):\n` +
      `• Imóvel: ${BRL(propertyValue)}\n` +
      `• Entrada: ${BRL(downPayment)} (${downPctActual.toFixed(0)}%)\n` +
      `• Prazo: ${inputBase.termMonths} meses (${system})\n` +
      `• 1ª parcela: ${BRL(active.firstInstallment)}\n` +
      `• CET: ${PCT(active.cetAnnual)} a.a.\n` +
      `Gostaria de mais informações.`,
  );

  const openReport = () => {
    simCodeRef.current = generateSimCode();
    setReportEmittedAt(new Date());
    setReportOpen(true);
  };

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
                Premissas da simulação
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* ============= IMÓVEL ============= */}
              <Fieldset title="Imóvel">
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
                    <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="custom">Personalizado</SelectItem>
                      {TYPOLOGIES.map((t) => (
                        <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-[11px] text-muted-foreground">Preços por unidade sob consulta. Use o campo abaixo para simular qualquer valor.</p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="pv">Valor do imóvel</Label>
                    <span className="text-sm font-semibold text-foreground tabular-nums">{BRL(propertyValue)}</span>
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
              </Fieldset>

              {/* ============= ENTRADA E PRAZO ============= */}
              <Fieldset title="Entrada e prazo">
                {/* Down payment: dual R$ / % */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="flex items-center gap-1.5">
                      Entrada
                      <InfoHint text="Pelas regras SFH, a entrada mínima é 20% do valor do imóvel (LTV 80%)." label="Entrada" />
                    </Label>
                    <span className="text-sm font-semibold text-foreground tabular-nums">
                      {BRL(downPayment)} · {downPctActual.toFixed(0)}%
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
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
                    <div className="relative">
                      <Input
                        id="dp-pct"
                        inputMode="decimal"
                        value={downPct.toFixed(0)}
                        onChange={(e) => {
                          const p = clamp(parseFloat(e.target.value.replace(",", ".")) || 0, 0, 100);
                          setDownPct(p);
                          setDownOverride(null);
                        }}
                        className="pr-8 h-11 text-right tabular-nums"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">%</span>
                    </div>
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
                  {!ltvOk && (
                    <p className="text-xs text-destructive">Entrada abaixo de 20% — fora das regras do SFH.</p>
                  )}
                </div>

                {/* Financed amount (auto) */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="financed" className="flex items-center gap-1.5">
                      <RefreshCw className="h-3 w-3 text-primary" aria-hidden="true" />
                      Valor financiado
                      <InfoHint text="Valor financiado = valor do imóvel − entrada. O FGTS, quando informado, compõe a entrada e reduz o valor financiado." label="Valor financiado" />
                    </Label>
                    <span className="text-xs text-muted-foreground">automático</span>
                  </div>
                  <div className="relative">
                    <span
                      className={[
                        "absolute left-3 top-1/2 -translate-y-1/2 text-sm",
                        financedAmountInvalid ? "text-destructive" : "text-muted-foreground",
                      ].join(" ")}
                    >
                      R$
                    </span>
                    <Input
                      id="financed"
                      readOnly
                      aria-readonly="true"
                      tabIndex={-1}
                      inputMode="numeric"
                      value={fmtBRL(financedAmount)}
                      className={[
                        "pl-9 pr-3 h-11 text-right font-semibold tabular-nums cursor-default transition-colors duration-300",
                        financedAmountInvalid
                          ? "border-destructive bg-destructive/10 text-destructive focus-visible:ring-destructive"
                          : "bg-muted/40",
                        financedPulse && !financedAmountInvalid ? "border-primary/60 text-primary" : "",
                      ].join(" ")}
                    />
                  </div>
                  {financedAmountInvalid && (
                    <p className="text-xs text-destructive">
                      A entrada não pode ser igual ou maior que o valor do imóvel. Reduza a entrada ou o FGTS.
                    </p>
                  )}
                </div>

                {/* Term */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Prazo</Label>
                    <span className="text-sm font-semibold text-foreground tabular-nums">
                      {inputBase.termMonths} meses · {(inputBase.termMonths / 12).toFixed(0)} anos
                    </span>
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
              </Fieldset>

              {/* ============= CONDIÇÕES ============= */}
              <Fieldset title="Condições">
                {/* System — segmented control */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-1.5">
                    Sistema de amortização
                    <InfoHint text="SAC: parcelas decrescem, paga menos juros total. Price: parcelas fixas, mais previsível." label="Sistema" />
                  </Label>
                  <div
                    role="tablist"
                    aria-label="Sistema de amortização"
                    className="inline-flex w-full rounded-md border border-border/60 bg-muted/30 p-0.5"
                  >
                    {(["SAC", "PRICE"] as const).map((opt) => {
                      const selected = system === opt;
                      const hint = opt === "SAC" ? "Parcelas decrescentes, menos juros" : "Parcelas fixas, mais previsibilidade";
                      return (
                        <TooltipProvider key={opt} delayDuration={200}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                type="button"
                                role="tab"
                                aria-selected={selected}
                                onClick={() => setSystem(opt)}
                                className={[
                                  "flex-1 h-9 rounded-[5px] text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                                  selected
                                    ? "bg-background text-foreground shadow-sm"
                                    : "text-muted-foreground hover:text-foreground",
                                ].join(" ")}
                              >
                                {opt === "PRICE" ? "Price" : "SAC"}
                              </button>
                            </TooltipTrigger>
                            <TooltipContent className="text-xs">{hint}</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      );
                    })}
                  </div>
                </div>

                {/* Bank + rate summary (bank selected in advanced) */}
                <div className="rounded-md border border-border/60 bg-muted/20 p-3 text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Banco</span>
                    <span className="font-semibold text-foreground">{bankLabel}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Taxa anunciada</span>
                    <span className="font-semibold text-foreground tabular-nums">{PCT_PT(annualRate)} a.a. + TR</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Configure banco, perfil, FGTS e amortização no modo avançado abaixo.
                  </p>
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
              </Fieldset>
            </CardContent>

            {/* Sticky summary chips */}
            <div className="border-t border-border/60 px-6 py-3 flex flex-wrap gap-1.5 bg-muted/10">
              <Chip>Financiado {BRL(financedAmount)}</Chip>
              <Chip>LTV {ltvPct.toFixed(0)}%</Chip>
              <Chip>{inputBase.termMonths} meses</Chip>
              <Chip>{system === "SAC" ? "SAC" : "Price"}</Chip>
            </div>
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
                <AccordionContent className="px-6 pb-6 space-y-4">
                  <SubTitle>Banco e taxa</SubTitle>
                  <div className="space-y-1.5">
                    <Label className="flex items-center gap-1.5">
                      Banco
                      <InfoHint text="Presets jul/2026 (SBPE, juros efetivos a.a. + TR). A taxa é definida pela instituição financeira." label="Banco" />
                    </Label>
                    <Select value={bankId} onValueChange={(v) => {
                      setBankId(v);
                      const p = BANK_PRESETS.find((b) => b.id === v);
                      if (p) setAnnualRate(p.annualRate);
                    }}>
                      <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {BANK_PRESETS.map((b) => (
                          <SelectItem key={b.id} value={b.id}>{b.label} — {PCT_PT(b.annualRate)} a.a. + TR</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="rate" className="flex items-center gap-1.5">
                      Taxa de juros efetiva (a.a.)
                      <InfoHint text="Juros efetivos anuais + TR, definidos pela instituição. Convertemos para mensal por (1+ia)^(1/12)−1." label="Taxa" />
                    </Label>
                    <div className="relative">
                      <Input
                        id="rate"
                        readOnly
                        aria-readonly="true"
                        tabIndex={-1}
                        value={PCT_PT(annualRate)}
                        className="pr-20 h-11 font-semibold tabular-nums cursor-default bg-muted/40 text-right"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">a.a. + TR</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground">Taxa definida pelo banco — selecione outra instituição para comparar.</p>
                  </div>

                  <SubTitle>Perfil do comprador</SubTitle>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="age" className="flex items-center gap-1.5">
                        Idade
                        <InfoHint text="Usada para estimar o MIP (seguro por morte/invalidez). Quanto mais jovem, mais barato." label="Idade" />
                      </Label>
                      <Input id="age" type="number" min={18} max={80} value={buyerAge} className="h-11 text-right tabular-nums"
                        onChange={(e) => setBuyerAge(clamp(parseInt(e.target.value) || 35, 18, 80))} />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="income-adv" className="flex items-center gap-1.5">
                        Renda familiar
                        <InfoHint text="Comprometimento máx. de 30% da renda com a 1ª parcela." label="Renda" />
                      </Label>
                      <CurrencyInput id="income-adv" value={monthlyIncome} onChange={setMonthlyIncome} placeholder="15000" />
                    </div>
                  </div>

                  <SubTitle>FGTS</SubTitle>
                  <div className="space-y-1.5">
                    <Label htmlFor="fgts" className="flex items-center gap-1.5">
                      FGTS na entrada (opcional)
                      <InfoHint text="Somamos ao valor da entrada. Regras: 3 anos de contribuição e imóvel em SP até R$ 1,5 mi." label="FGTS" />
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

                  <SubTitle>Amortização extraordinária</SubTitle>
                  <div className="space-y-2 rounded-lg border border-border/60 p-3">
                    <Label className="flex items-center gap-1.5">
                      Aporte extra anual
                      <InfoHint text="Aporte extra a cada 12 meses. Escolha se reduz o prazo ou a parcela." label="Amortização extra" />
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

          {/* ============ DRE: Composição do investimento ============ */}
          <Card className="border-border/60 card-elevated">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <CardTitle className="text-base">Composição do investimento</CardTitle>
                <ConferenceSeal ok={conference.ok} checks={conference.checks} />
              </div>
              <p className="text-[11px] text-muted-foreground">
                Formato demonstrativo: todo total tem composição. Valores no sistema {system}.
              </p>
            </CardHeader>
            <CardContent>
              <Table>
                <TableBody>
                  <TableRow>
                    <TableCell className="text-muted-foreground">Valor do imóvel</TableCell>
                    <Val>{BRL2(propertyValue)}</Val>
                  </TableRow>
                  <TableRow>
                    <TableCell className="text-muted-foreground">(−) Entrada{fgts > 0 && ` (recursos próprios + FGTS)`}</TableCell>
                    <Val>−{BRL2(downPayment)}</Val>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-semibold">(=) Valor financiado</TableCell>
                    <Val bold top>{BRL2(active.financedAmount)}</Val>
                  </TableRow>
                  <TableRow>
                    <TableCell className="text-muted-foreground">(+) Juros do contrato<sup className="ml-0.5">¹</sup></TableCell>
                    <Val>+{BRL2(active.totalInterest)}</Val>
                  </TableRow>
                  <TableRow>
                    <TableCell className="text-muted-foreground">(+) Seguro MIP (morte/invalidez) <EstimatedBadge /></TableCell>
                    <Val>+{BRL2(totalMip)}</Val>
                  </TableRow>
                  <TableRow>
                    <TableCell className="text-muted-foreground">(+) Seguro DFI (danos ao imóvel) <EstimatedBadge /></TableCell>
                    <Val>+{BRL2(totalDfi)}</Val>
                  </TableRow>
                  <TableRow>
                    <TableCell className="text-muted-foreground">(+) Tarifa administrativa (R$ 25/mês × {inputBase.termMonths})</TableCell>
                    <Val>+{BRL2(totalAdmin)}</Val>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-semibold">(=) Total pago no contrato</TableCell>
                    <Val bold top>{BRL2(active.totalPaid)}</Val>
                  </TableRow>
                </TableBody>
              </Table>
              <p className="text-[11px] text-muted-foreground mt-3 leading-relaxed">
                ¹ Juros calculados sobre saldo devedor à taxa efetiva {PCT_PT(annualRate)} a.a. — mensal equivalente
                {" "}<span className="tabular-nums">{PCT(active.monthlyRate, 4)}</span> a.m. via (1+ia)<sup>1/12</sup>−1.
              </p>
            </CardContent>
          </Card>

          {/* Recursos próprios na assinatura + Composição da 1ª parcela */}
          <div className="grid md:grid-cols-2 gap-3">
            <Card className="border-border/60">
              <CardHeader className="pb-2"><CardTitle className="text-base">Recursos próprios na assinatura</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableBody>
                    <TableRow>
                      <TableCell className="text-muted-foreground">Entrada (recursos próprios)</TableCell>
                      <Val>{BRL2(downPaymentOwn)}</Val>
                    </TableRow>
                    {fgts > 0 && (
                      <TableRow>
                        <TableCell className="text-muted-foreground text-[11px] italic">+ FGTS aplicado (não sai do bolso)</TableCell>
                        <Val>{BRL2(fgts)}</Val>
                      </TableRow>
                    )}
                    <TableRow>
                      <TableCell className="text-muted-foreground">(+) ITBI (3%)<sup className="ml-0.5">²</sup></TableCell>
                      <Val>+{BRL2(costs.itbi)}</Val>
                    </TableRow>
                    <TableRow>
                      <TableCell className="text-muted-foreground">(+) Escritura + registro (~1,5%)</TableCell>
                      <Val>+{BRL2(costs.registry)}</Val>
                    </TableRow>
                    <TableRow>
                      <TableCell className="text-muted-foreground">(+) Avaliação bancária <EstimatedBadge /></TableCell>
                      <Val>+{BRL2(costs.appraisal)}</Val>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-semibold">(=) Desembolso inicial</TableCell>
                      <Val bold top>{BRL2(upfrontCash)}</Val>
                    </TableRow>
                  </TableBody>
                </Table>
                <p className="text-[11px] text-muted-foreground mt-2">² Alíquotas de São Paulo (capital). Podem variar em cada município.</p>
              </CardContent>
            </Card>

            <Card className="border-border/60">
              <CardHeader className="pb-2"><CardTitle className="text-base">Composição da 1ª parcela ({system})</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableBody>
                    <TableRow>
                      <TableCell className="text-muted-foreground">Amortização</TableCell>
                      <Val>{BRL2(firstRow?.amortization ?? 0)}</Val>
                    </TableRow>
                    <TableRow>
                      <TableCell className="text-muted-foreground">(+) Juros</TableCell>
                      <Val>+{BRL2(firstRow?.interest ?? 0)}</Val>
                    </TableRow>
                    <TableRow>
                      <TableCell className="text-muted-foreground">(+) Seguro MIP <EstimatedBadge /></TableCell>
                      <Val>+{BRL2(firstRow?.mip ?? 0)}</Val>
                    </TableRow>
                    <TableRow>
                      <TableCell className="text-muted-foreground">(+) Seguro DFI <EstimatedBadge /></TableCell>
                      <Val>+{BRL2(firstRow?.dfi ?? 0)}</Val>
                    </TableRow>
                    <TableRow>
                      <TableCell className="text-muted-foreground">(+) Tarifa administrativa</TableCell>
                      <Val>+{BRL2(firstRow?.admin ?? 0)}</Val>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-semibold">(=) Prestação total</TableCell>
                      <Val bold top>{BRL2(firstRow?.fullPayment ?? 0)}</Val>
                    </TableRow>
                  </TableBody>
                </Table>
                <p className="text-[11px] text-muted-foreground mt-2">
                  CET considera todos esses componentes ao longo do contrato: {PCT(active.cetMonthly, 4)} a.m. · {PCT(active.cetAnnual)} a.a. <EstimatedBadge />
                </p>
              </CardContent>
            </Card>
          </div>

          {/* SAC vs PRICE compare */}
          <Card className="border-border/60">
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
                  <TableRow><TableCell>1ª parcela</TableCell><Val>{BRL(sac.firstInstallment)}</Val><Val>{BRL(price.firstInstallment)}</Val></TableRow>
                  <TableRow><TableCell>Última parcela</TableCell><Val>{BRL(sac.lastInstallment)}</Val><Val>{BRL(price.lastInstallment)}</Val></TableRow>
                  <TableRow><TableCell>Total de juros</TableCell><Val>{BRL(sac.totalInterest)}</Val><Val>{BRL(price.totalInterest)}</Val></TableRow>
                  <TableRow><TableCell>Total pago</TableCell><Val>{BRL(sac.totalPaid)}</Val><Val>{BRL(price.totalPaid)}</Val></TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Income fit */}
          <Card className="border-border/60">
            <CardHeader className="pb-2"><CardTitle className="text-base">Análise de renda</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm">Renda mínima necessária: <span className="font-semibold text-foreground tabular-nums">{BRL(requiredMonthly)}</span> <span className="text-xs text-muted-foreground">(comprometimento máx. 30%)</span></p>
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

          <BankComparator
            propertyValue={propertyValue}
            downPayment={downPayment}
            termMonths={termMonths}
            system={system}
            buyerAge={buyerAge}
            monthlyIncome={monthlyIncome}
            eligibleProCotista={eligibleProCotista}
            onToggleProCotista={setEligibleProCotista}
          />

          <FinancingGuide />

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Button size="lg" className="flex-1 min-h-[48px] gap-2" onClick={openReport}>
              <Printer className="h-4 w-4" /> Gerar relatório completo
            </Button>
            <a href={`https://api.whatsapp.com/send?phone=${WHATSAPP_PHONE}&text=${whatsappMsg}`} target="_blank" rel="noopener noreferrer" className="flex-1">
              <Button size="lg" variant="outline" className="w-full min-h-[48px] gap-2">
                <MessageCircle className="h-4 w-4" /> Enviar simulação por WhatsApp
              </Button>
            </a>
          </div>

          {/* Amortization preview table */}
          <Card className="border-border/60 mt-2">
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
                      <TableCell className="text-right tabular-nums">{BRL2(row.payment)}</TableCell>
                      <TableCell className="text-right tabular-nums text-foreground/80">{BRL2(row.interest)}</TableCell>
                      <TableCell className="text-right tabular-nums">{BRL2(row.amortization)}</TableCell>
                      <TableCell className="text-right tabular-nums text-foreground/80">{BRL2(row.mip + row.dfi + row.admin)}</TableCell>
                      <TableCell className="text-right tabular-nums font-semibold">{BRL2(row.fullPayment)}</TableCell>
                      <TableCell className="text-right tabular-nums">{BRL(row.balance)}</TableCell>
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
                              <span className="text-xs text-muted-foreground mr-2 tabular-nums">{BRL(totalYear)}</span>
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
                                      <TableCell className="text-right tabular-nums">{BRL2(row.payment)}</TableCell>
                                      <TableCell className="text-right tabular-nums text-foreground/80">{BRL2(row.interest)}</TableCell>
                                      <TableCell className="text-right tabular-nums">{BRL2(row.amortization)}</TableCell>
                                      <TableCell className="text-right tabular-nums text-foreground/80">{BRL2(row.mip + row.dfi + row.admin)}</TableCell>
                                      <TableCell className="text-right tabular-nums font-semibold">{BRL2(row.fullPayment)}</TableCell>
                                      <TableCell className="text-right tabular-nums">{BRL(row.balance)}</TableCell>
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
        </div>
      </div>

      {/* ------- Report dialog ------- */}
      <Dialog open={reportOpen} onOpenChange={setReportOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto print:max-w-none print:shadow-none">
          <DialogHeader className="print:hidden">
            <DialogTitle className="flex items-center justify-between">
              <span>Demonstrativo da simulação</span>
              <Button size="sm" onClick={() => window.print()} className="gap-2">
                <Printer className="h-4 w-4" /> Imprimir / salvar em PDF
              </Button>
            </DialogTitle>
          </DialogHeader>

          <div className="print-report space-y-6 py-4">
            {/* 1. Identificação */}
            <div className="border-b border-border/60 pb-4">
              <p className="text-xs uppercase tracking-wider text-primary font-semibold">Vila Park · Vila Mariana</p>
              <h1 className="font-display text-2xl font-bold text-foreground mt-1">Demonstrativo de financiamento imobiliário</h1>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs mt-3">
                <IdRow label="Código">{simCodeRef.current}</IdRow>
                <IdRow label="Emitido em">{reportEmittedAt.toLocaleString("pt-BR")}</IdRow>
                <IdRow label="Taxas consultadas em">{formatConsultDate(RATES_CONSULT_DATE)}</IdRow>
              </div>
              <div className="mt-4 rounded-md border border-border/60 bg-muted/20 p-3 text-xs leading-relaxed">
                <strong className="text-foreground">Como ler este demonstrativo:</strong> cada total tem sua composição
                logo acima. Valores marcados com <EstimatedBadge /> são estimados e podem variar por banco, idade e
                condições da operação. Números conferidos automaticamente — veja o selo abaixo.
                <div className="mt-2"><ConferenceSeal ok={conference.ok} checks={conference.checks} /></div>
              </div>
            </div>

            {/* 2. Premissas */}
            <section>
              <h2 className="font-display font-bold text-lg mb-2">Premissas</h2>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>• Valor do imóvel: <strong className="text-foreground">{BRL2(propertyValue)}</strong></li>
                <li>• Entrada: <strong className="text-foreground">{BRL2(downPayment)}</strong> ({downPctActual.toFixed(0)}%){fgts > 0 && ` — incluindo ${BRL2(fgts)} de FGTS`}</li>
                <li>• Valor financiado: <strong className="text-foreground">{BRL2(active.financedAmount)}</strong> · LTV {ltvPct.toFixed(0)}%</li>
                <li>• Prazo: <strong className="text-foreground">{inputBase.termMonths} meses</strong> · Sistema: <strong className="text-foreground">{system}</strong></li>
                <li>• Banco: <strong className="text-foreground">{bankLabel}</strong> · Taxa: <strong className="text-foreground">{PCT_PT(annualRate)} a.a. + TR</strong> (efetiva anunciada, sujeita a análise)</li>
                <li>• Idade do comprador: {buyerAge} anos · Seguros MIP+DFI e tarifa R$ 25/mês estimados</li>
              </ul>
            </section>

            {/* 3. Resultado */}
            <section>
              <h2 className="font-display font-bold text-lg mb-2">Resultado</h2>
              <Table>
                <TableBody>
                  <TableRow><TableCell>1ª prestação (com seguros e tarifa)</TableCell><Val bold>{BRL2(active.firstInstallment)}</Val></TableRow>
                  <TableRow><TableCell>{system === "SAC" ? "Última prestação" : "Prestação (fixa)"}</TableCell><Val>{BRL2(active.lastInstallment)}</Val></TableRow>
                  <TableRow><TableCell>Total de juros<sup>¹</sup></TableCell><Val>{BRL2(active.totalInterest)}</Val></TableRow>
                  <TableRow><TableCell>Seguros + tarifas <EstimatedBadge /></TableCell><Val>{BRL2(active.totalInsurance)}</Val></TableRow>
                  <TableRow><TableCell className="font-semibold">Total pago no contrato</TableCell><Val bold top>{BRL2(active.totalPaid)}</Val></TableRow>
                  <TableRow><TableCell>CET a.m.<sup>²</sup></TableCell><Val>{PCT(active.cetMonthly, 4)}</Val></TableRow>
                  <TableRow><TableCell>CET a.a. <EstimatedBadge /></TableCell><Val bold>{PCT(active.cetAnnual)}</Val></TableRow>
                </TableBody>
              </Table>
            </section>

            {/* 4. Evolução */}
            <section>
              <h2 className="font-display font-bold text-lg mb-2">Evolução (meses 1–12, marcos anuais e últimos 2)</h2>
              <div className="border border-border/60 rounded-lg overflow-hidden">
                <Table>
                  <TableHeader><TableRow>
                    <TableHead>Mês</TableHead>
                    <TableHead className="text-right">Prestação total</TableHead>
                    <TableHead className="text-right">Juros</TableHead>
                    <TableHead className="text-right">Amortização</TableHead>
                    <TableHead className="text-right">Saldo devedor</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {(() => {
                      const s = active.schedule;
                      const idxs = new Set<number>();
                      for (let i = 0; i < Math.min(12, s.length); i++) idxs.add(i);
                      for (let y = 1; y * 12 <= s.length; y++) idxs.add(y * 12 - 1);
                      if (s.length >= 2) idxs.add(s.length - 2);
                      if (s.length >= 1) idxs.add(s.length - 1);
                      return Array.from(idxs).sort((a, b) => a - b).map((i) => {
                        const row = s[i];
                        return (
                          <TableRow key={row.n}>
                            <TableCell>{row.n}</TableCell>
                            <TableCell className="text-right tabular-nums">{BRL2(row.fullPayment)}</TableCell>
                            <TableCell className="text-right tabular-nums">{BRL2(row.interest)}</TableCell>
                            <TableCell className="text-right tabular-nums">{BRL2(row.amortization)}</TableCell>
                            <TableCell className="text-right tabular-nums">{BRL(row.balance)}</TableCell>
                          </TableRow>
                        );
                      });
                    })()}
                  </TableBody>
                </Table>
              </div>
              <p className="text-[11px] text-muted-foreground mt-2">
                Tabela anualizada completa: {yearlySchedule.length} anos · pago no 1º ano{" "}
                {BRL(yearlySchedule[0]?.totalPayment ?? 0)} · pago no último ano{" "}
                {BRL(yearlySchedule[yearlySchedule.length - 1]?.totalPayment ?? 0)}.
              </p>
            </section>

            {/* 5. Custos de aquisição */}
            <section>
              <h2 className="font-display font-bold text-lg mb-2">Custos de aquisição (São Paulo)</h2>
              <Table>
                <TableBody>
                  <TableRow><TableCell>ITBI (3%)</TableCell><Val>{BRL2(costs.itbi)}</Val></TableRow>
                  <TableRow><TableCell>Escritura + registro (~1,5%)</TableCell><Val>{BRL2(costs.registry)}</Val></TableRow>
                  <TableRow><TableCell>Avaliação bancária <EstimatedBadge /></TableCell><Val>{BRL2(costs.appraisal)}</Val></TableRow>
                  <TableRow><TableCell className="font-semibold">Total de custos</TableCell><Val bold top>{BRL2(costs.total)}</Val></TableRow>
                  <TableRow><TableCell className="font-semibold">Desembolso inicial (entrada + custos)</TableCell><Val bold>{BRL2(upfrontCash)}</Val></TableRow>
                </TableBody>
              </Table>
            </section>

            {/* 6. Pontos que exigem confirmação */}
            <section>
              <h2 className="font-display font-bold text-lg mb-2 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-600" /> Pontos que exigem confirmação
              </h2>
              <ul className="text-sm space-y-1.5 text-foreground/90 list-disc pl-5">
                <li>Análise de crédito e comprovação de renda pela instituição.</li>
                <li>Avaliação do imóvel pelo banco — o financiamento incide sobre o MENOR entre preço e avaliação.</li>
                <li>Enquadramento em programa (MCMV Classe Média, Pró-Cotista) conforme regras vigentes.</li>
                <li>Uso do FGTS na entrada/amortização, sujeito às regras da Caixa e do empregador.</li>
                <li>Taxa efetiva final, seguros MIP/DFI (variam por banco e idade) e tarifas administrativas.</li>
              </ul>
            </section>

            {/* 7. Notas explicativas */}
            <section className="text-xs text-muted-foreground leading-relaxed border-t border-border/60 pt-3">
              <p className="font-semibold text-foreground mb-1">Notas</p>
              <p>¹ Juros aplicados sobre o saldo devedor à taxa efetiva {PCT_PT(annualRate)} a.a. Conversão para mensal: (1+i<sub>a</sub>)<sup>1/12</sup> − 1 = {PCT(active.monthlyRate, 4)} a.m.</p>
              <p>² O CET agrega prestação bancária, seguros MIP/DFI e tarifa administrativa, encontrando a taxa que iguala o valor financiado ao fluxo de pagamentos.</p>
              <p>Seguros MIP e DFI são estimativas de mercado e variam por banco, idade e política. Em linhas indexadas (IPCA, poupança) o saldo devedor varia no tempo.</p>
            </section>

            {/* Avisos obrigatórios */}
            <section className="text-[11px] text-muted-foreground leading-relaxed border-t border-border/60 pt-3 space-y-2">
              <p>
                As taxas e condições apresentadas correspondem às informações públicas localizadas na data indicada. A
                aprovação e as condições efetivas dependem da análise de crédito, renda, entrada, prazo, avaliação do
                imóvel, relacionamento bancário, regularidade do imóvel e políticas da instituição. Compare o Custo
                Efetivo Total e consulte as propostas oficiais antes da contratação.
              </p>
              <p>
                Informações tributárias, documentais e jurídicas podem variar conforme a operação e devem ser
                confirmadas com profissionais habilitados, com o banco e com os órgãos competentes.
              </p>
            </section>

            <div className="print:hidden pt-2">
              <a href={`https://api.whatsapp.com/send?phone=${WHATSAPP_PHONE}&text=${whatsappMsg}`} target="_blank" rel="noopener noreferrer">
                <Button size="lg" className="w-full gap-2"><MessageCircle className="h-4 w-4" /> Falar com o time Vila Park</Button>
              </a>
            </div>
          </div>
        </DialogContent>
      </Dialog>

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

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-border/60 bg-background px-2.5 py-0.5 text-[11px] font-medium text-foreground/90 tabular-nums">
      {children}
    </span>
  );
}

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
      <p className={`font-display font-bold mt-1 tabular-nums ${highlight ? "text-accent text-lg" : "text-foreground text-base"}`}>{value}</p>
    </div>
  );
}

function IdRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="text-sm font-semibold text-foreground tabular-nums">{children}</div>
    </div>
  );
}

function ConferenceSeal({ ok, checks }: { ok: boolean; checks: { label: string; pass: boolean; detail: string }[] }) {
  return (
    <TooltipProvider delayDuration={100}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            aria-label={ok ? "Conferência automática aprovada" : "Conferência automática com aviso"}
            className={[
              "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              ok
                ? "border-emerald-600/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                : "border-amber-600/40 bg-amber-500/10 text-amber-800 dark:text-amber-300",
            ].join(" ")}
          >
            {ok ? <CheckCircle2 className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}
            {ok ? "Números conferidos" : "Verificar composição"}
          </button>
        </TooltipTrigger>
        <TooltipContent className="max-w-sm text-xs">
          <p className="font-semibold mb-1">Verificações automáticas</p>
          <ul className="space-y-1">
            {checks.map((c, i) => (
              <li key={i} className={c.pass ? "" : "text-amber-700 dark:text-amber-300"}>
                {c.pass ? "✓" : "!"} {c.label} <span className="opacity-70 tabular-nums">({c.detail})</span>
              </li>
            ))}
          </ul>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
