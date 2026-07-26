import { useNavigate } from "react-router-dom";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { ChevronRight } from "lucide-react";
import { formatBRLCompact } from "@/lib/crm";
import type { DrillItem } from "@/lib/crmAdvanced";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  title: string;
  description?: string;
  items: DrillItem[];
  total: number;
}

/**
 * Detalhamento de um agrupamento do painel: lista os negócios ou as unidades
 * que compõem o número clicado. Cada item é um atalho — negócio abre o pipeline
 * com o detalhe do negócio, unidade abre o módulo de unidades já filtrado.
 */
export default function DrillDownSheet({ open, onOpenChange, title, description, items, total }: Props) {
  const navigate = useNavigate();
  const truncado = total > items.length;

  const go = (to: string) => {
    onOpenChange(false);
    navigate(to);
  };

  const itemClass =
    "flex w-full items-start gap-2 py-3 text-left transition-colors hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:outline-none cursor-pointer";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col overflow-y-auto sm:max-w-lg">
        <SheetHeader className="text-left">
          <SheetTitle className="font-display text-lg">{title}</SheetTitle>
          <SheetDescription>
            {description ? `${description} · ` : ""}
            {total} {total === 1 ? "registro" : "registros"}
          </SheetDescription>
        </SheetHeader>

        {items.length === 0 ? (
          <p className="mt-8 text-center text-sm text-muted-foreground">
            Nenhum registro neste agrupamento com os filtros atuais.
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-border/60">
            {items.map((it) =>
              it.tipo === "deal" ? (
                <li key={it.id}>
                  <button
                    type="button"
                    className={itemClass}
                    aria-label={`Abrir o negócio ${it.titulo ?? "sem título"}`}
                    onClick={() => go(`/admin?m=crm&deal=${it.id}`)}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="flex items-baseline justify-between gap-3">
                        <span className="truncate text-sm font-medium">{it.titulo ?? "Negócio sem título"}</span>
                        <span className="shrink-0 text-sm tabular-nums">{formatBRLCompact(it.valor_brl ?? 0)}</span>
                      </span>
                      <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                        {[it.pessoa, it.corretor].filter(Boolean).join(" · ") || "Sem lead vinculado"}
                      </span>
                      {it.etapa && (
                        <Badge variant="outline" className="mt-1.5 text-[10px]">
                          {it.etapa}
                        </Badge>
                      )}
                    </span>
                    <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                  </button>
                </li>
              ) : (
                <li key={it.id}>
                  <button
                    type="button"
                    className={itemClass}
                    aria-label={`Abrir a unidade ${it.code} no módulo de unidades`}
                    onClick={() => go(`/admin?u=${encodeURIComponent(it.code)}`)}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="flex items-baseline justify-between gap-3">
                        <span className="text-sm font-medium">Unidade {it.code}</span>
                        <span className="shrink-0 text-sm tabular-nums">{formatBRLCompact(it.price_brl ?? 0)}</span>
                      </span>
                      <span className="mt-0.5 block text-xs text-muted-foreground">
                        {[
                          it.area_m2 != null ? `${Number(it.area_m2).toLocaleString("pt-BR")} m²` : null,
                          it.andar != null ? `${it.andar}º andar` : null,
                          it.face ? `face ${it.face}` : null,
                          `${it.interessados ?? 0} interessado(s)`,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </span>
                      {it.status && (
                        <Badge variant="outline" className="mt-1.5 text-[10px] capitalize">
                          {it.status}
                        </Badge>
                      )}
                    </span>
                    <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                  </button>
                </li>
              ),
            )}
          </ul>
        )}

        {truncado && (
          <p className="mt-auto border-t border-border/60 pt-3 text-xs text-muted-foreground">
            Mostrando {items.length} de {total} registros.
          </p>
        )}
      </SheetContent>
    </Sheet>
  );
}

