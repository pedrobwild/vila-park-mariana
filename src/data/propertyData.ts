// Central financial data for LM Urban Flex Bela Cintra
// All investment logic derives from this single source of truth.
//
// FONTE DE DADOS (médias de mercado, região Consolação, São Paulo):
// • Preço de aquisição: ~R$ 11.000/m² para studios novos (Proprietário Direto, Loft, 2025)
// • Diárias: pesquisa Bwild 2025 — Consolação R$ 260–390
//   Ajustadas por metragem: studios menores têm diária/m² mais alta, maiores diluem.
// • Ocupação média: 78% (média plataformas short stay região central SP)

export const PROPERTY = {
  name: "LM Urban Flex Bela Cintra",
  neighborhood: "Consolação",
  address: "R. Bela Cintra, 209",
  city: "São Paulo",
  avgOccupancy: 74,
  obraProgress: "63,53%",
  deliveryEstimate: "Dez/2026",
  amenities: ["Coworking", "Lavanderia", "Rooftop", "Academia", "Bike Sharing", "Conveniência"],
  avgPricePerSqm: 10_500,
  dailyRateSource: "Pesquisa Bwild 2025 · Média Consolação",
  priceSource: "Proprietário Direto / Loft · Média região 2025",
} as const;

export interface Typology {
  id: string;
  label: string;
  area: number;
  /** Preço médio de mercado para a metragem (R$) */
  purchasePrice: number;
  /** Diária média de mercado para a metragem (R$) */
  dailyEstimate: number;
  /** Perfil ideal */
  idealProfile: "conservador" | "equilibrado" | "arrojado";
  /** Destaques curtos */
  highlights: string[];
}

export const TYPOLOGIES: Typology[] = [
  {
    id: "19m2",
    label: "Studio Compacto 19 m²",
    area: 19,
    purchasePrice: 200_000,
    dailyEstimate: 225,
    idealProfile: "arrojado",
    highlights: [
      "Menor ticket de entrada da região",
      "Maior yield bruto por m²",
      "Alta rotatividade — ideal para 1–2 noites",
    ],
  },
  {
    id: "38m2",
    label: "Studio Confort 38 m²",
    area: 38,
    purchasePrice: 399_000,
    dailyEstimate: 345,
    idealProfile: "equilibrado",
    highlights: [
      "Living amplo com cozinha completa",
      "Aceita casais e estadias corporativas",
      "Tipologia mais comum no mercado",
    ],
  },
  {
    id: "40m2",
    label: "Studio Premium 40 m²",
    area: 40,
    purchasePrice: 420_000,
    dailyEstimate: 355,
    idealProfile: "equilibrado",
    highlights: [
      "Varanda gourmet diferenciada",
      "Público corporativo e médico",
      "Estadias médias de 3–7 noites",
    ],
  },
  {
    id: "54m2",
    label: "Flat Executive 54 m²",
    area: 54,
    purchasePrice: 567_000,
    dailyEstimate: 410,
    idealProfile: "equilibrado",
    highlights: [
      "Mesa de jantar 6 lugares + closet",
      "Estadias corporativas longas",
      "Público premium com alta recorrência",
    ],
  },
  {
    id: "76m2",
    label: "Duplex Assinatura 76 m²",
    area: 76,
    purchasePrice: 798_000,
    dailyEstimate: 465,
    idealProfile: "conservador",
    highlights: [
      "Dois pavimentos com design autoral",
      "Layout versátil para famílias e grupos",
      "Menor vacância em alta temporada",
    ],
  },
  {
    id: "83m2",
    label: "Cobertura Garden 83 m²",
    area: 83,
    purchasePrice: 872_000,
    dailyEstimate: 480,
    idealProfile: "conservador",
    highlights: [
      "Área externa privativa com jacuzzi",
      "Diária mais alta do empreendimento",
      "Público premium: famílias e experiências",
    ],
  },
];

/** Calcula métricas financeiras para uma tipologia */
export function calcFinancials(
  typo: Typology,
  occupancyPct: number = PROPERTY.avgOccupancy,
  rateBoostPct: number = 0,
) {
  const boostedDaily = typo.dailyEstimate * (1 + rateBoostPct / 100);
  const nightsPerMonth = 30 * (occupancyPct / 100);
  const monthlyRevenue = Math.round(boostedDaily * nightsPerMonth);
  const annualRevenue = monthlyRevenue * 12;

  const totalInvestment = typo.purchasePrice;
  const grossYield = (annualRevenue / totalInvestment) * 100;
  const netYieldEstimate = grossYield * 0.75; // ~25% custos operacionais
  const paybackYears = totalInvestment / annualRevenue;
  const pricePerSqm = Math.round(typo.purchasePrice / typo.area);

  return {
    boostedDaily: Math.round(boostedDaily),
    nightsPerMonth: Math.round(nightsPerMonth),
    monthlyRevenue,
    annualRevenue,
    totalInvestment,
    grossYield: Number(grossYield.toFixed(1)),
    netYieldEstimate: Number(netYieldEstimate.toFixed(1)),
    paybackYears: Number(paybackYears.toFixed(1)),
    pricePerSqm,
  };
}

/** Ordena tipologias por yield bruto */
export function rankByYield(occupancyPct: number = PROPERTY.avgOccupancy) {
  return TYPOLOGIES
    .map((t) => ({ ...t, ...calcFinancials(t, occupancyPct) }))
    .sort((a, b) => b.grossYield - a.grossYield);
}

/** Recomenda tipologia com base no perfil */
export function recommendTypology(profileName: string): Typology {
  const lower = profileName.toLowerCase();
  if (lower.includes("conserv")) return TYPOLOGIES.find(t => t.id === "76m2") || TYPOLOGIES[4];
  if (lower.includes("arrojado") || lower.includes("agressivo")) return TYPOLOGIES.find(t => t.id === "19m2") || TYPOLOGIES[0];
  return TYPOLOGIES.find(t => t.id === "38m2") || TYPOLOGIES[1];
}
