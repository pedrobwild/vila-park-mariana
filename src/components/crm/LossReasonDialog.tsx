import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { CrmLossReason } from "@/lib/crm";

interface Props {
  open: boolean;
  /** Called with the chosen reason id and the optional note. */
  onConfirm: (reasonId: string, note: string) => void | Promise<void>;
  onCancel: () => void;
  stageLabel: string;
  dealLabel: string;
  saving?: boolean;
}

export default function LossReasonDialog({
  open,
  onConfirm,
  onCancel,
  stageLabel,
  dealLabel,
  saving,
}: Props) {
  const [reasons, setReasons] = useState<CrmLossReason[]>([]);
  const [loading, setLoading] = useState(false);
  const [reasonId, setReasonId] = useState<string>("");
  const [note, setNote] = useState("");

  useEffect(() => {
    if (!open) return;
    setReasonId("");
    setNote("");
    setLoading(true);
    supabase
      .from("crm_loss_reasons")
      .select("*")
      .eq("is_active", true)
      .order("position", { ascending: true })
      .then(({ data }) => {
        setReasons((data ?? []) as CrmLossReason[]);
        setLoading(false);
      });
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !saving && onCancel()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">Motivo da perda</DialogTitle>
          <DialogDescription>
            {dealLabel} — mover para {stageLabel}. Registre o motivo para alimentar a análise do
            funil.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-1">
          <div className="space-y-1.5">
            <Label htmlFor="loss-reason">Motivo *</Label>
            {loading ? (
              <Skeleton className="h-9 w-full" />
            ) : reasons.length === 0 ? (
              <p className="text-xs text-muted-foreground rounded-lg border border-dashed border-border/60 p-3">
                Nenhum motivo cadastrado. Peça a um administrador para cadastrar os motivos de perda
                na aba Corretores.
              </p>
            ) : (
              <Select value={reasonId} onValueChange={setReasonId}>
                <SelectTrigger id="loss-reason" className="h-9">
                  <SelectValue placeholder="Selecione o motivo" />
                </SelectTrigger>
                <SelectContent>
                  {reasons.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="loss-note">Observação (opcional)</Label>
            <Textarea
              id="loss-note"
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Contexto adicional que ajude a equipe"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onCancel} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={() => onConfirm(reasonId, note.trim())} disabled={saving || !reasonId}>
            {saving ? "Salvando…" : "Confirmar perda"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
