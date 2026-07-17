// Central data for Vila Park — Vila Mariana (residential, single tower).
// Numeric fields kept in the schema for backward compatibility, but financial
// values are zeroed here because we do not have official pricing published.
// Consumers should hide zero values instead of rendering "R$ 0".

export const PROPERTY = {
  name: "Vila Park",
  neighborhood: "Vila Mariana",
  address: "R. Baltazar Lisboa, 543",
  city: "São Paulo",
  incorporator: "Matere Bittar Incorporações",
  floors: 10,
  units: 33,
  builtAreaSqm: 1600,
  metroDistanceMeters: 900,
  amenitiesFloors: ["Térreo", "5º pavimento"],
  // Deprecated legacy fields kept so old consumers don't crash. Values are
  // placeholders — never render them; hide UI when 0/empty.
  avgOccupancy: 0,
  obraProgress: "",
  deliveryEstimate: "",
  amenities: ["Áreas comuns mobiliadas", "Infraestrutura para ar-condicionado"],
  avgPricePerSqm: 0,
  dailyRateSource: "",
  priceSource: "",
} as const;

export interface Typology {
  id: string;
  label: string;
  area: number;
  purchasePrice: number;
  dailyEstimate: number;
  idealProfile: "conservador" | "equilibrado" | "arrojado";
  highlights: string[];
}

// Three real Vila Park typologies. Area/price left as 0 because we don't have
// official numbers per typology — UI must not render zero.
export const TYPOLOGIES: Typology[] = [
  {
    id: "garden",
    label: "Apartamento com garden privativo",
    area: 0,
    purchasePrice: 0,
    dailyEstimate: 0,
    idealProfile: "equilibrado",
    highlights: [
      "Área externa privativa no térreo",
      "Integração com a unidade",
      "Ideal para quem quer contato com o exterior",
    ],
  },
  {
    id: "terrace",
    label: "Apartamento com terraço descoberto",
    area: 0,
    purchasePrice: 0,
    dailyEstimate: 0,
    idealProfile: "equilibrado",
    highlights: [
      "Terraço descoberto na unidade",
      "Lazer ao ar livre em casa",
      "Boa insolação",
    ],
  },
  {
    id: "studio",
    label: "1 dormitório / studio",
    area: 0,
    purchasePrice: 0,
    dailyEstimate: 0,
    idealProfile: "arrojado",
    highlights: [
      "Planta compacta",
      "A 900 m do metrô Vila Mariana",
      "Facilidade de manutenção",
    ],
  },
];

// Backward-compat helpers — return zeros. Consumers must not display these.
export function calcFinancials(typo: Typology, _occupancyPct = 0, _rateBoostPct = 0) {
  return {
    boostedDaily: 0,
    nightsPerMonth: 0,
    monthlyRevenue: 0,
    annualRevenue: 0,
    totalInvestment: typo.purchasePrice,
    grossYield: 0,
    netYieldEstimate: 0,
    paybackYears: 0,
    pricePerSqm: 0,
  };
}

export function rankByYield(occupancyPct = 0) {
  return TYPOLOGIES.map((t) => ({ ...t, ...calcFinancials(t, occupancyPct) }));
}

export function recommendTypology(_profileName: string): Typology {
  return TYPOLOGIES[0];
}
