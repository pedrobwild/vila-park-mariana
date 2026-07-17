import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { TrendingUp, DollarSign, BarChart3, Users, ChevronDown, Lightbulb } from "lucide-react";
import { Neighborhood, INVESTOR_INSIGHTS, DEMAND_PROFILE_LABELS, fmt } from "@/data/mapaBairrosData";

type SortKey = "roi" | "nightly" | "occupancy" | "competition";

const SORT_OPTIONS: { key: SortKey; label: string; icon: typeof TrendingUp }[] = [
  { key: "roi", label: "ROI estimado", icon: TrendingUp },
  { key: "nightly", label: "Diária média", icon: DollarSign },
  { key: "occupancy", label: "Ocupação", icon: BarChart3 },
  { key: "competition", label: "Menor competição", icon: Users },
];

const competitionOrder = { "baixa": 0, "média": 1, "alta": 2 };

interface ROIRankingProps {
  neighborhoods: Neighborhood[];
  onSelectNeighborhood: (n: Neighborhood) => void;
  selectedName?: string;
}

export default function ROIRanking({ neighborhoods, onSelectNeighborhood, selectedName }: ROIRankingProps) {
  const [sortBy, setSortBy] = useState<SortKey>("roi");
  const [showSort, setShowSort] = useState(false);

  const sorted = useMemo(() => {
    const list = [...neighborhoods];
    switch (sortBy) {
      case "roi": return list.sort((a, b) => b.metrics.estimatedROI - a.metrics.estimatedROI);
      case "nightly": return list.sort((a, b) => b.metrics.nightlyRate - a.metrics.nightlyRate);
      case "occupancy": return list.sort((a, b) => b.metrics.occupancy - a.metrics.occupancy);
      case "competition": return list.sort((a, b) => competitionOrder[a.metrics.competitionLevel] - competitionOrder[b.metrics.competitionLevel]);
      default: return list;
    }
  }, [neighborhoods, sortBy]);

  const currentSort = SORT_OPTIONS.find((s) => s.key === sortBy)!;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-display text-base font-bold text-foreground">Ranking de Rentabilidade</h3>
          <p className="text-xs text-muted-foreground font-body">{neighborhoods.length} bairros</p>
        </div>
        <div className="relative">
          <Button
            variant="outline"
            size="sm"
            className="text-xs gap-1.5"
            onClick={() => setShowSort(!showSort)}
          >
            <currentSort.icon size={12} />
            {currentSort.label}
            <ChevronDown size={12} className={`transition-transform ${showSort ? "rotate-180" : ""}`} />
          </Button>
          <AnimatePresence>
            {showSort && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                className="absolute right-0 top-full mt-1 bg-card border border-border rounded-lg shadow-lg z-50 min-w-[160px]"
              >
                {SORT_OPTIONS.map((opt) => (
                  <button
                    key={opt.key}
                    onClick={() => { setSortBy(opt.key); setShowSort(false); }}
                    className={`w-full flex items-center gap-2 text-xs px-3 py-2 hover:bg-muted transition-colors first:rounded-t-lg last:rounded-b-lg ${
                      sortBy === opt.key ? "text-primary font-semibold bg-primary/5" : "text-foreground"
                    }`}
                  >
                    <opt.icon size={12} />
                    {opt.label}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Ranking list */}
      <div className="flex flex-wrap items-center gap-3 mb-2 text-[10px] text-muted-foreground font-body p-2 rounded-md bg-muted/30">
        <span className="font-semibold text-foreground">Legenda:</span>
        <span><strong className="text-emerald-600">ROI est.</strong> = retorno anual sobre investimento</span>
        <span><strong>Diária</strong> = preço médio/noite</span>
        <span><strong>Ocupação</strong> = % de dias reservados</span>
        <span><strong>Receita/mês</strong> = faturamento mensal estimado</span>
      </div>
      <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
        <AnimatePresence mode="popLayout">
          {sorted.map((n, i) => {
            const profile = DEMAND_PROFILE_LABELS[n.demandProfile] || { label: n.demandProfile, emoji: "📍" };
            const isSelected = selectedName === n.name;
            return (
              <motion.div
                key={n.id}
                layout
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ delay: i * 0.03 }}
              >
                <Card
                  onClick={() => onSelectNeighborhood(n)}
                  className={`cursor-pointer transition-all hover:shadow-md ${
                    isSelected ? "ring-2 ring-primary border-primary" : "border-border hover:border-primary/30"
                  }`}
                >
                  <CardContent className="p-3">
                    <div className="flex items-start gap-3">
                      <div className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                        i === 0 ? "bg-emerald-500 text-white" : i === 1 ? "bg-emerald-400 text-white" : i === 2 ? "bg-amber-500 text-white" : "bg-muted text-muted-foreground"
                      }`}>
                        #{i + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <h4 className="font-display text-sm font-bold text-foreground truncate">{n.name}</h4>
                          <Badge variant="outline" className="text-[9px] shrink-0">
                            {profile.emoji} {profile.label}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-2">
                          <div>
                            <p className="text-[10px] text-muted-foreground">ROI est.</p>
                            <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400">{n.metrics.estimatedROI}%</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-muted-foreground">Diária média</p>
                            <p className="text-xs font-bold text-foreground">R${fmt(n.metrics.nightlyRate)}</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-muted-foreground">Ocupação</p>
                            <p className="text-xs font-bold text-foreground">{n.metrics.occupancy}%</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-muted-foreground">Receita/mês</p>
                            <p className="text-xs font-bold text-foreground">R${fmt(n.metrics.avgRevenueMo)}</p>
                          </div>
                        </div>
                        <p className="text-[9px] text-muted-foreground mt-1.5 font-body">
                          Faixa: R${fmt(n.metrics.nightlyRateRange[0])}–R${fmt(n.metrics.nightlyRateRange[1])} · {n.metrics.activeListings} anúncios · Fonte: {n.metrics.dataSource}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Investor insights */}
      <div className="pt-2 space-y-2">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
          <Lightbulb size={12} />
          Insights do investidor
        </div>
        {INVESTOR_INSIGHTS.slice(0, 3).map((insight, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 + i * 0.1 }}
          >
            <div className="flex items-start gap-2 p-2.5 rounded-lg bg-primary/5 border border-primary/10">
              <insight.icon size={14} className="text-primary shrink-0 mt-0.5" />
              <p className="text-[11px] text-foreground/80 font-body leading-relaxed">{insight.text}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
