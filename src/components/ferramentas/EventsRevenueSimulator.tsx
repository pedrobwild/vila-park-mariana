import { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import {
  CalendarDays, Loader2, RefreshCw, TrendingUp, Music, Trophy,
  Briefcase, Palette, Cpu, PartyPopper, Zap, Building2, Sparkles,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import SectionBlock from "@/components/guide/SectionBlock";
import { fmt } from "@/data/guide-data";
import { PROPERTY, TYPOLOGIES, calcFinancials } from "@/data/propertyData";
import EventsMonthlyChart from "./EventsMonthlyChart";

const MONTHS_PT = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const MONTH_MATCH: Array<[RegExp, number]> = [
  [/jan/i, 0], [/fev|feb/i, 1], [/mar/i, 2], [/abr|apr/i, 3],
  [/mai|may/i, 4], [/jun/i, 5], [/jul/i, 6], [/ago|aug/i, 7],
  [/set|sep/i, 8], [/out|oct/i, 9], [/nov/i, 10], [/dez|dec/i, 11],
];

function detectMonths(dateRange: string): number[] {
  const found: number[] = [];
  MONTH_MATCH.forEach(([re, idx]) => {
    if (re.test(dateRange)) found.push(idx);
  });
  return found.length ? found : [];
}

interface EventItem {
  name: string;
  category: string;
  dateRange: string;
  expectedAudience: string;
  dailyRateImpact: string;
  estimatedDailyRate: string;
  normalDailyRate: string;
  occupancyImpact: string;
  description: string;
  durationDays: number;
  recurring: boolean;
  confidence: string;
}

interface EventsData {
  events: EventItem[];
  baselineDaily: string;
  annualHighlights: string;
  topMonths: string[];
  estimatedAnnualBoost: string;
  citations?: string[];
}

const categoryConfig: Record<string, { icon: typeof Music; color: string }> = {
  música: { icon: Music, color: "text-purple-700 bg-purple-500/10" },
  esporte: { icon: Trophy, color: "text-emerald-700 bg-emerald-500/10" },
  negócios: { icon: Briefcase, color: "text-blue-700 bg-blue-500/10" },
  cultura: { icon: Palette, color: "text-rose-700 bg-rose-500/10" },
  tech: { icon: Cpu, color: "text-cyan-700 bg-cyan-500/10" },
  fórmula1: { icon: Zap, color: "text-red-700 bg-red-500/10" },
  carnaval: { icon: PartyPopper, color: "text-amber-700 bg-amber-500/10" },
  outros: { icon: CalendarDays, color: "text-muted-foreground bg-muted" },
};

function parsePct(s: string): number {
  const n = parseInt((s || "").replace(/[^0-9-]/g, ""), 10);
  return Number.isFinite(n) ? n : 0;
}

export default function EventsRevenueSimulator() {
  const [data, setData] = useState<EventsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedTypoId, setSelectedTypoId] = useState(TYPOLOGIES[1].id);
  const [selectedEvents, setSelectedEvents] = useState<Set<number>>(new Set());
  const { toast } = useToast();

  const typo = TYPOLOGIES.find((t) => t.id === selectedTypoId) || TYPOLOGIES[1];
  const baseFin = useMemo(() => calcFinancials(typo, PROPERTY.avgOccupancy), [typo]);

  const fetchEvents = async (refresh = false) => {
    setLoading(true);
    try {
      const fnName = refresh ? "sp-events?refresh=true" : "sp-events";
      const { data: res, error } = await supabase.functions.invoke(fnName);
      if (error) throw error;
      if (!res?.success) throw new Error(res?.error || "Erro ao buscar eventos");
      setData(res.events);
      // pre-select top 5 by impact
      const top = (res.events?.events || []).slice(0, 5).map((_: EventItem, i: number) => i);
      setSelectedEvents(new Set(top));
    } catch (err: any) {
      console.error("Events error:", err);
      toast({
        title: "Erro ao buscar eventos",
        description: err.message || "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sim = useMemo(() => {
    if (!data?.events) return null;
    const baseDaily = typo.dailyEstimate;
    const baseOcc = PROPERTY.avgOccupancy / 100;

    let extraRevenue = 0;
    const breakdown: Array<{ name: string; days: number; uplift: number; extra: number; category: string }> = [];
    const monthlyExtra = Array(12).fill(0);
    const monthlyEvents: string[][] = Array.from({ length: 12 }, () => []);

    data.events.forEach((ev, i) => {
      if (!selectedEvents.has(i)) return;
      const upliftPct = parsePct(ev.dailyRateImpact);
      const days = Math.max(1, ev.durationDays || 3);
      const eventOcc = Math.max(parsePct(ev.occupancyImpact) / 100, 0.85);
      const baselineForPeriod = baseDaily * baseOcc * days;
      const eventRevenueForPeriod = baseDaily * (1 + upliftPct / 100) * eventOcc * days;
      const extra = Math.max(0, eventRevenueForPeriod - baselineForPeriod);
      extraRevenue += extra;
      breakdown.push({
        name: ev.name,
        days,
        uplift: upliftPct,
        extra: Math.round(extra),
        category: ev.category,
      });

      // Distribute extra revenue across detected months
      const months = detectMonths(ev.dateRange);
      if (months.length > 0) {
        const perMonth = extra / months.length;
        months.forEach((m) => {
          monthlyExtra[m] += perMonth;
          monthlyEvents[m].push(ev.name);
        });
      }
    });

    const annualBase = baseFin.annualRevenue;
    const monthlyBase = annualBase / 12;
    const annualWithEvents = Math.round(annualBase + extraRevenue);
    const upliftPct = annualBase > 0 ? ((extraRevenue / annualBase) * 100) : 0;
    const newGrossYield = (annualWithEvents / typo.purchasePrice) * 100;
    const yieldDelta = newGrossYield - baseFin.grossYield;

    const monthly = MONTHS_PT.map((m, i) => {
      const total = monthlyBase + monthlyExtra[i];
      const yieldPct = ((total * 12) / typo.purchasePrice) * 100;
      return {
        month: m,
        base: Math.round(monthlyBase),
        extra: Math.round(monthlyExtra[i]),
        total: Math.round(total),
        yieldPct: Number(yieldPct.toFixed(2)),
        events: monthlyEvents[i],
      };
    });

    return {
      extraRevenue: Math.round(extraRevenue),
      annualBase,
      annualWithEvents,
      upliftPct: Number(upliftPct.toFixed(1)),
      newGrossYield: Number(newGrossYield.toFixed(1)),
      yieldDelta: Number(yieldDelta.toFixed(1)),
      breakdown: breakdown.sort((a, b) => b.extra - a.extra),
      monthly,
    };
  }, [data, selectedEvents, typo, baseFin]);

  const toggleEvent = (i: number) => {
    setSelectedEvents((prev) => {
      const n = new Set(prev);
      n.has(i) ? n.delete(i) : n.add(i);
      return n;
    });
  };

  const selectAll = () => {
    if (!data?.events) return;
    setSelectedEvents(new Set(data.events.map((_, i) => i)));
  };
  const clearAll = () => setSelectedEvents(new Set());

  return (
    <SectionBlock
      id="simulador-eventos"
      title="Simulador de Receita com Grandes Eventos"
      takeaway="Veja quanto cada evento adiciona na sua receita anual — escolha quais capturar e compare cenários."
    >
      <div className="flex items-center gap-2 mb-5 bg-primary/5 rounded-lg px-4 py-2.5">
        <CalendarDays className="h-4 w-4 text-primary shrink-0" />
        <span className="text-sm text-foreground font-medium">Calendário SP 2025–2027</span>
        <span className="text-xs text-muted-foreground">· {PROPERTY.neighborhood}, {PROPERTY.city}</span>
      </div>

      <Card className="border-border">
        <CardContent className="p-6 space-y-5 font-body">
          {/* Typology selector */}
          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">Tipologia base</label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {TYPOLOGIES.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setSelectedTypoId(t.id)}
                  className={`p-3 rounded-xl border-2 text-left transition-all ${
                    selectedTypoId === t.id
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/30"
                  }`}
                >
                  <Building2 className={`h-4 w-4 mb-1 ${selectedTypoId === t.id ? "text-primary" : "text-muted-foreground"}`} />
                  <p className="text-xs font-semibold text-foreground leading-tight">{t.label}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Diária base R$ {fmt(t.dailyEstimate)}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Loading state */}
          {loading && !data && (
            <div className="py-12 text-center">
              <Loader2 className="h-6 w-6 animate-spin text-primary mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Carregando eventos de São Paulo…</p>
            </div>
          )}

          {/* Empty / refresh */}
          {!loading && !data && (
            <div className="py-8 text-center">
              <Button onClick={() => fetchEvents(false)} className="min-h-[44px]">
                <CalendarDays className="h-4 w-4 mr-2" /> Carregar eventos
              </Button>
            </div>
          )}

          {data && (
            <>
              {/* Event picker */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-foreground">
                    Eventos a capturar <span className="text-muted-foreground font-normal">({selectedEvents.size}/{data.events.length})</span>
                  </label>
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost" onClick={selectAll} className="h-7 text-xs">Todos</Button>
                    <Button size="sm" variant="ghost" onClick={clearAll} className="h-7 text-xs">Nenhum</Button>
                    <Button size="sm" variant="ghost" onClick={() => fetchEvents(true)} className="h-7 text-xs">
                      <RefreshCw className="h-3 w-3" />
                    </Button>
                  </div>
                </div>

                <div className="max-h-72 overflow-y-auto space-y-1.5 rounded-lg border border-border p-2 bg-muted/20">
                  {data.events.map((ev, i) => {
                    const cat = categoryConfig[ev.category] || categoryConfig.outros;
                    const CatIcon = cat.icon;
                    const checked = selectedEvents.has(i);
                    return (
                      <label
                        key={i}
                        className={`flex items-start gap-2.5 p-2.5 rounded-md cursor-pointer transition-colors ${
                          checked ? "bg-primary/5" : "hover:bg-muted/40"
                        }`}
                      >
                        <Checkbox
                          checked={checked}
                          onCheckedChange={() => toggleEvent(i)}
                          className="mt-0.5"
                        />
                        <div className={`shrink-0 rounded-md p-1.5 ${cat.color.split(" ")[1]}`}>
                          <CatIcon className={`h-3.5 w-3.5 ${cat.color.split(" ")[0]}`} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-xs font-semibold text-foreground truncate">{ev.name}</p>
                            <Badge variant="secondary" className="text-[10px] shrink-0">{ev.dailyRateImpact}</Badge>
                          </div>
                          <p className="text-[11px] text-muted-foreground mt-0.5">
                            {ev.dateRange} · {ev.durationDays || 3} dias
                          </p>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              <Separator />

              {/* Results */}
              {sim && (
                <>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="text-xl font-display font-bold text-muted-foreground">R$ {fmt(sim.annualBase)}</p>
                      <p className="text-xs text-muted-foreground">Receita anual base</p>
                    </div>
                    <div>
                      <p className="text-xl font-display font-bold text-emerald-600">+R$ {fmt(sim.extraRevenue)}</p>
                      <p className="text-xs text-muted-foreground">Receita extra com eventos</p>
                    </div>
                    <div className="col-span-2 md:col-span-1">
                      <p className="text-2xl font-display font-bold text-primary">R$ {fmt(sim.annualWithEvents)}</p>
                      <p className="text-xs text-muted-foreground">Receita anual total</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4 text-center bg-muted/30 rounded-xl p-4">
                    <div>
                      <p className="text-lg font-display font-bold text-foreground">+{sim.upliftPct}%</p>
                      <p className="text-[10px] text-muted-foreground">Receita vs sem eventos</p>
                    </div>
                    <div>
                      <p className="text-lg font-display font-bold text-foreground">{sim.newGrossYield}%</p>
                      <p className="text-[10px] text-muted-foreground">Yield bruto com eventos</p>
                    </div>
                    <div>
                      <p className="text-lg font-display font-bold text-emerald-600">+{sim.yieldDelta} p.p.</p>
                      <p className="text-[10px] text-muted-foreground">Ganho de yield</p>
                    </div>
                  </div>

                  <EventsMonthlyChart data={sim.monthly} baseYield={baseFin.grossYield} />

                  {sim.breakdown.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                        Top contribuições
                      </p>
                      <div className="space-y-1.5">
                        {sim.breakdown.slice(0, 5).map((b, i) => {
                          const cat = categoryConfig[b.category] || categoryConfig.outros;
                          const pctOfTotal = sim.extraRevenue > 0 ? (b.extra / sim.extraRevenue) * 100 : 0;
                          return (
                            <div key={i} className="flex items-center gap-3 text-sm">
                              <div className={`shrink-0 h-2 rounded-full ${cat.color.split(" ")[1]}`} style={{ width: `${Math.max(8, pctOfTotal)}%` }} />
                              <div className="flex-1 min-w-0 flex items-center justify-between gap-2">
                                <span className="text-xs text-foreground truncate">{b.name}</span>
                                <span className="text-xs font-semibold text-emerald-700 tabular-nums shrink-0">
                                  +R$ {fmt(b.extra)}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {sim.extraRevenue > 0 && (
                    <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 flex items-start gap-3">
                      <Sparkles className="text-primary mt-0.5 flex-shrink-0" size={20} />
                      <p className="text-sm text-muted-foreground">
                        Capturando esses eventos, o <span className="font-semibold text-foreground">{typo.label}</span> rende{" "}
                        <span className="font-bold text-primary">+R$ {fmt(sim.extraRevenue)}/ano</span> além da receita base —
                        elevando o yield bruto de {baseFin.grossYield}% para <span className="font-bold text-primary">{sim.newGrossYield}%</span>.
                      </p>
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <p className="text-[10px] text-muted-foreground/60 mt-3 leading-relaxed">
        Estimativa baseada em diária base da tipologia × uplift do evento × ocupação durante o período. Não considera sobreposição de datas.
      </p>
    </SectionBlock>
  );
}
