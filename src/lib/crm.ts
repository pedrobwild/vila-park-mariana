import type { Database } from "@/integrations/supabase/types";

export type CrmPerson = Database["public"]["Tables"]["crm_people"]["Row"];
export type CrmDeal = Database["public"]["Tables"]["crm_deals"]["Row"];
export type CrmDealUnit = Database["public"]["Tables"]["crm_deal_units"]["Row"];
export type CrmActivity = Database["public"]["Tables"]["crm_activities"]["Row"];
export type CrmStageRow = Database["public"]["Tables"]["crm_stages"]["Row"];
export type CrmProposal = Database["public"]["Tables"]["crm_proposals"]["Row"];
export type CrmSource = Database["public"]["Enums"]["crm_source"];
export type CrmInterest = Database["public"]["Enums"]["crm_interest_level"];
export type CrmActivityType = Database["public"]["Enums"]["crm_activity_type"];

export type CrmBroker = Database["public"]["Tables"]["crm_brokers"]["Row"];
export type CrmSettings = Database["public"]["Tables"]["crm_settings"]["Row"];
export type CrmLossReason = Database["public"]["Tables"]["crm_loss_reasons"]["Row"];
export type CrmTask = Database["public"]["Tables"]["crm_tasks"]["Row"];
export type CrmCreditCheck = Database["public"]["Tables"]["crm_credit_checks"]["Row"];
export type CrmCommission = Database["public"]["Tables"]["crm_commissions"]["Row"];
export type CrmCommissionSplit =
  Database["public"]["Tables"]["crm_commission_splits"]["Row"];
export type CrmTaskKind = Database["public"]["Enums"]["crm_task_kind"];
export type CrmCreditStatus = Database["public"]["Enums"]["crm_credit_status"];
export type CrmCommissionStatus = Database["public"]["Enums"]["crm_commission_status"];

export const TASK_KIND_LABEL: Record<CrmTaskKind, string> = {
  ligacao: "Ligação",
  whatsapp: "WhatsApp",
  email: "E-mail",
  visita: "Visita",
  documentacao: "Documentação",
  follow_up: "Follow-up",
  outro: "Outro",
};

export const TASK_KINDS: CrmTaskKind[] = [
  "ligacao",
  "whatsapp",
  "email",
  "visita",
  "documentacao",
  "follow_up",
  "outro",
];

export const CREDIT_STATUS_LABEL: Record<CrmCreditStatus, string> = {
  nao_iniciada: "Não iniciada",
  em_analise: "Em análise",
  aprovada: "Aprovada",
  aprovada_parcial: "Aprovada parcial",
  reprovada: "Reprovada",
};

export const CREDIT_STATUSES: CrmCreditStatus[] = [
  "nao_iniciada",
  "em_analise",
  "aprovada",
  "aprovada_parcial",
  "reprovada",
];

export function creditStatusClass(s: CrmCreditStatus): string {
  switch (s) {
    case "em_analise":
    case "aprovada_parcial":
      return "border-amber-600/40 text-amber-700 dark:text-amber-400 bg-amber-500/5";
    case "aprovada":
      return "border-emerald-600/40 text-emerald-700 dark:text-emerald-400 bg-emerald-500/5";
    case "reprovada":
      return "border-destructive/40 text-destructive bg-destructive/5";
    default:
      return "border-border/60 text-muted-foreground bg-muted/20";
  }
}

export const COMMISSION_STATUS_LABEL: Record<CrmCommissionStatus, string> = {
  prevista: "Prevista",
  a_pagar: "A pagar",
  paga: "Paga",
  cancelada: "Cancelada",
};

export const COMMISSION_STATUSES: CrmCommissionStatus[] = [
  "prevista",
  "a_pagar",
  "paga",
  "cancelada",
];

export function commissionStatusClass(s: CrmCommissionStatus): string {
  switch (s) {
    case "a_pagar":
      return "border-amber-600/40 text-amber-700 dark:text-amber-400 bg-amber-500/5";
    case "paga":
      return "border-emerald-600/40 text-emerald-700 dark:text-emerald-400 bg-emerald-500/5";
    case "cancelada":
      return "border-border/60 text-muted-foreground bg-muted/20 line-through";
    default:
      return "border-border/60 text-muted-foreground bg-muted/20";
  }
}

export function initials(name: string | null | undefined): string {
  if (!name) return "—";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "—";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** Date-only (YYYY-MM-DD) in pt-BR, without timezone drift. */
export function formatDateBR(d: string | null | undefined): string {
  if (!d) return "—";
  const iso = d.length > 10 ? d : `${d}T12:00:00`;
  const t = new Date(iso);
  return Number.isNaN(t.getTime()) ? "—" : t.toLocaleDateString("pt-BR");
}

export function todayISO(): string {
  const now = new Date();
  const off = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - off).toISOString().slice(0, 10);
}

export function addDaysISO(days: number): string {
  const now = new Date();
  now.setDate(now.getDate() + days);
  const off = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - off).toISOString().slice(0, 10);
}

/** Positive = overdue days; 0 = today; negative = future. */
export function daysOverdue(due: string | null | undefined): number | null {
  if (!due) return null;
  const t = new Date(`${due}T12:00:00`).getTime();
  if (Number.isNaN(t)) return null;
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  return Math.round((today.getTime() - t) / 86_400_000);
}

export function relativeDateBR(iso: string | null | undefined): string {
  if (!iso) return "nunca";
  const diff = Date.now() - new Date(iso).getTime();
  const d = Math.floor(diff / 86_400_000);
  if (d <= 0) return "hoje";
  if (d === 1) return "ontem";
  if (d < 30) return `há ${d} dias`;
  const m = Math.floor(d / 30);
  return m === 1 ? "há 1 mês" : `há ${m} meses`;
}


export type CrmProposalStatus = "rascunho" | "enviada" | "aceita" | "recusada";
export type CrmPaymentMethod = "financiamento" | "a_vista" | "direto";

export const PROPOSAL_STATUS_LABEL: Record<CrmProposalStatus, string> = {
  rascunho: "Rascunho",
  enviada: "Enviada",
  aceita: "Aceita",
  recusada: "Recusada",
};

export const PAYMENT_METHOD_LABEL: Record<CrmPaymentMethod, string> = {
  financiamento: "Financiamento bancário (repasse)",
  a_vista: "À vista",
  direto: "Direto com a incorporadora",
};

export const PAYMENT_METHOD_SHORT: Record<CrmPaymentMethod, string> = {
  financiamento: "repasse",
  a_vista: "à vista",
  direto: "direto",
};

export function proposalStatusClass(s: CrmProposalStatus | "expirada"): string {
  switch (s) {
    case "enviada":
      return "border-sky-600/40 text-sky-700 dark:text-sky-400 bg-sky-500/5";
    case "aceita":
      return "border-emerald-600/40 text-emerald-700 dark:text-emerald-400 bg-emerald-500/5";
    case "recusada":
      return "border-rose-600/40 text-rose-700 dark:text-rose-400 bg-rose-500/5";
    case "expirada":
      return "border-amber-600/40 text-amber-700 dark:text-amber-400 bg-amber-500/5";
    default:
      return "border-border/60 text-muted-foreground bg-muted/20";
  }
}

export function isProposalExpired(p: Pick<CrmProposal, "valid_until" | "status">): boolean {
  if (!p.valid_until) return false;
  if (p.status !== "rascunho" && p.status !== "enviada") return false;
  return new Date(p.valid_until + "T23:59:59").getTime() < Date.now();
}

export function formatBRL2(n: number): string {
  return (Number.isFinite(n) ? n : 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export type CrmStageKind = "aberto" | "ganho" | "perdido";

export const SOURCE_LABEL: Record<CrmSource, string> = {
  indicacao: "Indicação",
  portal: "Portal",
  plantao: "Plantão",
  instagram: "Instagram",
  site: "Site",
  outro: "Outro",
};

export const INTEREST_LABEL: Record<CrmInterest, string> = {
  alta: "Alta",
  media: "Média",
  baixa: "Baixa",
};

export const ACTIVITY_LABEL: Record<CrmActivityType, string> = {
  nota: "Nota",
  ligacao: "Ligação",
  email: "E-mail",
  whatsapp: "WhatsApp",
  visita: "Visita",
  mudanca_etapa: "Mudança de etapa",
};

export const SOURCES: CrmSource[] = [
  "indicacao",
  "portal",
  "plantao",
  "instagram",
  "site",
  "outro",
];

export function formatBRLCompact(n: number): string {
  if (!Number.isFinite(n) || n === 0) return "R$ 0";
  if (n >= 1_000_000) return `R$ ${(n / 1_000_000).toLocaleString("pt-BR", { maximumFractionDigits: 2 })} mi`;
  if (n >= 1_000) return `R$ ${(n / 1_000).toLocaleString("pt-BR", { maximumFractionDigits: 0 })} mil`;
  return `R$ ${n.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}`;
}

export function daysSince(iso: string): number {
  return Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000));
}

/**
 * Sort stages so that kind='ganho' and kind='perdido' are always the last two,
 * in that order. Open stages preserve their `position` ordering.
 */
export function sortStages(stages: CrmStageRow[]): CrmStageRow[] {
  const rank = (k: string) => (k === "ganho" ? 1 : k === "perdido" ? 2 : 0);
  return [...stages].sort((a, b) => {
    const ra = rank(a.kind);
    const rb = rank(b.kind);
    if (ra !== rb) return ra - rb;
    return a.position - b.position;
  });
}

export function stageBadgeClass(kind: string): string {
  if (kind === "ganho") return "border-emerald-600/40 text-emerald-700 dark:text-emerald-400 bg-emerald-500/5";
  if (kind === "perdido") return "border-rose-600/40 text-rose-700 dark:text-rose-400 bg-rose-500/5";
  return "";
}
