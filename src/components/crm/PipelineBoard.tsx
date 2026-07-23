import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ChevronDown, MoreVertical } from "lucide-react";
import { STAGE_ORDER, STAGE_LABEL, formatBRLCompact, daysSince, type CrmStage } from "@/lib/crm";
import type { DealFull } from "./CrmSection";

interface Props {
  deals: DealFull[];
  loading: boolean;
  onReload: () => Promise<void>;
  onOpenDeal: (id: string) => void;
}

interface PendingChange {
  deal: DealFull;
  to: CrmStage;
}

export default function PipelineBoard({ deals, loading, onReload, onOpenDeal }: Props) {
  const [pending, setPending] = useState<PendingChange | null>(null);
  const [updateUnitStatus, setUpdateUnitStatus] = useState(true);
  const [lostReason, setLostReason] = useState("");
  const [saving, setSaving] = useState(false);

  const byStage = useMemo(() => {
    const map: Record<CrmStage, DealFull[]> = {
      lead: [], qualificado: [], visita: [], proposta: [], reserva: [], fechado: [], perdido: [],
    };
    for (const d of deals) map[d.stage].push(d);
    return map;
  }, [deals]);

  const requestChange = (deal: DealFull, to: CrmStage) => {
    if (to === deal.stage) return;
    setLostReason("");
    setUpdateUnitStatus(to === "reserva" || to === "fechado");
    setPending({ deal, to });
  };

  const primaryUnit = (deal: DealFull) =>
    deal.deal_units.find((du) => du.is_primary) ?? deal.deal_units[0];

  const confirmChange = async () => {
    if (!pending) return;
    const { deal, to } = pending;
    setSaving(true);
    try {
      const patch: Record<string, unknown> = { stage: to };
      if (to === "perdido") {
        if (!lostReason.trim()) {
          toast.error("Informe o motivo da perda.");
          setSaving(false);
          return;
        }
        patch.lost_reason = lostReason.trim();
      } else {
        patch.lost_reason = null;
      }
      const { error } = await supabase.from("crm_deals").update(patch).eq("id", deal.id);
      if (error) throw error;

      const pu = primaryUnit(deal);
      if (updateUnitStatus && pu?.unit) {
        if (to === "reserva" && pu.unit.status === "disponivel") {
          await supabase.from("units").update({ status: "reservado" }).eq("id", pu.unit.id);
        } else if (to === "fechado" && pu.unit.status !== "vendido") {
          await supabase.from("units").update({ status: "vendido" }).eq("id", pu.unit.id);
        }
      }
      toast.success(`Etapa atualizada: ${STAGE_LABEL[to]}`);
      setPending(null);
      await onReload();
    } catch (e) {
      toast.error("Não foi possível atualizar a etapa.", {
        description: e instanceof Error ? e.message : undefined,
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <p className="text-sm text-muted-foreground">Carregando pipeline…</p>;
  }

  return (
    <>
      <div className="overflow-x-auto pb-2 -mx-4 md:mx-0 px-4 md:px-0">
        <div className="flex gap-3 min-w-max snap-x snap-mandatory">
          {STAGE_ORDER.map((stage) => {
            const list = byStage[stage];
            const total = list.reduce((s, d) => s + Number(d.value_brl || 0), 0);
            return (
              <section
                key={stage}
                className="snap-start w-[280px] shrink-0 rounded-xl border border-border/60 bg-muted/20"
              >
                <header className="px-3 py-2.5 border-b border-border/50 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <h3 className="font-display text-sm font-semibold truncate">
                      {STAGE_LABEL[stage]}
                    </h3>
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
                    const pu = primaryUnit(deal);
                    return (
                      <article
                        key={deal.id}
                        className="group rounded-lg border border-border/60 bg-background p-3 hover:border-accent/50 hover:shadow-sm transition cursor-pointer"
                        onClick={() => onOpenDeal(deal.id)}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{deal.person.full_name}</p>
                            <p className="text-[11px] text-muted-foreground truncate">
                              {deal.title}
                            </p>
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
                              {STAGE_ORDER.filter((s) => s !== deal.stage).map((s) => (
                                <DropdownMenuItem key={s} onClick={() => requestChange(deal, s)}>
                                  {STAGE_LABEL[s]}
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

                        <div className="mt-2.5 flex items-center justify-between text-[11px] text-muted-foreground">
                          <span className="tabular-nums font-medium text-foreground">
                            {formatBRLCompact(Number(deal.value_brl || 0))}
                          </span>
                          <span className="tabular-nums">{daysSince(deal.stage_changed_at)}d</span>
                        </div>

                        {deal.stage === "perdido" && deal.lost_reason && (
                          <p className="mt-2 text-[10px] text-muted-foreground/80 line-clamp-2">
                            {deal.lost_reason}
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

      <Dialog open={!!pending} onOpenChange={(o) => !o && setPending(null)}>
        <DialogContent>
          {pending && (
            <>
              <DialogHeader>
                <DialogTitle>
                  Mover para {STAGE_LABEL[pending.to]}
                </DialogTitle>
                <DialogDescription>
                  {pending.deal.person.full_name} — {pending.deal.title}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-3 py-2">
                {(pending.to === "reserva" || pending.to === "fechado") && (
                  <div className="flex items-start gap-2 rounded-lg border border-border/60 p-3">
                    <Checkbox
                      id="upd-unit"
                      checked={updateUnitStatus}
                      onCheckedChange={(c) => setUpdateUnitStatus(!!c)}
                    />
                    <div className="space-y-0.5">
                      <Label htmlFor="upd-unit" className="text-sm cursor-pointer">
                        Também marcar unidade primária{" "}
                        <span className="font-mono">
                          {primaryUnit(pending.deal)?.unit?.code ?? "—"}
                        </span>{" "}
                        como {pending.to === "reserva" ? "reservada" : "vendida"}
                      </Label>
                      <p className="text-[11px] text-muted-foreground">
                        Recomendado. Atualiza a disponibilidade na vitrine pública.
                      </p>
                    </div>
                  </div>
                )}

                {pending.to === "perdido" && (
                  <div className="space-y-1.5">
                    <Label htmlFor="lost-reason">Motivo da perda *</Label>
                    <Textarea
                      id="lost-reason"
                      value={lostReason}
                      onChange={(e) => setLostReason(e.target.value)}
                      placeholder="Ex.: cliente optou por outro empreendimento"
                      rows={3}
                    />
                  </div>
                )}
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setPending(null)} disabled={saving}>
                  Cancelar
                </Button>
                <Button onClick={confirmChange} disabled={saving}>
                  {saving ? "Salvando…" : "Confirmar"}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
