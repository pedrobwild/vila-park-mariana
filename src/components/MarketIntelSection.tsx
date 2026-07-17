import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, TrendingUp, RefreshCw, ExternalLink, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface PropertyConfig {
  propertyName: string;
  neighborhood: string;
  city: string;
}

interface MarketIntelProps {
  property?: PropertyConfig;
}

const DEFAULT_PROPERTY: PropertyConfig = {
  propertyName: "LM Urban Flex Bela Cintra",
  neighborhood: "Consolação (Av. Paulista)",
  city: "São Paulo",
};

export default function MarketIntelSection({ property = DEFAULT_PROPERTY }: MarketIntelProps) {
  const [content, setContent] = useState<string | null>(null);
  const [citations, setCitations] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const { toast } = useToast();

  const fetchIntel = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("market-intel", {
        body: property,
      });

      if (error) throw error;

      if (data?.success) {
        setContent(data.content);
        setCitations(data.citations || []);
        setLastUpdated(new Date());
      } else {
        throw new Error(data?.error || "Erro ao buscar dados");
      }
    } catch (err: any) {
      console.error("MarketIntel error:", err);
      toast({
        title: "Erro ao buscar dados de mercado",
        description: err.message || "Tente novamente em alguns segundos.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Simple markdown-like rendering (bold, headings, lists)
  const renderContent = (text: string) => {
    const lines = text.split("\n");
    return lines.map((line, i) => {
      const trimmed = line.trim();
      if (!trimmed) return <br key={i} />;

      // Headings
      if (trimmed.startsWith("### "))
        return <h4 key={i} className="text-base font-semibold text-foreground mt-5 mb-2">{trimmed.slice(4)}</h4>;
      if (trimmed.startsWith("## "))
        return <h3 key={i} className="text-lg font-bold text-foreground mt-6 mb-2">{trimmed.slice(3)}</h3>;
      if (trimmed.startsWith("# "))
        return <h3 key={i} className="text-lg font-bold text-foreground mt-6 mb-2">{trimmed.slice(2)}</h3>;

      // List items
      if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
        const itemText = trimmed.slice(2);
        return (
          <div key={i} className="flex items-start gap-2 py-1">
            <div className="mt-2 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
            <span className="text-sm text-muted-foreground leading-relaxed" dangerouslySetInnerHTML={{ __html: boldify(itemText) }} />
          </div>
        );
      }

      // Numbered list
      const numMatch = trimmed.match(/^(\d+)\.\s(.+)/);
      if (numMatch) {
        return (
          <div key={i} className="flex items-start gap-2.5 py-1">
            <span className="text-xs font-bold text-primary mt-0.5 shrink-0 w-5 text-right">{numMatch[1]}.</span>
            <span className="text-sm text-muted-foreground leading-relaxed" dangerouslySetInnerHTML={{ __html: boldify(numMatch[2]) }} />
          </div>
        );
      }

      return <p key={i} className="text-sm text-muted-foreground leading-relaxed py-0.5" dangerouslySetInnerHTML={{ __html: boldify(trimmed) }} />;
    });
  };

  const boldify = (text: string) =>
    text.replace(/\*\*(.+?)\*\*/g, '<strong class="text-foreground font-semibold">$1</strong>');

  return (
    <section id="market-intel" className="scroll-mt-24 py-16 md:py-20">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <Badge variant="outline" className="mb-3 text-primary border-primary/30">
            <Sparkles className="h-3 w-3 mr-1" />
            Dados ao vivo via IA
          </Badge>
          <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground">
            Inteligência de Mercado — Consolação
          </h2>
          <p className="text-muted-foreground mt-1 max-w-xl">
            Análise atualizada do mercado de short stay no bairro Consolação, com dados reais de plataformas de hospedagem.
          </p>
        </div>
        <Button
          onClick={fetchIntel}
          disabled={loading}
          size="lg"
          className="min-h-[48px] shrink-0"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Analisando mercado…
            </>
          ) : content ? (
            <>
              <RefreshCw className="mr-2 h-4 w-4" />
              Atualizar dados
            </>
          ) : (
            <>
              <TrendingUp className="mr-2 h-4 w-4" />
              Analisar mercado agora
            </>
          )}
        </Button>
      </div>

      {!content && !loading && (
        <Card className="border-dashed border-2 border-border/60">
          <CardContent className="py-16 text-center">
            <TrendingUp className="h-10 w-10 text-muted-foreground/40 mx-auto mb-4" />
            <p className="text-muted-foreground font-medium mb-1">Nenhuma análise carregada</p>
            <p className="text-sm text-muted-foreground/70 max-w-md mx-auto">
              Clique em "Analisar mercado agora" para buscar dados atualizados de diárias, ocupação e tendências na região do empreendimento.
            </p>
          </CardContent>
        </Card>
      )}

      {loading && !content && (
        <Card className="border-border/60">
          <CardContent className="py-16 text-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
            <p className="text-muted-foreground font-medium">Buscando dados de mercado via Perplexity AI…</p>
            <p className="text-sm text-muted-foreground/60 mt-1">Isso pode levar alguns segundos.</p>
          </CardContent>
        </Card>
      )}

      {content && (
        <Card className="border-border/60 card-elevated">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                Análise — {property.neighborhood}
              </CardTitle>
              {lastUpdated && (
                <span className="text-xs text-muted-foreground">
                  Atualizado {lastUpdated.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                </span>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="prose-sm max-w-none">{renderContent(content)}</div>

            {citations.length > 0 && (
              <div className="mt-8 pt-4 border-t border-border/40">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/60 mb-2">Fontes</p>
                <div className="flex flex-wrap gap-2">
                  {citations.map((url, i) => {
                    let domain = url;
                    try { domain = new URL(url).hostname.replace("www.", ""); } catch {}
                    return (
                      <a
                        key={i}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-primary hover:underline bg-primary/5 rounded-md px-2 py-1"
                      >
                        <ExternalLink className="h-3 w-3" />
                        {domain}
                      </a>
                    );
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </section>
  );
}
