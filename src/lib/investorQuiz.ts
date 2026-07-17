/**
 * Investor Profile Quiz — Logic for Step 5 of the guided journey
 * 
 * 3 questions that generate an investor profile used to personalize
 * the recommendation in Step 7.
 */

import type { BairroAirbnb } from "@/types/intelligence";
import { calculateInvestmentScore, type BairroWithScore } from "@/lib/investmentScore";
import { getBairroProfile } from "@/lib/intelligenceInsights";
import { fmtBRL, fmtPct } from "@/hooks/useIntelligenceData";

// ── Quiz Types ───────────────────────────────────────────────────

export interface QuizQuestion {
  id: string;
  question: string;
  subtitle: string;
  options: QuizOption[];
}

export interface QuizOption {
  value: string;
  label: string;
  description: string;
  icon: string;
}

export interface QuizAnswers {
  objective: string;
  risk: string;
  priority: string;
}

export interface InvestorProfile {
  name: string;
  description: string;
  weights: { retorno: number; demanda: number; operacao: number; futuro: number };
  icon: string;
  color: string;
  textColor: string;
}

export interface Recommendation {
  bairro: BairroAirbnb;
  score: number;
  personalizedScore: number;
  grade: string;
  gradeColor: string;
  profileLabel: string;
  reasons: string[];
  cautions: string[];
}

// ── Quiz Questions ───────────────────────────────────────────────

export const QUIZ_QUESTIONS: QuizQuestion[] = [
  {
    id: "objective",
    question: "Qual é seu principal objetivo com esse investimento?",
    subtitle: "Isso ajuda a priorizar os indicadores certos para você",
    options: [
      {
        value: "renda",
        label: "Renda passiva",
        description: "Quero gerar receita mensal constante com aluguéis de curta temporada",
        icon: "Banknote",
      },
      {
        value: "valorizacao",
        label: "Valorização do patrimônio",
        description: "Quero um imóvel que valorize ao longo do tempo, com renda como bônus",
        icon: "TrendingUp",
      },
      {
        value: "equilibrio",
        label: "Equilíbrio entre os dois",
        description: "Quero retorno bom hoje e potencial de crescimento no futuro",
        icon: "Scale",
      },
    ],
  },
  {
    id: "risk",
    question: "Qual sua tolerância a risco?",
    subtitle: "Isso define o quanto priorizamos segurança versus retorno",
    options: [
      {
        value: "conservador",
        label: "Conservador",
        description: "Prefiro segurança e previsibilidade, mesmo que o retorno seja menor",
        icon: "Shield",
      },
      {
        value: "moderado",
        label: "Moderado",
        description: "Aceito algum risco em troca de retorno melhor, mas com limites",
        icon: "Gauge",
      },
      {
        value: "arrojado",
        label: "Arrojado",
        description: "Busco o maior retorno possível e aceito os riscos que vierem",
        icon: "Rocket",
      },
    ],
  },
  {
    id: "priority",
    question: "O que é mais importante para você na operação?",
    subtitle: "Isso personaliza quais bairros se encaixam melhor no seu estilo",
    options: [
      {
        value: "fluxo",
        label: "Fluxo constante de receita",
        description: "Quero o imóvel sempre ocupado, com reservas frequentes",
        icon: "CalendarCheck",
      },
      {
        value: "retorno",
        label: "Maior retorno percentual",
        description: "Quero maximizar o quanto o investimento rende proporcionalmente",
        icon: "ArrowUpRight",
      },
      {
        value: "facilidade",
        label: "Facilidade de operação",
        description: "Prefiro bairros com demanda estável e menos gestão necessária",
        icon: "Sparkles",
      },
    ],
  },
];

// ── Profile Resolution ───────────────────────────────────────────

const PROFILES: Record<string, InvestorProfile> = {
  "renda-conservador-fluxo": {
    name: "Investidor de renda estável",
    description: "Você busca um investimento previsível, com fluxo de caixa constante e risco controlado. Bairros com alta ocupação e boa liquidez são ideais para você.",
    weights: { retorno: 0.20, demanda: 0.35, operacao: 0.30, futuro: 0.15 },
    icon: "Shield",
    color: "bg-blue-100",
    textColor: "text-blue-800",
  },
  "renda-arrojado-retorno": {
    name: "Investidor agressivo de yield",
    description: "Você quer extrair o máximo de retorno do capital investido e aceita os riscos envolvidos. Bairros com yield alto, mesmo que menos previsíveis, são seus candidatos.",
    weights: { retorno: 0.50, demanda: 0.15, operacao: 0.20, futuro: 0.15 },
    icon: "Rocket",
    color: "bg-emerald-100",
    textColor: "text-emerald-800",
  },
  "valorizacao-conservador-facilidade": {
    name: "Investidor patrimonial",
    description: "Você pensa no longo prazo: quer um imóvel que valorize, em bairro consolidado, com operação tranquila. Crescimento e liquidez são suas prioridades.",
    weights: { retorno: 0.15, demanda: 0.25, operacao: 0.20, futuro: 0.40 },
    icon: "TrendingUp",
    color: "bg-amber-100",
    textColor: "text-amber-800",
  },
};

// Default profile used as fallback + base for dynamic calculation
const DEFAULT_PROFILE: InvestorProfile = {
  name: "Investidor equilibrado",
  description: "Você busca um equilíbrio entre retorno, segurança e potencial de crescimento. Os bairros mais equilibrados da amostra são os que melhor se encaixam no seu perfil.",
  weights: { retorno: 0.35, demanda: 0.25, operacao: 0.20, futuro: 0.20 },
  icon: "Scale",
  color: "bg-primary/10",
  textColor: "text-primary",
};

export function resolveProfile(answers: QuizAnswers): InvestorProfile {
  // Try exact match first
  const key = `${answers.objective}-${answers.risk}-${answers.priority}`;
  if (PROFILES[key]) return PROFILES[key];

  // Dynamic weight calculation based on answers
  const weights = { retorno: 0.25, demanda: 0.25, operacao: 0.25, futuro: 0.25 };

  // Objective adjustments
  if (answers.objective === "renda") {
    weights.retorno += 0.10;
    weights.operacao += 0.05;
    weights.futuro -= 0.10;
    weights.demanda -= 0.05;
  } else if (answers.objective === "valorizacao") {
    weights.futuro += 0.15;
    weights.retorno -= 0.10;
    weights.operacao -= 0.05;
  }

  // Risk adjustments
  if (answers.risk === "conservador") {
    weights.demanda += 0.10;
    weights.retorno -= 0.05;
    weights.futuro -= 0.05;
  } else if (answers.risk === "arrojado") {
    weights.retorno += 0.10;
    weights.demanda -= 0.10;
  }

  // Priority adjustments
  if (answers.priority === "fluxo") {
    weights.operacao += 0.05;
    weights.demanda += 0.05;
    weights.retorno -= 0.05;
    weights.futuro -= 0.05;
  } else if (answers.priority === "retorno") {
    weights.retorno += 0.10;
    weights.demanda -= 0.05;
    weights.futuro -= 0.05;
  } else if (answers.priority === "facilidade") {
    weights.demanda += 0.10;
    weights.operacao += 0.05;
    weights.retorno -= 0.10;
    weights.futuro -= 0.05;
  }

  // Normalize weights to sum to 1
  const sum = Object.values(weights).reduce((a, b) => a + b, 0);
  Object.keys(weights).forEach(k => {
    weights[k as keyof typeof weights] /= sum;
  });

  // Generate name based on dominant weight
  const dominant = Object.entries(weights).sort((a, b) => b[1] - a[1])[0][0];
  const nameMap: Record<string, string> = {
    retorno: "Investidor focado em retorno",
    demanda: "Investidor focado em liquidez",
    operacao: "Investidor focado em operação",
    futuro: "Investidor focado em crescimento",
  };

  const riskLabel = answers.risk === "conservador" ? "conservador" : answers.risk === "arrojado" ? "arrojado" : "moderado";
  
  const iconMap: Record<string, string> = {
    retorno: "TrendingUp",
    demanda: "Zap",
    operacao: "CalendarCheck",
    futuro: "Sprout",
  };

  const colorMap: Record<string, { color: string; textColor: string }> = {
    retorno: { color: "bg-emerald-100", textColor: "text-emerald-800" },
    demanda: { color: "bg-blue-100", textColor: "text-blue-800" },
    operacao: { color: "bg-violet-100", textColor: "text-violet-800" },
    futuro: { color: "bg-amber-100", textColor: "text-amber-800" },
  };

  return {
    name: `${nameMap[dominant]} ${riskLabel}`,
    description: `Com base nas suas respostas, você prioriza ${dominant === "retorno" ? "maximizar o retorno sobre o investimento" : dominant === "demanda" ? "segurança e previsibilidade na operação" : dominant === "operacao" ? "manter ocupação alta e estável" : "o crescimento futuro do bairro"}. Seu perfil ${riskLabel} orienta a seleção para bairros que equilibram essa prioridade com o nível de risco adequado.`,
    weights,
    icon: iconMap[dominant],
    ...colorMap[dominant],
  };
}

// ── Personalized Recommendation ──────────────────────────────────

function normalize(value: number, min: number, max: number): number {
  if (max === min) return 50;
  return Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));
}

export function generateRecommendations(
  bairros: BairroAirbnb[],
  profile: InvestorProfile
): Recommendation[] {
  if (!bairros.length) return [];

  const yields = bairros.map(b => Number(b.yield_bruto_airbnb));
  const liquidities = bairros.map(b => Number(b.score_liquidez));
  const occupancies = bairros.map(b => Number(b.ocupacao_media_studio));
  const growths = bairros.map(b => Number(b.score_crescimento_potencial));

  const minMax = (arr: number[]) => ({ min: Math.min(...arr), max: Math.max(...arr) });
  const yieldBounds = minMax(yields);
  const liqBounds = minMax(liquidities);
  const occBounds = minMax(occupancies);
  const growBounds = minMax(growths);

  const scored = bairros.map(b => {
    const invScore = calculateInvestmentScore(b, bairros);
    const bairroProfile = getBairroProfile(b, bairros);

    const normRetorno = normalize(Number(b.yield_bruto_airbnb), yieldBounds.min, yieldBounds.max);
    const normDemanda = normalize(Number(b.score_liquidez), liqBounds.min, liqBounds.max);
    const normOperacao = normalize(Number(b.ocupacao_media_studio), occBounds.min, occBounds.max);
    const normFuturo = normalize(Number(b.score_crescimento_potencial), growBounds.min, growBounds.max);

    const personalizedScore =
      normRetorno * profile.weights.retorno +
      normDemanda * profile.weights.demanda +
      normOperacao * profile.weights.operacao +
      normFuturo * profile.weights.futuro;

    // Generate reasons
    const reasons: string[] = [];
    if (normRetorno > 70) reasons.push(`Yield de ${fmtPct(b.yield_bruto_airbnb)} — acima da maioria dos bairros`);
    if (normDemanda > 70) reasons.push(`Boa liquidez (score ${Number(b.score_liquidez).toFixed(0)}) — operação mais previsível`);
    if (normOperacao > 70) reasons.push(`Ocupação de ${fmtPct(b.ocupacao_media_studio)} — poucos dias vazios`);
    if (normFuturo > 70) reasons.push(`Potencial de crescimento acima da média (score ${Number(b.score_crescimento_potencial).toFixed(0)})`);
    if (Number(b.delta_yield) > 0.03) reasons.push(`Airbnb rende ${fmtPct(b.delta_yield)} a mais que aluguel tradicional`);

    if (reasons.length === 0) {
      reasons.push(`Equilíbrio geral consistente entre os indicadores analisados`);
    }

    // Generate cautions
    const cautions: string[] = [];
    if (Number(b.score_liquidez) < 50) cautions.push("Liquidez abaixo do ideal — pode ser mais difícil manter reservas constantes");
    if (b.nivel_confianca_dados !== "alto") cautions.push("Dados com confiança intermediária — interpretar com mais cautela");
    if (Number(b.grau_saturacao_index) > 0.6) cautions.push("Saturação relativamente alta no bairro");

    return {
      bairro: b,
      score: invScore.score,
      personalizedScore,
      grade: invScore.grade,
      gradeColor: invScore.gradeColor,
      profileLabel: bairroProfile.label,
      reasons,
      cautions,
    };
  });

  return scored.sort((a, b) => b.personalizedScore - a.personalizedScore);
}
