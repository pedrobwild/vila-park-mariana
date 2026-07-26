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
import { HandCoins, Plus, Trash2 } from "lucide-react";
import {
  COMMISSION_STATUSES,
  COMMISSION_STATUS_LABEL,
  commissionStatusClass,
  formatBRL2,
  formatDateBR,
  type CrmBroker,
  type CrmCommission,
  type CrmCommissionSplit,
  type CrmCommissionStatus,
} from "@/lib/crm";
import type { DealFull } from "./CrmSection";

interface Props {
  deal: DealFull;
  brokers: CrmBroker[];
  defaultPct: number;
}

const num = (s: string) => {
  const n = Number(s.replace(/\./g, "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
};

export default function DealCommissionSection({ deal, brokers, defaultPct }: Props) {
  const [rows, setRows] = useState<CrmCommission[]>([]);
  const [splits, setSplits] = useState<Record<string, CrmCommissionSplit[]>>({});
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toDelete, setToDelete] = useState<CrmCommission | null>(null);

  const [proposalId, setProposalId] = useState<string>("");
  const [base, setBase] = useState("");
  const [pct, setPct] = useState(String(defaultPct).replace(".", ","));
  const [dueDate, setDueDate] = useState("");
  const [status, setStatus] = useState<CrmCommissionStatus>("prevista");
  const [notes, setNotes] = useState("");

  const isWon = deal.stage.kind === "ganho";

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("crm_commissions")
      .select("*")
      .eq("deal_id", deal.id)
      .order("created_at", { ascending: false });
    const list = (data ?? []) as CrmCommission[];
    setRows(list);
    if (list.length) {
      const { data: sp } = await supabase
        .from("crm_commission_splits")
        .select("*")
        .in(
          "commission_id",
          list.map((c) => c.id),
        );
      const map: Record<string, CrmCommissionSplit[]> = {};
      for (const s of (sp ?? []) as CrmCommissionSplit[]) {
        (map[s.commission_id] ??= []).push(s);
      }
      setSplits(map);
    } else {
      setSplits({});
    }
    setLoading(false);
  }, [deal.id]);

  useEffect(() => {
    load();
  }, [load]);

  const proposals = deal.proposals ?? [];

  const unitLabel = (unitId: string | null) =>
    deal.deal_units.find((du) => du.unit_id === unitId)?.unit?.code ?? "unidade";

  const openDialog = () => {
    const accepted = proposals.find((p) => p.status === "aceita") ?? proposals[0];
    setProposalId(accepted?.id ?? "");
    setBase(accepted ? String(Number(accepted.final_price_brl ?? 0)).replace(".", ",") : "");
    setPct(String(defaultPct).replace(".", ","));
    setDueDate("");
    setStatus("prevista");
    setNotes("");
    setOpen(true);
  };

  const total = useMemo(() => (num(base) * num(pct)) / 100, [base, pct]);

  const submit = async () => {
    if (num(base) <= 0) {
      toast.error("Informe a base de cálculo da comissão.");
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.from("crm_commissions").insert({
        deal_id: deal.id,
        proposal_id: proposalId || null,
        base_brl: num(base),
        total_pct: num(pct),
        total_brl: total,
        status,
        due_date: dueDate || null,
        notes: notes.trim() || null,
      });
      if (error) throw error;
      toast.success("Comissão gerada.");
      setOpen(false);
      await load();
    } catch (e) {
      notifyCrmError(e as SbErr, { entity: "comissão", action: "criar" });
    } finally {
      setSaving(false);
    }
  };

  const updateCommission = async (c: CrmCommission, patch: Partial<CrmCommission>) => {
    const { error } = await supabase.from("crm_commissions").update(patch).eq("id", c.id);
    if (error) notifyCrmError(error as SbErr, { entity: "comissão", action: "atualizar" });
    else {
      toast.success("Comissão atualizada.");
      await load();
    }
  };

  const remove = async () => {
    if (!toDelete) return;
    const { error } = await supabase.from("crm_commissions").delete().eq("id", toDelete.id);
    if (error) notifyCrmError(error as SbErr, { entity: "comissão", action: "excluir" });
    else {
      toast.success("Comissão excluída.");
      await load();
    }
    setToDelete(null);
  };

  const addSplit = async (c: CrmCommission) => {
    const { error } = await supabase.from("crm_commission_splits").insert({
      commission_id: c.id,
      role: "corretor",
      broker_id: deal.broker_id ?? null,
      pct: 0,
      amount_brl: 0,
    });
    if (error) notifyCrmError(error as SbErr, { entity: "rateio", action: "criar" });
    else await load();
  };

  const saveSplit = async (
    s: CrmCommissionSplit,
    patch: Partial<CrmCommissionSplit>,
    totalBrl: number,
  ) => {
    const merged = { ...s, ...patch };
    const amount = (Number(merged.pct ?? 0) * totalBrl) / 100;
    const { error } = await supabase
      .from("crm_commission_splits")
      .update({ ...patch, amount_brl: amount })
      .eq("id", s.id);
    if (error) notifyCrmError(error as SbErr, { entity: "rateio", action: "atualizar" });
    await load();
  };

  const removeSplit = async (s: CrmCommissionSplit) => {
    const { error } = await supabase.from("crm_commission_splits").delete().eq("id", s.id);
    if (error) notifyCrmError(error as SbErr, { entity: "rateio", action: "excluir" });
    else await load();
  };

  return (
    <section className={`space-y-3 ${isWon ? "rounded-lg border border-accent/40 bg-accent/5 p-3" : ""}`}>
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h3 className="font-medium text-sm">Comissão</h3>
          <p className="text-[11px] text-muted-foreground">
            {isWon
              ? "Negócio ganho — registre a comissão e o rateio."
              : "Previsão de comissão sobre a proposta escolhida."}
          </p>
        </div>
        <Button variant="outline" size="sm" className="h-8" onClick={openDialog}>
          <Plus className="h-3.5 w-3.5 mr-1" /> Gerar comissão
        </Button>
      </div>

      {loading ? (
        <Skeleton className="h-24 w-full" />
      ) : rows.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border/60 bg-muted/20 p-5 text-center space-y-2">
          <HandCoins className="mx-auto h-5 w-5 text-muted-foreground/70" />
          <p className="text-xs font-medium">Nenhuma comissão registrada</p>
          <p className="text-[11px] text-muted-foreground">
            Gere a comissão a partir de uma proposta para controlar o rateio da equipe.
          </p>
          <Button variant="outline" size="sm" onClick={openDialog}>
            Gerar comissão
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map((c) => {
            const list = splits[c.id] ?? [];
            const sum = list.reduce((s, x) => s + Number(x.pct ?? 0), 0);
            const totalBrl = Number(c.total_brl ?? 0);
            return (
              <article key={c.id} className="rounded-lg border border-border/60 p-3 space-y-3">
                <div className="flex items-start justify-between gap-2 flex-wrap">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium tabular-nums">
                        {formatBRL2(totalBrl)}
                      </span>
                      <Badge
                        variant="outline"
                        className={`text-[10px] ${commissionStatusClass(c.status)}`}
                      >
                        {COMMISSION_STATUS_LABEL[c.status]}
                      </Badge>
                    </div>
                    <p className="text-[11px] text-muted-foreground tabular-nums">
                      Base {formatBRL2(Number(c.base_brl ?? 0))} ·{" "}
                      {Number(c.total_pct ?? 0).toLocaleString("pt-BR", {
                        maximumFractionDigits: 2,
                      })}
                      % · vence {formatDateBR(c.due_date)}
                      {c.paid_at ? ` · paga em ${formatDateBR(c.paid_at)}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {c.status !== "paga" && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() =>
                          updateCommission(c, {
                            status: "paga",
                            paid_at: new Date().toISOString(),
                          })
                        }
                      >
                        Marcar como paga
                      </Button>
                    )}
                    {c.status !== "cancelada" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => updateCommission(c, { status: "cancelada" })}
                      >
                        Cancelar
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      aria-label="Excluir comissão"
                      onClick={() => setToDelete(c)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="text-xs font-medium">Rateio</h4>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => addSplit(c)}
                    >
                      <Plus className="h-3 w-3 mr-1" /> Linha
                    </Button>
                  </div>

                  {list.length === 0 ? (
                    <p className="text-[11px] text-muted-foreground">
                      Nenhum rateio definido — o valor total fica com a incorporadora.
                    </p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs min-w-[520px]">
                        <thead className="text-muted-foreground">
                          <tr className="text-left">
                            <th className="py-1 font-medium">Papel</th>
                            <th className="py-1 font-medium">Corretor</th>
                            <th className="py-1 font-medium">Beneficiário</th>
                            <th className="py-1 font-medium text-right">%</th>
                            <th className="py-1 font-medium text-right">Valor</th>
                            <th />
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/40">
                          {list.map((s) => (
                            <SplitRow
                              key={s.id}
                              split={s}
                              brokers={brokers}
                              totalBrl={totalBrl}
                              onSave={(patch) => saveSplit(s, patch, totalBrl)}
                              onRemove={() => removeSplit(s)}
                            />
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {list.length > 0 && Math.abs(sum - 100) > 0.01 && (
                    <p className="text-[11px] text-amber-700 dark:text-amber-400">
                      Rateio soma {sum.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}% —{" "}
                      {sum < 100 ? "falta" : "excede"}{" "}
                      {Math.abs(100 - sum).toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%.
                    </p>
                  )}
                </div>

                {c.notes && <p className="text-[11px] text-muted-foreground">{c.notes}</p>}
              </article>
            );
          })}
        </div>
      )}

      <Dialog open={open} onOpenChange={(o) => !saving && setOpen(o)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display">Gerar comissão</DialogTitle>
            <DialogDescription>
              A base sugerida é o valor final da proposta escolhida.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="cm-prop">Proposta</Label>
              {proposals.length === 0 ? (
                <p className="text-xs text-muted-foreground rounded-lg border border-dashed border-border/60 p-3">
                  Nenhuma proposta neste negócio. Informe a base manualmente.
                </p>
              ) : (
                <Select
                  value={proposalId}
                  onValueChange={(v) => {
                    setProposalId(v);
                    const p = proposals.find((x) => x.id === v);
                    if (p) setBase(String(Number(p.final_price_brl ?? 0)).replace(".", ","));
                  }}
                >
                  <SelectTrigger id="cm-prop" className="h-9">
                    <SelectValue placeholder="Selecione a proposta" />
                  </SelectTrigger>
                  <SelectContent>
                    {proposals.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {unitLabel(p.unit_id)} · {formatBRL2(Number(p.final_price_brl ?? 0))}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="cm-base">Base de cálculo (R$)</Label>
                <Input
                  id="cm-base"
                  inputMode="decimal"
                  value={base}
                  onChange={(e) => setBase(e.target.value)}
                  className="h-9 tabular-nums text-right"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cm-pct">Percentual total (%)</Label>
                <Input
                  id="cm-pct"
                  inputMode="decimal"
                  value={pct}
                  onChange={(e) => setPct(e.target.value)}
                  className="h-9 tabular-nums text-right"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cm-due">Vencimento</Label>
                <Input
                  id="cm-due"
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="h-9"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cm-status">Status</Label>
                <Select
                  value={status}
                  onValueChange={(v) => setStatus(v as CrmCommissionStatus)}
                >
                  <SelectTrigger id="cm-status" className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {COMMISSION_STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {COMMISSION_STATUS_LABEL[s]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="cm-notes">Observações</Label>
              <Textarea
                id="cm-notes"
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            <div className="rounded-lg border border-border/60 bg-muted/30 p-3 flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Comissão total</span>
              <strong className="text-base tabular-nums">{formatBRL2(total)}</strong>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button onClick={submit} disabled={saving || num(base) <= 0}>
              {saving ? "Salvando…" : "Gerar comissão"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir comissão</AlertDialogTitle>
            <AlertDialogDescription>
              A comissão e todo o rateio vinculado serão removidos.
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

function SplitRow({
  split,
  brokers,
  totalBrl,
  onSave,
  onRemove,
}: {
  split: CrmCommissionSplit;
  brokers: CrmBroker[];
  totalBrl: number;
  onSave: (patch: Partial<CrmCommissionSplit>) => void;
  onRemove: () => void;
}) {
  const [role, setRole] = useState(split.role ?? "corretor");
  const [beneficiary, setBeneficiary] = useState(split.beneficiary ?? "");
  const [pct, setPct] = useState(String(split.pct ?? 0).replace(".", ","));

  useEffect(() => {
    setRole(split.role ?? "corretor");
    setBeneficiary(split.beneficiary ?? "");
    setPct(String(split.pct ?? 0).replace(".", ","));
  }, [split.id, split.role, split.beneficiary, split.pct]);

  const pctNum = num(pct);

  return (
    <tr>
      <td className="py-1 pr-2">
        <Input
          value={role}
          onChange={(e) => setRole(e.target.value)}
          onBlur={() => role !== (split.role ?? "") && onSave({ role })}
          placeholder="corretor"
          className="h-8 text-xs"
          aria-label="Papel no rateio"
        />
      </td>
      <td className="py-1 pr-2">
        <Select
          value={split.broker_id ?? "none"}
          onValueChange={(v) => onSave({ broker_id: v === "none" ? null : v })}
        >
          <SelectTrigger className="h-8 text-xs w-[140px]" aria-label="Corretor do rateio">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">—</SelectItem>
            {brokers.map((b) => (
              <SelectItem key={b.id} value={b.id}>
                {b.full_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </td>
      <td className="py-1 pr-2">
        <Input
          value={beneficiary}
          onChange={(e) => setBeneficiary(e.target.value)}
          onBlur={() =>
            beneficiary !== (split.beneficiary ?? "") &&
            onSave({ beneficiary: beneficiary.trim() || null })
          }
          placeholder="opcional"
          className="h-8 text-xs"
          aria-label="Beneficiário"
        />
      </td>
      <td className="py-1 pr-2 text-right">
        <Input
          value={pct}
          inputMode="decimal"
          onChange={(e) => setPct(e.target.value)}
          onBlur={() => pctNum !== Number(split.pct ?? 0) && onSave({ pct: pctNum })}
          className="h-8 text-xs w-[70px] text-right tabular-nums"
          aria-label="Percentual do rateio"
        />
      </td>
      <td className="py-1 text-right tabular-nums">{formatBRL2((pctNum * totalBrl) / 100)}</td>
      <td className="py-1 text-right">
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-muted-foreground hover:text-destructive"
          aria-label="Remover rateio"
          onClick={onRemove}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </td>
    </tr>
  );
}
