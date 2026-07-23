import type { Database } from "@/integrations/supabase/types";

export type CrmPerson = Database["public"]["Tables"]["crm_people"]["Row"];
export type CrmDeal = Database["public"]["Tables"]["crm_deals"]["Row"];
export type CrmDealUnit = Database["public"]["Tables"]["crm_deal_units"]["Row"];
export type CrmActivity = Database["public"]["Tables"]["crm_activities"]["Row"];
export type CrmStage = Database["public"]["Enums"]["crm_stage"];
export type CrmSource = Database["public"]["Enums"]["crm_source"];
export type CrmInterest = Database["public"]["Enums"]["crm_interest_level"];
export type CrmActivityType = Database["public"]["Enums"]["crm_activity_type"];

export const STAGE_ORDER: CrmStage[] = [
  "lead",
  "qualificado",
  "visita",
  "proposta",
  "reserva",
  "fechado",
  "perdido",
];

export const STAGE_LABEL: Record<CrmStage, string> = {
  lead: "Lead",
  qualificado: "Qualificado",
  visita: "Visita",
  proposta: "Proposta",
  reserva: "Reserva",
  fechado: "Fechado",
  perdido: "Perdido",
};

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
