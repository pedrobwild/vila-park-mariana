import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { TrendingUp, TrendingDown, Home, Sparkles, Wrench } from "lucide-react";
import { useSimulatorLive, deriveSimInputs, computeSeasonal, fmtBRL, fmtPct } from "./useSimulatorLive";
import { cn } from "@/lib/utils";

const DASH = "—";

// Market hint fallbacks (seed) — only used when the simulator has no inputs.
const SEED = { daily: 350, occupancy: 70, condoIptu: 900, price: 550_000, capex: 55_000 };

function scenarioNumbers(base: { daily: number; occupancy: number; condoIptu: number; totalInvestment: number; capexBoost: number }, delta: { occ: number; adr: number }) {
  const occupancy = Math.max(0, Math.min(100, base.occupancy + delta.occ));
  const daily = Math.max(0, base.daily * (1 + delta.adr));
  const r = computeSeasonal(daily, occupancy, base.condoIptu, base.capexBoost);
  const yieldPct = base.totalInvestment > 0 && r.annualNet > 0 ? (r.annualNet / base.totalInvestment) * 100 : 0;
  const payback = r.annualNet > 0 ? base.totalInvestment / r.annualNet : 0;
  return { occupancy, daily, ...r, yieldPct, payback };
}

export default function ScenariosSection() {
  const { t } = useTranslation();
  const sim = useSimulatorLive();
  const derived = deriveSimInputs(sim);

  const isSeed = !derived.hasInputs;
  const baseInputs = {
    daily: derived.daily > 0 ? derived.daily : SEED.daily,
    occupancy: derived.occupancy,
    condoIptu: derived.condoIptu > 0 ? derived.condoIptu : SEED.condoIptu,
    totalInvestment: derived.totalInvestment > 0 ? derived.totalInvestment : SEED.price + SEED.capex,
    capexBoost: derived.capexBoost,
  };

  const scenarios = useMemo(() => ({
    conservador: scenarioNumbers(baseInputs, { occ: -10, adr: -0.1 }),
    base: scenarioNumbers(baseInputs, { occ: 0, adr: 0 }),
    otimista: scenarioNumbers(baseInputs, { occ: 10, adr: 0.1 }),
  }), [baseInputs]);

  // Impact estimate: +5pp occupancy at current daily.
  const impact5pp = baseInputs.daily * 0.05 * 30;

  const renderScenario = (key: keyof typeof scenarios) => {
    const s = scenarios[key];
    const show = (v: number) => (v > 0 ? v : NaN);
    return (
      <div className="grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-6 mt-4">
        <Metric label={t("investorGuide.scenarios.metrics.occ")} value={`${s.occupancy.toFixed(0)}%`} />
        <Metric label={t("investorGuide.scenarios.metrics.daily")} value={s.daily > 0 ? fmtBRL(s.daily) : DASH} />
        <Metric label={t("investorGuide.scenarios.metrics.grossM")} value={s.monthlyGross > 0 ? fmtBRL(s.monthlyGross) : DASH} />
        <Metric label={t("investorGuide.scenarios.metrics.netM")} value={isFinite(show(s.monthlyNet)) ? fmtBRL(s.monthlyNet) : DASH} negative={s.monthlyNet < 0} />
        <Metric label={t("investorGuide.scenarios.metrics.yield")} value={s.yieldPct > 0 ? fmtPct(s.yieldPct) : DASH} highlight />
        <Metric label={t("investorGuide.scenarios.metrics.payback")} value={s.payback > 0 ? t("investorGuide.scenarios.paybackYears", { n: s.payback.toFixed(1) }) : DASH} />
      </div>
    );
  };

  const drivers = [
    { key: "occupancy", icon: TrendingUp, impact: "high" as const, note: t("investorGuide.scenarios.drivers.occupancy.note", { v: fmtBRL(impact5pp) }) },
    { key: "adr", icon: TrendingUp, impact: "high" as const },
    { key: "condo", icon: Home, impact: "med" as const },
    { key: "ops", icon: Wrench, impact: "med" as const },
  ];

  return (
    <div className="space-y-6">
      {isSeed && (
        <Badge variant="outline" className="text-[10px] uppercase tracking-wider">
          {t("investorGuide.scenarios.seedBadge")}
        </Badge>
      )}
      <Tabs defaultValue="base" className="w-full">
        <TabsList className="grid grid-cols-3 w-full max-w-md">
          <TabsTrigger value="conservador"><TrendingDown className="h-3.5 w-3.5 mr-1" />{t("investorGuide.scenarios.tabs.conservador")}</TabsTrigger>
          <TabsTrigger value="base"><Home className="h-3.5 w-3.5 mr-1" />{t("investorGuide.scenarios.tabs.base")}</TabsTrigger>
          <TabsTrigger value="otimista"><TrendingUp className="h-3.5 w-3.5 mr-1" />{t("investorGuide.scenarios.tabs.otimista")}</TabsTrigger>
        </TabsList>
        <TabsContent value="conservador"><Card className="card-elevated border-border/60"><CardContent className="p-5">{renderScenario("conservador")}</CardContent></Card></TabsContent>
        <TabsContent value="base"><Card className="card-elevated border-accent/30 bg-accent/5"><CardContent className="p-5">{renderScenario("base")}</CardContent></Card></TabsContent>
        <TabsContent value="otimista"><Card className="card-elevated border-border/60"><CardContent className="p-5">{renderScenario("otimista")}</CardContent></Card></TabsContent>
      </Tabs>

      <div>
        <p className="font-semibold text-foreground mb-3 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-accent" />
          {t("investorGuide.scenarios.driversTitle")}
        </p>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          {drivers.map((d) => (
            <Card key={d.key} className="card-elevated border-border/60 h-full">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <d.icon className="h-4 w-4 text-accent" />
                  <Badge variant="outline" className={cn("text-[10px]",
                    d.impact === "high" ? "border-accent/40 text-accent" : "border-border text-muted-foreground")}>
                    {t(`investorGuide.scenarios.impact.${d.impact}`)}
                  </Badge>
                </div>
                <p className="font-semibold text-sm text-foreground">{t(`investorGuide.scenarios.drivers.${d.key}.title`)}</p>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  {d.note ?? t(`investorGuide.scenarios.drivers.${d.key}.note`)}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

function Metric({ label, value, highlight, negative }: { label: string; value: string; highlight?: boolean; negative?: boolean }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={cn("font-display font-bold text-base sm:text-lg mt-0.5 tabular-nums whitespace-nowrap",
        negative ? "text-destructive" : highlight ? "text-accent" : "text-foreground")}>{value}</p>
    </div>
  );
}
