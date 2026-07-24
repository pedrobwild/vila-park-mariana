import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  MessageCircle,
  Printer,
  AlertTriangle,
  ChevronDown,
  ImageOff,
  FileText,
  Calculator,
  RotateCcw,
} from "lucide-react";
import { formatBRL2, PAYMENT_METHOD_LABEL, type CrmPaymentMethod } from "@/lib/crm";
import { tipologias } from "@/data/tipologias";
import { WHATSAPP_PHONE } from "@/data/surroundings";
import {
  buildStatement,
  formatBRL as fmtBRL,
  formatDateBR,
  type Contract as StmtContract,
  type Installment as StmtInstallment,
  type InstallmentKind,
} from "@/lib/contractStatement";
import {
  useFinancingSimulatorController,
  FinancingSimulatorForm,
  FinancingSimulatorResults,
  type SimulatorInitialForm,
} from "@/components/ferramentas/FinancingSimulator";

type SharedProposal = {
  status: "enviada" | "aceita";
  list_price_brl: number | string;
  discount_pct: number | string;
  discount_brl: number | string;
  final_price_brl: number | string;
  payment_method: CrmPaymentMethod;
  down_payment_brl: number | string;
  monthly_count: number;
  monthly_brl: number | string;
  balloon_count: number;
  balloon_brl: number | string;
  keys_brl: number | string;
  valid_until: string | null;
  notes: string | null;
  updated_at: string;
};

type SharedUnit = {
  code: string;
  block: string | null;
  area_m2: number | string | null;
  price_brl: number | string;
  status: string;
  planta_url: string | null;
  is_primary: boolean;
  custom_fields: Record<string, string | number | null> | null;
  proposals: SharedProposal[];
};

type SharedContractInstallment = {
  seq_label: string;
  kind: InstallmentKind;
  due_date: string;
  contractual_value: number | string;
  paid_date: string | null;
  paid_value: number | string | null;
  fine_value: number | string | null;
  interest_value: number | string | null;
  discount_value: number | string | null;
  admin_fee: number | string | null;
  insurance_fee: number | string | null;
  corrected_value: number | string | null;
};

type SharedContract = {
  contract_number: string;
  client_name: string;
  unit_code: string;
  contract_date: string;
  original_value: number | string;
  contract_value: number | string;
  monthly_index_rate: number | string;
  index_label: string;
  late_fine_rate: number | string;
  late_interest_monthly: number | string;
  status: string;
  installments: SharedContractInstallment[];
};

type SharedPayload = {
  client_name: string;
  shared_at: string;
  units: SharedUnit[];
  contracts?: SharedContract[] | null;
  interested_count?: number | null;
};

const n = (v: unknown) => (typeof v === "number" ? v : Number(v ?? 0)) || 0;

const fmtDateBR = (iso: string | null) => {
  if (!iso) return null;
  const d = new Date(iso.length === 10 ? iso + "T00:00:00" : iso);
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
};

const firstName = (full: string) => (full || "").trim().split(/\s+/)[0] || "";

function guessPlantaFallback(cf: Record<string, string | number | null> | null): string | null {
  if (!cf) return null;
  const pav = String(cf["Pavimento"] ?? "").trim();
  if (!pav) return null;
  const num = parseInt(pav, 10);
  if (Number.isNaN(num)) return null;
  const t =
    tipologias.find((t) => {
      const m = t.name.match(/(\d+)(?:º|\s*ao\s*(\d+)º)?/);
      if (!m) return false;
      const start = parseInt(m[1], 10);
      const end = m[2] ? parseInt(m[2], 10) : start;
      return num >= start && num <= end;
    }) ?? null;
  return t?.plantaFile ?? null;
}

function tipoHighlights(cf: Record<string, string | number | null> | null): string[] {
  if (!cf) return [];
  const label = String(cf["Tipologia"] ?? "").toLowerCase();
  if (!label) return [];
  const t = tipologias.find((t) => label.includes(t.name.toLowerCase().split(" ")[0]));
  return t?.highlights ?? [];
}

function bestProposal(u: SharedUnit): SharedProposal | null {
  if (!u.proposals?.length) return null;
  const accepted = u.proposals.find((p) => p.status === "aceita");
  if (accepted) return accepted;
  return [...u.proposals].sort(
    (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
  )[0];
}

function unitFinal(u: SharedUnit): number {
  const p = bestProposal(u);
  return p ? n(p.final_price_brl) : n(u.price_brl);
}

function unitSavings(u: SharedUnit): number {
  const p = bestProposal(u);
  if (!p) return 0;
  return Math.max(0, n(u.price_brl) - n(p.final_price_brl));
}

function PlantaThumb({ url, alt }: { url: string | null; alt: string }) {
  const [open, setOpen] = useState(false);
  if (!url) {
    return (
      <div className="aspect-[4/3] w-full rounded-md border border-border/60 bg-muted/30 flex flex-col items-center justify-center text-muted-foreground gap-1.5">
        <ImageOff className="h-6 w-6" />
        <span className="text-xs">Planta indisponível</span>
      </div>
    );
  }
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group block aspect-[4/3] w-full overflow-hidden rounded-md border border-border/60 bg-muted/30"
        aria-label="Abrir planta em tela cheia"
      >
        <img
          src={url}
          alt={alt}
          loading="lazy"
          className="h-full w-full object-contain transition-transform duration-500 group-hover:scale-[1.02]"
        />
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-6xl p-2 bg-background">
          <img src={url} alt={alt} className="max-h-[85vh] w-full object-contain" />
        </DialogContent>
      </Dialog>
    </>
  );
}

function PaymentTable({ p, unitCode }: { p: SharedProposal; unitCode: string }) {
  const isAVista = p.payment_method === "a_vista";
  const keysLabel =
    p.payment_method === "financiamento"
      ? "Saldo nas chaves — via financiamento bancário (repasse)"
      : p.payment_method === "a_vista"
        ? "Pagamento único na assinatura"
        : "Saldo nas chaves — direto com a incorporadora";

  const rows: Array<{ label: string; qty?: string; unit?: string; total: number }> = [];
  if (isAVista) {
    rows.push({ label: keysLabel, total: n(p.final_price_brl) });
  } else {
    if (n(p.down_payment_brl) > 0)
      rows.push({ label: "Ato / sinal — na assinatura", total: n(p.down_payment_brl) });
    if (p.monthly_count > 0)
      rows.push({
        label: "Mensais pré-chaves",
        qty: `${p.monthly_count}×`,
        unit: formatBRL2(n(p.monthly_brl)),
        total: p.monthly_count * n(p.monthly_brl),
      });
    if (p.balloon_count > 0)
      rows.push({
        label: "Intermediárias (balões)",
        qty: `${p.balloon_count}×`,
        unit: formatBRL2(n(p.balloon_brl)),
        total: p.balloon_count * n(p.balloon_brl),
      });
    if (n(p.keys_brl) > 0) rows.push({ label: keysLabel, total: n(p.keys_brl) });
  }

  return (
    <div className="rounded-md border border-border/60 overflow-hidden">
      <div className="px-3 py-2 bg-muted/40 border-b border-border/60 flex items-center justify-between">
        <span className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
          Plano de pagamento · unidade {unitCode}
        </span>
        <span className="text-[11px] text-muted-foreground">
          {PAYMENT_METHOD_LABEL[p.payment_method]}
        </span>
      </div>
      <table className="w-full text-sm">
        <thead className="text-[11px] uppercase tracking-wider text-muted-foreground">
          <tr className="border-b border-border/50">
            <th className="text-left font-medium px-3 py-2">Descrição</th>
            <th className="text-right font-medium px-3 py-2 w-16">Qtd</th>
            <th className="text-right font-medium px-3 py-2 w-32">Valor unit.</th>
            <th className="text-right font-medium px-3 py-2 w-40">Total</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-b border-border/40 last:border-0">
              <td className="px-3 py-2 text-foreground">{r.label}</td>
              <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">
                {r.qty ?? "—"}
              </td>
              <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">
                {r.unit ?? "—"}
              </td>
              <td className="px-3 py-2 text-right tabular-nums">{formatBRL2(r.total)}</td>
            </tr>
          ))}
          <tr className="bg-muted/30 font-semibold">
            <td className="px-3 py-2.5" colSpan={3}>
              Total da proposta
            </td>
            <td className="px-3 py-2.5 text-right tabular-nums text-accent">
              {formatBRL2(n(p.final_price_brl))}
            </td>
          </tr>
          {p.payment_method === "financiamento" && n(p.keys_brl) > 0 && (
            <tr className="bg-accent/[0.07] border-t border-accent/20">
              <td className="px-3 py-2.5" colSpan={3}>
                <span className="font-display text-[13px] text-foreground">
                  Valor a financiar nas chaves
                </span>
                <span className="ml-2 text-[11px] text-muted-foreground">
                  (repasse bancário)
                </span>
              </td>
              <td className="px-3 py-2.5 text-right tabular-nums font-display text-accent">
                {formatBRL2(n(p.keys_brl))}
              </td>
            </tr>
          )}
        </tbody>
      </table>
      {p.notes && (
        <p className="px-3 py-2 text-[11px] italic text-muted-foreground border-t border-border/40">
          {p.notes}
        </p>
      )}
    </div>
  );
}

function SocialProofChip({ count }: { count?: number | null }) {
  const value = count ?? 0;
  if (value <= 0) return null;
  const label =
    value === 1 ? "1 pessoa interessada neste imóvel" : `${value} pessoas interessadas neste imóvel`;
  return (
    <TooltipProvider delayDuration={100}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-accent/[0.06] px-3 py-1.5 print:hidden">
            <span className="relative flex h-2 w-2">
              <span className="motion-safe:animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
            </span>
            <span className="text-xs text-muted-foreground">
              <span className="font-medium text-foreground tabular-nums">{value}</span>{" "}
              {value === 1 ? "pessoa interessada neste imóvel" : "pessoas interessadas neste imóvel"}
            </span>
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs text-center">
          <p>Contatos com negócios em andamento para unidades do Vila Park</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function UnitCard({ u }: { u: SharedUnit }) {
  const primary = bestProposal(u);
  const others = primary ? u.proposals.filter((p) => p !== primary) : [];
  const cf = u.custom_fields ?? {};
  const plantaSrc = u.planta_url ?? guessPlantaFallback(cf);
  const highlights = tipoHighlights(cf);

  const listPrice = n(u.price_brl);
  const finalPrice = primary ? n(primary.final_price_brl) : listPrice;
  const hasDiscount = primary && listPrice > finalPrice;
  const discountBadge = primary
    ? n(primary.discount_pct) > 0
      ? `−${n(primary.discount_pct).toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%`
      : n(primary.discount_brl) > 0
        ? `−${formatBRL2(n(primary.discount_brl))}`
        : null
    : null;

  const chip = (label: string, value: string | number | null | undefined) =>
    value === null || value === undefined || value === "" ? null : (
      <span
        key={label}
        className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-background px-2.5 py-1 text-[11px] text-foreground"
      >
        <span className="text-muted-foreground">{label}</span>
        <span className="tabular-nums">{value}</span>
      </span>
    );

  return (
    <article className="rounded-lg border border-border/60 bg-background overflow-hidden print:break-inside-avoid">
      <div className="grid md:grid-cols-2 gap-0 md:gap-6 p-4 md:p-6">
        <div>
          <PlantaThumb url={plantaSrc} alt={`Planta unidade ${u.code}`} />
        </div>
        <div className="mt-5 md:mt-0 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="eyebrow text-[10px] mb-1">
                {u.is_primary ? "Unidade principal" : "Unidade adicional"}
              </p>
              <h3 className="font-display text-2xl md:text-3xl font-medium text-foreground tracking-tight">
                Apartamento {u.code}
              </h3>
              {u.block && (
                <p className="text-sm text-muted-foreground mt-0.5">Bloco {u.block}</p>
              )}
            </div>
            {primary?.status === "aceita" && (
              <Badge className="bg-emerald-600/15 text-emerald-700 dark:text-emerald-400 border border-emerald-600/30 hover:bg-emerald-600/15">
                Condição aceita
              </Badge>
            )}
          </div>

          <div className="flex flex-wrap gap-1.5">
            {chip("Tipologia", cf["Tipologia"] as string)}
            {chip("Pavimento", cf["Pavimento"] as string | number)}
            {u.area_m2 != null && chip("Privativa (m²)", `${n(u.area_m2)}`)}
            {chip("Área externa (m²)", cf["Área externa (m²)"] as string | number)}
            {chip("Orientação solar", cf["Orientação solar"] as string)}
          </div>

          {highlights.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {highlights.map((h) => (
                <span
                  key={h}
                  className="text-[10px] uppercase tracking-wider text-muted-foreground border border-dashed border-border/60 rounded-full px-2 py-0.5"
                >
                  {h}
                </span>
              ))}
            </div>
          )}

          <div className="pt-2 border-t border-border/50">
            <p className="eyebrow text-[10px] mb-1">Condição comercial</p>
            <div className="flex items-baseline flex-wrap gap-x-3 gap-y-1">
              {hasDiscount && (
                <span className="text-sm text-muted-foreground line-through tabular-nums">
                  {formatBRL2(listPrice)}
                </span>
              )}
              {discountBadge && (
                <Badge className="bg-accent/15 text-accent border border-accent/30 hover:bg-accent/15">
                  {discountBadge}
                </Badge>
              )}
            </div>
            <p className="font-display text-3xl md:text-4xl font-medium text-accent tabular-nums leading-tight mt-1">
              {formatBRL2(finalPrice)}
            </p>
            {!primary && (
              <p className="text-[11px] text-muted-foreground italic mt-1">
                Valor de tabela — sem proposta ativa.
              </p>
            )}
          </div>
        </div>
      </div>

      {primary && (
        <div className="px-4 md:px-6 pb-4 md:pb-6 space-y-3">
          <PaymentTable p={primary} unitCode={u.code} />
          {others.length > 0 && (
            <Collapsible>
              <CollapsibleTrigger className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition">
                <ChevronDown className="h-3.5 w-3.5" />
                Outras condições apresentadas ({others.length})
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-3 space-y-3">
                {others.map((op, i) => (
                  <PaymentTable key={i} p={op} unitCode={u.code} />
                ))}
              </CollapsibleContent>
            </Collapsible>
          )}
        </div>
      )}
    </article>
  );
}

const KIND_LABEL: Record<InstallmentKind, string> = {
  sinal: "Sinal",
  mensal: "Mensal",
  intermediaria: "Intermediária",
  chaves: "Chaves",
};

function toStmtContract(c: SharedContract): StmtContract {
  return {
    id: c.contract_number,
    unit_id: c.unit_code,
    contract_number: c.contract_number,
    client_name: c.client_name,
    contract_date: c.contract_date,
    original_value: n(c.original_value),
    contract_value: n(c.contract_value),
    monthly_index_rate: n(c.monthly_index_rate),
    index_label: c.index_label,
    late_fine_rate: n(c.late_fine_rate),
    late_interest_monthly: n(c.late_interest_monthly),
    status: c.status,
  };
}

function toStmtInstallments(c: SharedContract): StmtInstallment[] {
  return c.installments.map((i, idx) => ({
    id: `${c.contract_number}-${idx}`,
    contract_id: c.contract_number,
    seq_label: i.seq_label,
    kind: i.kind,
    due_date: i.due_date,
    contractual_value: n(i.contractual_value),
    paid_date: i.paid_date,
    paid_value: n(i.paid_value),
    fine_value: n(i.fine_value),
    interest_value: n(i.interest_value),
    discount_value: n(i.discount_value),
    admin_fee: n(i.admin_fee),
    insurance_fee: n(i.insurance_fee),
    corrected_value: i.corrected_value == null ? null : n(i.corrected_value),
  }));
}

function ContractStatementCard({ c, today }: { c: SharedContract; today: string }) {
  const [tableOpen, setTableOpen] = useState(true);
  const stmt = useMemo(
    () => buildStatement(toStmtContract(c), toStmtInstallments(c), today),
    [c, today],
  );
  const totalInst = stmt.rows.length;
  const openCount = stmt.rows.filter((r) => !r.paid_date || Number(r.paid_value) === 0).length;
  const saldoAberto = stmt.summary.valorQuitacao;
  const ratePct = (n(c.monthly_index_rate) * 100).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  const statusLabel = c.status.charAt(0).toUpperCase() + c.status.slice(1);
  const todayBR = formatDateBR(today);

  const kpi = (label: string, value: string, tone?: "accent" | "emerald" | "muted") => (
    <div className="rounded-md border border-border/60 bg-background/60 p-3">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p
        className={`mt-1 font-display text-lg md:text-xl tabular-nums ${
          tone === "accent"
            ? "text-accent"
            : tone === "emerald"
              ? "text-emerald-700 dark:text-emerald-400"
              : "text-foreground"
        }`}
      >
        {value}
      </p>
    </div>
  );

  return (
    <article className="rounded-lg border border-border/60 bg-background overflow-hidden print:break-inside-avoid">
      <div className="p-4 md:p-6 border-b border-border/50">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <p className="eyebrow text-[10px] mb-1">Contrato ativo</p>
            <h3 className="font-display text-xl md:text-2xl font-medium text-foreground tracking-tight">
              Contrato {c.contract_number} · Unidade {c.unit_code}
            </h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Assinado em {formatDateBR(c.contract_date)} · Correção: {c.index_label} (demo){" "}
              {ratePct}% a.m.
            </p>
          </div>
          <Badge variant="outline" className="border-border/60 text-[11px]">
            {statusLabel}
          </Badge>
        </div>

        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-2.5">
          {kpi("Valor do contrato", fmtBRL(stmt.summary.contractValue))}
          {kpi("Total pago", fmtBRL(stmt.summary.totalPago), "emerald")}
          {kpi("Saldo em aberto", fmtBRL(saldoAberto))}
          {kpi("Valor de quitação hoje", fmtBRL(saldoAberto), "accent")}
        </div>
      </div>

      <div className="p-4 md:p-6">
        <Collapsible open={tableOpen} onOpenChange={setTableOpen}>
          <CollapsibleTrigger className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition">
            <ChevronDown className={`h-3.5 w-3.5 transition-transform ${tableOpen ? "rotate-180" : ""}`} />
            {tableOpen ? "Ocultar parcelas" : `Ver todas as ${totalInst} parcelas (${openCount} em aberto)`}
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-3 print:!block">
            <div className="overflow-x-auto rounded-md border border-border/60">
              <table className="w-full text-xs tabular-nums">
                <thead className="text-[10px] uppercase tracking-wider text-muted-foreground bg-muted/40">
                  <tr>
                    <th className="text-left font-medium px-2.5 py-2">Parcela</th>
                    <th className="text-left font-medium px-2.5 py-2">Vencimento</th>
                    <th className="text-right font-medium px-2.5 py-2">Contratual</th>
                    <th className="text-left font-medium px-2.5 py-2">Situação</th>
                    <th className="text-right font-medium px-2.5 py-2">Pago / Corrigido</th>
                  </tr>
                </thead>
                <tbody>
                  {stmt.rows.map((r) => {
                    const paid = !!r.paid_date && Number(r.paid_value) > 0;
                    const overdue =
                      !paid &&
                      new Date(r.due_date + "T23:59:59").getTime() <
                        new Date(today + "T00:00:00").getTime();
                    const extras =
                      Number(r.fine_value || 0) + Number(r.interest_value || 0);
                    return (
                      <tr key={r.id} className="border-t border-border/40 align-top">
                        <td className="px-2.5 py-2">
                          <div className="text-foreground">{r.seq_label}</div>
                          <div className="text-[10px] text-muted-foreground">
                            {KIND_LABEL[r.kind]}
                          </div>
                        </td>
                        <td className="px-2.5 py-2 whitespace-nowrap">
                          {formatDateBR(r.due_date)}
                        </td>
                        <td className="px-2.5 py-2 text-right">
                          {fmtBRL(Number(r.contractual_value))}
                        </td>
                        <td className="px-2.5 py-2 whitespace-nowrap">
                          {paid ? (
                            <span className="text-emerald-700 dark:text-emerald-400">
                              Paga em {formatDateBR(r.paid_date)}
                            </span>
                          ) : overdue ? (
                            <span className="text-amber-700 dark:text-amber-400">
                              Em atraso
                            </span>
                          ) : (
                            <span className="text-muted-foreground">Em aberto</span>
                          )}
                          {paid && extras > 0 && (
                            <div className="text-[10px] text-muted-foreground">
                              Multa/juros {fmtBRL(extras)}
                            </div>
                          )}
                        </td>
                        <td className="px-2.5 py-2 text-right">
                          {paid ? (
                            <span className="text-emerald-700 dark:text-emerald-400">
                              {fmtBRL(Number(r.paid_value))}
                            </span>
                          ) : (
                            <span className="text-foreground">
                              {fmtBRL(r.correctedNow)}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CollapsibleContent>
        </Collapsible>

        <p className="mt-3 text-[11px] italic text-muted-foreground">
          Valores corrigidos até {todayBR} pela taxa contratual. Extrato demonstrativo — o extrato
          oficial é emitido pela incorporadora.
        </p>
      </div>
    </article>
  );
}

function StatementSection({ contracts, today }: { contracts: SharedContract[]; today: string }) {
  return (
    <section className="border-t border-border/40 bg-muted/25 print:break-before-page">
      <div className="max-w-6xl mx-auto px-5 md:px-8 py-12 md:py-16">
        <p className="eyebrow mb-3">
          <FileText className="inline h-3 w-3 mr-1.5 -mt-0.5" />
          Extrato do cliente
        </p>
        <h2 className="font-display text-2xl md:text-3xl font-medium text-foreground tracking-tight max-w-2xl">
          Situação do{contracts.length > 1 ? "s" : ""} contrato
          {contracts.length > 1 ? "s" : ""} em andamento com a incorporadora
        </h2>
        <div className="mt-8 space-y-5">
          {contracts.map((c) => (
            <ContractStatementCard key={c.contract_number} c={c} today={today} />
          ))}
        </div>
      </div>
    </section>
  );
}

/* --------------------------- Financing simulator --------------------------- */

// Taxa padrão do simulador de /ferramentas (Caixa SBPE, efetiva a.a.).
const DEFAULT_ANNUAL_RATE = 11.19;
const DEFAULT_TERM_MONTHS = 360;

type FinanceableOption = {
  id: string; // unit code + updated_at
  unitCode: string;
  finalPrice: number;
  keysBrl: number;
  paidUntilKeys: number; // final - keys
  proposalUpdatedAt: string;
  isPrimaryUnit: boolean;
};

type SimResultState = {
  unitCode: string;
  financedAmount: number;
  termMonths: number;
  annualRate: number;
  sac: FinancingResult;
  price: FinancingResult;
};

function financeableOptionsFrom(units: SharedUnit[]): FinanceableOption[] {
  const out: FinanceableOption[] = [];
  units.forEach((u) => {
    u.proposals.forEach((p) => {
      if (p.payment_method === "financiamento" && n(p.keys_brl) > 0) {
        const final = n(p.final_price_brl);
        const keys = n(p.keys_brl);
        out.push({
          id: `${u.code}-${p.updated_at}`,
          unitCode: u.code,
          finalPrice: final,
          keysBrl: keys,
          paidUntilKeys: Math.max(final - keys, 0),
          proposalUpdatedAt: p.updated_at,
          isPrimaryUnit: u.is_primary,
        });
      }
    });
  });
  // Ordenação: primária primeiro, depois mais recente
  out.sort((a, b) => {
    if (a.isPrimaryUnit !== b.isPrimaryUnit) return a.isPrimaryUnit ? -1 : 1;
    return new Date(b.proposalUpdatedAt).getTime() - new Date(a.proposalUpdatedAt).getTime();
  });
  return out;
}

function FinancingSimDialog({
  open,
  onOpenChange,
  options,
  initialOptionId,
  initialFinanced,
  initialTerm,
  initialRate,
  onSimulate,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  options: FinanceableOption[];
  initialOptionId?: string;
  initialFinanced?: number;
  initialTerm?: number;
  initialRate?: number;
  onSimulate: (r: SimResultState) => void;
}) {
  const defaultId = initialOptionId ?? options[0]?.id ?? "";
  const [optionId, setOptionId] = useState(defaultId);
  const current = options.find((o) => o.id === optionId) ?? options[0];
  const [financed, setFinanced] = useState<number>(initialFinanced ?? current?.keysBrl ?? 0);
  const [termMonths, setTermMonths] = useState<number>(initialTerm ?? DEFAULT_TERM_MONTHS);
  const [rateStr, setRateStr] = useState<string>(
    (initialRate ?? DEFAULT_ANNUAL_RATE).toString().replace(".", ","),
  );

  // Ao trocar unidade, atualiza o valor a financiar sugerido
  useEffect(() => {
    if (!current) return;
    setFinanced(current.keysBrl);
  }, [optionId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Reset quando abre novamente com initial values
  useEffect(() => {
    if (open) {
      setOptionId(initialOptionId ?? options[0]?.id ?? "");
      if (initialFinanced != null) setFinanced(initialFinanced);
      if (initialTerm != null) setTermMonths(initialTerm);
      if (initialRate != null) setRateStr(initialRate.toString().replace(".", ","));
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!current) return null;

  const parsedRate = parseFloat(rateStr.replace(",", ".")) || 0;
  const canSubmit = financed > 0 && termMonths >= 12 && termMonths <= 420 && parsedRate > 0;

  const submit = () => {
    if (!canSubmit || !current) return;
    // Usamos propertyValue = financed e downPayment = 0 para que "valor financiado" = financed.
    const base = {
      propertyValue: financed,
      downPayment: 0,
      termMonths,
      annualRate: parsedRate,
      annualRateType: "efetiva" as const,
    };
    const sac = simulate("SAC", base);
    const price = simulate("PRICE", base);
    onSimulate({
      unitCode: current.unitCode,
      financedAmount: financed,
      termMonths,
      annualRate: parsedRate,
      sac,
      price,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">Simular financiamento</DialogTitle>
          <DialogDescription>
            Simulação do saldo nas chaves via repasse bancário — SAC e Price, mesma metodologia
            usada nas ferramentas do site.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          {options.length > 1 && (
            <div className="space-y-1.5">
              <Label htmlFor="sim-unit" className="text-xs">Unidade</Label>
              <Select value={optionId} onValueChange={setOptionId}>
                <SelectTrigger id="sim-unit"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {options.map((o) => (
                    <SelectItem key={o.id} value={o.id}>
                      Apto {o.unitCode} · {formatBRL2(o.finalPrice)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Valor do imóvel</Label>
              <div className="h-10 flex items-center rounded-md border border-border/60 bg-muted/40 px-3 text-sm tabular-nums text-foreground">
                {formatBRL2(current.finalPrice)}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Pago até as chaves</Label>
              <div className="h-10 flex items-center rounded-md border border-border/60 bg-muted/40 px-3 text-sm tabular-nums text-foreground">
                {formatBRL2(current.paidUntilKeys)}
              </div>
              <p className="text-[10px] text-muted-foreground italic">
                direto com a incorporadora (ato + mensais + intermediárias)
              </p>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="sim-financed" className="text-xs">
              Valor a financiar (repasse bancário)
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">R$</span>
              <Input
                id="sim-financed"
                inputMode="numeric"
                className="pl-9 h-10 text-right tabular-nums"
                value={financed ? financed.toLocaleString("pt-BR") : ""}
                onChange={(e) => {
                  const digits = e.target.value.replace(/\D/g, "");
                  setFinanced(digits ? parseInt(digits, 10) : 0);
                }}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="sim-term" className="text-xs">Prazo (meses)</Label>
              <Input
                id="sim-term"
                type="number"
                min={12}
                max={420}
                className="h-10 tabular-nums"
                value={termMonths}
                onChange={(e) => setTermMonths(Math.max(12, Math.min(420, parseInt(e.target.value || "0", 10) || 0)))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sim-rate" className="text-xs">Taxa efetiva (% a.a.)</Label>
              <Input
                id="sim-rate"
                inputMode="decimal"
                className="h-10 tabular-nums"
                value={rateStr}
                onChange={(e) => setRateStr(e.target.value.replace(/[^\d,.]/g, ""))}
              />
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Simulamos SAC e Price lado a lado, como no simulador de /ferramentas.
          </p>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button
            className="bg-accent text-accent-foreground hover:bg-accent/90"
            onClick={submit}
            disabled={!canSubmit}
          >
            <Calculator className="mr-2 h-4 w-4" />
            Simular
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SimulationSection({
  result,
  onEdit,
  sectionRef,
}: {
  result: SimResultState;
  onEdit: () => void;
  sectionRef: React.RefObject<HTMLElement>;
}) {
  const { sac, price, unitCode, financedAmount, termMonths, annualRate } = result;
  const [tableOpen, setTableOpen] = useState(false);

  const balanceData = useMemo(() => {
    const step = Math.max(1, Math.floor(sac.schedule.length / 60));
    return sac.schedule
      .filter((_, i) => i % step === 0 || i === sac.schedule.length - 1)
      .map((row) => ({
        month: row.n,
        SAC: Math.round(row.balance),
        Price: Math.round(price.schedule[sac.schedule.indexOf(row)]?.balance ?? 0),
      }));
  }, [sac, price]);

  const Kpi = ({ label, value, tone }: { label: string; value: string; tone?: "accent" }) => (
    <div className="rounded-md border border-border/60 bg-background/60 p-3">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={`mt-1 font-display text-base md:text-lg tabular-nums ${tone === "accent" ? "text-accent" : "text-foreground"}`}>
        {value}
      </p>
    </div>
  );

  return (
    <section ref={sectionRef} className="border-t border-border/40 bg-background print:break-before-page">
      <div className="max-w-6xl mx-auto px-5 md:px-8 py-12 md:py-16">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <p className="eyebrow mb-3">
              <Calculator className="inline h-3 w-3 mr-1.5 -mt-0.5" />
              Simulação de financiamento
            </p>
            <h2 className="font-display text-2xl md:text-3xl font-medium text-foreground tracking-tight max-w-2xl">
              Unidade {unitCode} · financiando {formatBRL2(financedAmount)} em {termMonths} meses
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Taxa demonstrativa {PCT_PT(annualRate)} a.a. (efetiva) · SAC × Price lado a lado.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={onEdit} className="print:hidden">
            <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
            Refazer simulação
          </Button>
        </div>

        {/* KPIs SAC × Price */}
        <div className="mt-8 grid md:grid-cols-2 gap-4">
          <div className="rounded-lg border border-border/60 bg-muted/20 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-lg text-foreground">SAC</h3>
              <Badge variant="outline" className="text-[10px] border-border/60">parcelas decrescentes</Badge>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              {Kpi({ label: "1ª parcela", value: BRL(sac.firstInstallment), tone: "accent" })}
              {Kpi({ label: "Última parcela", value: BRL(sac.lastInstallment) })}
              {Kpi({ label: "Total de juros", value: BRL(sac.totalInterest) })}
              {Kpi({ label: "Total pago", value: BRL(sac.totalPaid) })}
            </div>
          </div>
          <div className="rounded-lg border border-border/60 bg-muted/20 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-lg text-foreground">Price</h3>
              <Badge variant="outline" className="text-[10px] border-border/60">parcelas fixas</Badge>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              {Kpi({ label: "1ª parcela", value: BRL(price.firstInstallment), tone: "accent" })}
              {Kpi({ label: "Última parcela", value: BRL(price.lastInstallment) })}
              {Kpi({ label: "Total de juros", value: BRL(price.totalInterest) })}
              {Kpi({ label: "Total pago", value: BRL(price.totalPaid) })}
            </div>
          </div>
        </div>

        {/* Evolução do saldo devedor */}
        <div className="mt-6 rounded-lg border border-border/60 bg-background p-4 md:p-5">
          <h3 className="text-sm font-semibold text-foreground mb-3">Evolução do saldo devedor</h3>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={balanceData}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
              <RTooltip formatter={(v: number) => BRL(v)} labelFormatter={(l) => `Mês ${l}`} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line type="monotone" dataKey="SAC" stroke="hsl(var(--accent))" strokeWidth={2.5} dot={false} />
              <Line type="monotone" dataKey="Price" stroke="hsl(var(--muted-foreground))" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Parcelas (colapsável) */}
        <div className="mt-6 rounded-lg border border-border/60 bg-background p-4 md:p-5">
          <Collapsible open={tableOpen} onOpenChange={setTableOpen}>
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <h3 className="text-sm font-semibold text-foreground">Cronograma de parcelas (SAC)</h3>
              <CollapsibleTrigger className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition print:hidden">
                <ChevronDown className={`h-3.5 w-3.5 transition-transform ${tableOpen ? "rotate-180" : ""}`} />
                {tableOpen ? "Ocultar" : `Ver primeiras 12 e resumo anual`}
              </CollapsibleTrigger>
            </div>
            <CollapsibleContent className="mt-3 print:!block">
              <div className="overflow-x-auto rounded-md border border-border/60">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-[10px] uppercase tracking-wider">Mês</TableHead>
                      <TableHead className="text-right text-[10px] uppercase tracking-wider">Amortização</TableHead>
                      <TableHead className="text-right text-[10px] uppercase tracking-wider">Juros</TableHead>
                      <TableHead className="text-right text-[10px] uppercase tracking-wider">Parcela</TableHead>
                      <TableHead className="text-right text-[10px] uppercase tracking-wider">Saldo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sac.schedule.slice(0, 12).map((r) => (
                      <TableRow key={r.n}>
                        <TableCell className="tabular-nums">{r.n}</TableCell>
                        <TableCell className="text-right tabular-nums">{BRL2(r.amortization)}</TableCell>
                        <TableCell className="text-right tabular-nums">{BRL2(r.interest)}</TableCell>
                        <TableCell className="text-right tabular-nums font-medium">{BRL2(r.fullPayment)}</TableCell>
                        <TableCell className="text-right tabular-nums">{BRL2(r.balance)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <h4 className="mt-5 mb-2 text-xs uppercase tracking-wider text-muted-foreground">Resumo anual (SAC)</h4>
              <div className="overflow-x-auto rounded-md border border-border/60">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-[10px] uppercase tracking-wider">Ano</TableHead>
                      <TableHead className="text-right text-[10px] uppercase tracking-wider">Amortizado</TableHead>
                      <TableHead className="text-right text-[10px] uppercase tracking-wider">Juros pagos</TableHead>
                      <TableHead className="text-right text-[10px] uppercase tracking-wider">Saldo fim</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Array.from({ length: Math.ceil(sac.schedule.length / 12) }).map((_, yi) => {
                      const rows = sac.schedule.slice(yi * 12, yi * 12 + 12);
                      if (!rows.length) return null;
                      const amort = rows.reduce((a, r) => a + r.amortization, 0);
                      const juros = rows.reduce((a, r) => a + r.interest, 0);
                      const saldo = rows[rows.length - 1].balance;
                      return (
                        <TableRow key={yi}>
                          <TableCell className="tabular-nums">{yi + 1}</TableCell>
                          <TableCell className="text-right tabular-nums">{BRL(amort)}</TableCell>
                          <TableCell className="text-right tabular-nums">{BRL(juros)}</TableCell>
                          <TableCell className="text-right tabular-nums">{BRL(saldo)}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>

        {/* Avisos obrigatórios */}
        <div className="mt-6 rounded-md border border-amber-500/40 bg-amber-500/10 p-4 space-y-1.5 text-[12px] leading-relaxed text-amber-900 dark:text-amber-200">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
            <div className="space-y-1">
              <p><strong>Simulação ilustrativa</strong> — não constitui proposta de crédito.</p>
              <p>Sujeito a análise e aprovação do banco no momento do repasse (nas chaves).</p>
              <p>Compare o <strong>CET</strong> nas propostas reais dos bancos antes de decidir.</p>
              <p>Taxa demonstrativa de {PCT_PT(annualRate)} a.a. (efetiva) — as taxas praticadas variam por banco, relacionamento e perfil.</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function ProposalPage({ data }: { data: SharedPayload }) {
  const units = useMemo(
    () => [...data.units].sort((a, b) => (a.is_primary === b.is_primary ? 0 : a.is_primary ? -1 : 1)),
    [data.units],
  );
  const contracts = data.contracts ?? [];
  const today = new Date().toISOString().slice(0, 10);


  const total = units.reduce((s, u) => s + unitFinal(u), 0);
  const listTotal = units.reduce((s, u) => s + n(u.price_brl), 0);
  const savings = units.reduce((s, u) => s + unitSavings(u), 0);

  const validities = units
    .flatMap((u) => u.proposals.map((p) => p.valid_until))
    .filter((v): v is string => !!v)
    .sort();
  const nearestValidity = validities[0] ?? null;
  const allExpired =
    validities.length > 0 &&
    validities.every((v) => new Date(v + "T23:59:59").getTime() < Date.now());

  const codes = units.map((u) => u.code).join(", ");
  const waText = encodeURIComponent(
    `Olá! Sou ${firstName(data.client_name)} e recebi a proposta Vila Park para as unidades ${codes}. Podemos conversar?`,
  );
  const waHref = `https://api.whatsapp.com/send?phone=${WHATSAPP_PHONE}&text=${waText}`;

  const steps = [
    {
      title: "Solicite pelo formulário ou WhatsApp",
      desc: "Envie seus dados e a tipologia de interesse — sem compromisso.",
    },
    {
      title: "O time Vila Park entra em contato",
      desc: "Apresentamos condições atualizadas, disponibilidade e materiais completos.",
    },
    {
      title: "Comercialização conforme o Registro de Incorporação",
      desc: "A venda só ocorre após o registro cartorial da incorporação imobiliária.",
    },
    {
      title: "Formalização do contrato",
      desc: "Assinatura, pagamento da entrada e cronograma financeiro definido.",
    },
  ];

  // --- Simulação de financiamento ---
  const financeableOptions = useMemo(() => financeableOptionsFrom(units), [units]);
  const hasFinanceable = financeableOptions.length > 0;
  const [simOpen, setSimOpen] = useState(false);
  const [simResult, setSimResult] = useState<SimResultState | null>(null);
  const simSectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (simResult && simSectionRef.current) {
      const el = simSectionRef.current;
      requestAnimationFrame(() => {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }
  }, [simResult]);

  const currentSimOption = simResult
    ? financeableOptions.find((o) => o.unitCode === simResult.unitCode)
    : undefined;

  const openSimDialog = () => {
    if (!hasFinanceable) return;
    setSimOpen(true);
  };


  return (
    <div className="min-h-screen bg-muted/25">
      <header className="border-b border-border/40 bg-background">
        <div className="max-w-6xl mx-auto px-5 md:px-8 py-8 md:py-12">
          <p className="eyebrow mb-3">VILA PARK · VILA MARIANA</p>
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
            <h1 className="font-display text-3xl md:text-5xl font-medium text-foreground tracking-tight">
              Proposta preparada para {data.client_name}
            </h1>
            <SocialProofChip count={data.interested_count} />
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
            <span className="tabular-nums">
              Emitida em{" "}
              {new Date(data.shared_at).toLocaleDateString("pt-BR", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
              })}
            </span>
            {nearestValidity && (
              <Badge
                variant="outline"
                className="border-border/60 text-[11px] tabular-nums"
              >
                Válida até {fmtDateBR(nearestValidity)}
              </Badge>
            )}
          </div>
          {allExpired && (
            <div className="mt-5 flex items-start gap-2.5 rounded-md border border-amber-500/40 bg-amber-500/10 p-3.5 text-sm text-amber-900 dark:text-amber-200">
              <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
              <p>
                Proposta expirada — fale com o time Vila Park para condições atualizadas.
              </p>
            </div>
          )}
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-5 md:px-8 py-10 md:py-14 grid lg:grid-cols-[minmax(0,1fr)_320px] gap-8 lg:gap-10">
        <div className="space-y-6">
          {units.map((u) => (
            <UnitCard key={u.code} u={u} />
          ))}
        </div>

        <aside className="lg:sticky lg:top-8 lg:self-start space-y-4 print:hidden">
          <div className="rounded-lg border border-border/60 bg-background p-5 space-y-3 relative">
            <div className="flex items-start justify-between gap-2">
              <p className="eyebrow text-[10px]">Resumo da proposta</p>
              <TooltipProvider delayDuration={100}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 -mt-1 -mr-1 text-muted-foreground hover:text-foreground"
                      onClick={() => window.print()}
                      aria-label="Imprimir ou salvar em PDF"
                    >
                      <Printer className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="left">Imprimir / salvar PDF</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <ul className="text-sm divide-y divide-border/50">
              {units.map((u) => {
                const p = bestProposal(u);
                return (
                  <li key={u.code} className="flex items-baseline justify-between gap-3 py-2">
                    <span>
                      <span className="font-mono text-xs mr-1.5">{u.code}</span>
                      {!p && (
                        <span className="text-[10px] text-muted-foreground italic">
                          tabela
                        </span>
                      )}
                    </span>
                    <span className="tabular-nums text-foreground">
                      {formatBRL2(unitFinal(u))}
                    </span>
                  </li>
                );
              })}
            </ul>
            <div className="pt-3 border-t border-border/50">
              {savings > 0 && (
                <div className="flex items-baseline justify-between text-xs text-muted-foreground mb-1">
                  <span>Tabela</span>
                  <span className="line-through tabular-nums">{formatBRL2(listTotal)}</span>
                </div>
              )}
              <div className="flex items-baseline justify-between">
                <span className="text-sm font-medium">Total</span>
                <span className="font-display text-2xl text-accent tabular-nums">
                  {formatBRL2(total)}
                </span>
              </div>
              {savings > 0 && (
                <p className="text-[11px] text-emerald-700 dark:text-emerald-400 mt-1 tabular-nums">
                  Economia de {formatBRL2(savings)} vs tabela
                </p>
              )}
              {contracts.length > 0 && (
                <p className="text-[11px] text-muted-foreground mt-2 border-t border-border/40 pt-2">
                  Cliente da base ·{" "}
                  {contracts.length === 1
                    ? `contrato ${contracts[0].contract_number} em andamento`
                    : `${contracts.length} contratos em andamento`}
                </p>
              )}
            </div>
            <div className="pt-2 space-y-2">
              <a href={waHref} target="_blank" rel="noopener noreferrer" className="block">
                <Button className="w-full bg-accent text-accent-foreground hover:bg-accent/90">
                  <MessageCircle className="mr-2 h-4 w-4" />
                  Falar com o time Vila Park
                </Button>
              </a>
              <TooltipProvider delayDuration={100}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="block">
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={openSimDialog}
                        disabled={!hasFinanceable}
                      >
                        <Calculator className="mr-2 h-4 w-4" />
                        Simular financiamento
                      </Button>
                    </span>
                  </TooltipTrigger>
                  {!hasFinanceable && (
                    <TooltipContent side="top" className="max-w-xs text-center">
                      Disponível para propostas com financiamento bancário
                    </TooltipContent>
                  )}
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
        </aside>
      </div>

      {contracts.length > 0 && <StatementSection contracts={contracts} today={today} />}

      {simResult && (
        <SimulationSection
          result={simResult}
          onEdit={() => setSimOpen(true)}
          sectionRef={simSectionRef}
        />
      )}

      {hasFinanceable && (
        <FinancingSimDialog
          open={simOpen}
          onOpenChange={setSimOpen}
          options={financeableOptions}
          initialOptionId={currentSimOption?.id ?? financeableOptions[0]?.id}
          initialFinanced={simResult?.financedAmount}
          initialTerm={simResult?.termMonths}
          initialRate={simResult?.annualRate}
          onSimulate={(r) => {
            setSimResult(r);
            setSimOpen(false);
          }}
        />
      )}

      {/* Mobile bottom bar */}
      <div
        className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-background/95 backdrop-blur-md border-t border-border/60 px-3 pt-3 print:hidden"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 0.75rem)" }}
      >
        <div className="max-w-6xl mx-auto flex items-center gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Total</p>
            <p className="font-display text-lg text-accent tabular-nums leading-tight truncate">
              {formatBRL2(total)}
            </p>
          </div>
          <TooltipProvider delayDuration={100}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 shrink-0 text-muted-foreground"
                  onClick={() => window.print()}
                  aria-label="Imprimir ou salvar em PDF"
                >
                  <Printer className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">Imprimir / salvar PDF</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <Button
            variant="outline"
            size="sm"
            className="shrink-0 h-10 px-3"
            onClick={openSimDialog}
            disabled={!hasFinanceable}
            aria-label="Simular financiamento"
          >
            <Calculator className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Simular</span>
          </Button>
          <a href={waHref} target="_blank" rel="noopener noreferrer" className="shrink-0">
            <Button size="sm" className="bg-accent text-accent-foreground hover:bg-accent/90 h-10 px-3 sm:px-4">
              <MessageCircle className="sm:mr-2 h-4 w-4" />
              <span className="hidden sm:inline">Falar com o time</span>
              <span className="sr-only sm:hidden">Falar com o time</span>
            </Button>
          </a>
        </div>
      </div>


      <section className="border-t border-border/40 bg-background print:break-before-page">
        <div className="max-w-6xl mx-auto px-5 md:px-8 py-12 md:py-16">
          <p className="eyebrow mb-3">Próximos passos</p>
          <h2 className="font-display text-2xl md:text-3xl font-medium text-foreground tracking-tight max-w-2xl">
            Como funciona a reserva
          </h2>
          <div className="mt-8 grid gap-0 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-border/60">
            {steps.map((s, i) => (
              <div key={s.title} className="p-5 md:px-6 first:pl-0 last:pr-0">
                <p className="font-display text-3xl md:text-4xl font-medium text-accent leading-none">
                  {String(i + 1).padStart(2, "0")}
                </p>
                <h3 className="mt-3 text-sm font-semibold text-foreground">{s.title}</h3>
                <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-border/40 bg-muted/40">
        <div className="max-w-6xl mx-auto px-5 md:px-8 py-8 md:py-10 space-y-3 pb-24 lg:pb-10">
          <p className="text-[11px] text-muted-foreground leading-relaxed max-w-3xl">
            Esta proposta comercial não constitui contrato nem reserva de unidade. Valores e
            disponibilidade sujeitos a confirmação e aprovação. O parcelamento pré-chaves é feito
            diretamente com a incorporadora; o saldo nas chaves via financiamento bancário está
            sujeito a análise e aprovação de crédito na época do repasse. Documento de demonstração —
            dados fictícios.
          </p>
          <p className="font-display text-sm text-foreground">Vila Park · Vila Mariana</p>
        </div>
      </footer>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="min-h-screen bg-muted/25">
      <div className="max-w-6xl mx-auto px-5 md:px-8 py-10 md:py-16 space-y-6">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-10 w-2/3" />
        <Skeleton className="h-4 w-56" />
        <div className="grid lg:grid-cols-[1fr_320px] gap-8 mt-10">
          <div className="space-y-6">
            <Skeleton className="h-[420px] w-full" />
            <Skeleton className="h-[420px] w-full" />
          </div>
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    </div>
  );
}

function NotFoundState() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/25 px-5">
      <div className="max-w-md text-center space-y-4">
        <p className="eyebrow">Proposta Vila Park</p>
        <h1 className="font-display text-3xl font-medium text-foreground tracking-tight">
          Proposta não encontrada
        </h1>
        <p className="text-sm text-muted-foreground">
          Este link pode ter expirado ou sido desativado pelo time comercial. Fale conosco para
          receber uma nova proposta.
        </p>
        <div className="flex flex-col sm:flex-row gap-2 justify-center pt-2">
          <Link to="/">
            <Button variant="outline">Ir para o site Vila Park</Button>
          </Link>
          <a
            href={`https://api.whatsapp.com/send?phone=${WHATSAPP_PHONE}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button className="bg-accent text-accent-foreground hover:bg-accent/90">
              <MessageCircle className="mr-2 h-4 w-4" />
              Falar no WhatsApp
            </Button>
          </a>
        </div>
      </div>
    </div>
  );
}

export default function PublicProposal() {
  const { token } = useParams<{ token: string }>();
  const [state, setState] = useState<
    { kind: "loading" } | { kind: "ok"; data: SharedPayload } | { kind: "notfound" }
  >({ kind: "loading" });

  useEffect(() => {
    // noindex for this public route
    const prev = document.querySelector('meta[name="robots"]');
    const meta = document.createElement("meta");
    meta.name = "robots";
    meta.content = "noindex, nofollow";
    document.head.appendChild(meta);
    const prevTitle = document.title;
    document.title = "Proposta Vila Park";
    return () => {
      document.head.removeChild(meta);
      if (prev) document.head.appendChild(prev);
      document.title = prevTitle;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    if (!token) {
      setState({ kind: "notfound" });
      return;
    }
    setState({ kind: "loading" });
    supabase
      .rpc("get_shared_proposal", { _token: token })
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error || !data) {
          setState({ kind: "notfound" });
          return;
        }
        setState({ kind: "ok", data: data as unknown as SharedPayload });
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  if (state.kind === "loading") return <LoadingState />;
  if (state.kind === "notfound") return <NotFoundState />;
  return <ProposalPage data={state.data} />;
}
