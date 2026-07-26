import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
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
 * que compõem o número clicado. Os dados já vêm carregados com o painel.
 */
export default function DrillDownSheet({ open, onOpenChange, title, description, items, total }: Props) {
  const truncado = total > items.length;
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader className="text-left">
          <SheetTitle className="font-display text-lg">{title}</SheetTitle>
          <SheetDescription>
            {description ? `${description} · ` : ""}
            {total} {total === 1 ? "registro" : "registros"}
            {truncado ? ` · exibindo os ${items.length} primeiros` : ""}
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
                <li key={it.id} className="py-3">
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="truncate text-sm font-medium">{it.titulo ?? "Negócio sem título"}</p>
                    <span className="shrink-0 text-sm tabular-nums">{formatBRLCompact(it.valor_brl ?? 0)}</span>
                  </div>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    {[it.pessoa, it.corretor].filter(Boolean).join(" · ") || "Sem lead vinculado"}
                  </p>
                  {it.etapa && (
                    <Badge variant="outline" className="mt-1.5 text-[10px]">
                      {it.etapa}
                    </Badge>
                  )}
                </li>
              ) : (
                <li key={it.id} className="py-3">
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="text-sm font-medium">Unidade {it.code}</p>
                    <span className="shrink-0 text-sm tabular-nums">{formatBRLCompact(it.price_brl ?? 0)}</span>
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {[
                      it.area_m2 != null ? `${Number(it.area_m2).toLocaleString("pt-BR")} m²` : null,
                      it.andar != null ? `${it.andar}º andar` : null,
                      it.face ? `face ${it.face}` : null,
                      `${it.interessados ?? 0} interessado(s)`,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                  {it.status && (
                    <Badge variant="outline" className="mt-1.5 text-[10px] capitalize">
                      {it.status}
                    </Badge>
                  )}
                </li>
              ),
            )}
          </ul>
        )}
      </SheetContent>
    </Sheet>
  );
}
