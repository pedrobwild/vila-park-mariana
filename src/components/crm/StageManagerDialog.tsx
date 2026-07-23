import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ArrowDown, ArrowUp, Lock, Plus, Trash2 } from "lucide-react";
import { sortStages, stageBadgeClass, type CrmStageRow } from "@/lib/crm";
import { notifyCrmError, type CrmAction, type SbErr } from "@/lib/crmErrors";

const notifyStage = (
  err: SbErr,
  action: CrmAction,
  dependents?: number,
) => notifyCrmError(err, { entity: "etapa", action, dependents });



interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  stages: CrmStageRow[];
  dealCountByStage: Map<string, number>;
  onReload: () => Promise<void>;
}

export default function StageManagerDialog({
  open,
  onOpenChange,
  stages,
  dealCountByStage,
  onReload,
}: Props) {
  const [local, setLocal] = useState<CrmStageRow[]>(stages);
  const [busy, setBusy] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [editing, setEditing] = useState<Record<string, string>>({});

  useEffect(() => {
    setLocal(sortStages(stages));
  }, [stages, open]);

  const openStages = local.filter((s) => s.kind === "aberto");

  const swapPositions = async (a: CrmStageRow, b: CrmStageRow) => {
    if (a.kind !== "aberto" || b.kind !== "aberto") return;
    setBusy(true);
    try {
      const r1 = await supabase.from("crm_stages").update({ position: -1 }).eq("id", a.id);
      if (r1.error) throw r1.error;
      const r2 = await supabase.from("crm_stages").update({ position: a.position }).eq("id", b.id);
      if (r2.error) throw r2.error;
      const r3 = await supabase.from("crm_stages").update({ position: b.position }).eq("id", a.id);
      if (r3.error) throw r3.error;
      await onReload();
    } catch (e) {
      notifyStageError(e as SbErr, "reorder");
    } finally {
      setBusy(false);
    }
  };

  const moveUp = (idx: number) => {
    const cur = openStages[idx];
    const prev = openStages[idx - 1];
    if (!cur || !prev) return;
    swapPositions(cur, prev);
  };

  const moveDown = (idx: number) => {
    const cur = openStages[idx];
    const next = openStages[idx + 1];
    if (!cur || !next) return;
    swapPositions(cur, next);
  };

  const rename = async (stage: CrmStageRow, label: string) => {
    const trimmed = label.trim();
    if (!trimmed || trimmed === stage.label) {
      setEditing((s) => {
        const n = { ...s };
        delete n[stage.id];
        return n;
      });
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase
        .from("crm_stages")
        .update({ label: trimmed })
        .eq("id", stage.id);
      if (error) throw error;
      setEditing((s) => {
        const n = { ...s };
        delete n[stage.id];
        return n;
      });
      await onReload();
    } catch (e) {
      notifyStageError(e as SbErr, "update", stage);
    } finally {
      setBusy(false);
    }
  };

  const toggleReserves = async (stage: CrmStageRow, v: boolean) => {
    setBusy(true);
    try {
      const { error } = await supabase
        .from("crm_stages")
        .update({ reserves_unit: v })
        .eq("id", stage.id);
      if (error) throw error;
      await onReload();
    } catch (e) {
      notifyStageError(e as SbErr, "update", stage);
    } finally {
      setBusy(false);
    }
  };

  const addStage = async () => {
    const label = newLabel.trim();
    if (!label) return;
    setBusy(true);
    try {
      const maxOpen = openStages.reduce((m, s) => Math.max(m, s.position), 0);
      const { error } = await supabase.from("crm_stages").insert({
        label,
        position: maxOpen + 5,
        kind: "aberto",
        reserves_unit: false,
        is_system: false,
      });
      if (error) throw error;
      setNewLabel("");
      await onReload();
    } catch (e) {
      notifyStageError(e as SbErr, "insert");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (stage: CrmStageRow) => {
    const count = dealCountByStage.get(stage.id) ?? 0;
    if (stage.is_system) {
      notifyStageError(
        { message: "Etapas de sistema não podem ser excluídas" },
        "delete",
        stage,
        count,
      );
      return;
    }
    if (count > 0) {
      notifyStageError({ code: "23503" }, "delete", stage, count);
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.from("crm_stages").delete().eq("id", stage.id);
      if (error) throw error;
      toast.success("Etapa excluída.");
      await onReload();
    } catch (e) {
      notifyStageError(e as SbErr, "delete", stage, count);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display">Personalizar etapas</DialogTitle>
          <DialogDescription>
            Ordene, renomeie e ajuste o comportamento das etapas do funil. Ganho e perdido são
            etapas de sistema e ficam sempre por último.
          </DialogDescription>
        </DialogHeader>

        <TooltipProvider delayDuration={200}>
          <div className="space-y-2">
            {local.map((stage, i) => {
              const isOpen = stage.kind === "aberto";
              const openIdx = openStages.findIndex((s) => s.id === stage.id);
              const count = dealCountByStage.get(stage.id) ?? 0;
              const editable = editing[stage.id];
              return (
                <div
                  key={stage.id}
                  className="flex items-center gap-2 rounded-lg border border-border/60 bg-background p-2.5"
                >
                  <div className="flex flex-col">
                    <button
                      className="h-6 w-6 flex items-center justify-center rounded hover:bg-muted disabled:opacity-30"
                      onClick={() => moveUp(openIdx)}
                      disabled={!isOpen || busy || openIdx <= 0}
                      aria-label="Mover para cima"
                    >
                      <ArrowUp className="h-3.5 w-3.5" />
                    </button>
                    <button
                      className="h-6 w-6 flex items-center justify-center rounded hover:bg-muted disabled:opacity-30"
                      onClick={() => moveDown(openIdx)}
                      disabled={
                        !isOpen || busy || openIdx < 0 || openIdx >= openStages.length - 1
                      }
                      aria-label="Mover para baixo"
                    >
                      <ArrowDown className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <div className="flex-1 min-w-0">
                    {editable !== undefined ? (
                      <Input
                        autoFocus
                        value={editable}
                        onChange={(e) =>
                          setEditing((s) => ({ ...s, [stage.id]: e.target.value }))
                        }
                        onBlur={() => rename(stage, editable)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") rename(stage, editable);
                          if (e.key === "Escape")
                            setEditing((s) => {
                              const n = { ...s };
                              delete n[stage.id];
                              return n;
                            });
                        }}
                        className="h-8"
                      />
                    ) : (
                      <button
                        onClick={() =>
                          setEditing((s) => ({ ...s, [stage.id]: stage.label }))
                        }
                        className="text-left w-full text-sm font-medium hover:text-accent transition truncate"
                        title="Renomear"
                      >
                        {stage.label}
                      </button>
                    )}
                    <div className="flex items-center gap-2 mt-0.5">
                      <Badge
                        variant="outline"
                        className={`text-[9px] ${stageBadgeClass(stage.kind)}`}
                      >
                        {stage.kind === "aberto"
                          ? "Aberto"
                          : stage.kind === "ganho"
                          ? "Ganho"
                          : "Perdido"}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground tabular-nums">
                        {count} negócio{count === 1 ? "" : "s"}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Label
                      htmlFor={`res-${stage.id}`}
                      className="text-[11px] text-muted-foreground cursor-pointer"
                    >
                      Reservar unidade
                    </Label>
                    <Switch
                      id={`res-${stage.id}`}
                      checked={stage.reserves_unit}
                      disabled={busy || stage.kind !== "aberto"}
                      onCheckedChange={(v) => toggleReserves(stage, v)}
                    />
                  </div>

                  {stage.is_system ? (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          onClick={() => remove(stage)}
                          className="h-8 w-8 flex items-center justify-center rounded text-muted-foreground hover:bg-muted"
                          aria-label="Etapa de sistema (não pode ser excluída)"
                        >
                          <Lock className="h-3.5 w-3.5" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>
                        Etapa de sistema — pode renomear, não excluir
                      </TooltipContent>
                    </Tooltip>
                  ) : count > 0 ? (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          onClick={() => remove(stage)}
                          className="h-8 w-8 flex items-center justify-center rounded text-muted-foreground/60 hover:bg-muted hover:text-destructive"
                          aria-label={`Excluir etapa (bloqueado: ${count} negócios)`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>
                        Mova os {count} negócio{count === 1 ? "" : "s"} desta etapa antes de excluir
                      </TooltipContent>
                    </Tooltip>
                  ) : (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      disabled={busy}
                      onClick={() => remove(stage)}
                      aria-label="Excluir etapa"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        </TooltipProvider>

        <div className="mt-4 flex items-end gap-2">
          <div className="flex-1 space-y-1.5">
            <Label htmlFor="new-stage" className="text-xs">
              Adicionar etapa
            </Label>
            <Input
              id="new-stage"
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              placeholder="Ex.: Negociação"
              onKeyDown={(e) => {
                if (e.key === "Enter") addStage();
              }}
            />
          </div>
          <Button onClick={addStage} disabled={busy || !newLabel.trim()}>
            <Plus className="h-3.5 w-3.5 mr-1" /> Adicionar
          </Button>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
