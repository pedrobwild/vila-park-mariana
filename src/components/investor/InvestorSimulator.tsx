import { useMemo, useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  AlertCircle,
  Building2,
  Check,
  Copy,
  Home,
  CalendarDays,
  MessageCircle,
  Info,
  RotateCcw,
  TrendingUp,
} from "lucide-react";
import { TYPOLOGIES, type Typology } from "@/data/propertyData";
import { WHATSAPP_PHONE } from "@/data/surroundings";
import { simulatorStorage, type SimulatorPersisted } from "./persistence";

const LIMITS = {
  price: { min: 0, max: 50_000_000, softMin: 100_000, softMax: 20_000_000 },
  condoIptu: { min: 0, max: 50_000, softMin: 200, softMax: 10_000 },
  rent: { min: 0, max: 200_000, softMin: 800, softMax: 50_000 },
  daily: { min: 0, max: 20_000, softMin: 100, softMax: 5_000 },
} as const;

function digitsOnly(input: string, cap: number): string {
  const only = input.replace(/\D/g, "").replace(/^0+(?=\d)/, "");
  if (!only) return "";
  const n = Math.min(Number(only), cap);
  return String(n);
}

function formatBRL(digits: string): string {
  if (!digits) return "";
  return Number(digits).toLocaleString("pt-BR");
}

const CAPEX_LEVELS = [
  { id: "essencial", capex: 25000, rateBoost: 1.0 },
  { id: "premium", capex: 55000, rateBoost: 1.15 },
  { id: "signature", capex: 95000, rateBoost: 1.3 },
] as const;

const MARKET_HINT = {
  studio: { price: 550000, rent: 2600, daily: 260, condoIptu: 900 },
  garden: { price: 950000, rent: 4200, daily: 420, condoIptu: 1500 },
  terrace: { price: 850000, rent: 3800, daily: 380, condoIptu: 1300 },
} as const;

type Mode = "tradicional" | "temporada";

const fmtBRL = (v: number) =>
  `${v < 0 ? "-" : ""}${Math.abs(v).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  })}`;

const fmtPct = (v: number) => `${v.toFixed(2).replace(".", ",")}%`;

interface Props {
  initialTypologyId?: string;
}

interface CurrencyFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (raw: string) => void;
  placeholder?: string;
  hint?: string;
  error?: string | null;
}

function CurrencyField({ id, label, value, onChange, placeholder, hint, error }: CurrencyFieldProps) {
  const display = value ? formatBRL(value) : "";
  return (
    <div>
      <Label htmlFor={id}>{label} (R$)</Label>
      <div className="relative mt-1.5">
        <span
          aria-hidden
          className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-muted-foreground"
        >
          R$
        </span>
        <Input
          id={id}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          value={display}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : `${id}-hint`}
          className={cn(
            "min-h-[46px] pl-10 text-base tabular-nums",
            error && "border-destructive focus-visible:ring-destructive",
          )}
        />
      </div>
      {error ? (
        <p id={`${id}-error`} className="mt-1 flex items-center gap-1.5 text-[12px] text-destructive">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" /> {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-[11px] text-muted-foreground mt-1">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export default function InvestorSimulator({ initialTypologyId }: Props) {
  const { t } = useTranslation();

  // Lazy init: JSON.parse from localStorage only once.
  const [stored] = useState<SimulatorPersisted | null>(() =>
    typeof window !== "undefined" ? simulatorStorage.load() : null,
  );

  // Simulator's own persisted typoId has priority over the quiz-mounted value.
  const [typoId, setTypoId] = useState<string>(
    stored?.typoId ?? initialTypologyId ?? TYPOLOGIES[0].id,
  );
  const [mode, setMode] = useState<Mode>((stored?.mode as Mode) ?? "tradicional");
  const [capexLevelId, setCapexLevelId] = useState<(typeof CAPEX_LEVELS)[number]["id"]>(
    (stored?.capexLevelId as (typeof CAPEX_LEVELS)[number]["id"]) ?? "premium",
  );

  const [price, setPrice] = useState<string>(stored?.price ?? "");
  const [rent, setRent] = useState<string>(stored?.rent ?? "");
  const [daily, setDaily] = useState<string>(stored?.daily ?? "");
  const [occupancy, setOccupancy] = useState<number[]>([stored?.occupancy ?? 70]);
  const [condoIptu, setCondoIptu] = useState<string>(stored?.condoIptu ?? "");

  const typo = TYPOLOGIES.find((x) => x.id === typoId) ?? TYPOLOGIES[0];
  const capexLevel = CAPEX_LEVELS.find((c) => c.id === capexLevelId)!;
  const capexLabel = t(`investorSim.capex.${capexLevel.id}.label`);
  const hint = MARKET_HINT[typoId as keyof typeof MARKET_HINT];

  // React to user-driven typology changes coming from the quiz (props change mid-session).
  const firstRun = useRef(true);
  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    if (initialTypologyId) setTypoId(initialTypologyId);
  }, [initialTypologyId]);

  const validate = (field: keyof typeof LIMITS, value: string): string | null => {
    if (!value) return null;
    const n = Number(value);
    const { softMin, softMax } = LIMITS[field];
    if (n > 0 && n < softMin) return t("investorSim.validate.low");
    if (n > softMax) return t("investorSim.validate.high");
    return null;
  };

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      simulatorStorage.save({
        typoId, mode, capexLevelId, price, rent, daily,
        occupancy: occupancy[0], condoIptu,
      });
    }, 250);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [typoId, mode, capexLevelId, price, rent, daily, occupancy, condoIptu]);

  const handleReset = () => {
    simulatorStorage.clear();
    setPrice(""); setRent(""); setDaily(""); setCondoIptu("");
    setOccupancy([70]); setCapexLevelId("premium"); setMode("tradicional");
    setTypoId(initialTypologyId ?? TYPOLOGIES[0].id);
  };

  const priceError = validate("price", price);
  const condoError = validate("condoIptu", condoIptu);
  const rentError = validate("rent", rent);
  const dailyError = validate("daily", daily);

  const priceN = Number(price) || 0;
  const rentN = Number(rent) || 0;
  const dailyN = Number(daily) || 0;
  const condoN = Number(condoIptu) || 0;
  const capex = capexLevel.capex;

  const result = useMemo(() => {
    const totalInvestment = priceN + capex;
    if (mode === "tradicional") {
      const monthlyGross = rentN;
      // CRÍTICO: sem clamp — permitir fluxo negativo para não esconder prejuízo do usuário.
      const monthlyNet = monthlyGross - condoN;
      const annualNet = monthlyNet * 12;
      const yieldPct = totalInvestment > 0 && annualNet > 0 ? (annualNet / totalInvestment) * 100 : 0;
      const payback = annualNet > 0 ? totalInvestment / annualNet : 0;
      return { totalInvestment, monthlyGross, platformFee: 0, cleaningFee: 0, monthlyNet, annualNet, yieldPct, payback };
    }
    const boostedDaily = dailyN * capexLevel.rateBoost;
    const nights = 30 * (occupancy[0] / 100);
    const monthlyGross = boostedDaily * nights;
    const platformFee = monthlyGross * 0.18;
    const cleaningFee = monthlyGross * 0.12;
    const monthlyNet = monthlyGross - platformFee - cleaningFee - condoN;
    const annualNet = monthlyNet * 12;
    const yieldPct = totalInvestment > 0 && annualNet > 0 ? (annualNet / totalInvestment) * 100 : 0;
    const payback = annualNet > 0 ? totalInvestment / annualNet : 0;
    return { totalInvestment, monthlyGross, platformFee, cleaningFee, monthlyNet, annualNet, yieldPct, payback };
  }, [mode, priceN, rentN, dailyN, occupancy, condoN, capex, capexLevel]);

  const wa = `https://api.whatsapp.com/send?phone=${WHATSAPP_PHONE}&text=${encodeURIComponent(
    t("investorSim.copy.waMsg", { typo: typo.label }),
  )}`;

  const hasResult = result.totalInvestment > 0 && (mode === "tradicional" ? rentN > 0 : dailyN > 0);
  const isNegative = hasResult && result.monthlyNet < 0;

  const [copied, setCopied] = useState(false);
  const copyResetRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const paybackDisplay = result.payback > 0
    ? t("investorSim.metrics.paybackYears", { n: result.payback.toFixed(1) })
    : t("common.dash");

  const buildSummary = (): string => {
    const line = "─".repeat(44);
    const modeLabel = t(mode === "tradicional" ? "investorSim.mode.trad" : "investorSim.mode.temp");
    const rows: string[] = [];
    rows.push(t("investorSim.summary.title"));
    rows.push(new Date().toLocaleString());
    rows.push(line);
    rows.push(t("investorSim.summary.scenario"));
    rows.push(t("investorSim.summary.typology", { label: typo.label, profile: typo.idealProfile }));
    rows.push(t("investorSim.summary.mode", { mode: modeLabel }));
    rows.push(t("investorSim.summary.capexLevel", { label: capexLabel, value: fmtBRL(capex) }));
    rows.push("");
    rows.push(t("investorSim.summary.premises"));
    rows.push(t("investorSim.summary.price", { v: priceN > 0 ? fmtBRL(priceN) : t("common.dash") }));
    rows.push(t("investorSim.summary.condo", { v: condoN > 0 ? fmtBRL(condoN) : t("common.dash") }));
    if (mode === "tradicional") {
      rows.push(t("investorSim.summary.rent", { v: rentN > 0 ? fmtBRL(rentN) : t("common.dash") }));
    } else {
      rows.push(t("investorSim.summary.daily", { v: dailyN > 0 ? fmtBRL(dailyN) : t("common.dash") }));
      rows.push(t("investorSim.summary.boost", { v: capexLevel.rateBoost.toFixed(2) }));
      rows.push(t("investorSim.summary.occ", { v: occupancy[0] }));
    }
    rows.push("");
    rows.push(t("investorSim.summary.result"));
    if (!hasResult) {
      rows.push(t("investorSim.summary.fill"));
    } else {
      rows.push(t("investorSim.summary.invTotal", { v: fmtBRL(result.totalInvestment) }));
      rows.push(t("investorSim.summary.invUnit", { v: fmtBRL(priceN) }));
      rows.push(t("investorSim.summary.invMob", { v: fmtBRL(capex) }));
      rows.push(t("investorSim.summary.grossM", { v: fmtBRL(result.monthlyGross) }));
      if (mode === "temporada") {
        rows.push(t("investorSim.summary.ptf", { v: fmtBRL(result.platformFee) }));
        rows.push(t("investorSim.summary.cln", { v: fmtBRL(result.cleaningFee) }));
      }
      rows.push(t("investorSim.summary.condoLine", { v: fmtBRL(condoN) }));
      rows.push(t("investorSim.summary.netM", { v: fmtBRL(result.monthlyNet) }));
      rows.push(t("investorSim.summary.netY", { v: fmtBRL(result.annualNet) }));
      const yieldStr = result.annualNet > 0 ? fmtPct(result.yieldPct) : t("investorSim.metrics.notApplicable");
      rows.push(t("investorSim.summary.yieldLine", { v: yieldStr }));
      rows.push(t("investorSim.summary.paybackLine", { v: paybackDisplay }));
      if (isNegative) {
        rows.push("");
        rows.push(`⚠ ${t("investorSim.negative.warning")}`);
      }
    }
    rows.push(line);
    rows.push(t("investorSim.summary.disclaimer"));
    return rows.join("\n");
  };

  const handleCopy = async () => {
    const text = buildSummary();
    let ok = false;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        ok = true;
      } else {
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.setAttribute("readonly", "");
        ta.style.position = "absolute";
        ta.style.left = "-9999px";
        document.body.appendChild(ta);
        ta.select();
        ok = document.execCommand("copy");
        document.body.removeChild(ta);
      }
    } catch {
      ok = false;
    }
    if (ok) {
      setCopied(true);
      toast.success(t("investorSim.copy.okTitle"), { description: t("investorSim.copy.okDesc") });
      if (copyResetRef.current) clearTimeout(copyResetRef.current);
      copyResetRef.current = setTimeout(() => setCopied(false), 2000);
    } else {
      toast.error(t("investorSim.copy.failTitle"), { description: t("investorSim.copy.failDesc") });
    }
  };

  useEffect(() => () => { if (copyResetRef.current) clearTimeout(copyResetRef.current); }, []);

  return (
    <Card className="card-elevated border-accent/20">
      <CardContent className="p-5 md:p-7 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <Badge className="bg-accent/10 text-accent border-accent/20 hover:bg-accent/10 mb-2">
              <Building2 className="h-3 w-3 mr-1" /> {typo.label}
            </Badge>
            <h3 className="font-display text-xl md:text-2xl font-semibold text-foreground">
              {t("investorSim.title")}
            </h3>
          </div>
          <div className="inline-flex rounded-full border border-border p-1 bg-muted/40 self-start md:self-auto">
            <button
              type="button"
              onClick={() => setMode("tradicional")}
              className={cn(
                "px-4 py-2 text-sm font-medium rounded-full transition-colors flex items-center gap-1.5",
                mode === "tradicional" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground",
              )}
            >
              <Home className="h-3.5 w-3.5" /> {t("investorSim.mode.trad")}
            </button>
            <button
              type="button"
              onClick={() => setMode("temporada")}
              className={cn(
                "px-4 py-2 text-sm font-medium rounded-full transition-colors flex items-center gap-1.5",
                mode === "temporada" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground",
              )}
            >
              <CalendarDays className="h-3.5 w-3.5" /> {t("investorSim.mode.temp")}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {TYPOLOGIES.map((tp) => (
            <button
              key={tp.id}
              type="button"
              onClick={() => setTypoId(tp.id)}
              className={cn(
                "text-left rounded-xl border p-3 transition-colors",
                typoId === tp.id ? "border-accent bg-accent/5" : "border-border/60 hover:border-accent/40",
              )}
            >
              <p className="text-sm font-semibold text-foreground">{tp.label}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {t("investorSim.profileLabel", { profile: tp.idealProfile })}
              </p>
            </button>
          ))}
        </div>

        <Separator />

        <div className="grid gap-4 md:grid-cols-2">
          <CurrencyField
            id="price"
            label={t("investorSim.field.price")}
            value={price}
            onChange={(v) => setPrice(digitsOnly(v, LIMITS.price.max))}
            placeholder={formatBRL(String(hint?.price ?? 600000))}
            hint={t("investorSim.field.priceHint")}
            error={priceError}
          />

          <div>
            <Label>{t("investorSim.field.capex")}</Label>
            <div className="grid grid-cols-3 gap-1.5 mt-1.5">
              {CAPEX_LEVELS.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setCapexLevelId(c.id)}
                  className={cn(
                    "rounded-lg border px-2 py-2 text-xs font-medium transition-colors min-h-[46px]",
                    capexLevelId === c.id
                      ? "border-accent bg-accent/10 text-accent"
                      : "border-border/60 text-muted-foreground hover:border-accent/40",
                  )}
                >
                  <div className="font-semibold">{t(`investorSim.capex.${c.id}.label`)}</div>
                  <div className="text-[10px] opacity-80">{fmtBRL(c.capex)}</div>
                </button>
              ))}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              {t(`investorSim.capex.${capexLevel.id}.note`)}
            </p>
          </div>

          <CurrencyField
            id="condo"
            label={t("investorSim.field.condo")}
            value={condoIptu}
            onChange={(v) => setCondoIptu(digitsOnly(v, LIMITS.condoIptu.max))}
            placeholder={formatBRL(String(hint?.condoIptu ?? 1000))}
            hint={t("investorSim.field.condoHint")}
            error={condoError}
          />

          {mode === "tradicional" ? (
            <CurrencyField
              id="rent"
              label={t("investorSim.field.rent")}
              value={rent}
              onChange={(v) => setRent(digitsOnly(v, LIMITS.rent.max))}
              placeholder={formatBRL(String(hint?.rent ?? 3000))}
              hint={t("investorSim.field.rentHint")}
              error={rentError}
            />
          ) : (
            <div className="space-y-4">
              <CurrencyField
                id="daily"
                label={t("investorSim.field.daily")}
                value={daily}
                onChange={(v) => setDaily(digitsOnly(v, LIMITS.daily.max))}
                placeholder={formatBRL(String(hint?.daily ?? 300))}
                hint={t("investorSim.field.dailyHint", { level: capexLabel, boost: capexLevel.rateBoost.toFixed(2) })}
                error={dailyError}
              />
              <div>
                <div className="flex items-center justify-between">
                  <Label>{t("investorSim.field.occ")}</Label>
                  <span className="text-sm font-semibold text-accent">{occupancy[0]}%</span>
                </div>
                <Slider
                  value={occupancy}
                  onValueChange={(v) => setOccupancy([Math.min(95, Math.max(45, v[0] ?? 70))])}
                  min={45}
                  max={95}
                  step={1}
                  className="mt-2"
                  aria-label={t("investorSim.field.occAria")}
                />
                <p className="text-[11px] text-muted-foreground mt-1">{t("investorSim.field.occHint")}</p>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleReset}
            className="text-muted-foreground hover:text-foreground"
          >
            <RotateCcw className="mr-2 h-3.5 w-3.5" /> {t("investorSim.reset")}
          </Button>
        </div>

        <div className="rounded-2xl border border-accent/30 bg-accent/5 p-5">
          {!hasResult ? (
            <div className="flex items-start gap-3 text-sm text-muted-foreground">
              <Info className="h-4 w-4 text-accent mt-0.5" />
              <p>{t(mode === "tradicional" ? "investorSim.result.prompt.trad" : "investorSim.result.prompt.temp")}</p>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="h-4 w-4 text-accent" />
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-accent">
                  {t("investorSim.result.eyebrow", { typo: typo.label })}
                </p>
              </div>

              {isNegative && (
                <div
                  role="alert"
                  className="mb-4 flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive"
                >
                  <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-semibold">{t("investorSim.negative.warning")}</p>
                    <p className="text-xs mt-1 text-destructive/80">{t("investorSim.negative.note")}</p>
                  </div>
                </div>
              )}

              <div className="grid gap-4 md:grid-cols-4">
                <div>
                  <p className="text-xs text-muted-foreground">{t("investorSim.metrics.netMonth")}</p>
                  <p className={cn(
                    "font-display text-2xl font-bold tabular-nums",
                    result.monthlyNet < 0 ? "text-destructive" : "text-foreground",
                  )}>
                    {fmtBRL(result.monthlyNet)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{t("investorSim.metrics.netYear")}</p>
                  <p className={cn(
                    "font-display text-2xl font-bold tabular-nums",
                    result.annualNet < 0 ? "text-destructive" : "text-foreground",
                  )}>
                    {fmtBRL(result.annualNet)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{t("investorSim.metrics.yield")}</p>
                  <p
                    className={cn("font-display text-2xl font-bold", result.annualNet > 0 ? "text-accent" : "text-muted-foreground")}
                    title={result.annualNet <= 0 ? t("investorSim.negative.note") : undefined}
                  >
                    {result.annualNet > 0 ? fmtPct(result.yieldPct) : t("common.dash")}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{t("investorSim.metrics.payback")}</p>
                  <p
                    className={cn("font-display text-2xl font-bold", result.payback > 0 ? "text-foreground" : "text-muted-foreground")}
                    title={result.payback <= 0 ? t("investorSim.negative.note") : undefined}
                  >
                    {result.payback > 0 ? t("investorSim.metrics.paybackYears", { n: result.payback.toFixed(1) }) : t("common.dash")}
                  </p>
                </div>
              </div>

              <Separator className="my-5" />

              <div className="grid gap-4 md:grid-cols-2 text-sm">
                <div>
                  <p className="font-semibold text-foreground mb-2">{t("investorSim.sections.rev")}</p>
                  <ul className="space-y-1 text-muted-foreground">
                    <li className="flex justify-between">
                      <span>{t("investorSim.rows.gross")}</span>
                      <span className="text-foreground tabular-nums">{fmtBRL(result.monthlyGross)}</span>
                    </li>
                    {mode === "temporada" && (
                      <>
                        <li className="flex justify-between">
                          <span>{t("investorSim.rows.platform")}</span>
                          <span className="tabular-nums">-{fmtBRL(result.platformFee)}</span>
                        </li>
                        <li className="flex justify-between">
                          <span>{t("investorSim.rows.cleaning")}</span>
                          <span className="tabular-nums">-{fmtBRL(result.cleaningFee)}</span>
                        </li>
                      </>
                    )}
                    <li className="flex justify-between">
                      <span>{t("investorSim.rows.condo")}</span>
                      <span className="tabular-nums">-{fmtBRL(condoN)}</span>
                    </li>
                    <li className={cn(
                      "flex justify-between border-t border-border/40 pt-1 mt-1 font-semibold",
                      result.monthlyNet < 0 ? "text-destructive" : "text-foreground",
                    )}>
                      <span>{t("investorSim.rows.net")}</span>
                      <span className="tabular-nums">{fmtBRL(result.monthlyNet)}</span>
                    </li>
                  </ul>
                </div>
                <div>
                  <p className="font-semibold text-foreground mb-2">{t("investorSim.sections.inv")}</p>
                  <ul className="space-y-1 text-muted-foreground">
                    <li className="flex justify-between">
                      <span>{t("investorSim.rows.unit")}</span>
                      <span className="text-foreground tabular-nums">{fmtBRL(priceN)}</span>
                    </li>
                    <li className="flex justify-between">
                      <span>{t("investorSim.rows.mob", { level: capexLabel })}</span>
                      <span className="text-foreground tabular-nums">{fmtBRL(capex)}</span>
                    </li>
                    <li className="flex justify-between border-t border-border/40 pt-1 mt-1 font-semibold text-foreground">
                      <span>{t("investorSim.rows.total")}</span>
                      <span className="tabular-nums">{fmtBRL(result.totalInvestment)}</span>
                    </li>
                  </ul>
                </div>
              </div>

              <div className="mt-5 flex flex-col sm:flex-row gap-2.5">
                <Button
                  className="bg-accent hover:bg-accent/90 text-accent-foreground min-h-[46px]"
                  onClick={() => window.open(wa, "_blank")}
                >
                  <MessageCircle className="mr-2 h-4 w-4" />
                  {t("investorSim.cta.wa")}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="min-h-[46px]"
                  onClick={handleCopy}
                  aria-live="polite"
                >
                  {copied ? (
                    <><Check className="mr-2 h-4 w-4" />{t("investorSim.cta.copied")}</>
                  ) : (
                    <><Copy className="mr-2 h-4 w-4" />{t("investorSim.cta.copy")}</>
                  )}
                </Button>
              </div>
            </>
          )}
        </div>

        <p className="text-[11px] text-muted-foreground leading-relaxed">
          {t("investorSim.disclaimer")}
        </p>
      </CardContent>
    </Card>
  );
}
