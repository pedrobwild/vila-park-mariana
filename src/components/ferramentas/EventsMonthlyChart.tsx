import { useMemo } from "react";
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from "recharts";
import { fmt } from "@/data/guide-data";

interface MonthlyDatum {
  month: string;
  base: number;
  extra: number;
  total: number;
  yieldPct: number;
  events: string[];
}

interface Props {
  data: MonthlyDatum[];
  baseYield: number;
}

export default function EventsMonthlyChart({ data, baseYield }: Props) {
  const maxRevenue = useMemo(() => Math.max(...data.map((d) => d.total)), [data]);
  const maxYield = useMemo(() => Math.max(...data.map((d) => d.yieldPct), baseYield), [data, baseYield]);

  return (
    <div className="w-full">
      <p className="text-xs font-medium text-muted-foreground mb-3 uppercase tracking-wider">
        Receita e yield mês a mês
      </p>
      <ResponsiveContainer width="100%" height={280}>
        <ComposedChart data={data} margin={{ top: 8, right: 8, left: -8, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
          <XAxis dataKey="month" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
          <YAxis
            yAxisId="left"
            tick={{ fontSize: 11 }}
            tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
            domain={[0, Math.ceil(maxRevenue / 1000) * 1000]}
            className="fill-muted-foreground"
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            tick={{ fontSize: 11 }}
            tickFormatter={(v) => `${v.toFixed(0)}%`}
            domain={[0, Math.ceil(maxYield * 1.2)]}
            className="fill-muted-foreground"
          />
          <Legend
            verticalAlign="top"
            height={32}
            content={({ payload }) => (
              <div className="flex items-center justify-center gap-4 flex-wrap mb-1">
                {payload?.map((entry, i) => (
                  <div key={i} className="flex items-center gap-1.5">
                    <span
                      className={`inline-block w-3 h-3 rounded-sm ${
                        entry.dataKey === "base"
                          ? "bg-muted-foreground/40"
                          : entry.dataKey === "extra"
                          ? "bg-primary"
                          : "bg-emerald-500"
                      }`}
                    />
                    <span className="text-xs text-muted-foreground">{entry.value}</span>
                  </div>
                ))}
              </div>
            )}
          />
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const d = payload[0].payload as MonthlyDatum;
              return (
                <div className="bg-popover border border-border rounded-lg p-3 shadow-lg text-xs space-y-1 max-w-[220px]">
                  <p className="font-semibold text-foreground">{d.month}</p>
                  <p className="text-muted-foreground">Base: R$ {fmt(d.base)}</p>
                  {d.extra > 0 && (
                    <p className="text-primary">Eventos: +R$ {fmt(d.extra)}</p>
                  )}
                  <p className="text-foreground font-semibold">Total: R$ {fmt(d.total)}</p>
                  <p className="text-emerald-700">Yield (anualizado): {d.yieldPct.toFixed(1)}%</p>
                  {d.events.length > 0 && (
                    <div className="pt-1 border-t border-border">
                      <p className="text-[10px] text-muted-foreground">
                        {d.events.slice(0, 3).join(" · ")}
                        {d.events.length > 3 ? ` +${d.events.length - 3}` : ""}
                      </p>
                    </div>
                  )}
                </div>
              );
            }}
          />
          <Bar yAxisId="left" dataKey="base" name="Receita base" stackId="rev" fill="hsl(var(--muted-foreground) / 0.4)" radius={[0, 0, 0, 0]} maxBarSize={36} />
          <Bar yAxisId="left" dataKey="extra" name="Receita extra (eventos)" stackId="rev" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} maxBarSize={36} />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="yieldPct"
            name="Yield mensal anualizado"
            stroke="hsl(142 70% 40%)"
            strokeWidth={2}
            dot={{ r: 3, fill: "hsl(142 70% 40%)" }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
