/**
 * Storytelling components for the Short Stay Intelligence module.
 * Phase 3: Strategic lessons and consultive narratives.
 * Depends on: productFoundation.ts (Phase 1), intelligenceInsights.ts (Phase 2)
 */

import type { BairroAirbnb } from "@/types/intelligence";
import { fmtBRL, fmtPct, fmtScore } from "@/hooks/useIntelligenceData";
import { PRODUCT, DATA_COMMUNICATION } from "@/lib/productFoundation";

// ── Strategic Lessons (the 6 core learnings) ─────────────────────
export interface StrategicLesson {
  id: string;
  title: string;
  explanation: string;
  /** Generated dynamically with real bairro data */
  buildExample: (bairros: BairroAirbnb[]) => string | null;
  takeaway: string;
  icon: string;
}

export const STRATEGIC_LESSONS: StrategicLesson[] = [
  {
    id: "adr-not-everything",
    title: "Diária mais alta não significa, sozinha, melhor investimento",
    explanation:
      "Cobrar mais por noite ajuda, mas o retorno final depende do equilíbrio entre diária, ocupação e preço do imóvel. Um bairro com diária premium pode ter yield menor que um bairro com diária intermediária e ocupação forte.",
    buildExample: (bairros) => {
      const byADR = [...bairros].sort((a, b) => Number(b.adr_medio_studio) - Number(a.adr_medio_studio));
      const byYield = [...bairros].sort((a, b) => Number(b.yield_bruto_airbnb) - Number(a.yield_bruto_airbnb));
      const topADR = byADR[0];
      const topYield = byYield[0];
      if (topADR.bairro === topYield.bairro) return null;
      return `${topADR.bairro} cobra ${fmtBRL(topADR.adr_medio_studio)}/noite (a maior diária), mas ${topYield.bairro} entrega yield de ${fmtPct(topYield.yield_bruto_airbnb)} — o maior retorno da amostra, mesmo com diária de ${fmtBRL(topYield.adr_medio_studio)}.`;
    },
    takeaway: "Olhe para o yield e a ocupação, não apenas para o preço da diária.",
    icon: "AlertCircle",
  },
  {
    id: "hidden-gems",
    title: "Os melhores retornos podem estar em bairros menos óbvios",
    explanation:
      "Bairros intermediários muitas vezes geram retorno percentual melhor porque o custo de aquisição do imóvel é menor. O investidor que só olha para bairros famosos pode perder oportunidades.",
    buildExample: (bairros) => {
      const byYield = [...bairros].sort((a, b) => Number(b.yield_bruto_airbnb) - Number(a.yield_bruto_airbnb));
      const top3 = byYield.slice(0, 3);
      const byADR = [...bairros].sort((a, b) => Number(b.adr_medio_studio) - Number(a.adr_medio_studio));
      const premiumNames = byADR.slice(0, 3).map(b => b.bairro);
      const surprises = top3.filter(b => !premiumNames.includes(b.bairro));
      if (!surprises.length) return null;
      return `${surprises.map(b => b.bairro).join(" e ")} ${surprises.length > 1 ? "aparecem" : "aparece"} entre os maiores yields, mesmo sem estar entre as diárias mais caras — mostrando que retorno não depende só de fama.`;
    },
    takeaway: "Não descarte bairros menos conhecidos. Eles podem surpreender no retorno.",
    icon: "Gem",
  },
  {
    id: "liquidity-matters",
    title: "Liquidez importa tanto quanto rentabilidade",
    explanation:
      "De nada adianta um yield alto no papel se o bairro tem demanda instável ou dificuldade de manter reservas. Liquidez alta significa operação mais previsível e menos estresse.",
    buildExample: (bairros) => {
      const highYieldLowLiq = bairros.find(
        b => Number(b.yield_bruto_airbnb) > 0.10 && Number(b.score_liquidez) < 55
      );
      if (!highYieldLowLiq) return null;
      return `${highYieldLowLiq.bairro} tem yield de ${fmtPct(highYieldLowLiq.yield_bruto_airbnb)}, mas score de liquidez de apenas ${fmtScore(highYieldLowLiq.score_liquidez)} — sugerindo que manter a operação pode ser mais desafiador.`;
    },
    takeaway: "Retorno alto com liquidez baixa pode significar mais risco operacional.",
    icon: "Gauge",
  },
  {
    id: "balance-wins",
    title: "O melhor investimento costuma estar no equilíbrio",
    explanation:
      "O bairro ideal raramente é o que tem o maior número em um único indicador. Ele é aquele que equilibra retorno, demanda, liquidez e perspectiva — gerando resultado consistente.",
    buildExample: (bairros) => {
      // Find most balanced
      const scored = bairros.map(b => {
        const avg = (Number(b.score_rentabilidade) + Number(b.score_liquidez) + Number(b.score_crescimento_potencial)) / 3;
        const spread = Math.max(Number(b.score_rentabilidade), Number(b.score_liquidez), Number(b.score_crescimento_potencial)) -
          Math.min(Number(b.score_rentabilidade), Number(b.score_liquidez), Number(b.score_crescimento_potencial));
        return { bairro: b.bairro, compositeScore: avg - spread * 0.3, avg };
      });
      const best = scored.reduce((a, b) => a.compositeScore > b.compositeScore ? a : b);
      return `${best.bairro} aparece como o bairro mais equilibrado, com score médio de ${best.avg.toFixed(1)} e baixa dispersão entre rentabilidade, liquidez e crescimento.`;
    },
    takeaway: "Busque equilíbrio entre retorno, demanda e estabilidade.",
    icon: "Scale",
  },
  {
    id: "high-yield-caution",
    title: "Yield alto com liquidez baixa exige mais cautela",
    explanation:
      "Um retorno muito alto pode esconder riscos: bairro com pouca demanda, dados limitados ou alta sazonalidade. Sempre cruze yield com liquidez e confiança antes de decidir.",
    buildExample: (bairros) => {
      const risky = bairros
        .filter(b => Number(b.yield_bruto_airbnb) > 0.10 && Number(b.score_liquidez) < 55)
        .sort((a, b) => Number(b.yield_bruto_airbnb) - Number(a.yield_bruto_airbnb));
      if (!risky.length) return "Nesta amostra, nenhum bairro apresenta essa combinação de forma extrema — mas o princípio continua válido para qualquer análise de investimento.";
      const b = risky[0];
      return `${b.bairro} mostra yield de ${fmtPct(b.yield_bruto_airbnb)} com liquidez ${fmtScore(b.score_liquidez)} e confiança ${b.nivel_confianca_dados}. Isso pede leitura mais cautelosa.`;
    },
    takeaway: "Sempre cruze retorno com liquidez e confiança dos dados.",
    icon: "ShieldAlert",
  },
  {
    id: "airbnb-vs-rent",
    title: "Airbnb pode render mais que aluguel tradicional, mas o risco também importa",
    explanation:
      "O delta yield mostra quanto o short stay supera o aluguel comum. Um delta alto justifica a operação, mas short stay exige mais gestão, limpeza e variação de demanda.",
    buildExample: (bairros) => {
      const avgDelta = bairros.reduce((s, b) => s + Number(b.delta_yield), 0) / bairros.length;
      const bestDelta = bairros.reduce((a, b) => Number(a.delta_yield) > Number(b.delta_yield) ? a : b);
      return `Na amostra, o delta médio é de ${fmtPct(avgDelta)}, e ${bestDelta.bairro} lidera com ${fmtPct(bestDelta.delta_yield)} a mais que o aluguel tradicional. Esse prêmio precisa compensar o esforço extra de operar short stay.`;
    },
    takeaway: "O delta yield mostra se o esforço extra do short stay vale a pena.",
    icon: "ArrowUpDown",
  },
];

// ── Generate comparative narratives from data ────────────────────
export interface ComparativeNarrative {
  type: "insight" | "comparison" | "caution";
  text: string;
}

export function generateComparativeNarratives(bairros: BairroAirbnb[]): ComparativeNarrative[] {
  if (bairros.length < 3) return [];
  const narratives: ComparativeNarrative[] = [];

  const byYield = [...bairros].sort((a, b) => Number(b.yield_bruto_airbnb) - Number(a.yield_bruto_airbnb));
  const byADR = [...bairros].sort((a, b) => Number(b.adr_medio_studio) - Number(a.adr_medio_studio));
  const byOcc = [...bairros].sort((a, b) => Number(b.ocupacao_media_studio) - Number(a.ocupacao_media_studio));

  // 1. Premium vs yield leader
  if (byADR[0].bairro !== byYield[0].bairro) {
    narratives.push({
      type: "comparison",
      text: `${byADR[0].bairro} lidera em diária (${fmtBRL(byADR[0].adr_medio_studio)}/noite), mas ${byYield[0].bairro} entrega o maior retorno percentual (${fmtPct(byYield[0].yield_bruto_airbnb)}). Isso reforça que preço premium não é sinônimo de melhor investimento.`,
    });
  }

  // 2. Occupancy leader insight
  const occLeader = byOcc[0];
  narratives.push({
    type: "insight",
    text: `${occLeader.bairro} mantém a maior ocupação da amostra (${fmtPct(occLeader.ocupacao_media_studio)}), indicando forte demanda e menos dias vazios — o que se traduz em fluxo de caixa mais previsível.`,
  });

  // 3. High yield + low liquidity caution
  const risky = bairros.filter(b => Number(b.yield_bruto_airbnb) >= Number(byYield[1].yield_bruto_airbnb) && Number(b.score_liquidez) < 55);
  if (risky.length > 0) {
    narratives.push({
      type: "caution",
      text: `${risky.map(b => b.bairro).join(", ")} ${risky.length > 1 ? "mostram" : "mostra"} yield atrativo mas liquidez abaixo de 55 — o que pode indicar maior dificuldade para manter a operação consistente.`,
    });
  }

  // 4. Best balance narrative
  const scored = bairros.map(b => {
    const avg = (Number(b.score_rentabilidade) + Number(b.score_liquidez) + Number(b.score_crescimento_potencial)) / 3;
    const spread = Math.max(Number(b.score_rentabilidade), Number(b.score_liquidez), Number(b.score_crescimento_potencial)) -
      Math.min(Number(b.score_rentabilidade), Number(b.score_liquidez), Number(b.score_crescimento_potencial));
    return { ...b, compositeScore: avg - spread * 0.3 };
  }).sort((a, b) => b.compositeScore - a.compositeScore);

  narratives.push({
    type: "insight",
    text: `${scored[0].bairro} se destaca como o bairro mais equilibrado: boa rentabilidade, liquidez e crescimento em harmonia — ideal para quem busca consistência.`,
  });

  // 5. Delta yield insight
  const avgDelta = bairros.reduce((s, b) => s + Number(b.delta_yield), 0) / bairros.length;
  if (avgDelta > 0.02) {
    narratives.push({
      type: "insight",
      text: `Em média, o short stay rende ${fmtPct(avgDelta)} a mais que o aluguel tradicional na amostra — mas esse prêmio varia bastante entre bairros e deve ser avaliado caso a caso.`,
    });
  }

  return narratives;
}

// ── Bairro-specific storytelling for detail page ─────────────────
export function buildBairroStoryBlocks(b: BairroAirbnb, allBairros: BairroAirbnb[]): { title: string; text: string; type: "positive" | "neutral" | "caution" }[] {
  const blocks: { title: string; text: string; type: "positive" | "neutral" | "caution" }[] = [];
  const yieldRank = [...allBairros].sort((a, bb) => Number(bb.yield_bruto_airbnb) - Number(a.yield_bruto_airbnb)).findIndex(x => x.bairro === b.bairro) + 1;
  const adrRank = [...allBairros].sort((a, bb) => Number(bb.adr_medio_studio) - Number(a.adr_medio_studio)).findIndex(x => x.bairro === b.bairro) + 1;
  const occRank = [...allBairros].sort((a, bb) => Number(bb.ocupacao_media_studio) - Number(a.ocupacao_media_studio)).findIndex(x => x.bairro === b.bairro) + 1;
  const total = allBairros.length;

  // Yield positioning
  if (yieldRank <= 3) {
    blocks.push({
      title: "Retorno entre os mais altos",
      text: `${b.bairro} está na ${yieldRank}ª posição em yield bruto (${fmtPct(b.yield_bruto_airbnb)}), entre ${total} bairros analisados. Isso indica forte potencial de retorno sobre o investimento.`,
      type: "positive",
    });
  } else if (yieldRank > total * 0.6) {
    blocks.push({
      title: "Retorno na metade inferior",
      text: `Com yield de ${fmtPct(b.yield_bruto_airbnb)}, ${b.bairro} fica na ${yieldRank}ª posição de ${total}. Outros bairros entregam retorno percentual maior, mas isso pode ser compensado por outros fatores.`,
      type: "caution",
    });
  }

  // ADR vs yield disconnect
  if (adrRank <= 3 && yieldRank > 5) {
    blocks.push({
      title: "Diária alta, retorno moderado",
      text: `${b.bairro} tem uma das diárias mais altas (${fmtBRL(b.adr_medio_studio)}), mas o retorno percentual não acompanha. Isso pode indicar que o preço do imóvel é alto demais em relação à receita gerada.`,
      type: "neutral",
    });
  }

  // Occupancy strength
  if (occRank <= 3) {
    blocks.push({
      title: "Ocupação forte",
      text: `Com ${fmtPct(b.ocupacao_media_studio)} de ocupação (${occRank}ª posição), ${b.bairro} demonstra demanda consistente. Isso reduz o risco de dias vazios e torna o fluxo de caixa mais previsível.`,
      type: "positive",
    });
  }

  // Liquidity warning
  if (Number(b.score_liquidez) < 50) {
    blocks.push({
      title: "Liquidez merece atenção",
      text: `O score de liquidez de ${fmtScore(b.score_liquidez)} sugere que a operação neste bairro pode ser mais desafiadora. Considere isso ao planejar sua estratégia de gestão.`,
      type: "caution",
    });
  }

  // Delta yield interpretation
  const delta = Number(b.delta_yield);
  if (delta > 0.05) {
    blocks.push({
      title: "Short stay claramente superior ao aluguel",
      text: `O delta yield de ${fmtPct(delta)} indica que o Airbnb rende significativamente mais que o aluguel tradicional neste bairro. O prêmio justifica a operação de short stay para a maioria dos perfis de investidor.`,
      type: "positive",
    });
  } else if (delta < 0.02) {
    blocks.push({
      title: "Vantagem marginal sobre aluguel tradicional",
      text: `Com delta de apenas ${fmtPct(delta)}, a vantagem do short stay sobre o aluguel tradicional é pequena. Para investidores que preferem simplicidade, o aluguel comum pode fazer mais sentido.`,
      type: "neutral",
    });
  }

  return blocks;
}
