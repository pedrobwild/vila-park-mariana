import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { notifyCrmError, type SbErr } from "@/lib/crmErrors";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2, Plus, RefreshCw, CheckCircle2, AlertTriangle } from "lucide-react";
import { formatBRL2, type CrmProposal } from "@/lib/crm";
import {
  buildProposalFlow,
  toISODate,
  parseISODateLocal,
  addMonthsSafe,
  type FlowKind,
  FLOW_KIND_LABEL,
} from "@/lib/proposalFlow";
import { cn } from "@/lib/utils";

type Draft = {
  key: string; // uid local
  kind: FlowKind;
  due_date: string; // ISO
  amount_brl: number;
  locked?: boolean; // chaves em financiamento não pode ser removida
};

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  proposal: CrmProposal;
  unitCode: string;
  onSaved: () => Promise<void> | void;
}

const uid = () =>
  (crypto as Crypto & { randomUUID?: () => string }).randomUUID?.() ??
  `k-${Date.now()}-${Math.random().toString(36).slice(2)}`;

const kindBadgeClass = (k: FlowKind) => {
  switch (k) {
    case "sinal":
    case "unico":
      return "border-sky-600/40 text-sky-700 dark:text-sky-400 bg-sky-500/5";
    case "mensal":
      return "border-border/60 text-muted-foreground bg-muted/20";
    case "intermediaria":
      return "border-amber-600/40 text-amber-700 dark:text-amber-400 bg-amber-500/5";
    case "chaves":
      return "border-emerald-600/40 text-emerald-700 dark:text-emerald-400 bg-emerald-500/5";
  }
};

const parseBRL = (v: string) => {
  const cleaned = String(v).replace(/[^\d,-]/g, "").replace(/\./g, "").replace(",", ".");
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : 0;
};

const proposalDate = (p: CrmProposal) => {
  const d = new Date(p.updated_at);
  return Number.isNaN(d.getTime()) ? p.updated_at.slice(0, 10) : toISODate(d);
};

const autoDraftsFromProposal = (p: CrmProposal): Draft[] => {
  const rows = buildProposalFlow(
    {
      payment_method: p.payment_method,
      final_price_brl: p.final_price_brl,
      down_payment_brl: p.down_payment_brl,
      monthly_count: p.monthly_count,
      monthly_brl: p.monthly_brl,
      balloon_count: p.balloon_count,
      balloon_brl: p.balloon_brl,
      keys_brl: p.keys_brl,
    },
    proposalDate(p),
  );
  return rows.map((r) => ({
    key: uid(),
    kind: r.kind,
    due_date: r.dueDate,
    amount_brl: r.contractual,
    locked: r.kind === "chaves" && p.payment_method === "financiamento",
  }));
};

export default function PaymentFlowDialog({
  open,
  onOpenChange,
  proposal,
  unitCode,
  onSaved,
}: Props) {
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (!open) return;
    let alive = true;
    setLoading(true);
    setDirty(false);
    (async () => {
      const { data, error } = await supabase
        .from("crm_proposal_installments")
        .select("*")
        .eq("proposal_id", proposal.id)
        .order("seq_no");
      if (!alive) return;
      if (error) {
        notifyCrmError(error as SbErr, { entity: "proposta", action: "atualizar" });
      }
      if (data && data.length > 0) {
        setDrafts(
          data.map((r) => ({
            key: uid(),
            kind: r.kind as FlowKind,
            due_date: r.due_date,
            amount_brl: Number(r.amount_brl),
            locked: r.kind === "chaves" && proposal.payment_method === "financiamento",
          })),
        );
      } else {
        setDrafts(autoDraftsFromProposal(proposal));
      }
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, [open, proposal]);

  const sorted = useMemo(
    () => [...drafts].sort((a, b) => a.due_date.localeCompare(b.due_date)),
    [drafts],
  );

  const totals = useMemo(() => {
    const s = drafts.reduce((acc, d) => acc + (Number.isFinite(d.amount_brl) ? d.amount_brl : 0), 0);
    return { sum: s, final: Number(proposal.final_price_brl) };
  }, [drafts, proposal.final_price_brl]);

  const diff = totals.sum - totals.final;
  const matches = Math.abs(diff) < 0.01;

  const counts = useMemo(() => {
    const c: Record<FlowKind, number> = { sinal: 0, mensal: 0, intermediaria: 0, chaves: 0, unico: 0 };
    for (const d of drafts) c[d.kind]++;
    return c;
  }, [drafts]);

  const patch = (key: string, changes: Partial<Draft>) => {
    setDrafts((prev) => prev.map((d) => (d.key === key ? { ...d, ...changes } : d)));
    setDirty(true);
  };
  const removeRow = (key: string) => {
    setDrafts((prev) => prev.filter((d) => d.key !== key || d.locked));
    setDirty(true);
  };

  const addRow = (kind: "mensal" | "intermediaria") => {
    const lastOfKind = [...drafts].filter((d) => d.kind === kind).sort((a, b) => a.due_date.localeCompare(b.due_date)).pop();
    const anchor = lastOfKind?.due_date ?? proposalDate(proposal);
    const next = addMonthsSafe(parseISODateLocal(anchor), 1);
    setDrafts((prev) => [
      ...prev,
      {
        key: uid(),
        kind,
        due_date: toISODate(next),
        amount_brl: Number(kind === "mensal" ? proposal.monthly_brl : proposal.balloon_brl) || 0,
      },
    ]);
    setDirty(true);
  };

  const redistribute = () => {
    setDrafts(autoDraftsFromProposal(proposal));
    setDirty(false);
    setConfirmReset(false);
    toast.success("Distribuição regenerada.");
  };

  const save = async () => {
    if (!matches) return;
    setBusy(true);
    try {
      const del = await supabase
        .from("crm_proposal_installments")
        .delete()
        .eq("proposal_id", proposal.id);
      if (del.error) throw del.error;

      const payload = sorted.map((d, idx) => ({
        proposal_id: proposal.id,
        seq_no: idx + 1,
        kind: d.kind,
        due_date: d.due_date,
        amount_brl: Number(d.amount_brl.toFixed(2)),
      }));
      if (payload.length > 0) {
        const ins = await supabase.from("crm_proposal_installments").insert(payload);
        if (ins.error) throw ins.error;
      }
      toast.success("Fluxo salvo. O cliente verá as parcelas configuradas.");
      onOpenChange(false);
      await onSaved();
    } catch (e) {
      notifyCrmError(e as SbErr, { entity: "proposta", action: "atualizar" });
    } finally {
      setBusy(false);
    }
  };

  const chip = (label: string) => (
    <span className="text-[11px] rounded-full border border-border/60 bg-muted/30 px-2 py-0.5 tabular-nums">
      {label}
    </span>
  );

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display">Configurar fluxo de pagamento</DialogTitle>
            <DialogDescription>
              Unidade <span className="font-mono">{unitCode}</span> · valor da proposta{" "}
              <span className="tabular-nums text-foreground">
                {formatBRL2(Number(proposal.final_price_brl))}
              </span>
              . Distribua ato, mensais, intermediárias e chaves — a soma precisa fechar com o valor
              da proposta.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            {loading ? (
              <p className="text-sm text-muted-foreground py-6 text-center">Carregando fluxo…</p>
            ) : (
              <div className="overflow-x-auto rounded-md border border-border/60">
                <table className="w-full text-xs">
                  <thead className="text-[10px] uppercase tracking-wider text-muted-foreground bg-muted/40">
                    <tr>
                      <th className="text-left font-medium px-2.5 py-2 w-40">Tipo</th>
                      <th className="text-left font-medium px-2.5 py-2 w-44">Vencimento</th>
                      <th className="text-right font-medium px-2.5 py-2">Valor (R$)</th>
                      <th className="w-10"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {sorted.length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-2.5 py-6 text-center text-muted-foreground">
                          Nenhuma parcela. Use “Adicionar parcela” ou “Redistribuir”.
                        </td>
                      </tr>
                    )}
                    {sorted.map((d, idx) => (
                      <tr
                        key={d.key}
                        className={cn(
                          "border-t border-border/40 align-middle",
                          idx % 2 === 1 && "bg-muted/20",
                        )}
                      >
                        <td className="px-2.5 py-1.5">
                          <span
                            className={cn(
                              "text-[10px] px-1.5 py-0.5 rounded border",
                              kindBadgeClass(d.kind),
                            )}
                          >
                            {FLOW_KIND_LABEL[d.kind]}
                          </span>
                        </td>
                        <td className="px-2.5 py-1.5">
                          <Input
                            type="date"
                            value={d.due_date}
                            onChange={(e) => patch(d.key, { due_date: e.target.value })}
                            className="h-8 text-xs"
                          />
                        </td>
                        <td className="px-2.5 py-1.5">
                          <Input
                            inputMode="decimal"
                            value={d.amount_brl.toLocaleString("pt-BR", {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                            onChange={(e) =>
                              patch(d.key, { amount_brl: parseBRL(e.target.value) })
                            }
                            className="h-8 text-xs text-right tabular-nums"
                          />
                        </td>
                        <td className="px-1 py-1.5 text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground"
                            onClick={() => removeRow(d.key)}
                            disabled={d.locked}
                            aria-label="Remover parcela"
                            title={d.locked ? "Chaves obrigatória em financiamento" : "Remover"}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="h-8">
                    <Plus className="h-3.5 w-3.5 mr-1" /> Adicionar parcela
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  <DropdownMenuItem onClick={() => addRow("mensal")}>Mensal</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => addRow("intermediaria")}>
                    Intermediária
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button
                variant="outline"
                size="sm"
                className="h-8"
                onClick={() => (dirty ? setConfirmReset(true) : redistribute())}
              >
                <RefreshCw className="h-3.5 w-3.5 mr-1" /> Redistribuir automaticamente
              </Button>

              <div className="ml-auto flex flex-wrap items-center gap-1.5">
                {counts.sinal > 0 && chip(`${counts.sinal} ato`)}
                {counts.unico > 0 && chip(`${counts.unico} único`)}
                {counts.mensal > 0 && chip(`${counts.mensal} mensais`)}
                {counts.intermediaria > 0 && chip(`${counts.intermediaria} interm.`)}
                {counts.chaves > 0 && chip(`${counts.chaves} chaves`)}
              </div>
            </div>

            <div
              className={cn(
                "rounded-md border p-3 flex items-start gap-2 text-xs",
                matches
                  ? "border-emerald-600/40 bg-emerald-500/5 text-emerald-700 dark:text-emerald-400"
                  : "border-rose-600/40 bg-rose-500/5 text-rose-700 dark:text-rose-400",
              )}
            >
              {matches ? (
                <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" />
              ) : (
                <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
              )}
              <div className="flex-1">
                {matches ? (
                  <span>Distribuição fecha com o valor da proposta ✓</span>
                ) : (
                  <span>
                    Soma das parcelas: <strong className="tabular-nums">{formatBRL2(totals.sum)}</strong>{" "}
                    · Diferença:{" "}
                    <strong className="tabular-nums">
                      {diff > 0 ? "+" : ""}
                      {formatBRL2(diff)}
                    </strong>{" "}
                    em relação ao valor da proposta ({formatBRL2(totals.final)}).
                  </span>
                )}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
              Cancelar
            </Button>
            <Button onClick={save} disabled={busy || !matches || loading}>
              {busy ? "Salvando…" : "Salvar fluxo"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmReset} onOpenChange={setConfirmReset}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Descartar edições?</AlertDialogTitle>
            <AlertDialogDescription>
              A distribuição automática será regenerada a partir da estrutura da proposta e suas
              alterações serão perdidas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={redistribute}>Redistribuir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
