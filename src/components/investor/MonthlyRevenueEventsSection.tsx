import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine } from "recharts";
import { useSimulatorLive, deriveSimInputs, computeSeasonal, fmtBRL, fmtPct } from "./useSimulatorLive";

interface EventItem {
  name: string;
  dateRange: string;
  dailyRateImpact: string;
  durationDays: number;
}
interface EventsData {
  events: EventItem[];
}

const SEED = { daily: 350, occupancy: 70, condoIptu: 900, price: 550_000, capex: 55_000 };

// 12 months July 2026 → June 2027
const MONTHS: { y: number; m: number; label: string }[] = Array.from({ length: 12 }, (_, i) => {
  const d = new Date(2026, 6 + i, 1);
  return {
    y: d.getFullYear(),
    m: d.getMonth(),
    label: d.toLocaleDateString("pt-BR", { month: "short" }).replace(".", "") + "/" + String(d.getFullYear()).slice(2),
  };
});

const MONTHS_PT: Record<string, number> = {
  janeiro: 0, jan: 0, fevereiro: 1, fev: 1, março: 2, marco: 2, mar: 2,
  abril: 3, abr: 3, maio: 4, mai: 4, junho: 5, jun: 5,
  julho: 6, jul: 6, agosto: 7, ago: 7, setembro: 8, set: 8,
  outubro: 9, out: 9, novembro: 10, nov: 10, dezembro: 11, dez: 11,
};
const MONTHS_EN: Record<string, number> = {
  january: 0, february: 1, march: 2, april: 3, may: 4, june: 5,
  july: 6, august: 7, september: 8, october: 9, november: 10, december: 11,
};

function parseDates(text: string): { y: number; m: number }[] {
  if (!text) return [];
  const t = text.toLowerCase();
  const results: { y: number; m: number }[] = [];
  const years = Array.from(t.matchAll(/(20\d{2})/g)).map((m) => parseInt(m[1]));
  const dict = { ...MONTHS_PT, ...MONTHS_EN };
  const monthRegex = new RegExp(`\\b(${Object.keys(dict).join("|")})\\b`, "g");
  const months = Array.from(t.matchAll(monthRegex)).map((m) => dict[m[1]]);
  const numeric = Array.from(t.matchAll(/(\d{1,2})[\/\-](20\d{2})/g));
  for (const m of numeric) {
    const mo = parseInt(m[1]) - 1;
    const y = parseInt(m[2]);
    if (mo >= 0 && mo < 12) results.push({ y, m: mo });
  }
  if (months.length > 0) {
    for (const y of years) for (const mo of months) results.push({ y, m: mo });
  }
  return results;
}

function parseImpactPct(s: string): number {
  const m = (s || "").match(/-?\d+(\.\d+)?/);
  if (!m) return 0;
  return Math.max(0, Math.min(100, Math.abs(parseFloat(m[0]))));
}

interface Props {
  eventsData: EventsData | null;
}

export default function MonthlyRevenueEventsSection({ eventsData }: Props) {
  const { t } = useTranslation();
  const sim = useSimulatorLive();
  const derived = deriveSimInputs(sim);
  const isSeed = !derived.hasInputs;

  const dailyBase = derived.daily > 0 ? derived.daily : SEED.daily;
  const occ = derived.occupancy;
  const capexBoost = derived.capexBoost;
  const condo = derived.condoIptu > 0 ? derived.condoIptu : SEED.condoIptu;
  const totalInvestment = derived.totalInvestment > 0 ? derived.totalInvestment : SEED.price + SEED.capex;

  const baseline = computeSeasonal(dailyBase, occ, condo, capexBoost);
  const baselineMonthly = baseline.monthlyGross;

  const data = useMemo(() => {
    // For each month, aggregate impact from all events falling in that month.
    const monthImpact: number[] = new Array(12).fill(0);
    const events = eventsData?.events ?? [];
    for (const ev of events) {
      const dates = parseDates(ev.dateRange);
      const impactPct = parseImpactPct(ev.dailyRateImpact) / 100;
      const durationDays = Math.min(30, Math.max(1, ev.durationDays || 3));
      for (const { y, m } of dates) {
        const idx = MONTHS.findIndex((mm) => mm.y === y && mm.m === m);
        if (idx === -1) continue;
        // Extra revenue for that month = extra daily × impacted nights.
        // Extra revenue = baseline_daily_uplift × occupancy_fraction × durationDays
        const nightsOccupied = durationDays * (occ / 100);
        const extraDailyRevenue = dailyBase * capexBoost * impactPct * nightsOccupied;
        monthImpact[idx] += extraDailyRevenue * 0.7; // net after fees ~ conservative
      }
    }
    return MONTHS.map((mm, i) => ({
      month: mm.label,
      base: Math.round(baselineMonthly),
      extra: Math.round(monthImpact[i]),
      total: Math.round(baselineMonthly + monthImpact[i]),
    }));
  }, [eventsData, baselineMonthly, dailyBase, capexBoost, occ]);

  const annualBase = data.reduce((s, d) => s + d.base, 0);
  const annualWithEvents = data.reduce((s, d) => s + d.total, 0);
  const extraAnnual = annualWithEvents - annualBase;
  const extraPct = annualBase > 0 ? (extraAnnual / annualBase) * 100 : 0;
  const grossYield = totalInvestment > 0 ? (annualWithEvents / totalInvestment) * 100 : 0;
  const netAnnual = data.reduce((s, d) => s + d.total * 0.7, 0) - condo * 12;
  const netYield = totalInvestment > 0 ? (netAnnual / totalInvestment) * 100 : 0;
  const avg = annualWithEvents / 12;

  return (
    <div className="space-y-6">
      {isSeed && (
        <Badge variant="outline" className="text-[10px] uppercase tracking-wider">
          {t("investorGuide.monthlyEvents.seedBadge")}
        </Badge>
      )}

      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <Kpi label={t("investorGuide.monthlyEvents.kpi.annualBase")} value={fmtBRL(annualBase)} />
        <Kpi label={t("investorGuide.monthlyEvents.kpi.annualEvents")} value={fmtBRL(annualWithEvents)} highlight />
        <Kpi label={t("investorGuide.monthlyEvents.kpi.extra")} value={`+${fmtBRL(extraAnnual)} (${fmtPct(extraPct)})`} />
        <Kpi label={t("investorGuide.monthlyEvents.kpi.yield")} value={`${fmtPct(grossYield)} / ${fmtPct(netYield)}`} sub={t("investorGuide.monthlyEvents.kpi.yieldSub")} />
      </div>

      <Card className="card-elevated border-border/60">
        <CardContent className="p-5 md:p-6">
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={data} margin={{ top: 8, right: 8, left: -8, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
              <YAxis tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11 }} className="fill-muted-foreground" />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null;
                  const d: any = payload[0].payload;
                  return (
                    <div className="bg-popover border border-border rounded-lg p-3 shadow-lg text-sm space-y-0.5">
                      <p className="font-semibold text-foreground">{label}</p>
                      <p className="text-muted-foreground tabular-nums">{t("investorGuide.monthlyEvents.tooltip.base")}: {fmtBRL(d.base)}</p>
                      <p className="text-accent tabular-nums">{t("investorGuide.monthlyEvents.tooltip.extra")}: +{fmtBRL(d.extra)}</p>
                      <p className="font-semibold text-foreground tabular-nums">{t("investorGuide.monthlyEvents.tooltip.total")}: {fmtBRL(d.total)}</p>
                    </div>
                  );
                }}
              />
              <Legend
                content={({ payload }) => (
                  <div className="flex items-center justify-center gap-6 mb-1">
                    {payload?.map((entry, i) => (
                      <div key={i} className="flex items-center gap-1.5">
                        <span className={`inline-block w-3 h-3 rounded-sm ${entry.dataKey === "extra" ? "bg-accent" : "bg-muted-foreground/40"}`} />
                        <span className="text-xs text-muted-foreground">{entry.value}</span>
                      </div>
                    ))}
                  </div>
                )}
              />
              <Bar dataKey="base" name={t("investorGuide.monthlyEvents.legend.base")} stackId="a" className="fill-muted-foreground/40" radius={[0, 0, 0, 0]} />
              <Bar dataKey="extra" name={t("investorGuide.monthlyEvents.legend.extra")} stackId="a" className="fill-accent" radius={[4, 4, 0, 0]} />
              <ReferenceLine y={avg} stroke="hsl(var(--accent))" strokeDasharray="4 4" label={{ value: t("investorGuide.monthlyEvents.avgLine"), fontSize: 10, fill: "hsl(var(--muted-foreground))", position: "insideTopRight" }} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground leading-relaxed">{t("investorGuide.monthlyEvents.disclaimer")}</p>
    </div>
  );
}

function Kpi({ label, value, sub, highlight }: { label: string; value: string; sub?: string; highlight?: boolean }) {
  return (
    <Card className={`card-elevated border-border/60 ${highlight ? "border-accent/40 bg-accent/5" : ""}`}>
      <CardContent className="p-4">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className={`font-display font-bold text-lg sm:text-xl mt-1 tabular-nums whitespace-nowrap ${highlight ? "text-accent" : "text-foreground"}`}>{value}</p>
        {sub && <p className="text-[10px] text-muted-foreground mt-1">{sub}</p>}
      </CardContent>
    </Card>
  );
}
