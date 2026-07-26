import { useMemo } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { MoreVertical, FileText, AlertTriangle } from "lucide-react";
import { formatBRLCompact, daysSince, initials, type CrmStageRow } from "@/lib/crm";
import type { DealFull } from "./CrmSection";

interface Props {
  deals: DealFull[];
  stages: CrmStageRow[];
  onOpenDeal: (id: string) => void;
  onRequestStageChange: (deal: DealFull, to: CrmStageRow) => void;
  staleDays?: number;
}

export default function KanbanView({
  deals,
  stages,
  onOpenDeal,
  onRequestStageChange,
  staleDays = 7,
}: Props) {
  const byStage = useMemo(() => {
    const map = new Map<string, DealFull[]>();
    for (const s of stages) map.set(s.id, []);
    for (const d of deals) {
      const arr = map.get(d.stage_id);
      if (arr) arr.push(d);
      else map.set(d.stage_id, [d]);
    }
    return map;
  }, [deals, stages]);

  const primaryUnit = (deal: DealFull) =>
    deal.deal_units.find((du) => du.is_primary) ?? deal.deal_units[0];

  return (
    <div className="overflow-x-auto pb-2 -mx-4 md:mx-0 px-4 md:px-0">
      <div className="flex gap-3 min-w-max snap-x snap-mandatory">
        {stages.map((stage) => {
          const list = byStage.get(stage.id) ?? [];
          const total = list.reduce((s, d) => s + Number(d.value_brl || 0), 0);
          return (
            <section
              key={stage.id}
              className="snap-start w-[280px] shrink-0 rounded-xl border border-border/60 bg-muted/20"
            >
              <header className="px-3 py-2.5 border-b border-border/50 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <h3 className="font-display text-sm font-semibold truncate">{stage.label}</h3>
                  <span className="text-[11px] text-muted-foreground tabular-nums">
                    {list.length}
                  </span>
                </div>
                <span className="text-[11px] text-muted-foreground tabular-nums">
                  {formatBRLCompact(total)}
                </span>
              </header>
              <div className="p-2 space-y-2 min-h-[80px]">
                {list.length === 0 && (
                  <p className="text-[11px] text-muted-foreground/70 px-2 py-4 text-center">
                    Sem negócios
                  </p>
                )}
                {list.map((deal) => {
                  const dias = daysSince(deal.stage_changed_at);
                  const parado = stage.kind === "aberto" && dias >= staleDays;
                  return (
                  <article
                    key={deal.id}
                    className="group rounded-lg border border-border/60 bg-background p-3 hover:border-accent/50 hover:shadow-sm transition cursor-pointer"
                    onClick={() => onOpenDeal(deal.id)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{deal.person.full_name}</p>
                        <p className="text-[11px] text-muted-foreground truncate">{deal.title}</p>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 shrink-0"
                            onClick={(e) => e.stopPropagation()}
                            aria-label="Mover etapa"
                          >
                            <MoreVertical className="h-3.5 w-3.5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                          <DropdownMenuLabel className="text-xs">Mover para</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          {stages
                            .filter((s) => s.id !== deal.stage_id)
                            .map((s) => (
                              <DropdownMenuItem
                                key={s.id}
                                onClick={() => onRequestStageChange(deal, s)}
                              >
                                {s.label}
                              </DropdownMenuItem>
                            ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    {deal.deal_units.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {deal.deal_units.slice(0, 4).map((du) => (
                          <span
                            key={du.id}
                            className={`text-[10px] px-1.5 py-0.5 rounded border tabular-nums ${
                              du.is_primary
                                ? "border-accent/60 text-accent bg-accent/5 font-medium"
                                : "border-border/60 text-muted-foreground"
                            }`}
                            title={du.unit?.code}
                          >
                            {du.unit?.code ?? "—"}
                          </span>
                        ))}
                        {deal.deal_units.length > 4 && (
                          <span className="text-[10px] text-muted-foreground">
                            +{deal.deal_units.length - 4}
                          </span>
                        )}
                      </div>
                    )}

                    <div className="mt-2.5 flex items-center justify-between text-[11px] text-muted-foreground gap-2">
                      <span className="tabular-nums font-medium text-foreground">
                        {formatBRLCompact(Number(deal.value_brl || 0))}
                      </span>
                      <div className="flex items-center gap-1.5">
                        {(deal.proposals?.length ?? 0) > 0 && (
                          <span
                            className="inline-flex items-center gap-1 tabular-nums"
                            title={`${deal.proposals.length} proposta(s)`}
                          >
                            <FileText className="h-3 w-3" />
                            {deal.proposals.length}
                          </span>
                        )}
                        {deal.proposals?.some((p) => p.status === "aceita") && (
                          <span className="text-[9px] px-1 py-0.5 rounded border border-emerald-600/40 text-emerald-700 dark:text-emerald-400 bg-emerald-500/5 uppercase tracking-wide">
                            negociado
                          </span>
                        )}
                        <span
                          className={`tabular-nums ${parado ? "text-amber-700 dark:text-amber-400 font-medium" : ""}`}
                          title={parado ? `Parado há ${dias} dias nesta etapa` : undefined}
                        >
                          {parado && <AlertTriangle className="inline h-3 w-3 mr-0.5 -mt-0.5" />}
                          {dias}d
                        </span>
                      </div>
                    </div>


                    <div className="mt-2 flex items-center gap-1.5 text-[10px] text-muted-foreground">
                      <span
                        className="h-5 w-5 rounded-full bg-muted flex items-center justify-center text-[9px] font-medium"
                        aria-hidden
                      >
                        {initials(deal.broker?.full_name)}
                      </span>
                      <span className="truncate">
                        {deal.broker?.full_name ?? "Sem corretor"}
                      </span>
                    </div>

                    {stage.kind === "perdido" && (deal.loss_reason?.label || deal.lost_reason) && (
                      <p className="mt-2 text-[10px] text-muted-foreground/80 line-clamp-2">
                        {deal.loss_reason?.label ?? deal.lost_reason}
                      </p>
                    )}
                  </article>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
