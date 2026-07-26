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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { buildProposalFlow, proposalDateISO } from "@/lib/proposalFlow";
import { INCC_M_DEMO_MONTHLY, analyzeVpl, installmentsFromFlow } from "@/lib/vpl";
import {
  PAYMENT_METHOD_LABEL,
  formatBRL2,
  type CrmPaymentMethod,
  type CrmProposal,
} from "@/lib/crm";
import { formatBRL } from "@/lib/units";
import type { DealFull } from "./CrmSection";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  deal: DealFull;
  proposal: CrmProposal | null;
  onSaved: () => Promise<void> | void;
}

const round2 = (n: number) => Math.round(n * 100) / 100;
const toNum = (v: string) => {
  const n = Number(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : 0;
};

const addDaysISO = (d: Date, days: number) => {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x.toISOString().slice(0, 10);
};

export default function ProposalDialog({ open, onOpenChange, deal, proposal, onSaved }: Props) {
  const isEdit = !!proposal;

  const [unitId, setUnitId] = useState<string>("");
  const [listPrice, setListPrice] = useState<number>(0);
  const [discountPct, setDiscountPct] = useState("");
  const [discountBrl, setDiscountBrl] = useState("");
  const [method, setMethod] = useState<CrmPaymentMethod>("financiamento");
  const [downPayment, setDownPayment] = useState("");
  const [monthlyCount, setMonthlyCount] = useState("15");
  const [monthlyBrl, setMonthlyBrl] = useState("");
  const [balloonCount, setBalloonCount] = useState("0");
  const [balloonBrl, setBalloonBrl] = useState("");
  const [validUntil, setValidUntil] = useState<string>(addDaysISO(new Date(), 15));
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [vplRatePct, setVplRatePct] = useState("0,8");
  const [defaults, setDefaults] = useState({ downPct: 10, monthlyCount: 15, keysPct: 75, validityDays: 15 });
  const [correctByIncc, setCorrectByIncc] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (proposal) {
      setUnitId(proposal.unit_id);
      setListPrice(Number(proposal.list_price_brl));
      setDiscountPct(String(proposal.discount_pct ?? 0));
      setDiscountBrl(String(proposal.discount_brl ?? 0));
      setMethod(proposal.payment_method as CrmPaymentMethod);
      setDownPayment(String(proposal.down_payment_brl ?? 0));
      setMonthlyCount(String(proposal.monthly_count ?? 0));
      setMonthlyBrl(String(proposal.monthly_brl ?? 0));
      setBalloonCount(String(proposal.balloon_count ?? 0));
      setBalloonBrl(String(proposal.balloon_brl ?? 0));
      setValidUntil(proposal.valid_until ?? addDaysISO(new Date(), 15));
      setNotes(proposal.notes ?? "");
    } else {
      setUnitId("");
      setListPrice(0);
      setDiscountPct("");
      setDiscountBrl("");
      setMethod("financiamento");
      setDownPayment("");
      setMonthlyCount("15");
      setMonthlyBrl("");
      setBalloonCount("0");
      setBalloonBrl("");
      setValidUntil(addDaysISO(new Date(), 15));
      setNotes("");
    }
  }, [open, proposal]);

  useEffect(() => {
    if (!open) return;
    let alive = true;
    supabase
      .from("crm_settings")
      .select(
        "vpl_monthly_rate, vpl_correct_by_incc, proposal_default_down_pct, proposal_default_monthly_count, proposal_default_keys_pct, proposal_validity_days",
      )
      .maybeSingle()
      .then(({ data }) => {
        if (!alive || !data) return;
        setVplRatePct(
          (Number(data.vpl_monthly_rate ?? 0.008) * 100).toLocaleString("pt-BR", {
            maximumFractionDigits: 4,
          }),
        );
        setCorrectByIncc(!!data.vpl_correct_by_incc);
        const d = {
          downPct: Number(data.proposal_default_down_pct ?? 10),
          monthlyCount: Number(data.proposal_default_monthly_count ?? 15),
          keysPct: Number(data.proposal_default_keys_pct ?? 75),
          validityDays: Number(data.proposal_validity_days ?? 15),
        };
        setDefaults(d);
        // Sugestão para propostas novas — segue totalmente editável.
        if (!proposal) {
          setMonthlyCount(String(d.monthlyCount));
          setValidUntil(addDaysISO(new Date(), d.validityDays));
        }
      });
    return () => {
      alive = false;
    };
  }, [open, proposal]);

  const onPickUnit = (id: string) => {
    setUnitId(id);
    if (isEdit) return;
    const du = deal.deal_units.find((x) => x.unit_id === id);
    const price = Number(du?.unit?.price_brl ?? 0);
    setListPrice(price);
    // Sugestões a partir das configurações (ato, mensais e saldo nas chaves).
    const ato0 = round2((price * defaults.downPct) / 100);
    const keys0 = round2((price * defaults.keysPct) / 100);
    setDownPayment(String(ato0));
    const count = Math.max(0, Math.floor(defaults.monthlyCount));
    if (count > 0) {
      setMonthlyCount(String(count));
      setMonthlyBrl(String(round2(Math.max(0, price - ato0 - keys0) / count)));
    }
  };

  const pct = toNum(discountPct);
  const dBrl = toNum(discountBrl);
  const finalPrice = round2(listPrice * (1 - pct / 100) - dBrl);
  const savings = round2(listPrice - finalPrice);

  const ato = method === "a_vista" ? finalPrice : toNum(downPayment);
  const mCount = method === "a_vista" ? 0 : Math.max(0, Math.floor(toNum(monthlyCount)));
  const mBrl = method === "a_vista" ? 0 : toNum(monthlyBrl);
  const bCount = method === "a_vista" ? 0 : Math.max(0, Math.floor(toNum(balloonCount)));
  const bBrl = method === "a_vista" ? 0 : toNum(balloonBrl);
  const keys = method === "a_vista" ? 0 : round2(finalPrice - ato - mCount * mBrl - bCount * bBrl);

  const sumOk = Math.abs(ato + mCount * mBrl + bCount * bBrl + keys - finalPrice) < 0.01;
  const negative = keys < -0.01;

  const canSave = useMemo(() => {
    if (!unitId) return false;
    if (finalPrice <= 0) return false;
    if (negative) return false;
    return true;
  }, [unitId, finalPrice, negative]);

  const availableUnits = useMemo(() => {
    if (isEdit) {
      // include current even if not in list (shouldn't happen)
      return deal.deal_units;
    }
    return deal.deal_units;
  }, [deal.deal_units, isEdit]);

  const submit = async () => {
    if (!canSave) {
      toast.error("Revise os valores da proposta.");
      return;
    }
    setBusy(true);
    try {
      const payload = {
        deal_id: deal.id,
        unit_id: unitId,
        list_price_brl: listPrice,
        discount_pct: pct,
        discount_brl: dBrl,
        final_price_brl: finalPrice,
        payment_method: method,
        down_payment_brl: ato,
        monthly_count: mCount,
        monthly_brl: mBrl,
        balloon_count: bCount,
        balloon_brl: bBrl,
        keys_brl: Math.max(0, keys),
        valid_until: validUntil || null,
        notes: notes.trim() || null,
      };
      if (isEdit && proposal) {
        const { error } = await supabase
          .from("crm_proposals")
          .update(payload)
          .eq("id", proposal.id);
        if (error) throw error;
        toast.success("Proposta atualizada.");
      } else {
        const { error } = await supabase.from("crm_proposals").insert(payload);
        if (error) throw error;
        toast.success("Proposta criada.");
      }
      onOpenChange(false);
      await onSaved();
    } catch (e) {
      notifyCrmError(e as SbErr, { entity: "proposta", action: isEdit ? "atualizar" : "criar" });
    } finally {
      setBusy(false);
    }
  };

  const atoPct = finalPrice > 0 ? (ato / finalPrice) * 100 : 0;

  const vpl = useMemo(() => {
    if (!unitId || listPrice <= 0 || finalPrice <= 0 || negative) return null;
    const rows = buildProposalFlow(
      {
        payment_method: method,
        final_price_brl: finalPrice,
        down_payment_brl: ato,
        monthly_count: mCount,
        monthly_brl: mBrl,
        balloon_count: bCount,
        balloon_brl: bBrl,
        keys_brl: Math.max(0, keys),
      },
      proposalDateISO(new Date().toISOString()),
    );
    return analyzeVpl(installmentsFromFlow(rows), {
      listPriceBrl: listPrice,
      monthlyRate: toNum(vplRatePct) / 100,
      correctByIncc,
    });
  }, [
    unitId,
    listPrice,
    finalPrice,
    negative,
    method,
    ato,
    mCount,
    mBrl,
    bCount,
    bBrl,
    keys,
    vplRatePct,
    correctByIncc,
  ]);

  const pctBR = (frac: number) =>
    `${(frac * 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display">
            {isEdit ? "Editar proposta" : "Nova proposta"}
          </DialogTitle>
          <DialogDescription>
            {deal.person.full_name} — {deal.title}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Unidade */}
          <div className="space-y-1.5">
            <Label>Unidade *</Label>
            {availableUnits.length === 0 ? (
              <p className="text-xs text-muted-foreground border border-dashed rounded-md p-3">
                Este negócio não tem unidades de interesse. Adicione ao menos uma unidade antes de criar
                uma proposta.
              </p>
            ) : (
              <Select value={unitId} onValueChange={onPickUnit} disabled={isEdit}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a unidade" />
                </SelectTrigger>
                <SelectContent>
                  {availableUnits.map((du) => (
                    <SelectItem key={du.unit_id} value={du.unit_id}>
                      <span className="font-mono text-xs mr-2">{du.unit?.code}</span>
                      <span className="text-xs text-muted-foreground">
                        {formatBRL(Number(du.unit?.price_brl ?? 0))}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {unitId && (
              <p className="text-[11px] text-muted-foreground tabular-nums">
                Tabela: {formatBRL2(listPrice)}
                {isEdit && " (congelada no momento da criação)"}
              </p>
            )}
          </div>

          {/* Desconto + valor final */}
          {unitId && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="pd-pct">Desconto (%)</Label>
                  <Input
                    id="pd-pct"
                    inputMode="decimal"
                    value={discountPct}
                    onChange={(e) => setDiscountPct(e.target.value)}
                    placeholder="0"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="pd-brl">Desconto (R$)</Label>
                  <Input
                    id="pd-brl"
                    inputMode="decimal"
                    value={discountBrl}
                    onChange={(e) => setDiscountBrl(e.target.value)}
                    placeholder="0,00"
                  />
                </div>
              </div>

              <div className="rounded-lg border border-border/60 bg-muted/20 p-3 flex items-baseline justify-between">
                <span className="text-xs text-muted-foreground uppercase tracking-wide">
                  Valor final
                </span>
                <div className="text-right">
                  <div className="font-display text-2xl tabular-nums text-accent">
                    {formatBRL2(finalPrice)}
                  </div>
                  {savings > 0 && (
                    <div className="text-[11px] text-muted-foreground tabular-nums">
                      − {formatBRL2(savings)} vs tabela
                    </div>
                  )}
                </div>
              </div>

              <Separator />

              {/* Forma de pagamento */}
              <div className="space-y-1.5">
                <Label>Forma de pagamento</Label>
                <Select value={method} onValueChange={(v) => setMethod(v as CrmPaymentMethod)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(PAYMENT_METHOD_LABEL) as CrmPaymentMethod[]).map((k) => (
                      <SelectItem key={k} value={k}>
                        {PAYMENT_METHOD_LABEL[k]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {method === "a_vista" ? (
                <div className="rounded-lg border border-border/60 p-3 text-xs text-muted-foreground">
                  Pagamento único na assinatura: {formatBRL2(finalPrice)}
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="pd-ato">Ato/sinal (R$)</Label>
                    <Input
                      id="pd-ato"
                      inputMode="decimal"
                      value={downPayment}
                      onChange={(e) => setDownPayment(e.target.value)}
                    />
                    <p className="text-[11px] text-muted-foreground tabular-nums">
                      Representa {atoPct.toFixed(1)}% do valor final
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="pd-mc">Mensais pré-chaves — qtd</Label>
                      <Input
                        id="pd-mc"
                        inputMode="numeric"
                        value={monthlyCount}
                        onChange={(e) => setMonthlyCount(e.target.value)}
                      />
                      <p className="text-[11px] text-muted-foreground">Padrão da tabela: 15</p>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="pd-mb">Valor da mensal (R$)</Label>
                      <Input
                        id="pd-mb"
                        inputMode="decimal"
                        value={monthlyBrl}
                        onChange={(e) => setMonthlyBrl(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="pd-bc">Intermediárias — qtd</Label>
                      <Input
                        id="pd-bc"
                        inputMode="numeric"
                        value={balloonCount}
                        onChange={(e) => setBalloonCount(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="pd-bb">Valor da intermediária (R$)</Label>
                      <Input
                        id="pd-bb"
                        inputMode="decimal"
                        value={balloonBrl}
                        onChange={(e) => setBalloonBrl(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label>Saldo nas chaves (R$)</Label>
                    <Input readOnly value={formatBRL2(keys)} className="tabular-nums" />
                  </div>

                  {negative ? (
                    <p className="text-xs text-rose-700 dark:text-rose-400">
                      A estrutura ultrapassa o valor final em {formatBRL2(Math.abs(keys))}. Ajuste
                      ato, mensais ou intermediárias.
                    </p>
                  ) : sumOk ? (
                    <p className="text-xs text-emerald-700 dark:text-emerald-400 tabular-nums">
                      Ato + mensais + intermediárias + chaves = {formatBRL2(finalPrice)} ✓
                    </p>
                  ) : null}
                </div>
              )}

              <Separator />

              {/* VPL */}
              <section className="rounded-lg border border-border/60 p-3 space-y-3">
                <div>
                  <h4 className="text-sm font-medium">Análise de valor presente (VPL)</h4>
                  <p className="text-[11px] text-muted-foreground">
                    O VPL traz cada parcela a valor presente pela taxa de oportunidade. Quanto mais
                    alongado o pagamento, maior o desconto real embutido.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="pd-vpl-rate">Taxa de desconto (oportunidade) ao mês (%)</Label>
                    <Input
                      id="pd-vpl-rate"
                      inputMode="decimal"
                      value={vplRatePct}
                      onChange={(e) => setVplRatePct(e.target.value)}
                      className="tabular-nums text-right"
                    />
                  </div>
                  <div className="flex items-center justify-between gap-2 rounded-md border border-border/60 px-3 py-2">
                    <Label htmlFor="pd-vpl-incc" className="text-xs font-normal cursor-pointer">
                      Corrigir parcelas futuras pelo INCC (
                      {(INCC_M_DEMO_MONTHLY * 100).toLocaleString("pt-BR", {
                        minimumFractionDigits: 2,
                      })}
                      % a.m.)
                    </Label>
                    <Switch
                      id="pd-vpl-incc"
                      checked={correctByIncc}
                      onCheckedChange={setCorrectByIncc}
                    />
                  </div>
                </div>

                {vpl ? (
                  <>
                    <dl className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {[
                        { k: "Preço de tabela", v: formatBRL2(vpl.listPriceBrl) },
                        { k: "Valor nominal da proposta", v: formatBRL2(vpl.nominalBrl) },
                        { k: "VPL do fluxo", v: formatBRL2(vpl.npvBrl) },
                        { k: "Desconto real", v: pctBR(vpl.realDiscount) },
                      ].map((x) => (
                        <div
                          key={x.k}
                          className="rounded-md border border-border/50 bg-muted/20 p-2"
                        >
                          <dt className="text-[10px] uppercase tracking-wide text-muted-foreground">
                            {x.k}
                          </dt>
                          <dd className="text-sm font-medium tabular-nums">{x.v}</dd>
                        </div>
                      ))}
                    </dl>

                    <p className="text-[11px] text-muted-foreground tabular-nums">
                      Desconto de tabela: {pctBR(vpl.listDiscount)} · Desconto real (VPL):{" "}
                      {pctBR(vpl.realDiscount)}
                    </p>

                    <Badge
                      variant={vpl.verdict === "equilibrado" ? "secondary" : "outline"}
                      className={
                        vpl.verdict === "alongado"
                          ? "border-amber-600/40 text-amber-700 dark:text-amber-400 bg-amber-500/5 text-[11px] whitespace-normal text-left"
                          : vpl.verdict === "antecipado"
                            ? "border-emerald-600/40 text-emerald-700 dark:text-emerald-400 bg-emerald-500/5 text-[11px] whitespace-normal text-left"
                            : "text-[11px] whitespace-normal text-left"
                      }
                    >
                      {vpl.verdict === "alongado"
                        ? `Fluxo alongado — custa ${pctBR(vpl.realDiscount)} à incorporadora, acima dos ${pctBR(vpl.listDiscount)} de tabela`
                        : vpl.verdict === "antecipado"
                          ? "Fluxo antecipado — desconto real menor que o de tabela"
                          : "Fluxo equilibrado"}
                    </Badge>
                  </>
                ) : (
                  <p className="text-[11px] text-muted-foreground">
                    Preencha a estrutura de pagamento para calcular o valor presente.
                  </p>
                )}
              </section>

              <Separator />

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="pd-valid">Validade</Label>
                  <Input
                    id="pd-valid"
                    type="date"
                    value={validUntil}
                    onChange={(e) => setValidUntil(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="pd-notes">Observações</Label>
                <Textarea
                  id="pd-notes"
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Condições comerciais, contrapartidas, prazos…"
                />
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            Cancelar
          </Button>
          <Button onClick={submit} disabled={busy || !canSave}>
            {busy ? "Salvando…" : isEdit ? "Salvar alterações" : "Criar proposta"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
