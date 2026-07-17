// src/data/districtMetrics.mock.ts

// Seed 1:1 com o UI do mock (ranking + detalhes do painel + chips)
// ✅ Valores EXATOS do mock para: Pinheiros, Itaim Bibi, Jardim Paulista
// ⚠️ Os demais distritos estão com placeholders coerentes (troque quando plugar dados reais)

export type DemandChip =
  | "Misto"
  | "Corporativo"
  | "Turismo"
  | "Turismo Premium"
  | "Eventos"
  | "Hospitais"
  | "Universidades"
  | "Próximo ao metrô";

export type CompetitionChip = "Baixa" | "Média" | "Alta";

export type DistrictRow = {
  districtName: string;
  score: number;
  chips: DemandChip[];
  roiPercent: number;
  nightlyRateBRL: number;
  occupancyPercent: number;
  revenueMonthBRL: number;
  adrRangeLabel: string;
  listingsCount: number;
  priceSqm: number;
  competition: CompetitionChip;
  sourceLabel: string;
  recommendation: {
    bestStudioType: string;
    whyItWorks: string;
    tips: string[];
    risks: string[];
  };
};

export const DISTRICTS_MOCK: DistrictRow[] = [
  {
    districtName: "Pinheiros",
    score: 92,
    chips: ["Misto", "Turismo", "Próximo ao metrô"],
    roiPercent: 19.2,
    nightlyRateBRL: 410,
    occupancyPercent: 75,
    revenueMonthBRL: 9225,
    adrRangeLabel: "R$340–R$480",
    listingsCount: 3200,
    priceSqm: 14000,
    competition: "Alta",
    sourceLabel: "Bwild/AirDNA 2025",
    recommendation: {
      bestStudioType: "Compacto premium + home office",
      whyItWorks:
        "Alta demanda mista (turismo + corporativo), vida noturna forte e ótima mobilidade.",
      tips: [
        "Foto de capa perfeita + 1 elemento de design memorável.",
        "Wi-Fi excelente e mesa confortável (nômades digitais).",
        "Check-in autônomo + mensagens automatizadas para escalar.",
      ],
      risks: [
        "Competição alta: reviews e operação precisam ser impecáveis.",
        "Atenção a ruído e regras do condomínio (horários).",
      ],
    },
  },
  {
    districtName: "Itaim Bibi",
    score: 91,
    chips: ["Corporativo", "Próximo ao metrô"],
    roiPercent: 18.1,
    nightlyRateBRL: 440,
    occupancyPercent: 73,
    revenueMonthBRL: 9636,
    adrRangeLabel: "R$360–R$520",
    listingsCount: 2600,
    priceSqm: 16000,
    competition: "Alta",
    sourceLabel: "Bwild/AirDNA 2025",
    recommendation: {
      bestStudioType: "Business studio (hotel feel)",
      whyItWorks:
        "Público corporativo valoriza previsibilidade, conforto e experiência padrão hotel.",
      tips: [
        "Enxoval premium + blackout + colchão padrão hotel.",
        "Guia digital objetivo (check-in, Wi-Fi, regras).",
        "Preço dinâmico para capturar picos em dias úteis.",
      ],
      risks: [
        "Sazonalidade corporativa (picos em semana).",
        "Condomínios podem ter restrições operacionais.",
      ],
    },
  },
  {
    districtName: "Jardim Paulista",
    score: 87,
    chips: ["Turismo Premium", "Turismo", "Próximo ao metrô"],
    roiPercent: 17.4,
    nightlyRateBRL: 440,
    occupancyPercent: 70,
    revenueMonthBRL: 9240,
    adrRangeLabel: "R$360–R$520",
    listingsCount: 2800,
    priceSqm: 15000,
    competition: "Alta",
    sourceLabel: "Bwild/AirDNA 2025",
    recommendation: {
      bestStudioType: "Premium aesthetic (instagramável)",
      whyItWorks:
        "Região premium com alta disposição a pagar por estética, conforto e serviços.",
      tips: [
        "Identidade visual clara (paleta + 'peça wow').",
        "Iluminação em camadas para fotos impecáveis.",
        "Amenities e padrão hotel para elevar ADR.",
      ],
      risks: [
        "Competição alta: fotografia profissional é obrigatória.",
        "Custo de montagem tende a ser maior para manter padrão premium.",
      ],
    },
  },
  {
    districtName: "Consolação",
    score: 86,
    chips: ["Turismo", "Próximo ao metrô"],
    roiPercent: 16.6,
    nightlyRateBRL: 390,
    occupancyPercent: 74,
    revenueMonthBRL: 8660,
    adrRangeLabel: "R$320–R$470",
    listingsCount: 2400,
    priceSqm: 10500,
    competition: "Alta",
    sourceLabel: "Seed (substituir por dados reais)",
    recommendation: {
      bestStudioType: "Turismo funcional + mobilidade",
      whyItWorks: "Demanda alta por localização e acesso rápido à Paulista e metrô.",
      tips: ["Check-in autônomo com manual visual.", "Layout otimizado para mala + cozinha completa."],
      risks: ["Micro-localização varia muito entre ruas."],
    },
  },
  {
    districtName: "Bela Vista",
    score: 82,
    chips: ["Turismo", "Próximo ao metrô"],
    roiPercent: 15.4,
    nightlyRateBRL: 360,
    occupancyPercent: 72,
    revenueMonthBRL: 7776,
    adrRangeLabel: "R$290–R$430",
    listingsCount: 2100,
    priceSqm: 9500,
    competition: "Alta",
    sourceLabel: "Seed (substituir por dados reais)",
    recommendation: {
      bestStudioType: "Turismo acessível (alto giro)",
      whyItWorks: "Boa procura cultural e gastronômica; performa bem com preço competitivo.",
      tips: ["Limpeza padrão hotel (checklist).", "Blackout + vedação básica para ruído."],
      risks: ["Trechos com ruído e variação de percepção de segurança."],
    },
  },
  {
    districtName: "Moema",
    score: 85,
    chips: ["Misto", "Próximo ao metrô"],
    roiPercent: 15.8,
    nightlyRateBRL: 380,
    occupancyPercent: 70,
    revenueMonthBRL: 7980,
    adrRangeLabel: "R$310–R$460",
    listingsCount: 1800,
    priceSqm: 14500,
    competition: "Média",
    sourceLabel: "Seed (substituir por dados reais)",
    recommendation: {
      bestStudioType: "Conforto + estadias médias",
      whyItWorks: "Demanda variada (lazer, deslocamentos) e bom perfil para estadias mais longas.",
      tips: ["Wi-Fi forte + mesa de trabalho.", "Kit boas-vindas simples (café/água)."],
      risks: ["Dependência de micro-localização para mobilidade."],
    },
  },
  {
    districtName: "Vila Mariana",
    score: 83,
    chips: ["Hospitais", "Universidades", "Próximo ao metrô"],
    roiPercent: 33.2,
    nightlyRateBRL: 366,
    occupancyPercent: 80,
    revenueMonthBRL: 8909,
    adrRangeLabel: "R$300–R$460",
    listingsCount: 1600,
    priceSqm: 12500,
    competition: "Média",
    sourceLabel: "Seed (substituir por dados reais)",
    recommendation: {
      bestStudioType: "Funcional (estadia média) + cozinha completa",
      whyItWorks: "Demanda recorrente de saúde/universidades: hóspedes valorizam praticidade.",
      tips: ["Cozinha bem equipada.", "Ambiente silencioso + cama premium."],
      risks: ["Menos picos de ADR: performance vem de ocupação consistente."],
    },
  },
  {
    districtName: "Barra Funda",
    score: 80,
    chips: ["Eventos", "Próximo ao metrô"],
    roiPercent: 14.8,
    nightlyRateBRL: 340,
    occupancyPercent: 68,
    revenueMonthBRL: 6936,
    adrRangeLabel: "R$260–R$420",
    listingsCount: 1200,
    priceSqm: 8500,
    competition: "Média",
    sourceLabel: "Seed (substituir por dados reais)",
    recommendation: {
      bestStudioType: "Eventos + operação eficiente",
      whyItWorks: "Excelente em picos de calendário: shows, feiras, eventos.",
      tips: ["Smart pricing sempre ativo.", "Regras de estadia mínima em datas fortes."],
      risks: ["Sazonalidade: precisa gestão de calendário."],
    },
  },
  {
    districtName: "Campo Belo",
    score: 84,
    chips: ["Corporativo"],
    roiPercent: 15.0,
    nightlyRateBRL: 370,
    occupancyPercent: 69,
    revenueMonthBRL: 7659,
    adrRangeLabel: "R$300–R$460",
    listingsCount: 1100,
    priceSqm: 13000,
    competition: "Média",
    sourceLabel: "Seed (substituir por dados reais)",
    recommendation: {
      bestStudioType: "Business + estadia média",
      whyItWorks: "Atrai viagens de trabalho; bom para conforto e previsibilidade.",
      tips: ["Blackout + enxoval premium.", "Tomadas/USB e setup de trabalho."],
      risks: ["Alguns trechos com menor acesso a metrô."],
    },
  },
  {
    districtName: "República",
    score: 79,
    chips: ["Turismo", "Próximo ao metrô"],
    roiPercent: 13.6,
    nightlyRateBRL: 300,
    occupancyPercent: 67,
    revenueMonthBRL: 6030,
    adrRangeLabel: "R$230–R$380",
    listingsCount: 1900,
    priceSqm: 8200,
    competition: "Alta",
    sourceLabel: "Seed (substituir por dados reais)",
    recommendation: {
      bestStudioType: "Turismo econômico + alta rotatividade",
      whyItWorks: "Procura por centralidade e mobilidade; bom para operação padronizada.",
      tips: ["Check-in ultra visual e simples.", "Iluminação/entrada clara para segurança percebida."],
      risks: ["Micro-localização crítica."],
    },
  },
  {
    districtName: "Santana",
    score: 81,
    chips: ["Misto", "Próximo ao metrô"],
    roiPercent: 14.0,
    nightlyRateBRL: 310,
    occupancyPercent: 66,
    revenueMonthBRL: 6138,
    adrRangeLabel: "R$240–R$390",
    listingsCount: 900,
    priceSqm: 9000,
    competition: "Média",
    sourceLabel: "Seed (substituir por dados reais)",
    recommendation: {
      bestStudioType: "Funcional (misto) + boa operação",
      whyItWorks: "Demanda diversificada; performa bem com boa apresentação e reviews.",
      tips: ["Limpeza e enxoval acima da média.", "Wi-Fi forte."],
      risks: ["Variação por micro-região."],
    },
  },
  {
    districtName: "Vila Olímpia",
    score: 89,
    chips: ["Corporativo", "Misto", "Próximo ao metrô"],
    roiPercent: 17.0,
    nightlyRateBRL: 410,
    occupancyPercent: 74,
    revenueMonthBRL: 9102,
    adrRangeLabel: "R$340–R$480",
    listingsCount: 2200,
    priceSqm: 15500,
    competition: "Alta",
    sourceLabel: "Bwild/AirDNA 2025",
    recommendation: {
      bestStudioType: "Business + lazer premium",
      whyItWorks:
        "Polo corporativo e de entretenimento com alta demanda mista e boa mobilidade.",
      tips: [
        "Setup executivo + área social atrativa.",
        "Preço dinâmico para capturar picos em dias úteis e eventos.",
        "Fotos profissionais destacando vista e acabamento.",
      ],
      risks: [
        "Competição alta: diferenciação é essencial.",
        "Trânsito pesado pode afetar percepção em horários de pico.",
      ],
    },
  },
  {
    districtName: "Vila Madalena",
    score: 88,
    chips: ["Turismo", "Misto", "Próximo ao metrô"],
    roiPercent: 16.5,
    nightlyRateBRL: 390,
    occupancyPercent: 72,
    revenueMonthBRL: 8424,
    adrRangeLabel: "R$320–R$460",
    listingsCount: 1800,
    priceSqm: 13000,
    competition: "Média",
    sourceLabel: "Bwild/AirDNA 2025",
    recommendation: {
      bestStudioType: "Criativo / instagramável",
      whyItWorks:
        "Bairro boêmio com forte apelo turístico e cultural; hóspedes valorizam personalidade.",
      tips: [
        "Decoração autoral com identidade local.",
        "Guia de bares, galerias e programação cultural.",
        "Check-in flexível para perfil de lazer.",
      ],
      risks: [
        "Ruído noturno pode gerar reviews negativos.",
        "Micro-localização importa: evite ruas muito movimentadas.",
      ],
    },
  },
  {
    districtName: "Liberdade",
    score: 84,
    chips: ["Turismo", "Próximo ao metrô"],
    roiPercent: 15.0,
    nightlyRateBRL: 340,
    occupancyPercent: 70,
    revenueMonthBRL: 7140,
    adrRangeLabel: "R$270–R$410",
    listingsCount: 1400,
    priceSqm: 9800,
    competition: "Média",
    sourceLabel: "Bwild/AirDNA 2025",
    recommendation: {
      bestStudioType: "Turismo cultural + custo acessível",
      whyItWorks:
        "Forte identidade cultural e gastronômica; demanda turística constante e boa mobilidade.",
      tips: [
        "Decoração temática sutil (cultura oriental).",
        "Guia gastronômico + feiras de rua no bairro.",
        "Preço competitivo para capturar volume.",
      ],
      risks: [
        "ADR mais baixo exige ocupação consistente.",
        "Percepção de segurança varia por trecho.",
      ],
    },
  },
  {
    districtName: "Vila Clementino",
    score: 83,
    chips: ["Hospitais", "Universidades", "Próximo ao metrô"],
    roiPercent: 15.2,
    nightlyRateBRL: 350,
    occupancyPercent: 71,
    revenueMonthBRL: 7455,
    adrRangeLabel: "R$280–R$420",
    listingsCount: 850,
    priceSqm: 11500,
    competition: "Baixa",
    sourceLabel: "Bwild/AirDNA 2025",
    recommendation: {
      bestStudioType: "Funcional (estadia média) + cozinha completa",
      whyItWorks:
        "Proximidade com hospitais e universidades gera demanda recorrente e previsível.",
      tips: [
        "Cozinha bem equipada para estadias longas.",
        "Ambiente silencioso + cama premium.",
        "Desconto semanal/mensal para fidelizar perfil saúde/acadêmico.",
      ],
      risks: [
        "Menos picos de ADR: performance vem de ocupação consistente.",
        "Menor apelo turístico limita diversificação.",
      ],
    },
  },
  {
    districtName: "Brooklin",
    score: 80,
    chips: ["Corporativo", "Misto"],
    roiPercent: 12.1,
    nightlyRateBRL: 290,
    occupancyPercent: 60,
    revenueMonthBRL: 5292,
    adrRangeLabel: "R$240–R$350",
    listingsCount: 2800,
    priceSqm: 12500,
    competition: "Média",
    sourceLabel: "Bwild/AirDNA 2025",
    recommendation: {
      bestStudioType: "Business premium + estadias médias",
      whyItWorks:
        "Região corporativa em crescimento com baixa saturação e bom potencial de valorização.",
      tips: [
        "Setup executivo: mesa ampla, cadeira ergonômica, internet dedicada.",
        "Amenities de hotel: café, toalhas extras, blackout total.",
        "Perfil para estadias de 5+ noites (desconto semanal).",
      ],
      risks: [
        "Ocupação mais baixa exige gestão ativa de preço dinâmico.",
        "Algumas micro-regiões ainda carecem de oferta gastronômica.",
      ],
    },
  },
  {
    districtName: "Itaquera",
    score: 78,
    chips: ["Eventos", "Próximo ao metrô"],
    roiPercent: 13.2,
    nightlyRateBRL: 260,
    occupancyPercent: 62,
    revenueMonthBRL: 4836,
    adrRangeLabel: "R$190–R$320",
    listingsCount: 450,
    priceSqm: 6500,
    competition: "Baixa",
    sourceLabel: "Seed (substituir por dados reais)",
    recommendation: {
      bestStudioType: "Eventos pontuais + baixo custo",
      whyItWorks: "Pode performar em datas específicas com estratégia de preço.",
      tips: ["Calendário de eventos + preço dinâmico.", "Operação enxuta."],
      risks: ["Demanda menos constante fora de eventos."],
    },
  },
];

// -----------------------------------------
// Helpers para UI (ranking / filtros / join)
// -----------------------------------------

export const districtByName = new Map(DISTRICTS_MOCK.map((d) => [d.districtName, d]));

export const allChips = Array.from(
  new Set(DISTRICTS_MOCK.flatMap((d) => d.chips)),
).sort();

export const formatBRL = (value: number) =>
  value.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

export const formatPct = (value: number) =>
  `${value.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;

export const scoreBand = (score: number) => {
  if (score >= 88) return "high";
  if (score >= 80) return "medium";
  return "low";
};

export const sortDistricts = (
  list: DistrictRow[],
  by:
    | "roi"
    | "score"
    | "nightlyRate"
    | "occupancy"
    | "revenueMonth"
    | "listingsCount" = "roi",
) => {
  const sorted = [...list];
  const key: Record<typeof by, (d: DistrictRow) => number> = {
    roi: (d) => d.roiPercent,
    score: (d) => d.score,
    nightlyRate: (d) => d.nightlyRateBRL,
    occupancy: (d) => d.occupancyPercent,
    revenueMonth: (d) => d.revenueMonthBRL,
    listingsCount: (d) => d.listingsCount,
  };
  sorted.sort((a, b) => key[by](b) - key[by](a));
  return sorted;
};
