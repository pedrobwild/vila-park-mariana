import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { notifyCrmError, type SbErr } from "@/lib/crmErrors";
import { Button } from "@/components/ui/button";
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreVertical, Plus, FileText, CalendarClock, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  buildProposalFlow,
  flowFromSaved,
  proposalDateISO,
  type SavedInstallment,
} from "@/lib/proposalFlow";
import { analyzeVpl, installmentsFromFlow } from "@/lib/vpl";
import ProposalDialog from "./ProposalDialog";
import PaymentFlowDialog from "./PaymentFlowDialog";
import ShareProposalButton from "./ShareProposalButton";
import {
  PAYMENT_METHOD_SHORT,
  PROPOSAL_STATUS_LABEL,
  formatBRL2,
  isProposalExpired,
  proposalStatusClass,
  type CrmProposal,
  type CrmProposalStatus,
} from "@/lib/crm";
import type { DealFull } from "./CrmSection";

interface Props {
  deal: DealFull;
  onReload: () => Promise<void>;
}

const fmtDate = (iso: string | null) =>
  iso ? new Date(iso + "T00:00:00").toLocaleDateString("pt-BR") : "—";

export default function ProposalsSection({ deal, onReload }: Props) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<CrmProposal | null>(null);
  const [flowFor, setFlowFor] = useState<CrmProposal | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<CrmProposal | null>(null);
  const [confirmAccept, setConfirmAccept] = useState<CrmProposal | null>(null);
  const [busy, setBusy] = useState(false);
  const [vplRate, setVplRate] = useState(0.008);
  const [vplIncc, setVplIncc] = useState(false);
  const [acceptances, setAcceptances] = useState<
    Record<string, { signer_name: string; accepted_at: string; doc_hash: string }>
  >({});

  const proposals = useMemo(
    () =>
      [...(deal.proposals ?? [])].sort(
        (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
      ),
    [deal.proposals],
  );

  const proposalIds = useMemo(() => proposals.map((p) => p.id).join(","), [proposals]);

  useEffect(() => {
    let alive = true;
    supabase
      .from("crm_settings")
      .select("vpl_monthly_rate, vpl_correct_by_incc")
      .maybeSingle()
      .then(({ data }) => {
        if (!alive || !data) return;
        setVplRate(Number(data.vpl_monthly_rate ?? 0.008));
        setVplIncc(!!data.vpl_correct_by_incc);
      });
    return () => {
      alive = false;
    };
  }, []);

  const loadAcceptances = useCallback(async () => {
    const ids = proposalIds ? proposalIds.split(",") : [];
    if (ids.length === 0) {
      setAcceptances({});
      return;
    }
    const { data } = await supabase
      .from("crm_proposal_acceptances")
      .select("proposal_id, signer_name, accepted_at, doc_hash")
      .in("proposal_id", ids)
      .order("accepted_at", { ascending: false });
    const map: Record<string, { signer_name: string; accepted_at: string; doc_hash: string }> = {};
    for (const a of data ?? []) {
      if (!map[a.proposal_id]) {
        map[a.proposal_id] = {
          signer_name: a.signer_name,
          accepted_at: a.accepted_at,
          doc_hash: a.doc_hash,
        };
      }
    }
    setAcceptances(map);
  }, [proposalIds]);

  useEffect(() => {
    loadAcceptances();
  }, [loadAcceptances]);

  const vplByProposal = useMemo(() => {
    const map: Record<string, number> = {};
    for (const p of proposals) {
      const saved = (p as CrmProposal & { installments?: SavedInstallment[] }).installments;
      const date = proposalDateISO(p.created_at);
      const rows =
        Array.isArray(saved) && saved.length > 0
          ? flowFromSaved(saved, date)
          : buildProposalFlow(
              {
                payment_method: p.payment_method,
                final_price_brl: Number(p.final_price_brl ?? 0),
                down_payment_brl: Number(p.down_payment_brl ?? 0),
                monthly_count: Number(p.monthly_count ?? 0),
                monthly_brl: Number(p.monthly_brl ?? 0),
                balloon_count: Number(p.balloon_count ?? 0),
                balloon_brl: Number(p.balloon_brl ?? 0),
                keys_brl: Number(p.keys_brl ?? 0),
              },
              date,
            );
      map[p.id] = analyzeVpl(installmentsFromFlow(rows), {
        listPriceBrl: Number(p.list_price_brl ?? 0),
        monthlyRate: vplRate,
        correctByIncc: vplIncc,
      }).realDiscount;
    }
    return map;
  }, [proposals, vplRate, vplIncc]);

  const bestProposalId = useMemo(() => {
    if (proposals.length < 2) return null;
    let best: string | null = null;
    let min = Infinity;
    for (const p of proposals) {
      const v = vplByProposal[p.id];
      if (Number.isFinite(v) && v < min) {
        min = v;
        best = p.id;
      }
    }
    return best;
  }, [proposals, vplByProposal]);

  const pctBR = (frac: number) =>
    `${(frac * 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;

  const unitByCode = (unitId: string) =>
    deal.deal_units.find((du) => du.unit_id === unitId)?.unit?.code ?? "—";

  const openNew = () => {
    setEditing(null);
    setDialogOpen(true);
  };
  const openEdit = (p: CrmProposal) => {
    setEditing(p);
    setDialogOpen(true);
  };

  const changeStatus = async (p: CrmProposal, to: CrmProposalStatus) => {
    setBusy(true);
    try {
      if (to === "aceita") {
        // recusar aceita anterior da mesma unidade neste negócio
        const prev = proposals.find(
          (x) => x.unit_id === p.unit_id && x.status === "aceita" && x.id !== p.id,
        );
        if (prev) {
          const r = await supabase
            .from("crm_proposals")
            .update({ status: "recusada" })
            .eq("id", prev.id);
          if (r.error) throw r.error;
        }
      }
      const { error } = await supabase
        .from("crm_proposals")
        .update({ status: to })
        .eq("id", p.id);
      if (error) throw error;
      if (to === "aceita") toast.success("Proposta aceita — valor do negócio atualizado.");
      else toast.success(`Proposta marcada como ${PROPOSAL_STATUS_LABEL[to].toLowerCase()}.`);
      await onReload();
    } catch (e) {
      notifyCrmError(e as SbErr, { entity: "proposta", action: "atualizar" });
    } finally {
      setBusy(false);
      setConfirmAccept(null);
    }
  };

  const doDelete = async (p: CrmProposal) => {
    setBusy(true);
    try {
      const { error } = await supabase.from("crm_proposals").delete().eq("id", p.id);
      if (error) throw error;
      toast.success("Proposta excluída.");
      await onReload();
    } catch (e) {
      notifyCrmError(e as SbErr, { entity: "proposta", action: "excluir" });
    } finally {
      setBusy(false);
      setConfirmDelete(null);
    }
  };

  const conditionsLine = (p: CrmProposal): string => {
    const parts: string[] = [];
    const pct = Number(p.discount_pct || 0);
    const dBrl = Number(p.discount_brl || 0);
    if (pct > 0) parts.push(`${pct.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}% off`);
    else if (dBrl > 0) parts.push(`${formatBRL2(dBrl)} off`);
    if (p.payment_method === "a_vista") {
      parts.push("pagamento único");
    } else {
      parts.push(`ato ${formatBRL2(Number(p.down_payment_brl || 0))}`);
      if (Number(p.monthly_count) > 0)
        parts.push(
          `${p.monthly_count} mensais de ${formatBRL2(Number(p.monthly_brl || 0))}`,
        );
      if (Number(p.balloon_count) > 0)
        parts.push(
          `${p.balloon_count} interm. de ${formatBRL2(Number(p.balloon_brl || 0))}`,
        );
      if (Number(p.keys_brl) > 0)
        parts.push(`chaves ${formatBRL2(Number(p.keys_brl || 0))}`);
    }
    parts.push(PAYMENT_METHOD_SHORT[p.payment_method as keyof typeof PAYMENT_METHOD_SHORT]);
    return parts.join(" · ");
  };

  const canCreate = deal.deal_units.length > 0;

  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h3 className="font-medium text-sm flex items-center gap-1.5">
          <FileText className="h-3.5 w-3.5 text-muted-foreground" />
          Propostas comerciais
        </h3>
        <div className="flex items-center gap-2">
          <ShareProposalButton
            deal={deal}
            canShare={proposals.some((p) => p.status === "enviada" || p.status === "aceita")}
            onReload={onReload}
          />
          <Button variant="outline" size="sm" className="h-8" onClick={openNew} disabled={!canCreate}>
            <Plus className="h-3.5 w-3.5 mr-1" /> Nova proposta
          </Button>
        </div>
      </div>

      {proposals.length === 0 ? (
        <p className="text-xs text-muted-foreground border border-border/60 rounded-lg p-4 text-center">
          {canCreate
            ? "Nenhuma proposta ainda. Crie a primeira para negociar desconto, ato, mensais e saldo nas chaves."
            : "Adicione uma unidade de interesse para começar a criar propostas."}
        </p>
      ) : (
        <ul className="rounded-lg border border-border/60 divide-y divide-border/50">
          {proposals.map((p) => {
            const expired = isProposalExpired(p);
            const status = p.status as CrmProposalStatus;
            const badgeKind = expired ? "expirada" : status;
            const badgeLabel = expired ? "Expirada" : PROPOSAL_STATUS_LABEL[status];
            const hasFlow =
              Array.isArray((p as CrmProposal & { installments?: unknown[] }).installments) &&
              ((p as CrmProposal & { installments?: unknown[] }).installments?.length ?? 0) > 0;
            const canConfigureFlow = p.payment_method !== "a_vista";
            return (
              <li key={p.id} className="p-3 space-y-1.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0 flex-wrap">
                    <span className="font-mono text-xs">{unitByCode(p.unit_id)}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded border ${proposalStatusClass(badgeKind)}`}
                    >
                      {badgeLabel}
                    </span>
                    {hasFlow && (
                      <span
                        className="text-[10px] px-1.5 py-0.5 rounded border border-border/60 text-muted-foreground bg-muted/20 inline-flex items-center gap-1"
                        title="Fluxo de pagamento configurado"
                      >
                        <CalendarClock className="h-3 w-3" /> fluxo
                      </span>
                    )}
                    <span className="font-display text-sm tabular-nums text-accent">
                      {formatBRL2(Number(p.final_price_brl))}
                    </span>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground"
                        aria-label="Ações"
                      >
                        <MoreVertical className="h-3.5 w-3.5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => openEdit(p)}>Editar</DropdownMenuItem>
                      <DropdownMenuItem
                        disabled={!canConfigureFlow}
                        onClick={() => canConfigureFlow && setFlowFor(p)}
                        title={
                          canConfigureFlow
                            ? undefined
                            : "Pagamento único — sem parcelamento"
                        }
                      >
                        <CalendarClock className="h-3.5 w-3.5 mr-2" /> Configurar fluxo de pagamento
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      {status !== "enviada" && status !== "aceita" && (
                        <DropdownMenuItem
                          disabled={busy}
                          onClick={() => changeStatus(p, "enviada")}
                        >
                          Marcar como enviada
                        </DropdownMenuItem>
                      )}
                      {status !== "aceita" && (
                        <DropdownMenuItem
                          disabled={busy}
                          onClick={() => setConfirmAccept(p)}
                        >
                          Aceitar
                        </DropdownMenuItem>
                      )}
                      {status !== "recusada" && (
                        <DropdownMenuItem
                          disabled={busy}
                          onClick={() => changeStatus(p, "recusada")}
                        >
                          Recusar
                        </DropdownMenuItem>
                      )}
                      {status !== "rascunho" && (
                        <DropdownMenuItem
                          disabled={busy}
                          onClick={() => changeStatus(p, "rascunho")}
                        >
                          Voltar a rascunho
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={() => setConfirmDelete(p)}
                      >
                        Excluir
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <p className="text-[11px] text-muted-foreground">{conditionsLine(p)}</p>
                <TooltipProvider delayDuration={200}>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="text-[10px] px-1.5 py-0.5 rounded border border-border/60 text-muted-foreground bg-muted/20 tabular-nums cursor-help">
                          Desconto de tabela{" "}
                          {Number(p.discount_pct || 0).toLocaleString("pt-BR", {
                            maximumFractionDigits: 2,
                          })}
                          % · Desconto real (VPL) {pctBR(vplByProposal[p.id] ?? 0)}
                        </span>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p className="text-xs">
                          O desconto real traz cada parcela a valor presente: quanto mais alongado o
                          fluxo, maior o custo efetivo para a incorporadora.
                        </p>
                      </TooltipContent>
                    </Tooltip>

                    {bestProposalId === p.id && (
                      <Badge variant="secondary" className="text-[10px]">
                        Melhor para a incorporadora
                      </Badge>
                    )}

                    {acceptances[p.id] && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Badge
                            variant="outline"
                            className="text-[10px] gap-1 border-emerald-600/40 text-emerald-700 dark:text-emerald-400 bg-emerald-500/5 cursor-help"
                          >
                            <CheckCircle2 className="h-3 w-3" /> Aceita pelo cliente
                          </Badge>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="text-xs">
                            {acceptances[p.id].signer_name} ·{" "}
                            {new Date(acceptances[p.id].accepted_at).toLocaleString("pt-BR")}
                          </p>
                          <p className="text-[11px] text-muted-foreground font-mono">
                            hash {acceptances[p.id].doc_hash.slice(0, 12)}
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    )}
                  </div>
                </TooltipProvider>
                <p className="text-[10px] text-muted-foreground tabular-nums">
                  Validade: {fmtDate(p.valid_until)}
                  {p.notes ? ` · ${p.notes}` : ""}
                </p>
              </li>
            );
          })}
        </ul>
      )}

      {dialogOpen && (
        <ProposalDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          deal={deal}
          proposal={editing}
          onSaved={onReload}
        />
      )}

      {flowFor && (
        <PaymentFlowDialog
          open={!!flowFor}
          onOpenChange={(o) => !o && setFlowFor(null)}
          proposal={flowFor}
          unitCode={unitByCode(flowFor.unit_id)}
          onSaved={onReload}
        />
      )}

      <AlertDialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir proposta?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Se a proposta estava aceita, o valor do negócio será
              recalculado.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={busy}
              onClick={() => confirmDelete && doDelete(confirmDelete)}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!confirmAccept} onOpenChange={(o) => !o && setConfirmAccept(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Aceitar proposta?</AlertDialogTitle>
            <AlertDialogDescription>
              O valor do negócio passará a considerar o valor negociado. Proposta aceita anterior
              desta unidade será marcada como recusada.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={busy}
              onClick={() => confirmAccept && changeStatus(confirmAccept, "aceita")}
            >
              Aceitar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
