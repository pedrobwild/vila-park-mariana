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
