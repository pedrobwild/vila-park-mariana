import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { motion, AnimatePresence } from "framer-motion";
import { X, Plus, ArrowUpDown, Check } from "lucide-react";
import { Neighborhood, NEIGHBORHOODS, DEMAND_PROFILE_LABELS, fmt } from "@/data/mapaBairrosData";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Cell } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";

interface ComparisonProps {
  onClose: () => void;
  initialNeighborhoods?: Neighborhood[];
}

const METRICS: { key: string; label: string; getValue: (n: Neighborhood) => number | string; format: (v: number | string) => string; higherIsBetter: boolean }[] = [
  { key: "nightly", label: "Diária média", getValue: (n) => n.metrics.nightlyRate, format: (v) => `R$${fmt(v as number)}`, higherIsBetter: true },
  { key: "nightlyRange", label: "Faixa de diária", getValue: (n) => `R$${fmt(n.metrics.nightlyRateRange[0])}–R$${fmt(n.metrics.nightlyRateRange[1])}`, format: (v) => `${v}`, higherIsBetter: false },
  { key: "occupancy", label: "Ocupação", getValue: (n) => n.metrics.occupancy, format: (v) => `${v}%`, higherIsBetter: true },
  { key: "roi", label: "ROI estimado", getValue: (n) => n.metrics.estimatedROI, format: (v) => `${v}%`, higherIsBetter: true },
  { key: "revenue", label: "Receita mensal", getValue: (n) => n.metrics.avgRevenueMo, format: (v) => `R$${fmt(v as number)}`, higherIsBetter: true },
  { key: "listings", label: "Anúncios ativos", getValue: (n) => n.metrics.activeListings, format: (v) => `${fmt(v as number)}`, higherIsBetter: false },
  { key: "seasonality", label: "Sazonalidade", getValue: (n) => n.metrics.seasonalityIndex, format: (v) => Number(v) > 1.2 ? "Alta" : Number(v) > 0.9 ? "Moderada" : "Estável", higherIsBetter: false },
  { key: "profile", label: "Perfil de demanda", getValue: (n) => DEMAND_PROFILE_LABELS[n.demandProfile]?.label || n.demandProfile, format: (v) => `${v}`, higherIsBetter: false },
  { key: "competition", label: "Competição", getValue: (n) => n.metrics.competitionLevel, format: (v) => `${v}`, higherIsBetter: false },
];

function getMetricColor(values: (number | string)[], idx: number, higherIsBetter: boolean): string {
  if (typeof values[0] === "string") return "text-foreground";
  const nums = values as number[];
  const sorted = [...nums].sort((a, b) => higherIsBetter ? b - a : a - b);
  if (nums[idx] === sorted[0]) return "text-emerald-600 dark:text-emerald-400 font-bold";
  if (nums[idx] === sorted[sorted.length - 1] && nums.length > 2) return "text-muted-foreground";
  return "text-amber-600 dark:text-amber-400";
}

const chartConfig = {
  revenue: { label: "Receita potencial", color: "hsl(var(--primary))" },
};

export default function NeighborhoodComparison({ onClose, initialNeighborhoods = [] }: ComparisonProps) {
  const [selected, setSelected] = useState<Neighborhood[]>(initialNeighborhoods.slice(0, 3));
  const [showPicker, setShowPicker] = useState(false);

  const available = NEIGHBORHOODS.filter((n) => !selected.some((s) => s.id === n.id));

  const addNeighborhood = (n: Neighborhood) => {
    if (selected.length < 3) {
      setSelected([...selected, n]);
      setShowPicker(false);
    }
  };

  const removeNeighborhood = (id: string) => {
    setSelected(selected.filter((n) => n.id !== id));
  };

  const chartData = selected.map((n) => ({
    name: n.name.length > 12 ? n.name.slice(0, 12) + "…" : n.name,
    revenue: Math.round(n.metrics.nightlyRate * 30 * (n.metrics.occupancy / 100)),
  }));

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="bg-card border border-border rounded-xl shadow-lg p-6"
    >
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-display text-lg font-bold text-foreground">Comparar bairros</h3>
          <p className="text-xs text-muted-foreground font-body">Selecione até 3 bairros</p>
        </div>
        <Button size="icon" variant="ghost" onClick={onClose}><X size={16} /></Button>
      </div>

      {/* Selected neighborhoods chips */}
      <div className="flex flex-wrap gap-2 mb-4">
        {selected.map((n, i) => (
          <Badge key={n.id} variant="outline" className="gap-1.5 py-1 px-2.5 text-xs">
            <span className={`w-2 h-2 rounded-full ${i === 0 ? "bg-emerald-500" : i === 1 ? "bg-primary" : "bg-amber-500"}`} />
            {n.name}
            <button onClick={() => removeNeighborhood(n.id)} className="ml-1 hover:text-destructive">
              <X size={10} />
            </button>
          </Badge>
        ))}
        {selected.length < 3 && (
          <div className="relative">
            <Button
              variant="outline"
              size="sm"
              className="text-xs gap-1 h-7"
              onClick={() => setShowPicker(!showPicker)}
            >
              <Plus size={12} />
              Adicionar
            </Button>
            <AnimatePresence>
              {showPicker && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  className="absolute left-0 top-full mt-1 bg-card border border-border rounded-lg shadow-lg z-50 min-w-[180px] max-h-[200px] overflow-y-auto"
                >
                  {available.map((n) => (
                    <button
                      key={n.id}
                      onClick={() => addNeighborhood(n)}
                      className="w-full flex items-center gap-2 text-xs px-3 py-2 hover:bg-muted transition-colors text-left"
                    >
                      <MapPinDot score={n.score} />
                      {n.name}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>

      {selected.length < 2 ? (
        <div className="text-center py-12 text-muted-foreground">
          <ArrowUpDown size={24} className="mx-auto mb-2 opacity-30" />
          <p className="text-sm font-body">Selecione pelo menos 2 bairros para comparar</p>
        </div>
      ) : (
        <>
          {/* Color legend */}
          <div className="flex flex-wrap items-center gap-3 mb-4 text-[10px] font-body text-muted-foreground">
            <span className="font-semibold text-foreground text-[11px]">Legenda:</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" /> Melhor valor</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500" /> Intermediário</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-gray-400" /> Menor valor</span>
            <span className="text-muted-foreground/50">|</span>
            <span>✓ = melhor na métrica</span>
          </div>
          {/* Comparison table */}
          <div className="overflow-x-auto mb-6">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 pr-4 font-medium text-muted-foreground">Métrica</th>
                  {selected.map((n, i) => (
                    <th key={n.id} className="text-center py-2 px-3 font-bold text-foreground">
                      <span className={`inline-block w-2 h-2 rounded-full mr-1.5 ${i === 0 ? "bg-emerald-500" : i === 1 ? "bg-primary" : "bg-amber-500"}`} />
                      {n.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {METRICS.map((metric) => {
                  const values = selected.map((n) => metric.getValue(n));
                  return (
                    <tr key={metric.key} className="border-b border-border/50">
                      <td className="py-2.5 pr-4 text-muted-foreground font-medium">{metric.label}</td>
                      {selected.map((n, i) => (
                        <td key={n.id} className={`text-center py-2.5 px-3 ${getMetricColor(values, i, metric.higherIsBetter)}`}>
                          {metric.format(values[i])}
                          {typeof values[i] === "number" && values[i] === [...(values as number[])].sort((a, b) => metric.higherIsBetter ? b - a : a - b)[0] && (
                            <Check size={10} className="inline ml-1 text-emerald-500" />
                          )}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Revenue chart */}
          <div>
            <h4 className="text-xs font-semibold text-muted-foreground mb-3">Receita mensal potencial</h4>
            <ChartContainer config={chartConfig} className="h-[160px] w-full">
              <BarChart data={chartData} layout="vertical" margin={{ left: 0, right: 20, top: 5, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} className="text-[10px]" />
                <YAxis dataKey="name" type="category" width={90} className="text-[10px]" />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="revenue" radius={[0, 4, 4, 0]} barSize={20}>
                  {chartData.map((_, i) => (
                    <Cell key={i} fill={i === 0 ? "hsl(152, 69%, 45%)" : i === 1 ? "hsl(var(--primary))" : "hsl(43, 96%, 56%)"} />
                  ))}
                </Bar>
              </BarChart>
            </ChartContainer>
          </div>
        </>
      )}
    </motion.div>
  );
}

function MapPinDot({ score }: { score: number }) {
  const color = score >= 88 ? "bg-emerald-500" : score >= 84 ? "bg-amber-500" : "bg-muted-foreground/40";
  return <span className={`w-2 h-2 rounded-full ${color}`} />;
}
