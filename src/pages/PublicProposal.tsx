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
  Calculator,
  RotateCcw,
  CalendarClock,
} from "lucide-react";
import { formatBRL2, PAYMENT_METHOD_LABEL, type CrmPaymentMethod } from "@/lib/crm";
import { tipologias } from "@/data/tipologias";
import { WHATSAPP_PHONE } from "@/data/surroundings";
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

type SharedPayload = {
  client_name: string;
  shared_at: string;
  units: SharedUnit[];
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

/* ------------------------- Fluxo de pagamento proposto ------------------------- */

// INCC-M demo: 0,45% a.m. — mesma taxa usada nos contratos do sistema (contractStatement).
// O índice oficial vigente será aplicado no contrato definitivo.
const INCC_M_DEMO_MONTHLY = 0.0045;

const pad3 = (v: number) => String(v).padStart(3, "0");

function parseISODateLocal(iso: string): Date {
  const s = iso.length > 10 ? iso.slice(0, 10) : iso;
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}
function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function fmtDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}
/** Adiciona meses preservando o dia; se o mês alvo não tiver o dia, usa o último dia do mês. */
function addMonthsSafe(base: Date, months: number): Date {
  const targetY = base.getFullYear();
  const targetIdx = base.getMonth() + months;
  const y = targetY + Math.floor(targetIdx / 12);
  const m = ((targetIdx % 12) + 12) % 12;
  const lastDay = new Date(y, m + 1, 0).getDate();
  return new Date(y, m, Math.min(base.getDate(), lastDay));
}

type FlowKind = "sinal" | "mensal" | "intermediaria" | "chaves" | "unico";
type FlowRow = {
  parcela: number;
  seq: string;
  kind: FlowKind;
  dueDate: string; // ISO
  contractual: number;
  correctedNow: number;
  monthsFromProposal: number;
};

function correctedByINCC(contractual: number, months: number): number {
  if (months <= 0) return contractual;
  return contractual * Math.pow(1 + INCC_M_DEMO_MONTHLY, months);
}

function buildProposalFlow(p: SharedProposal, proposalDateISO: string): FlowRow[] {
  const rows: FlowRow[] = [];

  if (p.payment_method === "a_vista") {
    const value = n(p.final_price_brl);
    rows.push({
      parcela: 1,
      seq: "001/001-S",
      kind: "unico",
      dueDate: proposalDateISO,
      contractual: value,
      correctedNow: value,
      monthsFromProposal: 0,
    });
    return rows;
  }

  const base = parseISODateLocal(proposalDateISO);
  let parcela = 0;

  if (n(p.down_payment_brl) > 0) {
    parcela++;
    const v = n(p.down_payment_brl);
    rows.push({
      parcela,
      seq: "001/001-S",
      kind: "sinal",
      dueDate: toISODate(base),
      contractual: v,
      correctedNow: v,
      monthsFromProposal: 0,
    });
  }

  const N = Math.max(0, p.monthly_count | 0);
  const B = Math.max(0, p.balloon_count | 0);
  let balloonIdx = 0;

  for (let i = 1; i <= N; i++) {
    parcela++;
    const due = addMonthsSafe(base, i);
    const v = n(p.monthly_brl);
    rows.push({
      parcela,
      seq: `${pad3(i)}/${pad3(N)}-M`,
      kind: "mensal",
      dueDate: toISODate(due),
      contractual: v,
      correctedNow: correctedByINCC(v, i),
      monthsFromProposal: i,
    });
    if (B > 0 && i % 6 === 0 && balloonIdx < B) {
      balloonIdx++;
      parcela++;
      const vb = n(p.balloon_brl);
      rows.push({
        parcela,
        seq: `${pad3(balloonIdx)}/${pad3(B)}-I`,
        kind: "intermediaria",
        dueDate: toISODate(due),
        contractual: vb,
        correctedNow: correctedByINCC(vb, i),
        monthsFromProposal: i,
      });
    }
  }

  if (n(p.keys_brl) > 0) {
    parcela++;
    const keysM = N + 1;
    const due = addMonthsSafe(base, keysM);
    const v = n(p.keys_brl);
    rows.push({
      parcela,
      seq: "001/001-C",
      kind: "chaves",
      dueDate: toISODate(due),
      contractual: v,
      correctedNow: correctedByINCC(v, keysM),
      monthsFromProposal: keysM,
    });
  }

  return rows;
}

const FLOW_KIND_LABEL: Record<FlowKind, string> = {
  sinal: "Ato / sinal",
  mensal: "Mensal",
  intermediaria: "Intermediária",
  chaves: "Chaves",
  unico: "Pagamento único",
};

function proposalDateISO(p: SharedProposal): string {
  const s = p.updated_at;
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return s.slice(0, 10);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function PaymentFlowBlock({
  u,
  p,
  clientName,
}: {
  u: SharedUnit;
  p: SharedProposal;
  clientName: string;
}) {
  const propISO = proposalDateISO(p);
  const rows = useMemo(() => buildProposalFlow(p, propISO), [p, propISO]);
  const totalContractual = rows.reduce((s, r) => s + r.contractual, 0);
  const totalCorrected = rows.reduce((s, r) => s + r.correctedNow, 0);
  const listPrice = n(u.price_brl);
  const finalPrice = n(p.final_price_brl);
  const savings = Math.max(0, listPrice - finalPrice);
  const discountPct = listPrice > 0 ? (savings / listPrice) * 100 : 0;
  const isAVista = p.payment_method === "a_vista";
  const keysValue = n(p.keys_brl);
  const matches = Math.abs(totalContractual - finalPrice) < 0.05;

  const discountLabel =
    savings > 0
      ? `${formatBRL2(savings)} (${discountPct.toLocaleString("pt-BR", {
          maximumFractionDigits: 2,
        })}%)`
      : "—";

  const chavesLabel = isAVista ? "—" : keysValue > 0 ? formatBRL2(keysValue) : "—";

  const propDateBR = fmtDate(propISO);
  const validityBR = p.valid_until ? fmtDate(p.valid_until.slice(0, 10)) : null;

  const metaParts: Array<{ label: string; value: string }> = [
    { label: "Cliente", value: clientName },
  ];
  if (u.block) metaParts.push({ label: "Bloco", value: u.block });
  metaParts.push({ label: "Unidade", value: u.code });
  metaParts.push({ label: "Proposta", value: propDateBR });

  return (
    <article className="rounded-lg border border-border/60 bg-background overflow-hidden print:break-inside-avoid">
      <div className="p-4 md:p-6 border-b border-border/50 grid gap-5 md:grid-cols-[minmax(0,1fr)_auto] md:items-start">
        <div className="min-w-0">
          <p className="eyebrow text-[10px] mb-2">Proposta comercial</p>
          <div className="flex flex-wrap gap-x-4 gap-y-1.5">
            {metaParts.map((m) => (
              <div key={m.label} className="min-w-0">
                <span className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground mr-1.5">
                  {m.label}
                </span>
                <span className="text-sm text-foreground tabular-nums">{m.value}</span>
              </div>
            ))}
          </div>
          {validityBR && (
            <p className="mt-2 text-[11px] text-muted-foreground">
              Validade da proposta:{" "}
              <span className="text-foreground tabular-nums">{validityBR}</span>
            </p>
          )}
        </div>
        <dl className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-3 md:min-w-[520px]">
          <div>
            <dt className="text-[10px] uppercase tracking-wider text-muted-foreground">Valor de tabela</dt>
            <dd className="mt-0.5 text-sm text-muted-foreground tabular-nums line-through">
              {formatBRL2(listPrice)}
            </dd>
          </div>
          <div>
            <dt className="text-[10px] uppercase tracking-wider text-muted-foreground">Desconto</dt>
            <dd className="mt-0.5 text-sm text-foreground tabular-nums">{discountLabel}</dd>
          </div>
          <div>
            <dt className="text-[10px] uppercase tracking-wider text-muted-foreground">Valor da proposta</dt>
            <dd className="mt-0.5 font-display text-lg md:text-xl text-accent tabular-nums">
              {formatBRL2(finalPrice)}
            </dd>
          </div>
          <div>
            <dt className="text-[10px] uppercase tracking-wider text-muted-foreground">Valor a financiar (chaves)</dt>
            <dd className="mt-0.5 text-sm text-foreground tabular-nums">{chavesLabel}</dd>
          </div>
        </dl>
      </div>

      <div className="p-4 md:p-6">
        <div className="overflow-x-auto rounded-md border border-border/60">
          <table className="w-full text-xs tabular-nums">
            <thead className="text-[10px] uppercase tracking-wider text-muted-foreground bg-muted/40">
              <tr>
                <th className="text-left font-medium px-2.5 py-2 w-16">Parcela</th>
                <th className="text-left font-medium px-2.5 py-2 w-28">Sequência</th>
                <th className="text-left font-medium px-2.5 py-2 whitespace-nowrap">Data vencimento</th>
                <th className="text-right font-medium px-2.5 py-2">Valor contratual</th>
                <th className="text-right font-medium px-2.5 py-2 whitespace-nowrap">
                  Valor corrigido (projetado)
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, idx) => (
                <tr
                  key={`${r.seq}-${idx}`}
                  className={`border-t border-border/40 align-top ${
                    idx % 2 === 1 ? "bg-muted/20" : ""
                  }`}
                >
                  <td className="px-2.5 py-2 text-muted-foreground">{r.parcela}</td>
                  <td className="px-2.5 py-2">
                    <div className="font-mono text-foreground">{r.seq}</div>
                    <div className="text-[10px] text-muted-foreground">
                      {FLOW_KIND_LABEL[r.kind]}
                    </div>
                  </td>
                  <td className="px-2.5 py-2 whitespace-nowrap">{fmtDate(r.dueDate)}</td>
                  <td className="px-2.5 py-2 text-right">{formatBRL2(r.contractual)}</td>
                  <td className="px-2.5 py-2 text-right text-foreground">
                    {formatBRL2(r.correctedNow)}
                  </td>
                </tr>
              ))}
              <tr className="border-t-2 border-border/60 bg-muted/40 font-semibold">
                <td className="px-2.5 py-2.5" colSpan={3}>
                  Total
                </td>
                <td className="px-2.5 py-2.5 text-right tabular-nums">
                  {formatBRL2(totalContractual)}
                </td>
                <td className="px-2.5 py-2.5 text-right tabular-nums text-accent">
                  {formatBRL2(totalCorrected)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {matches ? (
          <p className="mt-3 text-[11px] text-emerald-700 dark:text-emerald-400">
            Total contratual confere com o valor da proposta ✓
          </p>
        ) : (
          <div className="mt-3 flex items-start gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 p-2.5 text-[11px] text-amber-900 dark:text-amber-200">
            <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
            <span>
              Divergência entre a soma das parcelas contratuais ({formatBRL2(totalContractual)}) e o
              valor da proposta ({formatBRL2(finalPrice)}). Confirme com o time comercial.
            </span>
          </div>
        )}

        {p.payment_method === "financiamento" && keysValue > 0 && (
          <p className="mt-2 text-[11px] text-muted-foreground italic">
            Chaves — previsão de entrega alinhada ao plano proposto. O saldo nas chaves é liquidado
            via financiamento bancário (repasse).
          </p>
        )}
      </div>
    </article>
  );
}

function PaymentFlowSection({ units, clientName }: { units: SharedUnit[]; clientName: string }) {
  const blocks = units
    .map((u) => ({ u, p: bestProposal(u) }))
    .filter((x): x is { u: SharedUnit; p: SharedProposal } => !!x.p);
  if (blocks.length === 0) return null;

  const totalContractual = blocks.reduce(
    (s, { u, p }) => s + buildProposalFlow(p, proposalDateISO(p)).reduce((a, r) => a + r.contractual, 0) * 0 + // placeholder to satisfy lint on unused u
      buildProposalFlow(p, proposalDateISO(p)).reduce((a, r) => a + r.contractual, 0),
    0,
  );
  const totalCorrected = blocks.reduce(
    (s, { p }) =>
      s + buildProposalFlow(p, proposalDateISO(p)).reduce((a, r) => a + r.correctedNow, 0),
    0,
  );

  return (
    <section className="border-t border-border/40 bg-muted/25 print:break-before-page">
      <div className="max-w-6xl mx-auto px-5 md:px-8 py-12 md:py-16">
        <p className="eyebrow mb-3">
          <CalendarClock className="inline h-3 w-3 mr-1.5 -mt-0.5" />
          Proposta de fluxo de pagamento
        </p>
        <h2 className="font-display text-2xl md:text-3xl font-medium text-foreground tracking-tight max-w-3xl">
          Fluxo de pagamento proposto
        </h2>
        <p className="mt-2 text-sm text-muted-foreground max-w-3xl">
          Parcelas futuras projetadas pelo INCC-M (demo) de 0,45% a.m. — o índice oficial vigente
          será aplicado no contrato.
        </p>
        <p className="sr-only">Cliente: {clientName}</p>

        <div className="mt-8 space-y-5">
          {blocks.map(({ u, p }) => (
            <PaymentFlowBlock key={`${u.code}-${p.updated_at}`} u={u} p={p} />
          ))}
        </div>

        {blocks.length > 1 && (
          <div className="mt-5 rounded-md border border-border/60 bg-background overflow-hidden">
            <table className="w-full text-xs tabular-nums">
              <tbody>
                <tr className="bg-muted/40 font-semibold">
                  <td className="px-3 py-2.5 text-[11px] uppercase tracking-wider">
                    Total geral · {blocks.length} unidades
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground mr-2">
                      Contratual
                    </span>
                    {formatBRL2(totalContractual)}
                  </td>
                  <td className="px-3 py-2.5 text-right text-accent">
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground mr-2">
                      Corrigido (projetado)
                    </span>
                    {formatBRL2(totalCorrected)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        <p className="mt-4 text-[11px] italic text-muted-foreground max-w-3xl">
          Projeção ilustrativa: as parcelas futuras estão corrigidas pela projeção do INCC-M (demo)
          de 0,45% a.m. a partir da data da proposta. O índice oficial, as datas e o cronograma
          definitivo serão os do contrato. Documento de demonstração — dados fictícios.
        </p>
      </div>
    </section>
  );
}

/* --------------------------- Financing simulator --------------------------- */

type FinanceableOption = {
  id: string; // unit code + updated_at
  unitCode: string;
  finalPrice: number;
  keysBrl: number;
  paidUntilKeys: number; // final - keys
  proposalUpdatedAt: string;
  isPrimaryUnit: boolean;
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

function ProposalPage({ data }: { data: SharedPayload }) {
  const units = useMemo(
    () => [...data.units].sort((a, b) => (a.is_primary === b.is_primary ? 0 : a.is_primary ? -1 : 1)),
    [data.units],
  );




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

  // --- Simulação de financiamento (reutiliza engine/UI de /ferramentas) ---
  const financeableOptions = useMemo(() => financeableOptionsFrom(units), [units]);
  const hasFinanceable = financeableOptions.length > 0;
  const [simOpen, setSimOpen] = useState(false);
  const [simUnitId, setSimUnitId] = useState<string>(
    financeableOptions[0]?.id ?? "",
  );
  const [committedUnitCode, setCommittedUnitCode] = useState<string | null>(null);
  const simSectionRef = useRef<HTMLElement>(null);

  const initialFormFor = (opt?: FinanceableOption): SimulatorInitialForm =>
    opt
      ? {
          propertyValue: opt.finalPrice,
          downOverride: opt.paidUntilKeys,
        }
      : {};

  const currentOption = useMemo(
    () =>
      financeableOptions.find((o) => o.id === simUnitId) ??
      financeableOptions[0],
    [financeableOptions, simUnitId],
  );

  const simCtl = useFinancingSimulatorController({
    persist: false,
    initialForm: initialFormFor(financeableOptions[0]),
    onGenerated: () => {
      const opt = financeableOptions.find((o) => o.id === simUnitId) ?? financeableOptions[0];
      setCommittedUnitCode(opt?.unitCode ?? null);
      setSimOpen(false);
      requestAnimationFrame(() => {
        simSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    },
    onReset: () => setCommittedUnitCode(null),
  });

  const handleSelectSimUnit = (id: string) => {
    setSimUnitId(id);
    const opt = financeableOptions.find((o) => o.id === id);
    simCtl.applyForm(initialFormFor(opt));
  };

  const openSimDialog = () => {
    if (!hasFinanceable) return;
    if (!simUnitId && financeableOptions[0]) {
      setSimUnitId(financeableOptions[0].id);
      simCtl.applyForm(initialFormFor(financeableOptions[0]));
    }
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

      <PaymentFlowSection units={units} clientName={data.client_name} />

      {simCtl.snapshot && committedUnitCode && (
        <section
          ref={simSectionRef}
          className="border-t border-border/40 bg-background print:break-before-page"
        >
          <div className="max-w-6xl mx-auto px-5 md:px-8 py-12 md:py-16">
            <div className="flex items-start justify-between gap-3 flex-wrap mb-8">
              <div>
                <p className="eyebrow mb-3">
                  <Calculator className="inline h-3 w-3 mr-1.5 -mt-0.5" />
                  Simulação de financiamento
                </p>
                <h2 className="font-display text-2xl md:text-3xl font-medium text-foreground tracking-tight">
                  Unidade {committedUnitCode} · financiando{" "}
                  {formatBRL2(
                    Math.max(
                      simCtl.snapshot.propertyValue - simCtl.snapshot.downPayment,
                      0,
                    ),
                  )}{" "}
                  em {simCtl.snapshot.termMonths} meses
                </h2>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSimOpen(true)}
                className="print:hidden"
              >
                <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                Refazer simulação
              </Button>
            </div>
            <FinancingSimulatorResults
              ctl={simCtl}
              showEmpty={false}
              showCopyLink={false}
              showResetButton={false}
            />
          </div>
        </section>
      )}

      {hasFinanceable && (
        <Dialog open={simOpen} onOpenChange={setSimOpen}>
          <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="font-display text-2xl">
                Simular financiamento
              </DialogTitle>
              <DialogDescription>
                Mesma calculadora da aba Ferramentas, pré-preenchida com os valores
                desta proposta. Ajuste o que precisar e gere a simulação.
              </DialogDescription>
            </DialogHeader>
            {financeableOptions.length > 1 && (
              <div className="space-y-1.5 mb-2">
                <Label htmlFor="sim-unit-select" className="text-xs">
                  Unidade
                </Label>
                <Select value={simUnitId} onValueChange={handleSelectSimUnit}>
                  <SelectTrigger id="sim-unit-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {financeableOptions.map((o) => (
                      <SelectItem key={o.id} value={o.id}>
                        Unidade {o.unitCode} · {formatBRL2(o.finalPrice)}
                        {o.isPrimaryUnit ? " · principal" : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-muted-foreground">
                  Trocar a unidade repreenche o formulário com os valores da proposta.
                </p>
              </div>
            )}
            <FinancingSimulatorForm ctl={simCtl} />
          </DialogContent>
        </Dialog>
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
