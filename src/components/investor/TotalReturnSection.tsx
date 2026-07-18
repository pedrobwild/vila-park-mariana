import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { useSimulatorLive, deriveSimInputs, computeSeasonal, fmtBRL, fmtPct } from "./useSimulatorLive";
import { BENCHMARK_RATES, netOfIR } from "@/data/benchmarkRates";

// Rótulo curto legado — mantido como alias para compatibilidade com testes/import.
export const BENCHMARKS = BENCHMARK_RATES;

const DEFAULT_BASE = 500_000;

export default function TotalReturnSection() {
  const { t } = useTranslation();
  const sim = useSimulatorLive();
  const derived = deriveSimInputs(sim);
  const [appreciation, setAppreciation] = useState<number[]>([10]);

  const base = derived.totalInvestment > 0 ? derived.totalInvestment : DEFAULT_BASE;
  const isSeed = derived.totalInvestment <= 0;

  // Studio net yield %: from simulator when available, else 8% seed.
  const netYieldPct = useMemo(() => {
    if (!derived.hasInputs) return 8;
    if (derived.mode === "temporada") {
      const r = computeSeasonal(derived.daily, derived.occupancy, derived.condoIptu, derived.capexBoost);
      return derived.totalInvestment > 0 ? (r.annualNet / derived.totalInvestment) * 100 : 8;
    }
    const annualNet = (derived.rent - derived.condoIptu) * 12;
    return derived.totalInvestment > 0 ? (annualNet / derived.totalInvestment) * 100 : 8;
  }, [derived]);

  const appr = appreciation[0];
  const rows = useMemo(() => {
    const selicNet = BENCHMARKS.selic * (1 - BENCHMARKS.irFixedIncome);
    const cdiNet = BENCHMARKS.cdi * (1 - BENCHMARKS.irFixedIncome);
    const total = Math.max(-100, netYieldPct + appr);
    return [
      { key: "studioTotal", label: t("investorGuide.totalReturn.rows.studioTotal"), pct: total, highlight: true },
      { key: "studioRent", label: t("investorGuide.totalReturn.rows.studioRent"), pct: netYieldPct },
      { key: "selic", label: `Selic (${BENCHMARKS.selic}% a.a.)`, pct: selicNet },
      { key: "cdi", label: `CDI (${BENCHMARKS.cdi}% a.a.)`, pct: cdiNet },
      { key: "ifix", label: `IFIX (${BENCHMARKS.ifix}% a.a.)`, pct: BENCHMARKS.ifix },
      { key: "poup", label: `Poupança (${BENCHMARKS.poupanca}% a.a.)`, pct: BENCHMARKS.poupanca },
    ].map((r) => ({ ...r, brl: (base * r.pct) / 100 }));
  }, [netYieldPct, appr, base, t]);

  const total = rows[0].pct;
  const selicNet = rows[2].pct;
  const gapPp = (total - selicNet).toFixed(1).replace(".", ",");
  const in5Studio = base * Math.pow(1 + total / 100, 5) - base;
  const in5Selic = base * Math.pow(1 + selicNet / 100, 5) - base;

  return (
    <div className="space-y-6">
      <Card className="card-elevated border-border/60">
        <CardContent className="p-5 md:p-6 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-semibold text-foreground">{t("investorGuide.totalReturn.sliderTitle")}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {t("investorGuide.totalReturn.sliderHint")}
              </p>
            </div>
            <Badge variant="outline" className="tabular-nums text-base px-3 py-1">
              {appr}% a.a.
            </Badge>
          </div>
          <Slider
            value={appreciation}
            onValueChange={setAppreciation}
            min={6}
            max={15}
            step={1}
            aria-label={t("investorGuide.totalReturn.sliderTitle")}
          />
          <div className="flex justify-between text-[11px] text-muted-foreground">
            <span>{t("investorGuide.totalReturn.marks.cons")}</span>
            <span>{t("investorGuide.totalReturn.marks.region")}</span>
            <span>{t("investorGuide.totalReturn.marks.opt")}</span>
          </div>
        </CardContent>
      </Card>

      <Card className="card-elevated border-border/60">
        <CardContent className="p-5 md:p-6 space-y-4">
          <div className="flex flex-wrap justify-between items-baseline gap-2">
            <p className="font-semibold text-foreground">
              {t("investorGuide.totalReturn.chartTitle", { v: fmtBRL(base) })}
            </p>
            {isSeed && (
              <Badge variant="outline" className="text-[10px] uppercase tracking-wider">
                {t("investorGuide.totalReturn.baseSeed")}
              </Badge>
            )}
          </div>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={rows} layout="vertical" margin={{ left: 8, right: 40 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis type="number" tickFormatter={(v) => `${v}%`} tick={{ fontSize: 11 }} className="fill-muted-foreground" />
              <YAxis type="category" dataKey="label" width={220} tick={{ fontSize: 11 }} className="fill-muted-foreground" />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const d: any = payload[0].payload;
                  return (
                    <div className="bg-popover border border-border rounded-lg p-3 shadow-lg text-sm">
                      <p className="font-semibold text-foreground">{d.label}</p>
                      <p className="text-accent tabular-nums">{fmtPct(d.pct)}</p>
                      <p className="text-muted-foreground tabular-nums">{fmtBRL(d.brl)}/{t("investorGuide.totalReturn.perYear")}</p>
                    </div>
                  );
                }}
              />
              <Bar dataKey="pct" radius={[0, 6, 6, 0]} label={{ position: "right", formatter: (v: any) => `${v.toFixed(1)}%`, fontSize: 11 }}>
                {rows.map((r) => (
                  <Cell key={r.key} className={r.highlight ? "fill-accent" : "fill-muted-foreground/40"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="card-elevated border-accent/30 bg-accent/5">
        <CardContent className="p-5 md:p-6">
          <p className="font-semibold text-foreground">
            {t("investorGuide.totalReturn.conclusion.headline", { total: fmtPct(total), gap: gapPp })}
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            {t("investorGuide.totalReturn.conclusion.horizon", { a: fmtBRL(in5Studio), b: fmtBRL(in5Selic) })}
          </p>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground leading-relaxed">
        {t("investorGuide.totalReturn.methodology", { vintage: BENCHMARKS.vintage })}
      </p>
    </div>
  );
}
