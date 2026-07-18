import { useMemo, useState, useEffect, useRef } from "react";
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

// Limites (cap) por campo — evitam inputs absurdos e travam o teclado numérico.
const LIMITS = {
  price: { min: 0, max: 50_000_000, softMin: 100_000, softMax: 20_000_000 },
  condoIptu: { min: 0, max: 50_000, softMin: 200, softMax: 10_000 },
  rent: { min: 0, max: 200_000, softMin: 800, softMax: 50_000 },
  daily: { min: 0, max: 20_000, softMin: 100, softMax: 5_000 },
} as const;

// Extrai apenas dígitos e aplica cap. Retorna string vazia se não houver dígitos.
function digitsOnly(input: string, cap: number): string {
  const only = input.replace(/\D/g, "").replace(/^0+(?=\d)/, "");
  if (!only) return "";
  const n = Math.min(Number(only), cap);
  return String(n);
}

// Formata para pt-BR com separador de milhar (sem símbolo — já mostramos "R$" no prefixo).
function formatBRL(digits: string): string {
  if (!digits) return "";
  return Number(digits).toLocaleString("pt-BR");
}

function validate(field: keyof typeof LIMITS, value: string): string | null {
  if (!value) return null;
  const n = Number(value);
  const { softMin, softMax } = LIMITS[field];
  if (n > 0 && n < softMin) return "Valor muito baixo — confira se digitou certo.";
  if (n > softMax) return "Valor muito alto — confira se digitou certo.";
  return null;
}


const CAPEX_LEVELS = [
  { id: "essencial", label: "Essencial", capex: 25000, rateBoost: 1.0, note: "Mobília funcional e enxoval básico." },
  { id: "premium", label: "Premium", capex: 55000, rateBoost: 1.15, note: "Decoração cuidada, fotos profissionais, itens de conforto." },
  { id: "signature", label: "Signature", capex: 95000, rateBoost: 1.3, note: "Projeto autoral, design de destaque, operação diferenciada." },
] as const;

// Estimativas de MERCADO para a Vila Mariana — apenas placeholders orientativos.
// Sempre marcadas na UI. Usuário deve substituir pelos próprios números.
const MARKET_HINT = {
  studio: { price: 550000, rent: 2600, daily: 260, condoIptu: 900 },
  garden: { price: 950000, rent: 4200, daily: 420, condoIptu: 1500 },
  terrace: { price: 850000, rent: 3800, daily: 380, condoIptu: 1300 },
} as const;

type Mode = "tradicional" | "temporada";

const fmtBRL = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

const fmtPct = (v: number) => `${v.toFixed(2).replace(".", ",")}%`;

interface Props {
  initialTypologyId?: string;
}

interface CurrencyFieldProps {
  id: string;
  label: string;
  value: string; // digits-only string
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
  const stored = typeof window !== "undefined" ? simulatorStorage.load() : null;

  const [typoId, setTypoId] = useState<string>(
    initialTypologyId ?? stored?.typoId ?? TYPOLOGIES[0].id,
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

  const typo = TYPOLOGIES.find((t) => t.id === typoId) ?? TYPOLOGIES[0];
  const capexLevel = CAPEX_LEVELS.find((c) => c.id === capexLevelId)!;
  const hint = MARKET_HINT[typoId as keyof typeof MARKET_HINT];

  useEffect(() => {
    if (initialTypologyId) setTypoId(initialTypologyId);
  }, [initialTypologyId]);

  // Persistência com debounce leve — evita gravar a cada tecla.
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      const payload: SimulatorPersisted = {
        typoId,
        mode,
        capexLevelId,
        price,
        rent,
        daily,
        occupancy: occupancy[0],
        condoIptu,
      };
      simulatorStorage.save(payload);
    }, 250);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [typoId, mode, capexLevelId, price, rent, daily, occupancy, condoIptu]);

  const handleReset = () => {
    simulatorStorage.clear();
    setPrice("");
    setRent("");
    setDaily("");
    setCondoIptu("");
    setOccupancy([70]);
    setCapexLevelId("premium");
    setMode("tradicional");
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
      const monthlyNet = Math.max(0, monthlyGross - condoN);
      const annualNet = monthlyNet * 12;
      const yieldPct = totalInvestment > 0 ? (annualNet / totalInvestment) * 100 : 0;
      const payback = annualNet > 0 ? totalInvestment / annualNet : 0;
      return {
        totalInvestment,
        monthlyGross,
        platformFee: 0,
        cleaningFee: 0,
        monthlyNet,
        annualNet,
        yieldPct,
        payback,
      };
    }
    // temporada
    const boostedDaily = dailyN * capexLevel.rateBoost;
    const nights = 30 * (occupancy[0] / 100);
    const monthlyGross = boostedDaily * nights;
    // custos operacionais aproximados: 18% plataforma + 12% limpeza/gestão
    const platformFee = monthlyGross * 0.18;
    const cleaningFee = monthlyGross * 0.12;
    const monthlyNet = Math.max(0, monthlyGross - platformFee - cleaningFee - condoN);
    const annualNet = monthlyNet * 12;
    const yieldPct = totalInvestment > 0 ? (annualNet / totalInvestment) * 100 : 0;
    const payback = annualNet > 0 ? totalInvestment / annualNet : 0;
    return {
      totalInvestment,
      monthlyGross,
      platformFee,
      cleaningFee,
      monthlyNet,
      annualNet,
      yieldPct,
      payback,
    };
  }, [mode, priceN, rentN, dailyN, occupancy, condoN, capex, capexLevel]);

  const wa = `https://api.whatsapp.com/send?phone=${WHATSAPP_PHONE}&text=${encodeURIComponent(
    `Olá! Simulei o retorno do Vila Park (tipologia ${typo.label}) e gostaria de conversar.`,
  )}`;

  const hasResult = result.totalInvestment > 0 && (mode === "tradicional" ? rentN > 0 : dailyN > 0);

  return (
    <Card className="card-elevated border-accent/20">
      <CardContent className="p-5 md:p-7 space-y-6">
        {/* Header — tipologia + modo */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <Badge className="bg-accent/10 text-accent border-accent/20 hover:bg-accent/10 mb-2">
              <Building2 className="h-3 w-3 mr-1" /> {typo.label}
            </Badge>
            <h3 className="font-display text-xl md:text-2xl font-semibold text-foreground">
              Simulador do investidor
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
              <Home className="h-3.5 w-3.5" /> Aluguel tradicional
            </button>
            <button
              type="button"
              onClick={() => setMode("temporada")}
              className={cn(
                "px-4 py-2 text-sm font-medium rounded-full transition-colors flex items-center gap-1.5",
                mode === "temporada" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground",
              )}
            >
              <CalendarDays className="h-3.5 w-3.5" /> Temporada
            </button>
          </div>
        </div>

        {/* Tipologia picker */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {TYPOLOGIES.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTypoId(t.id)}
              className={cn(
                "text-left rounded-xl border p-3 transition-colors",
                typoId === t.id
                  ? "border-accent bg-accent/5"
                  : "border-border/60 hover:border-accent/40",
              )}
            >
              <p className="text-sm font-semibold text-foreground">{t.label}</p>
              <p className="text-xs text-muted-foreground mt-0.5 capitalize">Perfil {t.idealProfile}</p>
            </button>
          ))}
        </div>

        <Separator />

        {/* Inputs */}
        <div className="grid gap-4 md:grid-cols-2">
          <CurrencyField
            id="price"
            label="Preço da unidade"
            value={price}
            onChange={(v) => setPrice(digitsOnly(v, LIMITS.price.max))}
            placeholder={formatBRL(String(hint?.price ?? 600000))}
            hint="Estimativa de mercado — substitua pelo valor real da tabela."
            error={priceError}
          />

          <div>
            <Label>Nível de mobília / enxoval (capex)</Label>
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
                  <div className="font-semibold">{c.label}</div>
                  <div className="text-[10px] opacity-80">{fmtBRL(c.capex)}</div>
                </button>
              ))}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">{capexLevel.note}</p>
          </div>

          <CurrencyField
            id="condo"
            label="Condomínio + IPTU mensais"
            value={condoIptu}
            onChange={(v) => setCondoIptu(digitsOnly(v, LIMITS.condoIptu.max))}
            placeholder={formatBRL(String(hint?.condoIptu ?? 1000))}
            hint="Placeholder de mercado para a Vila Mariana — confirme os valores oficiais."
            error={condoError}
          />

          {mode === "tradicional" ? (
            <CurrencyField
              id="rent"
              label="Aluguel mensal estimado"
              value={rent}
              onChange={(v) => setRent(digitsOnly(v, LIMITS.rent.max))}
              placeholder={formatBRL(String(hint?.rent ?? 3000))}
              hint="Faixa observada em locações longas no bairro — substitua pela sua estimativa."
              error={rentError}
            />
          ) : (
            <div className="space-y-4">
              <CurrencyField
                id="daily"
                label="Diária média"
                value={daily}
                onChange={(v) => setDaily(digitsOnly(v, LIMITS.daily.max))}
                placeholder={formatBRL(String(hint?.daily ?? 300))}
                hint={`Diária base (${capexLevel.label} = ×${capexLevel.rateBoost.toFixed(2)}).`}
                error={dailyError}
              />
              <div>
                <div className="flex items-center justify-between">
                  <Label>Ocupação estimada</Label>
                  <span className="text-sm font-semibold text-accent">{occupancy[0]}%</span>
                </div>
                <Slider
                  value={occupancy}
                  onValueChange={(v) => setOccupancy([Math.min(95, Math.max(45, v[0] ?? 70))])}
                  min={45}
                  max={95}
                  step={1}
                  className="mt-2"
                  aria-label="Ocupação estimada em porcentagem"
                />
                <p className="text-[11px] text-muted-foreground mt-1">Entre 45% e 95%.</p>
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
            <RotateCcw className="mr-2 h-3.5 w-3.5" /> Limpar simulação
          </Button>
        </div>


        {/* Result */}
        <div className="rounded-2xl border border-accent/30 bg-accent/5 p-5">
          {!hasResult ? (
            <div className="flex items-start gap-3 text-sm text-muted-foreground">
              <Info className="h-4 w-4 text-accent mt-0.5" />
              <p>
                Preencha o preço da unidade e {mode === "tradicional" ? "o aluguel mensal" : "a diária média"} para
                ver o retorno estimado.
              </p>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="h-4 w-4 text-accent" />
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-accent">
                  Retorno estimado — {typo.label}
                </p>
              </div>
              <div className="grid gap-4 md:grid-cols-4">
                <div>
                  <p className="text-xs text-muted-foreground">Líquido / mês</p>
                  <p className="font-display text-2xl font-bold text-foreground">
                    {fmtBRL(result.monthlyNet)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Líquido / ano</p>
                  <p className="font-display text-2xl font-bold text-foreground">
                    {fmtBRL(result.annualNet)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Yield a.a.</p>
                  <p className="font-display text-2xl font-bold text-accent">
                    {fmtPct(result.yieldPct)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Payback</p>
                  <p className="font-display text-2xl font-bold text-foreground">
                    {result.payback > 0 ? `${result.payback.toFixed(1)} anos` : "—"}
                  </p>
                </div>
              </div>

              <Separator className="my-5" />

              <div className="grid gap-4 md:grid-cols-2 text-sm">
                <div>
                  <p className="font-semibold text-foreground mb-2">Composição da receita</p>
                  <ul className="space-y-1 text-muted-foreground">
                    <li className="flex justify-between">
                      <span>Receita bruta mensal</span>
                      <span className="text-foreground">{fmtBRL(result.monthlyGross)}</span>
                    </li>
                    {mode === "temporada" && (
                      <>
                        <li className="flex justify-between">
                          <span>(-) Taxa de plataforma (~18%)</span>
                          <span>-{fmtBRL(result.platformFee)}</span>
                        </li>
                        <li className="flex justify-between">
                          <span>(-) Limpeza e gestão (~12%)</span>
                          <span>-{fmtBRL(result.cleaningFee)}</span>
                        </li>
                      </>
                    )}
                    <li className="flex justify-between">
                      <span>(-) Condomínio + IPTU</span>
                      <span>-{fmtBRL(condoN)}</span>
                    </li>
                    <li className="flex justify-between border-t border-border/40 pt-1 mt-1 font-semibold text-foreground">
                      <span>Líquido mensal</span>
                      <span>{fmtBRL(result.monthlyNet)}</span>
                    </li>
                  </ul>
                </div>
                <div>
                  <p className="font-semibold text-foreground mb-2">Composição do investimento</p>
                  <ul className="space-y-1 text-muted-foreground">
                    <li className="flex justify-between">
                      <span>Unidade</span>
                      <span className="text-foreground">{fmtBRL(priceN)}</span>
                    </li>
                    <li className="flex justify-between">
                      <span>Mobília / enxoval ({capexLevel.label})</span>
                      <span className="text-foreground">{fmtBRL(capex)}</span>
                    </li>
                    <li className="flex justify-between border-t border-border/40 pt-1 mt-1 font-semibold text-foreground">
                      <span>Total</span>
                      <span>{fmtBRL(result.totalInvestment)}</span>
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
                  Quero falar sobre essa tipologia
                </Button>
              </div>
            </>
          )}
        </div>

        <p className="text-[11px] text-muted-foreground leading-relaxed">
          Projeção meramente ilustrativa, com base em premissas informadas pelo próprio usuário e faixas de mercado
          da Vila Mariana. Não constitui promessa de rentabilidade, retorno ou valorização. Custos reais podem
          variar conforme convenção do condomínio, plataforma, gestão e sazonalidade.
        </p>
      </CardContent>
    </Card>
  );
}
