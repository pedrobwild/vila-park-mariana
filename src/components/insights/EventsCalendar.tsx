import { useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CalendarDays, TrendingUp, Loader2, RefreshCw, Users, AlertTriangle,
  Music, Trophy, Briefcase, Palette, Cpu, PartyPopper, Zap,
  ChevronDown, ChevronUp,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";

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

const categoryConfig: Record<string, { icon: typeof Music; label: string; color: string }> = {
  música: { icon: Music, label: "Música", color: "bg-purple-500/10 text-purple-700 border-purple-200" },
  esporte: { icon: Trophy, label: "Esporte", color: "bg-emerald-500/10 text-emerald-700 border-emerald-200" },
  negócios: { icon: Briefcase, label: "Negócios", color: "bg-blue-500/10 text-blue-700 border-blue-200" },
  cultura: { icon: Palette, label: "Cultura", color: "bg-rose-500/10 text-rose-700 border-rose-200" },
  tech: { icon: Cpu, label: "Tech", color: "bg-cyan-500/10 text-cyan-700 border-cyan-200" },
  fórmula1: { icon: Zap, label: "Fórmula 1", color: "bg-red-500/10 text-red-700 border-red-200" },
  carnaval: { icon: PartyPopper, label: "Carnaval", color: "bg-amber-500/10 text-amber-700 border-amber-200" },
  outros: { icon: CalendarDays, label: "Outros", color: "bg-muted text-muted-foreground border-border" },
};

function clampImpact(impact: string): string {
  if (!impact) return impact;
  const match = impact.match(/-?\d+(\.\d+)?/);
  if (!match) return impact;
  const num = parseFloat(match[0]);
  const clamped = Math.max(0, Math.min(100, Math.abs(num)));
  if (clamped === Math.abs(num)) return impact;
  return `+${Math.round(clamped)}%`;
}

function getImpactColor(impact: string) {
  const num = parseInt(impact.replace(/[^0-9]/g, ""));
  if (num >= 80) return "text-red-600 bg-red-500/10";
  if (num >= 50) return "text-amber-600 bg-amber-500/10";
  if (num >= 30) return "text-emerald-600 bg-emerald-500/10";
  return "text-blue-600 bg-blue-500/10";
}

// Window: 01/07/2026 to 31/07/2027
const WINDOW_START = new Date(2026, 6, 1).getTime();
const WINDOW_END = new Date(2027, 7, 1).getTime() - 1;

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

function parseEventDates(dateRange: string): number[] {
  if (!dateRange) return [];
  const text = dateRange.toLowerCase();
  const results: number[] = [];
  const years = Array.from(text.matchAll(/(20\d{2})/g)).map((m) => parseInt(m[1]));
  if (years.length === 0) return [];
  const monthDict = { ...MONTHS_PT, ...MONTHS_EN };
  const monthRegex = new RegExp(`\\b(${Object.keys(monthDict).join("|")})\\b`, "g");
  const months = Array.from(text.matchAll(monthRegex)).map((m) => monthDict[m[1]]);
  // numeric mm/yyyy patterns
  const numeric = Array.from(text.matchAll(/(\d{1,2})[\/\-](20\d{2})/g));
  for (const m of numeric) {
    const mo = parseInt(m[1]) - 1;
    const y = parseInt(m[2]);
    if (mo >= 0 && mo < 12) results.push(new Date(y, mo, 15).getTime());
  }
  if (months.length > 0) {
    for (const y of years) for (const mo of months) results.push(new Date(y, mo, 15).getTime());
  } else {
    for (const y of years) results.push(new Date(y, 5, 15).getTime()); // mid-year fallback
  }
  return results;
}

function isInWindow(ev: EventItem): boolean {
  const dates = parseEventDates(ev.dateRange);
  if (dates.length === 0) {
    // fallback: keep only if text mentions 2026 or 2027
    return /202[67]/.test(ev.dateRange || "");
  }
  return dates.some((d) => d >= WINDOW_START && d <= WINDOW_END);
}

function firstDateForSort(ev: EventItem): number {
  const dates = parseEventDates(ev.dateRange).filter((d) => d >= WINDOW_START && d <= WINDOW_END);
  return dates.length > 0 ? Math.min(...dates) : WINDOW_END;
}

interface EventsCalendarProps {
  onDataLoaded?: (data: EventsData) => void;
  regionLabel?: string;
  title?: string;
  subtitle?: string;
  autoLoad?: boolean;
}

export default function EventsCalendar({
  onDataLoaded,
  regionLabel = "Vila Mariana",
  title,
  subtitle,
  autoLoad = true,
}: EventsCalendarProps) {
  const [data, setData] = useState<EventsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const { toast } = useToast();
  const { t } = useTranslation();
  const rootRef = useRef<HTMLElement | null>(null);
  const triggeredRef = useRef(false);

  const fetchEvents = async (refresh = false) => {
    setLoading(true);
    setError(null);
    try {
      const fnName = refresh ? "sp-events?refresh=true" : "sp-events";
      const { data: res, error: fnError } = await supabase.functions.invoke(fnName);
      if (fnError) throw fnError;
      if (!res?.success) throw new Error(res?.error || "Erro ao buscar eventos");
      setData(res.events);
      onDataLoaded?.(res.events);
      if (refresh) {
        toast({
          title: res.cached ? "Eventos carregados do cache" : "Eventos atualizados",
          description: res.cached
            ? `Cache de ${res.cacheAgeHours}h atrás.`
            : "Pesquisa concluída com dados atualizados.",
        });
      }
    } catch (err: any) {
      console.error("Events error:", err);
      setError(err?.message || "Falha ao carregar eventos");
    } finally {
      setLoading(false);
    }
  };

  // Auto-fetch on in-view (or immediately if autoLoad and IO unavailable)
  useEffect(() => {
    if (!autoLoad || triggeredRef.current) return;
    const node = rootRef.current;
    if (!node || typeof IntersectionObserver === "undefined") {
      triggeredRef.current = true;
      fetchEvents(false);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting && !triggeredRef.current) {
            triggeredRef.current = true;
            fetchEvents(false);
            io.disconnect();
            break;
          }
        }
      },
      { rootMargin: "200px" }
    );
    io.observe(node);
    return () => io.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoLoad]);

  const filteredEvents = useMemo(() => {
    if (!data?.events) return [] as EventItem[];
    return data.events
      .filter(isInWindow)
      .sort((a, b) => firstDateForSort(a) - firstDateForSort(b));
  }, [data]);

  const visibleEvents = expanded ? filteredEvents : filteredEvents.slice(0, 5);
  const windowLabel = t("eventsCalendar.windowLabel", { defaultValue: "julho/2026 a julho/2027" });
  const defaultSubtitle = t("eventsCalendar.defaultSubtitle", {
    region: regionLabel,
    window: windowLabel,
    defaultValue: `Eventos previstos em São Paulo entre ${windowLabel} e como cada um pode impactar a demanda de locação na região da ${regionLabel}.`,
  });
  const defaultTitle = t("eventsCalendar.defaultTitle", {
    defaultValue: "Grandes eventos × demanda de locação em SP",
  });

  return (
    <section ref={rootRef as any} className="space-y-5">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <Badge variant="outline" className="mb-3 text-primary border-primary/30">
            <CalendarDays className="h-3 w-3 mr-1" />
            {t("eventsCalendar.eyebrow", { defaultValue: "Calendário de Eventos SP" })}
          </Badge>
          <h2 className="font-display text-xl md:text-2xl font-bold text-foreground">
            {title ?? defaultTitle}
          </h2>
          <p className="text-muted-foreground text-sm mt-1 max-w-xl">
            {subtitle ?? defaultSubtitle}
          </p>
        </div>
        {data && (
          <Button
            onClick={() => fetchEvents(true)}
            disabled={loading}
            variant="ghost"
            size="sm"
            className="shrink-0 text-muted-foreground hover:text-foreground"
          >
            {loading ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{t("eventsCalendar.updating", { defaultValue: "Atualizando…" })}</>
            ) : (
              <><RefreshCw className="mr-2 h-4 w-4" />{t("eventsCalendar.update", { defaultValue: "Atualizar" })}</>
            )}
          </Button>
        )}
      </div>

      {loading && !data && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-20 rounded-lg" />
            ))}
          </div>
          <Skeleton className="h-16 rounded-lg" />
          <div className="space-y-2.5">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-28 rounded-lg" />
            ))}
          </div>
          <p className="sr-only" role="status" aria-live="polite">
            {t("eventsCalendar.loading", { defaultValue: "Carregando eventos…" })}
          </p>
        </div>
      )}

      {error && !loading && (
        <Card className="border-destructive/40 bg-destructive/5">
          <CardContent className="py-8 text-center space-y-3">
            <AlertTriangle className="h-8 w-8 text-destructive mx-auto" />
            <p className="text-sm text-foreground font-medium">
              {t("eventsCalendar.errorTitle", { defaultValue: "Não foi possível carregar os eventos" })}
            </p>
            <p className="text-xs text-muted-foreground max-w-md mx-auto">{error}</p>
            <Button size="sm" onClick={() => fetchEvents(false)}>
              <RefreshCw className="mr-2 h-4 w-4" />
              {t("eventsCalendar.retry", { defaultValue: "Tentar novamente" })}
            </Button>
          </CardContent>
        </Card>
      )}

      {data && (
        <div className="space-y-5">
          {/* Summary KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Card className="border-border/60">
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-primary tabular-nums">{filteredEvents.length}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {t("eventsCalendar.kpiCount", { defaultValue: "eventos mapeados" })}
                </p>
              </CardContent>
            </Card>
            <Card className="border-border/60">
              <CardContent className="p-4 text-center">
                <p className="text-lg font-bold text-foreground">{data.baselineDaily}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {t("eventsCalendar.kpiBaseline", { defaultValue: "cenário de referência" })}
                </p>
              </CardContent>
            </Card>
            <Card className="border-border/60">
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-emerald-600 tabular-nums">{data.estimatedAnnualBoost}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {t("eventsCalendar.kpiBoost", { defaultValue: "potencial extra com eventos" })}
                </p>
              </CardContent>
            </Card>
            <Card className="border-border/60">
              <CardContent className="p-4 text-center">
                <div className="flex flex-wrap items-center justify-center gap-1">
                  {data.topMonths?.map((m, i) => (
                    <Badge key={i} variant="secondary" className="text-xs">{m}</Badge>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-1.5">
                  {t("eventsCalendar.kpiTopMonths", { defaultValue: "meses de maior demanda" })}
                </p>
              </CardContent>
            </Card>
          </div>

          {data.annualHighlights && (
            <Card className="border-border/60 bg-primary/[0.02]">
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground leading-relaxed flex items-start gap-2">
                  <TrendingUp className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                  {data.annualHighlights}
                </p>
              </CardContent>
            </Card>
          )}

          <Card className="border-border/60 overflow-hidden">
            <CardHeader className="pb-3 bg-muted/30">
              <CardTitle className="text-base flex items-center gap-2">
                <CalendarDays className="h-4.5 w-4.5 text-primary" />
                {t("eventsCalendar.listTitle", { defaultValue: "Eventos por impacto na demanda" })}
                <Badge variant="outline" className="ml-auto text-xs font-normal">
                  {filteredEvents.length} {t("eventsCalendar.eventsWord", { defaultValue: "eventos" })}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-2.5">
              {filteredEvents.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-6">
                  {t("eventsCalendar.emptyWindow", {
                    window: windowLabel,
                    defaultValue: `Nenhum evento encontrado para o período (${windowLabel}).`,
                  })}
                </p>
              )}
              {visibleEvents?.map((event, i) => {
                const cat = categoryConfig[event.category] || categoryConfig.outros;
                const CatIcon = cat.icon;

                return (
                  <div
                    key={i}
                    className="rounded-lg border border-border/60 p-4 space-y-3 transition-colors hover:bg-muted/20"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0">
                        <div className={`shrink-0 rounded-md p-2 ${cat.color.split(" ")[0]}`}>
                          <CatIcon className={`h-4 w-4 ${cat.color.split(" ")[1]}`} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-foreground leading-snug">{event.name}</p>
                          <div className="flex flex-wrap items-center gap-2 mt-1">
                            <Badge variant="outline" className={`text-[10px] ${cat.color}`}>
                              {cat.label}
                            </Badge>
                            <span className="text-[11px] text-muted-foreground">{event.dateRange}</span>
                            {event.durationDays > 0 && (
                              <span className="text-[11px] text-muted-foreground">· {event.durationDays} dias</span>
                            )}
                            {event.recurring && (
                              <Badge variant="secondary" className="text-[10px]">Recorrente</Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className={`shrink-0 rounded-md px-3 py-1.5 text-center ${getImpactColor(event.dailyRateImpact)}`}>
                        <p className="text-lg font-bold tabular-nums leading-none">{event.dailyRateImpact}</p>
                        <p className="text-[10px] mt-0.5 opacity-70">na diária</p>
                      </div>
                    </div>

                    <p className="text-xs text-muted-foreground leading-relaxed">{event.description}</p>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <div className="rounded-md bg-muted/40 p-2.5">
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground/70 font-medium">Público</p>
                        <p className="text-xs font-semibold text-foreground mt-0.5 flex items-center gap-1">
                          <Users className="h-3 w-3 text-muted-foreground" />
                          {event.expectedAudience}
                        </p>
                      </div>
                      <div className="rounded-md bg-muted/40 p-2.5">
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground/70 font-medium">Diária evento</p>
                        <p className="text-xs font-semibold text-emerald-700 mt-0.5">{event.estimatedDailyRate}</p>
                      </div>
                      <div className="rounded-md bg-muted/40 p-2.5">
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground/70 font-medium">Diária normal</p>
                        <p className="text-xs font-semibold text-foreground mt-0.5">{event.normalDailyRate}</p>
                      </div>
                      <div className="rounded-md bg-muted/40 p-2.5">
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground/70 font-medium">Ocupação</p>
                        <p className="text-xs font-semibold text-foreground mt-0.5">{event.occupancyImpact}</p>
                      </div>
                    </div>
                  </div>
                );
              })}

              {filteredEvents.length > 5 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setExpanded(!expanded)}
                  className="w-full text-muted-foreground"
                >
                  {expanded ? (
                    <><ChevronUp className="h-4 w-4 mr-1.5" />{t("eventsCalendar.showLess", { defaultValue: "Mostrar menos" })}</>
                  ) : (
                    <><ChevronDown className="h-4 w-4 mr-1.5" />{t("eventsCalendar.showAll", { count: filteredEvents.length, defaultValue: `Ver todos os ${filteredEvents.length} eventos` })}</>
                  )}
                </Button>
              )}
            </CardContent>
          </Card>

          {data.citations && data.citations.length > 0 && (
            <p className="text-[10px] text-muted-foreground/50">
              {t("eventsCalendar.sources", { defaultValue: "Fontes" })}: {data.citations.slice(0, 5).map((c, i) => (
                <a key={i} href={c} target="_blank" rel="noopener noreferrer" className="underline hover:text-muted-foreground mr-2">
                  [{i + 1}]
                </a>
              ))}
            </p>
          )}
        </div>
      )}
    </section>
  );
}
