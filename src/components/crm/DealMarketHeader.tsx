import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { MapPin, Info } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  buildMarketMetrics,
  fmtDateRef,
  PURPOSE_LABEL,
  type DealPurpose,
  type NeighborhoodMetrics,
} from "@/lib/marketMetrics";

interface Props {
  dealId: string;
  purpose: DealPurpose | null;
  bairro: string;
  cidade: string;
  onPurposeChange: (p: DealPurpose) => void;
  /** Muda de valor para forçar releitura dos dados do bairro (ex.: após "Atualizar análise"). */
  refreshToken?: number;
}

export default function DealMarketHeader({
  dealId,
  purpose,
  bairro,
  cidade,
  onPurposeChange,
  refreshToken = 0,
}: Props) {
  const [metrics, setMetrics] = useState<NeighborhoodMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    supabase
      .from("market_neighborhood_metrics")
      .select("*")
      .eq("bairro", bairro)
      .eq("cidade", cidade)
      .maybeSingle()
      .then(({ data }) => {
        if (!alive) return;
        setMetrics((data ?? null) as NeighborhoodMetrics | null);
        setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [bairro, cidade, refreshToken]);


  const savePurpose = async (p: DealPurpose) => {
    setSaving(true);
    const { error } = await supabase
      .from("crm_deals")
      .update({ finalidade: p })
      .eq("id", dealId);
    setSaving(false);
    if (error) {
      toast.error("Não foi possível salvar a finalidade", { description: error.message });
      return;
    }
    onPurposeChange(p);
  };

  const items = purpose ? buildMarketMetrics(purpose, metrics) : [];
  const dataRef = fmtDateRef(metrics?.data_referencia ?? null);

  return (
    <section
      className="mt-4 rounded-lg border border-border/60 bg-muted/20 p-3"
      aria-label="Dados de mercado do bairro"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
          <span className="font-medium text-foreground">{bairro}</span>
          <span>· {cidade}</span>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-[11px] text-muted-foreground" htmlFor={`finalidade-${dealId}`}>
            Finalidade
          </label>
          <Select
            value={purpose ?? undefined}
            onValueChange={(v) => savePurpose(v as DealPurpose)}
            disabled={saving}
          >
            <SelectTrigger id={`finalidade-${dealId}`} className="h-8 w-[190px] text-xs">
              <SelectValue placeholder="Selecionar" />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(PURPOSE_LABEL) as DealPurpose[]).map((p) => (
                <SelectItem key={p} value={p} className="text-xs">
                  {PURPOSE_LABEL[p]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {!purpose ? (
        <p className="mt-3 text-xs text-muted-foreground">
          Defina a finalidade para ver os dados de mercado do bairro.
        </p>
      ) : loading ? (
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4" aria-busy="true">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-14 animate-pulse rounded-md bg-muted/60" />
          ))}
        </div>
      ) : (
        <TooltipProvider delayDuration={150}>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {items.map((m) => (
              <Tooltip key={m.key}>
                <TooltipTrigger asChild>
                  <div
                    tabIndex={0}
                    className="rounded-md border border-border/60 bg-background px-2.5 py-2 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <p className="flex items-center gap-1 text-[10px] uppercase tracking-wide text-muted-foreground">
                      {m.label}
                      <Info className="h-3 w-3 opacity-50" aria-hidden="true" />
                    </p>
                    {m.value ? (
                      <p className="mt-0.5 whitespace-nowrap font-display text-base tabular-nums">
                        {m.value}
                      </p>
                    ) : (
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        <span aria-hidden="true">—</span>{" "}
                        <span className="italic">sem dados</span>
                      </p>
                    )}
                  </div>
                </TooltipTrigger>
                <TooltipContent className="max-w-[260px] text-xs">
                  <p>{m.hint}</p>
                  <p className="mt-1 text-muted-foreground">
                    Fonte: {m.fonte} · {bairro}
                    {fmtDateRef(m.dataReferencia)
                      ? ` · ref. ${fmtDateRef(m.dataReferencia)}`
                      : ""}
                  </p>
                  {!m.value && (
                    <p className="mt-1 text-muted-foreground">
                      {m.emptyHint ?? "Sem dados para este bairro."}
                    </p>
                  )}
                </TooltipContent>
              </Tooltip>
            ))}
          </div>
          {metrics ? (
            <p className="mt-2 text-[10px] text-muted-foreground">
              Fonte: {metrics.fonte}
              {dataRef ? ` · data de referência ${dataRef}` : ""}
            </p>
          ) : (
            <p className="mt-2 text-[10px] text-muted-foreground">
              Sem base de mercado cadastrada para {bairro}.
            </p>
          )}
        </TooltipProvider>
      )}
    </section>
  );
}
