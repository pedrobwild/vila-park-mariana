import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, RefreshCw, Sparkles, ExternalLink, BarChart3 } from "lucide-react";
import { PURPOSE_SHORT_LABEL, type DealPurpose } from "@/lib/marketMetrics";

interface Secao {
  id: string;
  titulo: string;
  texto: string;
  refs: number[];
}
interface Fonte {
  n: number;
  titulo: string;
  url: string;
}
interface Insight {
  secoes: Secao[];
  sources: Fonte[];
  generated_at: string;
  cached?: boolean;
}

export interface MarketDataStatus {
  /** true = veio do cache do banco; false = regerada agora. */
  cached: boolean;
  /** ISO da geração/atualização da análise. */
  generatedAt: string;
}

interface Props {
  bairro: string;
  cidade: string;
  purpose: DealPurpose | null;
  /** Avisa que a análise foi lida/regerada, para revalidar os dados do bairro no cabeçalho. */
  onAnalysisRefreshed?: (status: MarketDataStatus) => void;
}


const fmtDateTime = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? "—"
    : d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
};

export default function DealMarketIntelSection({
  bairro,
  cidade,
  purpose,
  onAnalysisRefreshed,
}: Props) {

  const finalidade = purpose ?? "geral";
  const [insight, setInsight] = useState<Insight | null>(null);
  const [loadingCache, setLoadingCache] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastAttemptRefresh, setLastAttemptRefresh] = useState(false);
  const refreshedCbRef = useRef(onAnalysisRefreshed);
  refreshedCbRef.current = onAnalysisRefreshed;

  // Lê o cache do banco (sem custo de API)
  useEffect(() => {
    let alive = true;
    setLoadingCache(true);
    setInsight(null);
    supabase
      .from("market_insights")
      .select("payload, sources, generated_at")
      .eq("bairro", bairro)
      .eq("cidade", cidade)
      .eq("finalidade", finalidade)
      .maybeSingle()
      .then(({ data }) => {
        if (!alive) return;
        const payload = data?.payload as { secoes?: Secao[] } | null;
        if (data && Array.isArray(payload?.secoes)) {
          setInsight({
            secoes: payload!.secoes as Secao[],
            sources: (data.sources ?? []) as unknown as Fonte[],
            generated_at: data.generated_at,
            cached: true,
          });
          // Informa o cabeçalho que a análise exibida veio do cache.
          refreshedCbRef.current?.({ cached: true, generatedAt: data.generated_at });
        }
        setLoadingCache(false);
      });
    return () => {
      alive = false;
    };
  }, [bairro, cidade, finalidade]);

  const generate = useCallback(
    async (refresh: boolean) => {
      setGenerating(true);
      setLastAttemptRefresh(refresh);
      setError(null);
      try {
        const { data, error } = await supabase.functions.invoke("market-intel", {
          body: { bairro, cidade, finalidade, structured: true, refresh },
        });
        if (error) throw error;
        if (!data?.success) throw new Error(data?.error || "Não foi possível gerar a análise.");
        setInsight({
          secoes: (data.payload?.secoes ?? []) as Secao[],
          sources: (data.sources ?? []) as Fonte[],
          generated_at: data.generated_at,
          cached: data.cached,
        });
        // Revalida os indicadores do bairro para que fontes e datas de
        // referência do cabeçalho fiquem coerentes com a análise exibida.
        onAnalysisRefreshed?.({
          cached: data.cached === true,
          generatedAt: data.generated_at,
        });
      } catch (e) {
        // Mantemos a última análise válida em tela (e, portanto, as fontes e
        // datas dos tooltips do cabeçalho) — apenas sinalizamos a falha.
        const description =
          e instanceof Error ? e.message : "Tente novamente em alguns segundos.";
        setError(description);
        toast.error("Não foi possível atualizar a análise do bairro", { description });
      } finally {
        setGenerating(false);
      }
    },
    [bairro, cidade, finalidade, onAnalysisRefreshed],
  );




  const findFonte = (n: number) => insight?.sources.find((f) => f.n === n);

  return (
    <section className="space-y-3" aria-label="Inteligência de mercado">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="flex items-center gap-1.5 text-sm font-medium">
          <BarChart3 className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          Inteligência de mercado
        </h3>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-[10px]">
            {bairro} · {purpose ? PURPOSE_SHORT_LABEL[purpose] : "sem finalidade"}
          </Badge>
          {insight && (
            <Button
              size="sm"
              variant="outline"
              className="h-8"
              onClick={() => generate(true)}
              disabled={generating}
            >
              {generating ? (
                <>
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  Atualizando…
                </>
              ) : (
                <>
                  <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                  Atualizar análise
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      {loadingCache ? (
        <div className="h-20 animate-pulse rounded-lg bg-muted/50" aria-busy="true" />
      ) : !insight ? (
        <div className="rounded-lg border border-dashed border-border/70 p-4 text-center">
          <p className="text-xs text-muted-foreground">
            Nenhuma análise gerada para {bairro} ainda. A geração consulta fontes públicas e leva
            alguns segundos.
          </p>
          <Button
            size="sm"
            className="mt-3"
            onClick={() => generate(false)}
            disabled={generating}
          >
            {generating ? (
              <>
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                Gerando análise…
              </>
            ) : (
              <>
                <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                Gerar análise do bairro
              </>
            )}
          </Button>
        </div>
      ) : (
        <div className="space-y-3 rounded-lg border border-border/60 p-3">
          {insight.secoes.map((s) => (
            <div key={s.id || s.titulo}>
              <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {s.titulo}
              </h4>
              <p className="mt-1 text-sm leading-relaxed">
                {s.texto}{" "}
                {(s.refs ?? []).map((n) => {
                  const f = findFonte(n);
                  return f?.url ? (
                    <a
                      key={n}
                      href={f.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="align-super text-[10px] text-primary hover:underline"
                      title={f.titulo}
                    >
                      [{n}]
                    </a>
                  ) : (
                    <span key={n} className="align-super text-[10px] text-muted-foreground">
                      [{n}]
                    </span>
                  );
                })}
              </p>
            </div>
          ))}

          {insight.sources.length > 0 && (
            <div className="border-t border-border/40 pt-2">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Fontes
              </p>
              <ol className="mt-1 space-y-0.5">
                {insight.sources.map((f) => (
                  <li key={f.n} className="text-[11px] text-muted-foreground">
                    <span className="tabular-nums">[{f.n}]</span>{" "}
                    {f.url ? (
                      <a
                        href={f.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-primary hover:underline"
                      >
                        {f.titulo}
                        <ExternalLink className="h-2.5 w-2.5" aria-hidden="true" />
                      </a>
                    ) : (
                      f.titulo
                    )}
                  </li>
                ))}
              </ol>
            </div>
          )}

          <p className="text-[10px] text-muted-foreground">
            Análise gerada em {fmtDateTime(insight.generated_at)}
            {insight.cached ? " · versão em cache" : " · atualizada agora"} · conteúdo produzido
            por IA a partir de fontes públicas — confira antes de usar com o cliente.
          </p>

        </div>
      )}
    </section>
  );
}
