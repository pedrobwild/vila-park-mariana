import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Users, RefreshCw, Sparkles, CalendarRange, Database, UserCircle, ArrowLeftRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import InsightsDashboard from "@/components/insights/InsightsDashboard";
import CorretorComparison from "@/components/insights/CorretorComparison";

interface InsightsData {
  amandaName: string;
  totalMeetings: number;
  totalDurationMinutes: number;
  positiveSentimentPct: number | null;
  latestMeeting: string | null;
  cached?: boolean;
  cacheAge?: number;
  dashboard?: any;
}

interface CorretorUser {
  id: string;
  name: string;
  email: string | null;
}

export default function ElephantInsightsSection() {
  const [data, setData] = useState<InsightsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);
  const [corretores, setCorretores] = useState<CorretorUser[]>([]);
  const [selectedCorretor, setSelectedCorretor] = useState<string>("");
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [viewMode, setViewMode] = useState<"individual" | "comparativo">("individual");
  const { toast } = useToast();

  // Load available corretores on mount
  useEffect(() => {
    const loadUsers = async () => {
      setLoadingUsers(true);
      try {
        const { data: res, error } = await supabase.functions.invoke(
          "elephant-insights",
          { body: { action: "list-users" } }
        );
        if (!error && res?.success && res.users) {
          setCorretores(res.users);
          if (res.users.length > 0) {
            setSelectedCorretor(res.users[0].id);
          }
        }
      } catch {
        // Silently fail
      } finally {
        setLoadingUsers(false);
      }
    };
    loadUsers();
  }, []);

  // Load cache for selected corretor
  useEffect(() => {
    if (!selectedCorretor) {
      setInitialLoad(false);
      return;
    }
    const loadCache = async () => {
      try {
        const cacheKey = `user_${selectedCorretor}`;
        const { data: cached } = await supabase
          .from("elephant_insights_cache")
          .select("*")
          .eq("cache_key", cacheKey)
          .single();

        if (cached) {
          const age = Math.round((Date.now() - new Date(cached.updated_at).getTime()) / 60000);
          setData({
            amandaName: cached.amanda_name || "Corretor",
            totalMeetings: cached.total_meetings,
            totalDurationMinutes: cached.total_duration_minutes,
            positiveSentimentPct: cached.positive_sentiment_pct,
            latestMeeting: cached.latest_meeting,
            cached: true,
            cacheAge: age,
            dashboard: cached.charts_data,
          });
        } else {
          setData(null);
        }
      } catch {
        setData(null);
      } finally {
        setInitialLoad(false);
      }
    };
    loadCache();
  }, [selectedCorretor]);

  const fetchInsights = async (refresh = false) => {
    setLoading(true);
    try {
      const body: Record<string, string> = {};
      if (refresh) body.refresh = "true";
      if (selectedCorretor) body.userId = selectedCorretor;

      const { data: res, error } = await supabase.functions.invoke("elephant-insights", { body });
      if (error) throw error;
      if (!res?.success) throw new Error(res?.error || "Erro ao buscar insights");

      setData({
        amandaName: res.amandaName,
        totalMeetings: res.totalMeetings,
        totalDurationMinutes: res.totalDurationMinutes || 0,
        positiveSentimentPct: res.positiveSentimentPct,
        latestMeeting: res.latestMeeting,
        cached: res.cached || false,
        cacheAge: res.cacheAge,
        dashboard: res.chartsData,
      });

      if (res.cached) {
        toast({ title: "Dados carregados do cache", description: `Atualizado há ${res.cacheAge} minutos.` });
      } else {
        toast({ title: "Insights atualizados", description: "Dados processados com sucesso." });
      }
    } catch (err: any) {
      console.error("ElephantInsights error:", err);
      toast({ title: "Erro ao buscar insights", description: err.message || "Tente novamente.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const selectedCorretorName = corretores.find(c => c.id === selectedCorretor)?.name || "Corretor";

  return (
    <section className="scroll-mt-24 py-16 md:py-20">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <Badge variant="outline" className="mb-3 text-primary border-primary/30">
            <Sparkles className="h-3 w-3 mr-1" />
            Inteligência Comercial via IA
          </Badge>
          <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground">
            Dashboard Comercial
          </h2>
          <p className="text-muted-foreground mt-1 max-w-xl">
            Insights acionáveis extraídos das reuniões com investidores: objeções, argumentos que convertem e sinais de compra.
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-3 shrink-0">
          {/* View Mode Toggle */}
          <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as any)} className="shrink-0">
            <TabsList className="h-10">
              <TabsTrigger value="individual" className="text-xs gap-1.5 px-3">
                <UserCircle className="h-3.5 w-3.5" />
                Individual
              </TabsTrigger>
              <TabsTrigger value="comparativo" className="text-xs gap-1.5 px-3">
                <ArrowLeftRight className="h-3.5 w-3.5" />
                Comparativo
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {viewMode === "individual" && (
            <>
              {/* Corretor Filter */}
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium flex items-center gap-1">
                  <UserCircle className="h-3 w-3" />
                  Corretor
                </label>
                <Select
                  value={selectedCorretor}
                  onValueChange={setSelectedCorretor}
                  disabled={loadingUsers || loading}
                >
                  <SelectTrigger className="w-[200px] h-10">
                    <SelectValue placeholder={loadingUsers ? "Carregando…" : "Selecione"} />
                  </SelectTrigger>
                  <SelectContent>
                    {corretores.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {data && (
                <Button onClick={() => fetchInsights(true)} disabled={loading} variant="outline" size="lg" className="min-h-[48px]">
                  <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                  Forçar atualização
                </Button>
              )}
              <Button onClick={() => fetchInsights(false)} disabled={loading || !selectedCorretor} size="lg" className="min-h-[48px]">
                {loading ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Analisando…</>
                ) : data ? (
                  <><RefreshCw className="mr-2 h-4 w-4" />Atualizar</>
                ) : (
                  <><Users className="mr-2 h-4 w-4" />Gerar insights</>
                )}
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Comparativo Mode */}
      {viewMode === "comparativo" && (
        <CorretorComparison corretores={corretores} loadingUsers={loadingUsers} />
      )}

      {/* Individual Mode */}
      {viewMode === "individual" && (
        <>
          {!data && !loading && !initialLoad && (
            <Card className="border-dashed border-2 border-border/60">
              <CardContent className="py-16 text-center">
                <Users className="h-10 w-10 text-muted-foreground/40 mx-auto mb-4" />
                <p className="text-muted-foreground font-medium mb-1">Nenhum insight carregado</p>
                <p className="text-sm text-muted-foreground/70 max-w-md mx-auto">
                  Selecione um corretor e clique em "Gerar insights" para analisar as reuniões e gerar o dashboard comercial.
                </p>
              </CardContent>
            </Card>
          )}

          {loading && !data && (
            <Card className="border-border/60">
              <CardContent className="py-16 text-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
                <p className="text-muted-foreground font-medium">Processando reuniões de {selectedCorretorName}…</p>
                <p className="text-sm text-muted-foreground/60 mt-1">Extraindo padrões e gerando dashboard. Pode levar até 30s.</p>
              </CardContent>
            </Card>
          )}

          {data && (
            <div className="space-y-5">
              <div className="flex items-center gap-3 flex-wrap">
                <Badge className="bg-primary/10 text-primary border-primary/15 hover:bg-primary/10 text-sm py-1 px-3">
                  <UserCircle className="h-3.5 w-3.5 mr-1.5" />
                  {data.amandaName}
                </Badge>
                {data.cached && data.cacheAge !== undefined && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Database className="h-3.5 w-3.5" />
                    <span>Cache de {data.cacheAge < 60 ? `${data.cacheAge}min` : `${Math.round(data.cacheAge / 60)}h`} atrás</span>
                  </div>
                )}
              </div>

              {/* Summary KPIs */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <Card className="border-border/60">
                  <CardContent className="p-4 text-center">
                    <p className="text-2xl font-bold text-primary tabular-nums">{data.totalMeetings}</p>
                    <p className="text-xs text-muted-foreground mt-1">reuniões analisadas</p>
                  </CardContent>
                </Card>
                <Card className="border-border/60">
                  <CardContent className="p-4 text-center">
                    <p className="text-2xl font-bold text-foreground tabular-nums">
                      {data.totalDurationMinutes > 60 ? `${Math.round(data.totalDurationMinutes / 60)}h ${data.totalDurationMinutes % 60}m` : `${data.totalDurationMinutes}m`}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">tempo total gravado</p>
                  </CardContent>
                </Card>
                {data.latestMeeting && (
                  <Card className="border-border/60">
                    <CardContent className="p-4 text-center">
                      <p className="text-sm font-semibold text-foreground flex items-center justify-center gap-1.5">
                        <CalendarRange className="h-4 w-4 text-muted-foreground" />
                        {new Date(data.latestMeeting).toLocaleDateString("pt-BR")}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">última reunião</p>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Dashboard */}
              {data.dashboard && <InsightsDashboard data={data.dashboard} />}
            </div>
          )}
        </>
      )}
    </section>
  );
}
