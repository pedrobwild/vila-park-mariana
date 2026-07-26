import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { notifyCrmError, type SbErr } from "@/lib/crmErrors";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ArrowDown, ArrowUp, Pencil, Plus, ThumbsDown, Trash2 } from "lucide-react";
import type { CrmLossReason } from "@/lib/crm";

export default function LossReasonsManager() {
  const [rows, setRows] = useState<CrmLossReason[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<{ id?: string; label: string; is_active: boolean } | null>(null);
  const [saving, setSaving] = useState(false);
  const [toDelete, setToDelete] = useState<CrmLossReason | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("crm_loss_reasons")
      .select("*")
      .order("position", { ascending: true });
    setRows((data ?? []) as CrmLossReason[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const submit = async () => {
    if (!form || !form.label.trim()) {
      toast.error("Informe o motivo.");
      return;
    }
    setSaving(true);
    try {
      if (form.id) {
        const { error } = await supabase
          .from("crm_loss_reasons")
          .update({ label: form.label.trim(), is_active: form.is_active })
          .eq("id", form.id);
        if (error) throw error;
      } else {
        const nextPos = rows.length ? Math.max(...rows.map((r) => r.position)) + 1 : 1;
        const { error } = await supabase.from("crm_loss_reasons").insert({
          label: form.label.trim(),
          is_active: form.is_active,
          position: nextPos,
        });
        if (error) throw error;
      }
      toast.success(form.id ? "Motivo atualizado." : "Motivo cadastrado.");
      setForm(null);
      await load();
    } catch (e) {
      notifyCrmError(e as SbErr, {
        entity: "motivo de perda",
        action: form.id ? "atualizar" : "criar",
      });
    } finally {
      setSaving(false);
    }
  };

  const move = async (idx: number, dir: -1 | 1) => {
    const target = idx + dir;
    if (target < 0 || target >= rows.length) return;
    const a = rows[idx];
    const b = rows[target];
    const next = [...rows];
    next[idx] = b;
    next[target] = a;
    setRows(next);
    const r1 = await supabase
      .from("crm_loss_reasons")
      .update({ position: b.position })
      .eq("id", a.id);
    const r2 = await supabase
      .from("crm_loss_reasons")
      .update({ position: a.position })
      .eq("id", b.id);
    if (r1.error || r2.error) {
      notifyCrmError((r1.error ?? r2.error) as SbErr, {
        entity: "motivo de perda",
        action: "reordenar",
      });
      await load();
    }
  };

  const toggleActive = async (r: CrmLossReason, v: boolean) => {
    setRows((prev) => prev.map((x) => (x.id === r.id ? { ...x, is_active: v } : x)));
    const { error } = await supabase
      .from("crm_loss_reasons")
      .update({ is_active: v })
      .eq("id", r.id);
    if (error) {
      notifyCrmError(error as SbErr, { entity: "motivo de perda", action: "atualizar" });
      await load();
    }
  };

  const remove = async () => {
    if (!toDelete) return;
    const { error } = await supabase.from("crm_loss_reasons").delete().eq("id", toDelete.id);
    if (error) notifyCrmError(error as SbErr, { entity: "motivo de perda", action: "excluir" });
    else {
      toast.success("Motivo excluído.");
      await load();
    }
    setToDelete(null);
  };

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-base font-semibold">Motivos de perda</h2>
          <p className="text-xs text-muted-foreground">
            Exibidos quando um negócio é movido para uma etapa de perda.
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          className="h-8"
          onClick={() => setForm({ label: "", is_active: true })}
        >
          <Plus className="h-3.5 w-3.5 mr-1.5" /> Novo motivo
        </Button>
      </div>

      {loading ? (
        <Skeleton className="h-24 w-full" />
      ) : rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border/60 bg-muted/20 p-8 text-center space-y-2">
          <ThumbsDown className="mx-auto h-6 w-6 text-muted-foreground/70" />
          <p className="text-sm font-medium">Nenhum motivo cadastrado</p>
          <p className="text-xs text-muted-foreground">
            Cadastre motivos para padronizar a análise de perdas do funil.
          </p>
          <Button size="sm" variant="outline" onClick={() => setForm({ label: "", is_active: true })}>
            Cadastrar motivo
          </Button>
        </div>
      ) : (
        <ul className="rounded-lg border border-border/60 divide-y divide-border/50">
          {rows.map((r, idx) => (
            <li key={r.id} className="flex items-center gap-2 p-2.5">
              <div className="flex flex-col">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-6"
                  disabled={idx === 0}
                  onClick={() => move(idx, -1)}
                  aria-label={`Subir ${r.label}`}
                >
                  <ArrowUp className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-6"
                  disabled={idx === rows.length - 1}
                  onClick={() => move(idx, 1)}
                  aria-label={`Descer ${r.label}`}
                >
                  <ArrowDown className="h-3 w-3" />
                </Button>
              </div>
              <span
                className={`flex-1 text-sm ${r.is_active ? "" : "text-muted-foreground line-through"}`}
              >
                {r.label}
              </span>
              <Switch
                checked={r.is_active}
                onCheckedChange={(v) => toggleActive(r, v)}
                aria-label={`Ativo ${r.label}`}
              />
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                aria-label={`Editar ${r.label}`}
                onClick={() => setForm({ id: r.id, label: r.label, is_active: r.is_active })}
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-destructive"
                aria-label={`Excluir ${r.label}`}
                onClick={() => setToDelete(r)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={!!form} onOpenChange={(o) => !o && !saving && setForm(null)}>
        <DialogContent className="max-w-md">
          {form && (
            <>
              <DialogHeader>
                <DialogTitle className="font-display">
                  {form.id ? "Editar motivo" : "Novo motivo de perda"}
                </DialogTitle>
                <DialogDescription>
                  Use rótulos curtos e objetivos, como “Preço acima do orçamento”.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="lr-label">Motivo *</Label>
                  <Input
                    id="lr-label"
                    value={form.label}
                    onChange={(e) => setForm({ ...form, label: e.target.value })}
                  />
                </div>
                <div className="flex items-center justify-between rounded-lg border border-border/60 p-3">
                  <Label htmlFor="lr-active" className="text-sm cursor-pointer">
                    Ativo
                  </Label>
                  <Switch
                    id="lr-active"
                    checked={form.is_active}
                    onCheckedChange={(v) => setForm({ ...form, is_active: v })}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setForm(null)} disabled={saving}>
                  Cancelar
                </Button>
                <Button onClick={submit} disabled={saving || !form.label.trim()}>
                  {saving ? "Salvando…" : "Salvar"}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir motivo</AlertDialogTitle>
            <AlertDialogDescription>
              “{toDelete?.label}” deixará de aparecer na lista. Negócios já marcados com este motivo
              mantêm o registro.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={remove}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
