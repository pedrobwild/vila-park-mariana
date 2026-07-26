import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { notifyCrmError, type SbErr } from "@/lib/crmErrors";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Landmark, Pencil, Plus, Trash2 } from "lucide-react";
import {
  CREDIT_STATUSES,
  CREDIT_STATUS_LABEL,
  creditStatusClass,
  formatBRL2,
  formatDateBR,
  todayISO,
  type CrmCreditCheck,
  type CrmCreditStatus,
} from "@/lib/crm";

interface Props {
  dealId: string;
}

type Form = {
  id?: string;
  bank: string;
  status: CrmCreditStatus;
  requested_amount_brl: string;
  approved_amount_brl: string;
  income_brl: string;
  fgts_brl: string;
  submitted_at: string;
  decided_at: string;
  valid_until: string;
  notes: string;
};

const EMPTY: Form = {
  bank: "",
  status: "nao_iniciada",
  requested_amount_brl: "",
  approved_amount_brl: "",
  income_brl: "",
  fgts_brl: "",
  submitted_at: "",
  decided_at: "",
  valid_until: "",
  notes: "",
};

const num = (s: string) => {
  const n = Number(s.replace(/\./g, "").replace(",", "."));
  return Number.isFinite(n) && s.trim() !== "" ? n : null;
};
const toInput = (n: number | null) => (n == null ? "" : String(n).replace(".", ","));
const dateInput = (iso: string | null) => (iso ? iso.slice(0, 10) : "");

export default function DealCreditSection({ dealId }: Props) {
  const [rows, setRows] = useState<CrmCreditCheck[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<Form | null>(null);
  const [saving, setSaving] = useState(false);
  const [toDelete, setToDelete] = useState<CrmCreditCheck | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("crm_credit_checks")
      .select("*")
      .eq("deal_id", dealId)
      .order("created_at", { ascending: false });
    setRows((data ?? []) as CrmCreditCheck[]);
    setLoading(false);
  }, [dealId]);

  useEffect(() => {
    load();
  }, [load]);

  const bestApproved = useMemo(() => {
    const vals = rows
      .filter((r) => r.status === "aprovada" || r.status === "aprovada_parcial")
      .map((r) => Number(r.approved_amount_brl ?? 0));
    return vals.length ? Math.max(...vals) : 0;
  }, [rows]);

  const submit = async () => {
    if (!form || !form.bank.trim()) {
      toast.error("Informe o banco.");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        deal_id: dealId,
        bank: form.bank.trim(),
        status: form.status,
        requested_amount_brl: num(form.requested_amount_brl),
        approved_amount_brl: num(form.approved_amount_brl),
        income_brl: num(form.income_brl),
        fgts_brl: num(form.fgts_brl),
        submitted_at: form.submitted_at ? new Date(`${form.submitted_at}T12:00:00`).toISOString() : null,
        decided_at: form.decided_at ? new Date(`${form.decided_at}T12:00:00`).toISOString() : null,
        valid_until: form.valid_until || null,
        notes: form.notes.trim() || null,
      };
      const { error } = form.id
        ? await supabase.from("crm_credit_checks").update(payload).eq("id", form.id)
        : await supabase.from("crm_credit_checks").insert(payload);
      if (error) throw error;
      toast.success(form.id ? "Análise atualizada." : "Análise registrada.");
      setForm(null);
      await load();
    } catch (e) {
      notifyCrmError(e as SbErr, {
        entity: "análise de crédito",
        action: form.id ? "atualizar" : "criar",
      });
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!toDelete) return;
    const { error } = await supabase.from("crm_credit_checks").delete().eq("id", toDelete.id);
    if (error) notifyCrmError(error as SbErr, { entity: "análise de crédito", action: "excluir" });
    else {
      toast.success("Análise excluída.");
      await load();
    }
    setToDelete(null);
  };

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h3 className="font-medium text-sm">Análise de crédito</h3>
          <p className="text-[11px] text-muted-foreground">
            {bestApproved > 0
              ? `Melhor aprovação: ${formatBRL2(bestApproved)}`
              : "Nenhuma aprovação registrada"}
          </p>
        </div>
        <Button variant="outline" size="sm" className="h-8" onClick={() => setForm({ ...EMPTY })}>
          <Plus className="h-3.5 w-3.5 mr-1" /> Nova análise
        </Button>
      </div>

      {loading ? (
        <Skeleton className="h-24 w-full" />
      ) : rows.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border/60 bg-muted/20 p-5 text-center space-y-2">
          <Landmark className="mx-auto h-5 w-5 text-muted-foreground/70" />
          <p className="text-xs font-medium">Nenhuma análise de crédito</p>
          <p className="text-[11px] text-muted-foreground">
            Registre o banco e o valor solicitado para acompanhar o repasse.
          </p>
          <Button variant="outline" size="sm" onClick={() => setForm({ ...EMPTY })}>
            Nova análise
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {rows.map((r) => {
            const req = Number(r.requested_amount_brl ?? 0);
            const app = Number(r.approved_amount_brl ?? 0);
            const gap = req > 0 && app > 0 && app < req ? req - app : 0;
            const expired =
              !!r.valid_until &&
              (r.status === "aprovada" || r.status === "aprovada_parcial") &&
              new Date(`${r.valid_until}T23:59:59`).getTime() < Date.now();
            return (
              <article key={r.id} className="rounded-lg border border-border/60 p-3 space-y-2">
                <div className="flex items-start justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium">{r.bank}</span>
                    <Badge variant="outline" className={`text-[10px] ${creditStatusClass(r.status)}`}>
                      {CREDIT_STATUS_LABEL[r.status]}
                    </Badge>
                    {expired && (
                      <Badge
                        variant="outline"
                        className="text-[10px] border-destructive/40 text-destructive bg-destructive/5"
                      >
                        Aprovação vencida
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      aria-label={`Editar análise ${r.bank}`}
                      onClick={() =>
                        setForm({
                          id: r.id,
                          bank: r.bank,
                          status: r.status,
                          requested_amount_brl: toInput(
                            r.requested_amount_brl == null ? null : Number(r.requested_amount_brl),
                          ),
                          approved_amount_brl: toInput(
                            r.approved_amount_brl == null ? null : Number(r.approved_amount_brl),
                          ),
                          income_brl: toInput(r.income_brl == null ? null : Number(r.income_brl)),
                          fgts_brl: toInput(r.fgts_brl == null ? null : Number(r.fgts_brl)),
                          submitted_at: dateInput(r.submitted_at),
                          decided_at: dateInput(r.decided_at),
                          valid_until: r.valid_until ?? "",
                          notes: r.notes ?? "",
                        })
                      }
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      aria-label={`Excluir análise ${r.bank}`}
                      onClick={() => setToDelete(r)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>

                <dl className="grid grid-cols-2 sm:grid-cols-3 gap-x-3 gap-y-1 text-[11px]">
                  <Field label="Solicitado" value={req ? formatBRL2(req) : "—"} />
                  <Field label="Aprovado" value={app ? formatBRL2(app) : "—"} />
                  <Field
                    label="Renda"
                    value={r.income_brl ? formatBRL2(Number(r.income_brl)) : "—"}
                  />
                  <Field label="FGTS" value={r.fgts_brl ? formatBRL2(Number(r.fgts_brl)) : "—"} />
                  <Field label="Envio" value={formatDateBR(r.submitted_at)} />
                  <Field label="Decisão" value={formatDateBR(r.decided_at)} />
                  <Field label="Validade" value={formatDateBR(r.valid_until)} />
                </dl>

                {gap > 0 && (
                  <p className="text-[11px] text-amber-700 dark:text-amber-400">
                    Gap de {formatBRL2(gap)} frente ao solicitado.
                  </p>
                )}
                {r.notes && <p className="text-[11px] text-muted-foreground">{r.notes}</p>}
              </article>
            );
          })}
        </div>
      )}

      <Dialog open={!!form} onOpenChange={(o) => !o && !saving && setForm(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          {form && (
            <>
              <DialogHeader>
                <DialogTitle className="font-display">
                  {form.id ? "Editar análise de crédito" : "Nova análise de crédito"}
                </DialogTitle>
                <DialogDescription>
                  Acompanhe a aprovação do repasse bancário deste negócio.
                </DialogDescription>
              </DialogHeader>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="cc-bank">Banco *</Label>
                  <Input
                    id="cc-bank"
                    value={form.bank}
                    onChange={(e) => setForm({ ...form, bank: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="cc-status">Status</Label>
                  <Select
                    value={form.status}
                    onValueChange={(v) => setForm({ ...form, status: v as CrmCreditStatus })}
                  >
                    <SelectTrigger id="cc-status" className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CREDIT_STATUSES.map((s) => (
                        <SelectItem key={s} value={s}>
                          {CREDIT_STATUS_LABEL[s]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <MoneyField
                  id="cc-req"
                  label="Valor solicitado (R$)"
                  value={form.requested_amount_brl}
                  onChange={(v) => setForm({ ...form, requested_amount_brl: v })}
                />
                <MoneyField
                  id="cc-app"
                  label="Valor aprovado (R$)"
                  value={form.approved_amount_brl}
                  onChange={(v) => setForm({ ...form, approved_amount_brl: v })}
                />
                <MoneyField
                  id="cc-income"
                  label="Renda mensal (R$)"
                  value={form.income_brl}
                  onChange={(v) => setForm({ ...form, income_brl: v })}
                />
                <MoneyField
                  id="cc-fgts"
                  label="FGTS (R$)"
                  value={form.fgts_brl}
                  onChange={(v) => setForm({ ...form, fgts_brl: v })}
                />
                <div className="space-y-1.5">
                  <Label htmlFor="cc-sub">Enviado em</Label>
                  <Input
                    id="cc-sub"
                    type="date"
                    value={form.submitted_at}
                    onChange={(e) => setForm({ ...form, submitted_at: e.target.value })}
                    className="h-9"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="cc-dec">Decidido em</Label>
                  <Input
                    id="cc-dec"
                    type="date"
                    value={form.decided_at}
                    onChange={(e) => setForm({ ...form, decided_at: e.target.value })}
                    className="h-9"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="cc-valid">Válida até</Label>
                  <Input
                    id="cc-valid"
                    type="date"
                    min={todayISO()}
                    value={form.valid_until}
                    onChange={(e) => setForm({ ...form, valid_until: e.target.value })}
                    className="h-9"
                  />
                </div>
                <div className="sm:col-span-2 space-y-1.5">
                  <Label htmlFor="cc-notes">Observações</Label>
                  <Textarea
                    id="cc-notes"
                    rows={3}
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  />
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setForm(null)} disabled={saving}>
                  Cancelar
                </Button>
                <Button onClick={submit} disabled={saving || !form.bank.trim()}>
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
            <AlertDialogTitle>Excluir análise de crédito</AlertDialogTitle>
            <AlertDialogDescription>
              A análise do banco {toDelete?.bank} será removida deste negócio.
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

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="tabular-nums">{value}</dd>
    </div>
  );
}

function MoneyField({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        inputMode="decimal"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 tabular-nums text-right"
        placeholder="0,00"
      />
    </div>
  );
}
