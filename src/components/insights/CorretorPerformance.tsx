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
import {
  Loader2, Users, RefreshCw, CalendarRange, Database,
  UserCircle, ArrowLeftRight, UserX,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import InsightsDashboard from "./InsightsDashboard";
import CorretorComparison from "./CorretorComparison";
import { MOCK_CORRETORES, MOCK_CORRETOR_DATA } from "@/data/insightsMockData";

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

export default function CorretorPerformance() {
  const [data, setData] = useState<InsightsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);
  const [corretores] = useState<CorretorUser[]>(MOCK_CORRETORES);
  const [selectedCorretor, setSelectedCorretor] = useState<string>(MOCK_CORRETORES[0].id);
  const [loadingUsers] = useState(false);
  const [viewMode, setViewMode] = useState<"individual" | "comparativo">("individual");
  const { toast } = useToast();

  useEffect(() => {
    if (!selectedCorretor) { setInitialLoad(false); return; }
    const mock = MOCK_CORRETOR_DATA[selectedCorretor];
    if (mock) {
      setData({ ...mock, cached: true, cacheAge: 15 });
    } else {
      setData(null);
    }
    setInitialLoad(false);
  }, [selectedCorretor]);

  const fetchInsights = async (refresh = false) => {
    setLoading(true);
    setTimeout(() => {
      const mock = MOCK_CORRETOR_DATA[selectedCorretor];
      if (mock) {
        setData({ ...mock, cached: !refresh, cacheAge: refresh ? undefined : 15 });
        toast({
          title: refresh ? "Insights atualizados" : "Dados carregados",
          description: "Demonstração com dados fictícios fixos.",
        });
      }
      setLoading(false);
    }, refresh ? 700 : 300);
  };


  const selectedCorretorName = corretores.find(c => c.id === selectedCorretor)?.name || "Corretor";

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground">
            Performance por Corretor
          </h2>
          <p className="text-muted-foreground mt-1 max-w-xl">
            Analise a performance individual de cada corretor ou compare métricas entre dois corretores.
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-3 shrink-0">
          <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as any)} className="shrink-0">
            <TabsList className="h-10">
              <TabsTrigger value="individual" className="text-xs gap-1.5 px-3">
                <UserCircle className="h-3.5 w-3.5" /> Individual
              </TabsTrigger>
              <TabsTrigger value="comparativo" className="text-xs gap-1.5 px-3">
                <ArrowLeftRight className="h-3.5 w-3.5" /> Comparativo
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {viewMode === "individual" && (
            <>
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium flex items-center gap-1">
                  <UserCircle className="h-3 w-3" /> Corretor
                </label>
                <Select value={selectedCorretor} onValueChange={setSelectedCorretor} disabled={loadingUsers || loading}>
                  <SelectTrigger className="w-[200px] h-10">
                    <SelectValue placeholder={loadingUsers ? "Carregando…" : "Selecione"} />
                  </SelectTrigger>
                  <SelectContent>
                    {corretores.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {data && (
                <Button onClick={() => fetchInsights(true)} disabled={loading} variant="outline" size="lg" className="min-h-[48px]">
                  <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Forçar atualização
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

      {viewMode === "comparativo" && (
        <CorretorComparison corretores={corretores} loadingUsers={loadingUsers} />
      )}

      {viewMode === "individual" && (
        <>
          {!data && !loading && !initialLoad && (
            <Card className="border-dashed border-2 border-border/60">
              <CardContent className="py-16 text-center">
                <Users className="h-10 w-10 text-muted-foreground/40 mx-auto mb-4" />
                <p className="text-muted-foreground font-medium mb-1">Nenhum insight carregado</p>
                <p className="text-sm text-muted-foreground/70 max-w-md mx-auto">
                  Selecione um corretor e clique em "Gerar insights" para analisar as reuniões.
                </p>
              </CardContent>
            </Card>
          )}

          {loading && !data && (
            <Card className="border-border/60">
              <CardContent className="py-16 text-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
                <p className="text-muted-foreground font-medium">Processando reuniões de {selectedCorretorName}…</p>
                <p className="text-sm text-muted-foreground/60 mt-1">Pode levar até 30s.</p>
              </CardContent>
            </Card>
          )}

          {data && (
            <div className="space-y-5">
              <div className="flex items-center gap-3 flex-wrap">
                <Badge className="bg-primary/10 text-primary border-primary/15 hover:bg-primary/10 text-sm py-1 px-3">
                  <UserCircle className="h-3.5 w-3.5 mr-1.5" /> {data.amandaName}
                </Badge>
                {data.cached && data.cacheAge !== undefined && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Database className="h-3.5 w-3.5" />
                    <span>Cache de {data.cacheAge < 60 ? `${data.cacheAge}min` : `${Math.round(data.cacheAge / 60)}h`} atrás</span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
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
                {data.dashboard?.metrics?.scheduledCount > 0 && (
                  <Card className="border-border/60">
                    <CardContent className="p-4 text-center">
                      <p className="text-2xl font-bold text-amber-600 tabular-nums flex items-center justify-center gap-1.5">
                        <UserX className="h-5 w-5" />
                        {data.dashboard.metrics.noShowRate}%
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        no-show ({data.dashboard.metrics.noShowCount}/{data.dashboard.metrics.scheduledCount})
                      </p>
                    </CardContent>
                  </Card>
                )}
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

              {data.dashboard && <InsightsDashboard data={data.dashboard} scopeLabel={data.amandaName} />}
            </div>
          )}
        </>
      )}
    </div>
  );
}
