import { useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Legend } from "recharts";
import { TYPOLOGIES, calcFinancials, PROPERTY } from "@/data/propertyData";

interface Props {
  occupancy: number;
  rateBoost: number;
  selectedTypoId: string;
}

export default function YieldComparisonChart({ occupancy, rateBoost, selectedTypoId }: Props) {
  const data = useMemo(() =>
    TYPOLOGIES.map((t) => {
      const fin = calcFinancials(t, occupancy, rateBoost);
      return {
        name: t.label.replace("Studio ", "").replace("Flat ", "").replace("Duplex ", "").replace("Cobertura ", ""),
        area: `${t.area} m²`,
        fullLabel: t.label,
        yieldBruto: fin.grossYield,
        yieldLiquido: fin.netYieldEstimate,
        id: t.id,
      };
    }),
    [occupancy, rateBoost]
  );

  return (
    <div className="w-full">
      <p className="text-xs font-medium text-muted-foreground mb-3 uppercase tracking-wider">
        Yield bruto vs líquido por tipologia
      </p>
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={data} margin={{ top: 8, right: 8, left: -8, bottom: 4 }} barGap={2}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
          <XAxis
            dataKey="area"
            tick={{ fontSize: 11 }}
            className="fill-muted-foreground"
          />
          <YAxis
            tick={{ fontSize: 11 }}
            tickFormatter={(v) => `${v}%`}
            className="fill-muted-foreground"
          />
          <Legend
            verticalAlign="top"
            height={36}
            content={({ payload }) => (
              <div className="flex items-center justify-center gap-6 mb-1">
                {payload?.map((entry, i) => (
                  <div key={i} className="flex items-center gap-1.5">
                    <span
                      className={`inline-block w-3 h-3 rounded-sm ${
                        entry.dataKey === "yieldBruto"
                          ? "bg-primary"
                          : "bg-muted-foreground/40"
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
              const d = payload[0].payload;
              return (
                <div className="bg-popover border border-border rounded-lg p-3 shadow-lg text-sm">
                  <p className="font-semibold text-foreground mb-1">{d.fullLabel}</p>
                  <p className="text-primary">Yield bruto: {d.yieldBruto}%</p>
                  <p className="text-muted-foreground">Yield líquido: {d.yieldLiquido}%</p>
                </div>
              );
            }}
          />
          <Bar dataKey="yieldBruto" name="Yield Bruto" radius={[4, 4, 0, 0]} maxBarSize={40}>
            {data.map((entry) => (
              <Cell
                key={entry.id}
                className={entry.id === selectedTypoId ? "fill-primary" : "fill-primary/40"}
              />
            ))}
          </Bar>
          <Bar dataKey="yieldLiquido" name="Yield Líquido" radius={[4, 4, 0, 0]} maxBarSize={40}>
            {data.map((entry) => (
              <Cell
                key={entry.id}
                className={entry.id === selectedTypoId ? "fill-accent-foreground/70" : "fill-muted-foreground/30"}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <p className="text-[10px] text-muted-foreground text-center mt-1">
        Ocupação: {occupancy}%{rateBoost > 0 ? ` · Valorização: +${rateBoost}%` : ""}
      </p>
    </div>
  );
}
