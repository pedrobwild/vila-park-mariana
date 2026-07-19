/**
 * Fonte única de verdade para a base de taxas de instituições financeiras
 * usadas no comparativo do Simulador de Financiamento.
 *
 * ATUALIZAÇÃO: 19/07/2026 (consulta pública em canais oficiais e comparadores).
 * IMPORTANTE:
 *  - `annualRateType`: "efetiva" (padrão SBPE) ou "nominal" (padrão MCMV).
 *  - Toda comparação/ordenação usa a taxa efetiva a.a. equivalente.
 *  - Bancos sem taxa pública ficam com `annualRate: null` e situação
 *    "personalizada" ou "nao_localizada".
 */

export type RateLayer = "anunciada" | "simulada" | "media_bcb";
export type RateSituation =
  | "vigente_confirmada"
  | "publicada_sem_vigencia"
  | "personalizada"
  | "promocional"
  | "historica"
  | "nao_localizada";
export type RateConfidence = "alta" | "media" | "baixa";
export type RateType = "efetiva" | "nominal";
export type RateIndexer = "TR" | "IPCA" | "poupanca" | "fixa";
export type ModalityGroup = "TR" | "IPCA" | "poupanca" | "MCMV" | "PRO_COTISTA";

export interface InstitutionRate {
  id: string;
  bank: string;
  product: string;
  modality: ModalityGroup;
  /** Anual em % (ex.: 11.19). null quando não divulgada publicamente. */
  annualRate: number | null;
  annualRateType: RateType;
  indexer: RateIndexer;
  /** Componente extra estimado do indexador variável (ex.: TR≈0, poupança≈6.17). Só para nota educacional. */
  indexerFloatingPct?: number;
  layer: RateLayer;
  situation: RateSituation;
  confidence: RateConfidence;
  consultedAt: string; // ISO date
  maxLtvPct: number; // % financiável
  maxTermMonths: number;
  conditions: string; // texto curto
  note?: string; // observação/ressalva curta
}

export const INSTITUTION_RATES: InstitutionRate[] = [
  // ============ Caixa ============
  {
    id: "caixa-sbpe",
    bank: "Caixa",
    product: "SBPE + TR",
    modality: "TR",
    annualRate: 11.19,
    annualRateType: "efetiva",
    indexer: "TR",
    layer: "anunciada",
    situation: "publicada_sem_vigencia",
    confidence: "media",
    consultedAt: "2026-07-19",
    maxLtvPct: 80,
    maxTermMonths: 420,
    conditions: "Taxa 'a partir de' — depende de relacionamento e análise.",
  },
  {
    id: "caixa-mcmv",
    bank: "Caixa",
    product: "MCMV Classe Média",
    modality: "MCMV",
    annualRate: 10.0,
    annualRateType: "nominal",
    indexer: "TR",
    layer: "anunciada",
    situation: "vigente_confirmada",
    confidence: "alta",
    consultedAt: "2026-07-19",
    maxLtvPct: 90,
    maxTermMonths: 420,
    conditions: "Imóvel ≤ R$ 600 mil, renda familiar ≤ R$ 13 mil, entrada ≥ 20%.",
  },

  // ============ Banco do Brasil ============
  {
    id: "bb-mcmv",
    bank: "Banco do Brasil",
    product: "MCMV Classe Média",
    modality: "MCMV",
    annualRate: 10.0,
    annualRateType: "nominal",
    indexer: "TR",
    layer: "anunciada",
    situation: "vigente_confirmada",
    confidence: "alta",
    consultedAt: "2026-07-19",
    maxLtvPct: 90,
    maxTermMonths: 420,
    conditions: "Composição até 3 rendas. ITBI/cartório podem entrar no financiamento (análise).",
  },
  {
    id: "bb-sbpe",
    bank: "Banco do Brasil",
    product: "SBPE + TR",
    modality: "TR",
    annualRate: null,
    annualRateType: "efetiva",
    indexer: "TR",
    layer: "simulada",
    situation: "personalizada",
    confidence: "media",
    consultedAt: "2026-07-19",
    maxLtvPct: 80,
    maxTermMonths: 420,
    conditions: "Taxa não divulgada publicamente. Necessária simulação individual.",
  },

  // ============ Itaú ============
  {
    id: "itau-sbpe",
    bank: "Itaú",
    product: "SBPE + TR",
    modality: "TR",
    annualRate: 11.6,
    annualRateType: "efetiva",
    indexer: "TR",
    layer: "anunciada",
    situation: "publicada_sem_vigencia",
    confidence: "media",
    consultedAt: "2026-07-19",
    maxLtvPct: 80,
    maxTermMonths: 420,
    conditions: "Taxa 'a partir de'. Segmento Personnalité 11,70% e Uniclass 11,90%.",
    note: "Divergência entre páginas oficiais (11,70% vs 13,69%); valide no simulador do banco.",
  },
  {
    id: "itau-poupanca",
    bank: "Itaú",
    product: "Poupança + juros",
    modality: "poupanca",
    annualRate: 8.32,
    annualRateType: "efetiva",
    indexer: "poupanca",
    indexerFloatingPct: 6.17,
    layer: "anunciada",
    situation: "publicada_sem_vigencia",
    confidence: "media",
    consultedAt: "2026-07-19",
    maxLtvPct: 80,
    maxTermMonths: 420,
    conditions: "Componente variável limitado a 6,17% a.a.",
  },

  // ============ Santander ============
  {
    id: "santander-sbpe",
    bank: "Santander",
    product: "SBPE + TR",
    modality: "TR",
    annualRate: 11.69,
    annualRateType: "efetiva",
    indexer: "TR",
    layer: "anunciada",
    situation: "publicada_sem_vigencia",
    confidence: "media",
    consultedAt: "2026-07-19",
    maxLtvPct: 80,
    maxTermMonths: 420,
    conditions: "Taxa divulgada em comparadores; a taxa oficial vem da simulação personalizada.",
  },

  // ============ Bradesco ============
  {
    id: "bradesco-sbpe",
    bank: "Bradesco",
    product: "SBPE + TR",
    modality: "TR",
    annualRate: 11.7,
    annualRateType: "efetiva",
    indexer: "TR",
    layer: "anunciada",
    situation: "publicada_sem_vigencia",
    confidence: "media",
    consultedAt: "2026-07-19",
    maxLtvPct: 80,
    maxTermMonths: 420,
    conditions: "Taxa-padrão do simulador; a condição final vem da negociação com o gerente.",
  },

  // ============ Banco Inter ============
  {
    id: "inter-ipca",
    bank: "Banco Inter",
    product: "Residencial + IPCA",
    modality: "IPCA",
    annualRate: 9.99,
    annualRateType: "efetiva",
    indexer: "IPCA",
    layer: "anunciada",
    situation: "publicada_sem_vigencia",
    confidence: "media",
    consultedAt: "2026-07-19",
    maxLtvPct: 80,
    maxTermMonths: 420,
    conditions: "Parcela e saldo variam com o IPCA.",
  },
  {
    id: "inter-tr-promo",
    bank: "Banco Inter",
    product: "Bonificada + TR",
    modality: "TR",
    annualRate: 9.4,
    annualRateType: "efetiva",
    indexer: "TR",
    layer: "anunciada",
    situation: "promocional",
    confidence: "media",
    consultedAt: "2026-07-19",
    maxLtvPct: 80,
    maxTermMonths: 420,
    conditions: "Campanha promocional — confirmar vigência.",
  },
  {
    id: "inter-procotista",
    bank: "Banco Inter",
    product: "Pró-Cotista FGTS + TR",
    modality: "PRO_COTISTA",
    annualRate: 9.0,
    annualRateType: "efetiva",
    indexer: "TR",
    layer: "anunciada",
    situation: "publicada_sem_vigencia",
    confidence: "media",
    consultedAt: "2026-07-19",
    maxLtvPct: 80,
    maxTermMonths: 420,
    conditions: "Renda familiar ≤ R$ 12 mil (usado); 3+ anos de FGTS; sem imóvel/financiamento SFH.",
  },

  // ============ Sicoob ============
  {
    id: "sicoob-sbpe",
    bank: "Sicoob",
    product: "Habitacional cooperativo",
    modality: "TR",
    annualRate: null,
    annualRateType: "efetiva",
    indexer: "TR",
    layer: "simulada",
    situation: "nao_localizada",
    confidence: "baixa",
    consultedAt: "2026-07-19",
    maxLtvPct: 90,
    maxTermMonths: 420,
    conditions:
      "Taxa varia por cooperativa. Financia ITBI/cartório (análise) e compõe até 3 rendas sem vínculo familiar.",
    note: "Taxa não divulgada publicamente. Necessária simulação individual.",
  },
  // ============ Sicredi ============
  {
    id: "sicredi-sbpe",
    bank: "Sicredi",
    product: "Habitacional cooperativo",
    modality: "TR",
    annualRate: null,
    annualRateType: "efetiva",
    indexer: "TR",
    layer: "simulada",
    situation: "nao_localizada",
    confidence: "baixa",
    consultedAt: "2026-07-19",
    maxLtvPct: 90,
    maxTermMonths: 420,
    conditions: "Taxa varia por cooperativa.",
    note: "Taxa não divulgada publicamente. Necessária simulação individual.",
  },

  // ============ Banrisul ============
  {
    id: "banrisul-sfh",
    bank: "Banrisul",
    product: "SFH + TR",
    modality: "TR",
    annualRate: null,
    annualRateType: "efetiva",
    indexer: "TR",
    layer: "simulada",
    situation: "personalizada",
    confidence: "media",
    consultedAt: "2026-07-19",
    maxLtvPct: 90,
    maxTermMonths: 420,
    conditions: "Imóvel até R$ 2,25 mi. Regra idade + prazo ≤ 80 anos.",
    note: "Taxa por simulação personalizada.",
  },

  // ============ BRB ============
  {
    id: "brb-sfh",
    bank: "BRB",
    product: "Habitacional + TR",
    modality: "TR",
    annualRate: null,
    annualRateType: "efetiva",
    indexer: "TR",
    layer: "simulada",
    situation: "personalizada",
    confidence: "media",
    consultedAt: "2026-07-19",
    maxLtvPct: 90,
    maxTermMonths: 420,
    conditions: "Financia ITBI/cartório em algumas modalidades. Taxa por simulação personalizada.",
  },
];

export const MODALITY_LABEL: Record<ModalityGroup, string> = {
  TR: "SBPE + TR",
  IPCA: "SBPE + IPCA",
  poupanca: "SBPE + Poupança",
  MCMV: "MCMV",
  PRO_COTISTA: "Pró-Cotista FGTS",
};

export const SITUATION_LABEL: Record<RateSituation, string> = {
  vigente_confirmada: "Vigente confirmada",
  publicada_sem_vigencia: "Publicada",
  personalizada: "Personalizada (simulação)",
  promocional: "Promocional",
  historica: "Histórica",
  nao_localizada: "Não localizada",
};

/** Cor discreta do badge por situação (tokens semânticos). */
export function situationBadgeClass(s: RateSituation): string {
  switch (s) {
    case "vigente_confirmada":
      return "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border-emerald-600/40";
    case "promocional":
    case "publicada_sem_vigencia":
      return "bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-600/40";
    case "personalizada":
    case "nao_localizada":
    case "historica":
    default:
      return "bg-muted text-muted-foreground border-border";
  }
}

/** Nível numérico de previsibilidade (maior = mais previsível). */
export const PREDICTABILITY_RANK: Record<RateIndexer, number> = {
  fixa: 4,
  TR: 3,
  poupanca: 2,
  IPCA: 1,
};
