/**
 * Base de taxas de instituições financeiras para financiamento imobiliário.
 * Data de referência: 19/07/2026. Fonte: consulta pública nas páginas dos bancos,
 * simuladores oficiais e comparadores. Ver campos `situation` e `note` para nuances.
 *
 * IMPORTANTE: taxas "efetiva" a.a. convertem para mensal via (1+i)^(1/12)-1.
 * Taxas "nominal" a.a. convertem via nominal/12 (regra brasileira). Toda ordenação
 * e comparação deve usar a taxa efetiva a.a. equivalente.
 */

export type RateLayer = "anunciada" | "simulada" | "media_bcb";
export type RateSituation =
  | "vigente_confirmada"
  | "publicada_sem_vigencia"
  | "personalizada"
  | "promocional"
  | "historica"
  | "nao_localizada";
export type Confidence = "alta" | "media" | "baixa";
export type RateType = "efetiva" | "nominal";
export type Indexer = "TR" | "IPCA" | "poupanca" | "fixa";
export type ModalityGroup = "TR" | "IPCA" | "poupanca" | "MCMV" | "PRO_COTISTA";

export interface InstitutionRate {
  id: string;
  bank: string;
  product: string;
  modality: ModalityGroup;
  /** Taxa anunciada. `null` quando não localizada / apenas via simulação individual. */
  annualRate: number | null;
  annualRateType: RateType;
  indexer: Indexer;
  layer: RateLayer;
  situation: RateSituation;
  confidence: Confidence;
  consultedAt: string; // ISO
  conditions: string;
  note?: string;
  maxLtvPct: number;
  maxTermMonths: number;
}

export const INSTITUTION_RATES: InstitutionRate[] = [
  // ============ + TR ============
  {
    id: "caixa-sbpe",
    bank: "Caixa",
    product: "SBPE Poupança-Caixa",
    modality: "TR",
    annualRate: 11.19,
    annualRateType: "efetiva",
    indexer: "TR",
    layer: "anunciada",
    situation: "publicada_sem_vigencia",
    confidence: "media",
    consultedAt: "2026-07-19",
    conditions: "'A partir de' 11,19% a.a. + TR. Depende de relacionamento e análise.",
    maxLtvPct: 80,
    maxTermMonths: 420,
  },
  {
    id: "itau-sbpe",
    bank: "Itaú",
    product: "SBPE",
    modality: "TR",
    annualRate: 11.6,
    annualRateType: "efetiva",
    indexer: "TR",
    layer: "anunciada",
    situation: "publicada_sem_vigencia",
    confidence: "media",
    consultedAt: "2026-07-19",
    conditions: "'A partir de' 11,60% a.a. + TR. Personnalité 11,70%, Uniclass 11,90%.",
    note: "Condição depende do segmento; valide no simulador oficial.",
    maxLtvPct: 80,
    maxTermMonths: 420,
  },
  {
    id: "santander-sbpe",
    bank: "Santander",
    product: "SBPE",
    modality: "TR",
    annualRate: 11.69,
    annualRateType: "efetiva",
    indexer: "TR",
    layer: "anunciada",
    situation: "publicada_sem_vigencia",
    confidence: "media",
    consultedAt: "2026-07-19",
    conditions: "Divulgada via comparadores. Oficial só via simulação individual.",
    maxLtvPct: 80,
    maxTermMonths: 420,
  },
  {
    id: "bradesco-sbpe",
    bank: "Bradesco",
    product: "SBPE",
    modality: "TR",
    annualRate: 11.7,
    annualRateType: "efetiva",
    indexer: "TR",
    layer: "anunciada",
    situation: "publicada_sem_vigencia",
    confidence: "media",
    consultedAt: "2026-07-19",
    conditions: "Taxa-padrão do simulador; sujeita a negociação com o gerente.",
    maxLtvPct: 80,
    maxTermMonths: 420,
  },
  {
    id: "inter-bonificada",
    bank: "Banco Inter",
    product: "SBPE Bonificada",
    modality: "TR",
    annualRate: 9.4,
    annualRateType: "efetiva",
    indexer: "TR",
    layer: "anunciada",
    situation: "promocional",
    confidence: "media",
    consultedAt: "2026-07-19",
    conditions: "Campanha bonificada — confirmar vigência.",
    note: "Confirmar campanha antes de simular.",
    maxLtvPct: 80,
    maxTermMonths: 420,
  },
  {
    id: "bb-sbpe",
    bank: "Banco do Brasil",
    product: "SBPE",
    modality: "TR",
    annualRate: null,
    annualRateType: "efetiva",
    indexer: "TR",
    layer: "simulada",
    situation: "personalizada",
    confidence: "baixa",
    consultedAt: "2026-07-19",
    conditions: "Taxa personalizada por análise. Pode incluir ITBI/cartório no financiamento.",
    maxLtvPct: 80,
    maxTermMonths: 420,
  },
  {
    id: "banrisul-sbpe",
    bank: "Banrisul",
    product: "SFH",
    modality: "TR",
    annualRate: null,
    annualRateType: "efetiva",
    indexer: "TR",
    layer: "simulada",
    situation: "personalizada",
    confidence: "baixa",
    consultedAt: "2026-07-19",
    conditions: "Simulador oficial. SFH até imóvel R$ 2,25 mi; regra idade+prazo ≤ 80 anos.",
    maxLtvPct: 90,
    maxTermMonths: 420,
  },
  {
    id: "brb-sbpe",
    bank: "BRB",
    product: "SBPE",
    modality: "TR",
    annualRate: null,
    annualRateType: "efetiva",
    indexer: "TR",
    layer: "simulada",
    situation: "personalizada",
    confidence: "baixa",
    consultedAt: "2026-07-19",
    conditions: "Taxa via simulação; pode financiar ITBI/cartório em algumas modalidades.",
    maxLtvPct: 90,
    maxTermMonths: 420,
  },
  {
    id: "sicoob-sbpe",
    bank: "Sicoob",
    product: "SBPE",
    modality: "TR",
    annualRate: null,
    annualRateType: "efetiva",
    indexer: "TR",
    layer: "simulada",
    situation: "nao_localizada",
    confidence: "baixa",
    consultedAt: "2026-07-19",
    conditions:
      "Taxa não divulgada publicamente (varia por cooperativa). Necessária simulação individual. Financia ITBI+cartório conforme análise.",
    maxLtvPct: 90,
    maxTermMonths: 420,
  },
  {
    id: "sicredi-sbpe",
    bank: "Sicredi",
    product: "SBPE",
    modality: "TR",
    annualRate: null,
    annualRateType: "efetiva",
    indexer: "TR",
    layer: "simulada",
    situation: "nao_localizada",
    confidence: "baixa",
    consultedAt: "2026-07-19",
    conditions: "Taxa não divulgada publicamente (varia por cooperativa). Necessária simulação individual.",
    maxLtvPct: 90,
    maxTermMonths: 420,
  },

  // ============ MCMV ============
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
    conditions: "Imóvel ≤ R$ 600 mil, renda familiar ≤ R$ 13 mil, até 420m, entrada ≥ 20%.",
    maxLtvPct: 90,
    maxTermMonths: 420,
  },
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
    conditions: "Composição de até 3 rendas. Mesmos limites de imóvel e renda do MCMV Classe Média.",
    maxLtvPct: 90,
    maxTermMonths: 420,
  },

  // ============ Pró-Cotista ============
  {
    id: "inter-procotista",
    bank: "Banco Inter",
    product: "Pró-Cotista FGTS",
    modality: "PRO_COTISTA",
    annualRate: 9.0,
    annualRateType: "efetiva",
    indexer: "TR",
    layer: "anunciada",
    situation: "publicada_sem_vigencia",
    confidence: "media",
    consultedAt: "2026-07-19",
    conditions: "3+ anos de FGTS, sem imóvel/financiamento SFH. Renda familiar até R$ 12 mil (usado).",
    maxLtvPct: 80,
    maxTermMonths: 420,
  },

  // ============ IPCA ============
  {
    id: "inter-ipca",
    bank: "Banco Inter",
    product: "Residencial IPCA",
    modality: "IPCA",
    annualRate: 9.99,
    annualRateType: "efetiva",
    indexer: "IPCA",
    layer: "anunciada",
    situation: "publicada_sem_vigencia",
    confidence: "media",
    consultedAt: "2026-07-19",
    conditions: "9,99% a.a. + IPCA; parcela e saldo corrigidos pela inflação.",
    maxLtvPct: 80,
    maxTermMonths: 420,
  },

  // ============ Poupança ============
  {
    id: "itau-poupanca",
    bank: "Itaú",
    product: "Linha Poupança",
    modality: "poupanca",
    annualRate: 8.32,
    annualRateType: "efetiva",
    indexer: "poupanca",
    layer: "anunciada",
    situation: "publicada_sem_vigencia",
    confidence: "media",
    consultedAt: "2026-07-19",
    conditions: "8,32% a.a. + poupança (componente variável limitado a 6,17%).",
    maxLtvPct: 80,
    maxTermMonths: 420,
  },
];

export const MODALITY_LABEL: Record<ModalityGroup, string> = {
  TR: "+ TR",
  IPCA: "+ IPCA",
  poupanca: "+ Poupança",
  MCMV: "MCMV",
  PRO_COTISTA: "Pró-Cotista",
};

export const SITUATION_LABEL: Record<RateSituation, string> = {
  vigente_confirmada: "Vigente confirmada",
  publicada_sem_vigencia: "Publicada",
  personalizada: "Personalizada",
  promocional: "Promocional",
  historica: "Histórica",
  nao_localizada: "Não localizada",
};

export function situationBadgeClass(s: RateSituation): string {
  switch (s) {
    case "vigente_confirmada":
      return "bg-emerald-500/10 text-emerald-700 border-emerald-500/40";
    case "promocional":
    case "publicada_sem_vigencia":
      return "bg-amber-500/10 text-amber-700 border-amber-500/40";
    case "personalizada":
    case "nao_localizada":
    case "historica":
    default:
      return "bg-muted text-muted-foreground border-border";
  }
}

export const PREDICTABILITY_RANK: Record<Indexer, number> = {
  fixa: 4,
  TR: 3,
  poupanca: 2,
  IPCA: 1,
};
