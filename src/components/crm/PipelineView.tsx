import { useCallback, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { notifyCrmError, type SbErr } from "@/lib/crmErrors";
import { Button } from "@/components/ui/button";
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
import { LayoutGrid, List, Settings2 } from "lucide-react";
import { useRole } from "@/hooks/useIsAdmin";
import type { CrmStageRow } from "@/lib/crm";
import type { DealFull } from "./CrmSection";
import KanbanView from "./KanbanView";
import ListView from "./ListView";
import StageManagerDialog from "./StageManagerDialog";

interface Props {
  deals: DealFull[];
  stages: CrmStageRow[];
  loading: boolean;
  onReload: () => Promise<void>;
  onReloadStages: () => Promise<void>;
  onOpenDeal: (id: string) => void;
}

interface PendingChange {
  deal: DealFull;
  to: CrmStageRow;
}

type ViewMode = "kanban" | "lista";
const VIEW_KEY = "crm.pipeline.view";

export default function PipelineView({
  deals,
  stages,
  loading,
  onReload,
  onReloadStages,
  onOpenDeal,
}: Props) {
  const { role } = useRole();
  const [view, setView] = useState<ViewMode>(() => {
    if (typeof window === "undefined") return "kanban";
    const v = localStorage.getItem(VIEW_KEY);
    return v === "lista" ? "lista" : "kanban";
  });
  const [pending, setPending] = useState<PendingChange | null>(null);
  const [updateUnitStatus, setUpdateUnitStatus] = useState(true);
  const [lostReason, setLostReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);

  const setViewPersist = (v: ViewMode) => {
    setView(v);
    try {
      localStorage.setItem(VIEW_KEY, v);
    } catch {
      /* ignore */
    }
  };

  const primaryUnit = (deal: DealFull) =>
    deal.deal_units.find((du) => du.is_primary) ?? deal.deal_units[0];

  const requestChange = useCallback((deal: DealFull, to: CrmStageRow) => {
    if (to.id === deal.stage_id) return;
    setLostReason("");
    setUpdateUnitStatus(to.reserves_unit || to.kind === "ganho");
    setPending({ deal, to });
  }, []);

  const confirmChange = async () => {
    if (!pending) return;
    const { deal, to } = pending;
    setSaving(true);
    try {
      if (to.kind === "perdido" && !lostReason.trim()) {
        toast.error("Informe o motivo da perda.");
        setSaving(false);
        return;
      }
      const { error } = await supabase
        .from("crm_deals")
        .update({
          stage_id: to.id,
          lost_reason: to.kind === "perdido" ? lostReason.trim() : null,
        })
        .eq("id", deal.id);
      if (error) throw error;

      const pu = primaryUnit(deal);
      if (updateUnitStatus && pu?.unit) {
        if (to.reserves_unit && pu.unit.status === "disponivel") {
          await supabase.from("units").update({ status: "reservado" }).eq("id", pu.unit.id);
        } else if (to.kind === "ganho" && pu.unit.status !== "vendido") {
          await supabase.from("units").update({ status: "vendido" }).eq("id", pu.unit.id);
        }
      }
      toast.success(`Etapa atualizada: ${to.label}`);
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

  const dealCountByStage = useMemo(() => {
    const map = new Map<string, number>();
    for (const d of deals) map.set(d.stage_id, (map.get(d.stage_id) ?? 0) + 1);
    return map;
  }, [deals]);

  if (loading) {
    return <p className="text-sm text-muted-foreground">Carregando pipeline…</p>;
  }

  const isAdmin = role === "admin";

  return (
    <>
      <div className="flex items-center justify-between gap-3 mb-3">
        <div
          role="tablist"
          aria-label="Modo de visualização"
          className="inline-flex rounded-lg border border-border/60 bg-muted/30 p-0.5"
        >
          <button
            role="tab"
            aria-selected={view === "kanban"}
            onClick={() => setViewPersist("kanban")}
            className={`inline-flex items-center gap-1.5 px-3 h-8 rounded-md text-xs transition ${
              view === "kanban"
                ? "bg-background shadow-sm text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <LayoutGrid className="h-3.5 w-3.5" /> Kanban
          </button>
          <button
            role="tab"
            aria-selected={view === "lista"}
            onClick={() => setViewPersist("lista")}
            className={`inline-flex items-center gap-1.5 px-3 h-8 rounded-md text-xs transition ${
              view === "lista"
                ? "bg-background shadow-sm text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <List className="h-3.5 w-3.5" /> Lista
          </button>
        </div>

        {isAdmin && (
          <Button
            variant="outline"
            size="sm"
            className="h-8"
            onClick={() => setManageOpen(true)}
          >
            <Settings2 className="h-3.5 w-3.5 mr-1.5" /> Personalizar etapas
          </Button>
        )}
      </div>

      {view === "kanban" ? (
        <KanbanView
          deals={deals}
          stages={stages}
          onOpenDeal={onOpenDeal}
          onRequestStageChange={requestChange}
        />
      ) : (
        <ListView
          deals={deals}
          stages={stages}
          onOpenDeal={onOpenDeal}
        />
      )}

      <Dialog open={!!pending} onOpenChange={(o) => !o && setPending(null)}>
        <DialogContent>
          {pending && (
            <>
              <DialogHeader>
                <DialogTitle>Mover para {pending.to.label}</DialogTitle>
                <DialogDescription>
                  {pending.deal.person.full_name} — {pending.deal.title}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-3 py-2">
                {(pending.to.reserves_unit || pending.to.kind === "ganho") && (
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
                        como {pending.to.kind === "ganho" ? "vendida" : "reservada"}
                      </Label>
                      <p className="text-[11px] text-muted-foreground">
                        Recomendado. Atualiza a disponibilidade na vitrine pública.
                      </p>
                    </div>
                  </div>
                )}

                {pending.to.kind === "perdido" && (
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

      {isAdmin && (
        <StageManagerDialog
          open={manageOpen}
          onOpenChange={setManageOpen}
          stages={stages}
          dealCountByStage={dealCountByStage}
          onReload={onReloadStages}
        />
      )}
    </>
  );
}
