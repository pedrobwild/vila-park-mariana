import type { Database } from "@/integrations/supabase/types";

export type CrmPerson = Database["public"]["Tables"]["crm_people"]["Row"];
export type CrmDeal = Database["public"]["Tables"]["crm_deals"]["Row"];
export type CrmDealUnit = Database["public"]["Tables"]["crm_deal_units"]["Row"];
export type CrmActivity = Database["public"]["Tables"]["crm_activities"]["Row"];
export type CrmStageRow = Database["public"]["Tables"]["crm_stages"]["Row"];
export type CrmSource = Database["public"]["Enums"]["crm_source"];
export type CrmInterest = Database["public"]["Enums"]["crm_interest_level"];
export type CrmActivityType = Database["public"]["Enums"]["crm_activity_type"];

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
