import type { BairroAirbnb } from "@/types/intelligence";
import { fmtBRL, fmtPct, fmtScore } from "@/hooks/useIntelligenceData";

// ── Column tooltips ──────────────────────────────────────────────
export const COLUMN_TOOLTIPS: Record<string, { friendly: string; tip: string }> = {
  investment_score: { friendly: "Investment Score", tip: "Nota central que combina retorno (35%), demanda (25%), operação (20%) e potencial futuro (20%)." },
  adr: { friendly: "Preço médio da diária", tip: "Quanto, em média, um imóvel cobra por noite neste bairro." },
  ocupacao: { friendly: "% de dias alugados", tip: "Percentual de dias em que o imóvel fica ocupado no mês." },
  yield_airbnb: { friendly: "Retorno anual no Airbnb", tip: "Quanto o imóvel pode render por ano em relação ao valor investido." },
  delta_yield: { friendly: "Ganho extra vs aluguel comum", tip: "Diferença entre o retorno do Airbnb e o aluguel tradicional." },
  rentabilidade: { friendly: "Score geral de retorno", tip: "Nota que combina diária, ocupação, retorno e saturação." },
  liquidez: { friendly: "Facilidade de operar", tip: "Quanto o bairro tem de demanda, reservas e velocidade comercial." },
  crescimento: { friendly: "Potencial futuro", tip: "Sinais de valorização e expansão futura da demanda." },
  confianca: { friendly: "Qualidade dos dados", tip: "Alto = leitura consistente · Médio = útil, com incerteza · Baixo = exploratória." },
  true_yield: { friendly: "True Yield", tip: "Retorno bruto direto: ADR × Ocupação × 365 ÷ Preço do imóvel. Estimativa simplificada sem custos operacionais." },
};

// ── Indicator explainer cards (for the didactic section) ────────
export interface IndicatorExplainer {
  key: string;
  title: string;
  friendlyTitle: string;
  whatItIs: string;
  whyItMatters: string;
  howToRead: string;
  example: string;
  keyMessage: string;
  commonMistake: string;
  icon: string;
}

export const INDICATOR_EXPLAINERS: IndicatorExplainer[] = [
  {
    key: "adr",
    title: "ADR",
    friendlyTitle: "Preço médio da diária",
    whatItIs: "É o valor médio que um imóvel consegue cobrar por noite neste bairro. Se o ADR é R$300, significa que os studios da região cobram, em média, R$300/noite.",
    whyItMatters: "Uma diária mais alta gera mais receita por reserva — mas não garante, sozinha, que o investimento será melhor. Afinal, se a ocupação for baixa, poucas noites serão vendidas.",
    howToRead: "ADR mais alto → diária mais cara → perfil mais premium. Mas compare sempre com a ocupação e o yield para ter a visão completa.",
    example: "Um studio na Consolação pode cobrar R$310/noite com 74% de ocupação. Se a ocupação subir para 80%, o retorno anual cresce mesmo sem aumentar a diária.",
    keyMessage: "Diária mais alta ajuda, mas não decide sozinha.",
    commonMistake: "Achar que o bairro com a diária mais cara é automaticamente o melhor investimento.",
    icon: "DollarSign",
  },
  {
    key: "ocupacao",
    title: "Ocupação",
    friendlyTitle: "Percentual de dias alugados",
    whatItIs: "É a porcentagem de dias em que o imóvel fica realmente ocupado com hóspedes. Uma ocupação de 72% significa que, num mês de 30 dias, o imóvel fica alugado cerca de 22 dias.",
    whyItMatters: "Imóvel vazio não gera receita. Quanto maior a ocupação, mais constante é o fluxo de dinheiro entrando e menor o risco de ficar com dias ociosos.",
    howToRead: "Acima de 65% é uma ocupação saudável. Acima de 75% é considerado forte. Abaixo de 55% pode indicar dificuldade de demanda ou precificação inadequada.",
    example: "Um bairro com 75% de ocupação mantém o imóvel alugado cerca de 22 dias por mês — e cada dia ocupado é receita no bolso.",
    keyMessage: "Quanto maior a ocupação, menos tempo o imóvel fica vazio.",
    commonMistake: "Ignorar a ocupação e focar só na diária. Um imóvel com diária alta mas ocupação de 40% pode render menos que um com diária menor e 80% de ocupação.",
    icon: "CalendarCheck",
  },
  {
    key: "yield_airbnb",
    title: "Yield Airbnb",
    friendlyTitle: "Retorno anual do imóvel no Airbnb",
    whatItIs: "É o retorno bruto anual que o imóvel gera via short stay, expresso como porcentagem do valor do imóvel. Se o yield é 12%, significa que o imóvel gera 12% do seu valor em receita bruta por ano.",
    whyItMatters: "É o indicador que mais se aproxima de responder 'esse investimento vale a pena?'. Ele conecta a receita gerada com o capital investido.",
    howToRead: "Quanto maior o yield, maior o retorno percentual. Compare com investimentos tradicionais: poupança rende ~8% ao ano, renda fixa ~12%. Um yield de 14% já é bastante competitivo.",
    example: "Se você investiu R$400 mil num studio e ele gera R$56 mil/ano no Airbnb, o yield bruto é 14%. Isso supera a maioria dos investimentos tradicionais.",
    keyMessage: "É um dos indicadores mais importantes para saber se o investimento vale a pena.",
    commonMistake: "Confundir yield bruto com lucro líquido. O yield não desconta despesas como condomínio, limpeza e manutenção.",
    icon: "TrendingUp",
  },
  {
    key: "delta_yield",
    title: "Delta Yield",
    friendlyTitle: "Quanto o Airbnb rende a mais que o aluguel comum",
    whatItIs: "É a diferença entre o retorno do short stay (Airbnb) e o aluguel tradicional (long term). Se o delta é +5pp, o Airbnb rende 5 pontos percentuais a mais por ano.",
    whyItMatters: "Responde diretamente: 'vale a pena operar short stay ou é melhor alugar normal?'. Um delta alto justifica o esforço extra de operar no modelo Airbnb.",
    howToRead: "Delta positivo = Airbnb rende mais. Acima de 3pp = vantagem significativa. Acima de 5pp = vantagem forte. Perto de zero ou negativo = aluguel tradicional pode ser mais inteligente.",
    example: "Se o Airbnb rende 13% e o aluguel rende 7%, o delta é +6pp. Isso significa que, para cada R$100 mil investidos, o short stay gera R$6.000/ano a mais que o aluguel tradicional.",
    keyMessage: "Ajuda a responder se faz sentido operar short stay ou seguir no aluguel tradicional.",
    commonMistake: "Esquecer que o short stay dá mais trabalho. Um delta pequeno pode não justificar a operação extra.",
    icon: "ArrowUpRight",
  },
  {
    key: "rentabilidade",
    title: "Rentabilidade",
    friendlyTitle: "Score geral de retorno",
    whatItIs: "É uma nota calculada que combina vários fatores — diária, ocupação, yield, saturação — para mostrar quais bairros parecem mais fortes em geração de resultado.",
    whyItMatters: "Olhar um indicador isolado pode enganar. A rentabilidade combina tudo numa única leitura e facilita a comparação entre bairros.",
    howToRead: "Score de 0 a 100. Quanto maior, melhor o equilíbrio geral de retorno. Acima de 70 é forte. Acima de 80 é excepcional na amostra.",
    example: "Um bairro com score 78 provavelmente combina boa diária, ocupação decente e yield competitivo — mesmo que nenhum desses indicadores seja o maior da tabela.",
    keyMessage: "Quanto maior a rentabilidade, melhor o equilíbrio entre receita e atratividade do investimento.",
    commonMistake: "Achar que o score mais alto significa 'investimento garantido'. Ele indica potencial, não certeza.",
    icon: "Target",
  },
  {
    key: "liquidez",
    title: "Liquidez",
    friendlyTitle: "Facilidade de girar a operação",
    whatItIs: "Representa o quanto o bairro tem de demanda, velocidade comercial e facilidade de manter reservas constantes. Pode ser interpretado como 'facilidade de fazer o negócio funcionar'.",
    whyItMatters: "De nada adianta um retorno excelente no papel se o bairro tem demanda instável. Liquidez alta = operação mais previsível e menos estresse.",
    howToRead: "Score alto = demanda constante, reservas frequentes, menos risco operacional. Score baixo = pode ser mais difícil manter o imóvel ocupado de forma consistente.",
    example: "Um bairro com liquidez 75 tende a ter reservas mais constantes. Já um com liquidez 40 pode alternar entre meses cheios e meses quase vazios.",
    keyMessage: "Nem sempre o bairro com maior retorno é o mais fácil de operar.",
    commonMistake: "Focar só em rentabilidade e ignorar liquidez. Retorno alto com liquidez baixa pode significar muito mais trabalho e incerteza.",
    icon: "Zap",
  },
  {
    key: "crescimento",
    title: "Crescimento",
    friendlyTitle: "Potencial futuro do bairro",
    whatItIs: "Mostra se o bairro tem sinais de valorização, amadurecimento ou expansão futura da demanda. É um indicador de perspectiva, não de resultado atual.",
    whyItMatters: "Investimento imobiliário é de médio/longo prazo. Um bairro com crescimento forte pode valer mais no futuro, tanto em diárias quanto em valor do imóvel.",
    howToRead: "Score alto = o bairro tem sinais positivos de evolução. Score baixo = o bairro pode já estar maduro ou ter perspectiva de crescimento mais limitada.",
    example: "Um bairro com score de crescimento 80 pode estar passando por revitalização, atração de novos moradores ou expansão de oferta de transporte.",
    keyMessage: "É o indicador que ajuda a enxergar o que pode melhorar ao longo do tempo.",
    commonMistake: "Investir só olhando o presente. Um bairro com crescimento forte pode compensar um yield atual um pouco menor.",
    icon: "Sprout",
  },
  {
    key: "confianca",
    title: "Confiança",
    friendlyTitle: "Qualidade dos dados",
    whatItIs: "Mostra o quão confiável é a leitura daquele bairro, baseado no volume e consistência dos dados disponíveis.",
    whyItMatters: "Uma análise é tão boa quanto os dados que a sustentam. Confiança alta significa leitura mais segura. Confiança baixa pede mais cautela na interpretação.",
    howToRead: "Alto = dados consistentes, leitura segura. Médio = útil, mas com margem de incerteza maior. Baixo = leitura exploratória, use com mais cautela.",
    example: "Se dois bairros têm yield parecido, mas um tem confiança alta e outro baixa, o primeiro oferece uma leitura muito mais segura para decisão.",
    keyMessage: "Confiança alta significa leitura mais consistente.",
    commonMistake: "Ignorar o nível de confiança e tratar todos os bairros como se tivessem a mesma qualidade de dados.",
    icon: "ShieldCheck",
  },
];

// ── Bairro Profile ───────────────────────────────────────────────
export type BairroProfile = "equilibrado" | "premium" | "alta-ocupacao" | "alto-retorno" | "oportunidade-arriscada" | "crescimento-consistente";

export interface BairroProfileInfo {
  profile: BairroProfile;
  label: string;
  color: string;
  textColor: string;
  quickRead: string;
  description: string;
  interpretation: string;
  icon: string;
}

const PROFILE_DEFS: Record<BairroProfile, Omit<BairroProfileInfo, "profile" | "quickRead">> = {
  equilibrado: {
    label: "Equilibrado",
    color: "bg-primary/10",
    textColor: "text-primary",
    description: "Combina retorno, demanda e estabilidade de forma consistente.",
    interpretation: "É o tipo de bairro que costuma funcionar bem para investidores que buscam previsibilidade. Não é o mais rentável nem o mais barato, mas oferece um equilíbrio difícil de encontrar.",
    icon: "Scale",
  },
  premium: {
    label: "Premium",
    color: "bg-violet-100",
    textColor: "text-violet-800",
    description: "Tem diárias mais altas e percepção de valor maior, embora nem sempre com melhor retorno percentual.",
    interpretation: "Bairros premium atraem hóspedes dispostos a pagar mais, mas o custo de aquisição do imóvel também é maior. O yield percentual pode ser inferior ao de bairros mais acessíveis.",
    icon: "Crown",
  },
  "alta-ocupacao": {
    label: "Alta ocupação",
    color: "bg-blue-100",
    textColor: "text-blue-800",
    description: "Mantém o imóvel ocupado com frequência acima da média, gerando fluxo de caixa mais constante.",
    interpretation: "Ideal para quem prioriza previsibilidade de receita. Alta ocupação reduz o risco de meses vazios, mas a diária média pode ser mais moderada.",
    icon: "CalendarCheck",
  },
  "alto-retorno": {
    label: "Alto retorno",
    color: "bg-emerald-100",
    textColor: "text-emerald-800",
    description: "Apresenta yield acima da média, com retorno percentual mais agressivo sobre o capital investido.",
    interpretation: "É o perfil que mais interessa quem quer maximizar o retorno sobre o investimento. Porém, alto retorno nem sempre vem com alta liquidez — é importante checar a demanda.",
    icon: "TrendingUp",
  },
  "oportunidade-arriscada": {
    label: "Oportunidade arriscada",
    color: "bg-red-100",
    textColor: "text-red-800",
    description: "Pode entregar retorno forte, mas exige maior tolerância a risco e gestão mais ativa.",
    interpretation: "Bairros neste perfil costumam ter yield atrativo no papel, porém combinado com liquidez baixa, dados menos robustos ou saturação elevada. É para investidores que aceitam mais incerteza.",
    icon: "AlertTriangle",
  },
  "crescimento-consistente": {
    label: "Crescimento consistente",
    color: "bg-amber-100",
    textColor: "text-amber-800",
    description: "Mostra sinais de valorização e expansão futura da demanda acima dos demais bairros.",
    interpretation: "Ideal para quem pensa no médio/longo prazo. O retorno atual pode não ser o maior, mas o bairro está em trajetória ascendente — o que pode significar diárias maiores e valorização do imóvel.",
    icon: "Sprout",
  },
};

export function getBairroProfile(b: BairroAirbnb, allBairros: BairroAirbnb[]): BairroProfileInfo {
  const maxADR = Math.max(...allBairros.map(x => Number(x.adr_medio_studio)));
  const maxYield = Math.max(...allBairros.map(x => Number(x.yield_bruto_airbnb)));
  const maxOcc = Math.max(...allBairros.map(x => Number(x.ocupacao_media_studio)));

  const rent = Number(b.score_rentabilidade);
  const liq = Number(b.score_liquidez);
  const cresc = Number(b.score_crescimento_potencial);
  const adr = Number(b.adr_medio_studio);
  const yld = Number(b.yield_bruto_airbnb);
  const occ = Number(b.ocupacao_media_studio);
  const confianca = b.nivel_confianca_dados?.toLowerCase();
  const saturacao = Number(b.grau_saturacao_index);

  // Premium: top ADR (check first — premium positioning overrides all)
  if (adr >= maxADR * 0.90) {
    const def = PROFILE_DEFS.premium;
    return { ...def, profile: "premium", quickRead: `Diárias entre as mais altas (R$${adr.toFixed(0)}), percepção premium` };
  }

  // High return: top yield — prioritized over "risky" even with high saturation
  if (yld >= maxYield * 0.80 && liq >= 50) {
    const def = PROFILE_DEFS["alto-retorno"];
    return { ...def, profile: "alto-retorno", quickRead: `Yield de ${(yld * 100).toFixed(1)}% — acima da maioria dos bairros` };
  }

  // Risky opportunity: high yield but low liquidity OR low confidence (saturation alone no longer triggers this)
  if (yld >= maxYield * 0.85 && (liq < 50 || confianca === "baixo")) {
    const def = PROFILE_DEFS["oportunidade-arriscada"];
    return { ...def, profile: "oportunidade-arriscada", quickRead: `Yield atrativo (${(yld * 100).toFixed(1)}%), mas com sinais de risco${liq < 50 ? " — liquidez abaixo do ideal" : ""}${confianca === "baixo" ? " — dados limitados" : ""}` };
  }

  // High occupancy: top 85% instead of 95%
  if (occ >= maxOcc * 0.85) {
    const def = PROFILE_DEFS["alta-ocupacao"];
    return { ...def, profile: "alta-ocupacao", quickRead: `Ocupação de ${(occ * 100).toFixed(0)}% — fluxo de caixa mais estável` };
  }

  // Consistent growth: lowered threshold from 65 to 55
  if (cresc >= 55 && cresc > rent * 0.9) {
    const def = PROFILE_DEFS["crescimento-consistente"];
    return { ...def, profile: "crescimento-consistente", quickRead: `Score de crescimento ${cresc.toFixed(0)} — trajetória ascendente` };
  }

  // Default: balanced
  const def = PROFILE_DEFS.equilibrado;
  return { ...def, profile: "equilibrado", quickRead: "Bom equilíbrio entre retorno, demanda e estabilidade" };
}

export function getAllProfileDefs() {
  return PROFILE_DEFS;
}

// ── Highlight winners ────────────────────────────────────────────
export interface HighlightWinner {
  category: string;
  icon: string;
  bairro: string;
  value: string;
  narrative: string;
}

export function getHighlightWinners(bairros: BairroAirbnb[]): HighlightWinner[] {
  if (!bairros.length) return [];

  const best = (fn: (b: BairroAirbnb) => number) => bairros.reduce((a, b) => fn(a) > fn(b) ? a : b);

  const bestEquilibrio = (() => {
    // balanced = highest average of three scores with lowest spread
    return bairros.reduce((a, b) => {
      const avgA = (Number(a.score_rentabilidade) + Number(a.score_liquidez) + Number(a.score_crescimento_potencial)) / 3;
      const avgB = (Number(b.score_rentabilidade) + Number(b.score_liquidez) + Number(b.score_crescimento_potencial)) / 3;
      const spreadA = Math.max(Number(a.score_rentabilidade), Number(a.score_liquidez), Number(a.score_crescimento_potencial)) - Math.min(Number(a.score_rentabilidade), Number(a.score_liquidez), Number(a.score_crescimento_potencial));
      const spreadB = Math.max(Number(b.score_rentabilidade), Number(b.score_liquidez), Number(b.score_crescimento_potencial)) - Math.min(Number(b.score_rentabilidade), Number(b.score_liquidez), Number(b.score_crescimento_potencial));
      const scoreA = avgA - spreadA * 0.3;
      const scoreB = avgB - spreadB * 0.3;
      return scoreA > scoreB ? a : b;
    });
  })();

  const bestRent = best(b => Number(b.yield_bruto_airbnb));
  const bestPremium = best(b => Number(b.adr_medio_studio));
  const bestOcc = best(b => Number(b.ocupacao_media_studio));
  const bestCresc = best(b => Number(b.score_crescimento_potencial));

  // Risky opportunity: high yield but low liquidity or low confidence
  const riskyCandidate = bairros
    .filter(b => Number(b.yield_bruto_airbnb) >= Number(bestRent.yield_bruto_airbnb) * 0.85)
    .find(b => Number(b.score_liquidez) < 55 || b.nivel_confianca_dados?.toLowerCase() === "baixo");

  return [
    {
      category: "Melhor equilíbrio geral",
      icon: "Scale",
      bairro: bestEquilibrio.bairro,
      value: `Score médio ${fmtScore((Number(bestEquilibrio.score_rentabilidade) + Number(bestEquilibrio.score_liquidez) + Number(bestEquilibrio.score_crescimento_potencial)) / 3)}`,
      narrative: `${bestEquilibrio.bairro} combina boa ocupação, yield forte e leitura geral positiva — o mais completo da amostra.`,
    },
    {
      category: "Bairro premium",
      icon: "Crown",
      bairro: bestPremium.bairro,
      value: `ADR ${fmtBRL(bestPremium.adr_medio_studio)}`,
      narrative: `${bestPremium.bairro} tem as diárias mais altas e forte percepção de valor, mas o custo de entrada é proporcionalmente maior.`,
    },
    {
      category: "Maior retorno potencial",
      icon: "Rocket",
      bairro: bestRent.bairro,
      value: `Yield ${fmtPct(bestRent.yield_bruto_airbnb)}`,
      narrative: `${bestRent.bairro} apresenta o yield mais alto da amostra — atrativo para quem busca maximizar retorno sobre capital.`,
    },
    {
      category: "Alta ocupação",
      icon: "Activity",
      bairro: bestOcc.bairro,
      value: `Ocupação ${fmtPct(bestOcc.ocupacao_media_studio)}`,
      narrative: `${bestOcc.bairro} mantém o imóvel ocupado com mais frequência — fluxo de caixa mais constante e previsível.`,
    },
    {
      category: "Crescimento consistente",
      icon: "TrendingUp",
      bairro: bestCresc.bairro,
      value: `Score ${fmtScore(bestCresc.score_crescimento_potencial)}`,
      narrative: `${bestCresc.bairro} mostra os melhores sinais de valorização e expansão futura da demanda.`,
    },
    ...(riskyCandidate ? [{
      category: "Oportunidade com mais risco",
      icon: "AlertTriangle",
      bairro: riskyCandidate.bairro,
      value: `Yield ${fmtPct(riskyCandidate.yield_bruto_airbnb)} · Liquidez ${fmtScore(riskyCandidate.score_liquidez)}`,
      narrative: `${riskyCandidate.bairro} tem retorno atrativo no papel, mas liquidez ou confiança dos dados pedem leitura mais cautelosa.`,
    }] : []),
  ];
}

// ── Auto-generated narrative insights ────────────────────────────
export function generateNarrativeInsights(bairros: BairroAirbnb[]): string[] {
  if (!bairros.length) return [];
  const winners = getHighlightWinners(bairros);
  const insights: string[] = [];

  // find equilibrado
  const eq = winners.find(w => w.category === "Melhor equilíbrio geral");
  if (eq) insights.push(`${eq.bairro} aparece como o bairro mais equilibrado da amostra, combinando boa ocupação, yield forte e boa rentabilidade geral.`);

  const premium = winners.find(w => w.category === "Bairro premium");
  if (premium) insights.push(`${premium.bairro} se destaca pelas diárias mais altas, reforçando o perfil premium do bairro, embora isso não resulte necessariamente no maior retorno percentual.`);

  // find high occ
  const occ = winners.find(w => w.category === "Maior tração operacional");
  if (occ) insights.push(`${occ.bairro} chama atenção pela ocupação forte e yield elevado, sugerindo boa tração operacional.`);

  // find high yield but low liquidity
  const ret = winners.find(w => w.category === "Maior retorno potencial");
  if (ret) {
    const retB = bairros.find(b => b.bairro === ret.bairro);
    if (retB && Number(retB.score_liquidez) < 65) {
      insights.push(`${ret.bairro} mostra o maior retorno potencial da tabela, mas com liquidez menor e confiança intermediária, o que pede leitura mais cautelosa.`);
    } else if (retB) {
      insights.push(`${ret.bairro} mostra o maior retorno potencial da tabela com ${fmtPct(retB.yield_bruto_airbnb)} de yield bruto.`);
    }
  }

  const cresc = winners.find(w => w.category === "Crescimento consistente");
  if (cresc) insights.push(`${cresc.bairro} aparece como uma alternativa consistente, com bom equilíbrio entre crescimento, ocupação e estabilidade.`);

  return insights;
}

// ── Bairro detail narrative builders ─────────────────────────────
export function buildHeaderNarrative(b: BairroAirbnb, profile: BairroProfileInfo): string {
  const map: Record<BairroProfile, string> = {
    equilibrado: `${b.bairro} se destaca como um dos bairros mais equilibrados para short stay na amostra, combinando boa ocupação, retorno forte e leitura geral positiva.`,
    premium: `${b.bairro} é o bairro com perfil premium da análise, com as diárias mais altas e forte percepção de valor entre investidores e hóspedes.`,
    "alta-ocupacao": `${b.bairro} se destaca pela alta ocupação, indicando forte demanda de hóspedes e boa tração operacional no short stay.`,
    "alto-retorno": `${b.bairro} apresenta o maior retorno potencial da amostra, com yield bruto elevado que pode atrair investidores com apetite por rentabilidade.`,
    "oportunidade-arriscada": `${b.bairro} mostra retorno potencialmente elevado, mas indicadores de liquidez e risco pedem uma leitura mais cautelosa.`,
    "crescimento-consistente": `${b.bairro} aparece como uma aposta de crescimento consistente, com sinais de valorização e expansão futura da demanda por short stay.`,
  };
  return map[profile.profile];
}

export function buildLeigosResumo(b: BairroAirbnb, profile: BairroProfileInfo): string[] {
  const items: string[] = [];
  items.push(`Cobra diária média de ${fmtBRL(b.adr_medio_studio)} por noite`);
  items.push(`Mantém ocupação de ${fmtPct(b.ocupacao_media_studio)} dos dias`);
  items.push(`Yield bruto de ${fmtPct(b.yield_bruto_airbnb)} ao ano no Airbnb`);
  if (Number(b.delta_yield) > 0.02) {
    items.push(`O Airbnb rende ${fmtPct(b.delta_yield)} a mais que o aluguel tradicional`);
  }
  if (profile.profile === "equilibrado") items.push("Parece mais equilibrado do que bairros mais caros");
  if (profile.profile === "premium") items.push("Posicionamento premium com diárias acima da média");
  return items;
}

export function buildExplicaResultado(b: BairroAirbnb): string[] {
  const items: string[] = [];
  if (Number(b.ocupacao_media_studio) > 0.65) items.push("Ocupação consistente acima de 65%");
  if (Number(b.delta_yield) > 0) items.push("Delta yield positivo — Airbnb supera aluguel tradicional");
  if (Number(b.score_rentabilidade) > 60) items.push("Boa rentabilidade geral");
  if (Number(b.score_liquidez) > 55) items.push("Liquidez razoável a boa");
  if (Number(b.score_crescimento_potencial) > 60) items.push("Bom potencial de crescimento futuro");
  if (Number(b.percentual_superhost) > 0.3) items.push(`${fmtPct(b.percentual_superhost)} dos hosts são superhosts`);
  return items;
}

export function buildPontosAtencao(b: BairroAirbnb, allBairros: BairroAirbnb[]): string[] {
  const items: string[] = [];
  const maxADR = Math.max(...allBairros.map(x => Number(x.adr_medio_studio)));
  if (Number(b.adr_medio_studio) < maxADR * 0.7) items.push("Diária abaixo da média dos bairros premium");
  if (Number(b.score_crescimento_potencial) < 50) items.push("Crescimento pode ser inferior a regiões em expansão");
  if (b.nivel_confianca_dados !== "alto") items.push("Confiança dos dados é intermediária, o que pode afetar a leitura");
  if (Number(b.grau_saturacao_index) > 0.6) items.push("Grau de saturação relativamente alto");
  if (Number(b.risco_regulatorio) > 0.5) items.push("Risco regulatório acima da média");
  if (Number(b.score_liquidez) < 50) items.push("Liquidez mais baixa — pode ser mais difícil manter ocupação estável");
  if (items.length === 0) items.push("Nenhum ponto crítico identificado com os dados atuais");
  return items;
}

export function buildShortVsLongNarrative(b: BairroAirbnb): string {
  const delta = Number(b.delta_yield);
  if (delta > 0.04) return `O Airbnb gera um retorno consideravelmente superior ao aluguel tradicional neste bairro (${fmtPct(delta)} a mais), reforçando o potencial de short stay. Ainda assim, esse ganho deve ser interpretado junto com liquidez e risco.`;
  if (delta > 0.01) return `O short stay tem uma vantagem moderada sobre o aluguel tradicional (${fmtPct(delta)} a mais). A decisão pode depender do perfil do investidor e da disposição para operar ativamente.`;
  return `A diferença entre short stay e aluguel tradicional é pequena neste bairro (${fmtPct(delta)}). Para investidores que preferem simplicidade, o aluguel tradicional pode fazer mais sentido.`;
}

export function buildInvestorProfile(profile: BairroProfileInfo): string[] {
  const map: Record<BairroProfile, string[]> = {
    equilibrado: ["Investidor que busca equilíbrio entre retorno e estabilidade", "Quem prefere menor risco operacional", "Primeiro investimento em short stay"],
    premium: ["Investidor que busca posicionamento nobre", "Quem prioriza ticket médio alto", "Perfil mais conservador com imóvel valorizado"],
    "alta-ocupacao": ["Investidor que busca fluxo constante de receita", "Quem prioriza menos dias vazios", "Perfil que valoriza previsibilidade"],
    "alto-retorno": ["Investidor que busca maximizar rentabilidade", "Perfil mais agressivo, aceita mais variação", "Quem prioriza retorno sobre ticket"],
    "oportunidade-arriscada": ["Investidor com apetite por risco maior", "Perfil especulativo, busca retorno acima do mercado", "Requer acompanhamento mais próximo da operação"],
    "crescimento-consistente": ["Investidor com visão de médio/longo prazo", "Quem aposta em valorização futura", "Perfil que aceita retorno menor hoje por ganho futuro"],
  };
  return map[profile.profile];
}

// ── Microcopy quotes ─────────────────────────────────────────────
export const MICROCOPY = [
  "Entenda o que realmente move o retorno no short stay.",
  "Compare bairros como um investidor, não como um turista.",
  "Preço alto por noite nem sempre significa melhor negócio.",
  "O melhor investimento está no equilíbrio, não apenas na diária.",
  "Use os scores como leitura estratégica, não como verdade absoluta.",
  "Confiança alta significa leitura mais consistente.",
  "Delta yield mostra quando o Airbnb supera o aluguel tradicional.",
  "Investment Score resume retorno, demanda, operação e futuro.",
  "Bairros baratos podem render mais do que bairros famosos.",
  "Liquidez baixa pode transformar um bom retorno num investimento difícil.",
  "O melhor bairro para investir depende do seu perfil, não da fama do bairro.",
  "Rentabilidade alta com dados de baixa confiança exige cautela redobrada.",
];

// ── Contextual microcopy by section ─────────────────────────────
export const SECTION_MICROCOPY: Record<string, { message: string; type: "insight" | "caution" | "opportunity" }> = {
  before_table: { message: "A tabela abaixo ordena bairros pelo Investment Score — uma combinação ponderada de retorno, demanda, operação e futuro.", type: "insight" },
  after_table: { message: "Números altos chamam atenção, mas o contexto é o que transforma dado em decisão.", type: "caution" },
  before_charts: { message: "Os gráficos abaixo detalham o comportamento do bairro ao longo do tempo. Sazonalidade e tendência importam tanto quanto a média.", type: "insight" },
  before_metrics: { message: "Esses são os dados brutos que alimentam os scores. Use-os para validar a leitura ou aprofundar sua análise.", type: "insight" },
  score_intro: { message: "O Investment Score não é uma recomendação de compra — é uma leitura comparativa que indica quais bairros parecem mais equilibrados para short stay.", type: "caution" },
  yield_comparison: { message: "Airbnb pode render mais que aluguel tradicional, mas exige gestão ativa. O delta yield mostra a diferença, não a garantia.", type: "caution" },
  true_yield: { message: "O True Yield é uma conta direta, sem ajustes. Serve como referência rápida — não como projeção financeira.", type: "insight" },
  profile_intro: { message: "Cada bairro tem um perfil que ajuda a entender para quem ele faz sentido, independente de ser o 'melhor' da tabela.", type: "opportunity" },
  investor_match: { message: "Não existe bairro perfeito — existe o bairro certo para o seu perfil de investidor.", type: "opportunity" },
  // Journey step transitions
  journey_context: { message: "Entenda o que realmente move o retorno no short stay.", type: "insight" },
  journey_highlights: { message: "Compare bairros como um investidor, não como um turista.", type: "insight" },
  journey_indicators: { message: "Preço alto por noite nem sempre significa melhor negócio.", type: "caution" },
  journey_learnings: { message: "O melhor investimento está no equilíbrio, não apenas na diária.", type: "insight" },
  journey_ranking: { message: "Investment Score resume retorno, demanda, operação e futuro.", type: "insight" },
  journey_profile: { message: "Confiança alta significa leitura mais consistente.", type: "caution" },
  journey_explore: { message: "Delta yield mostra quando o Airbnb supera o aluguel tradicional.", type: "insight" },
  journey_recommendation: { message: "Use os scores como leitura estratégica, não como verdade absoluta.", type: "caution" },
};

// ── Key education messages ───────────────────────────────────────
export const EDUCATION_MESSAGES = [
  { title: "Diária premium ≠ maior rentabilidade", text: "Cobrar mais por noite não garante melhor retorno final. O que importa é o equilíbrio entre diária, ocupação e preço do imóvel." },
  { title: "Os melhores retornos nem sempre estão nos bairros mais óbvios", text: "Bairros intermediários podem gerar melhor retorno percentual porque o imóvel custa menos para comprar." },
  { title: "Retorno alto com liquidez baixa pode significar mais risco", text: "Não adianta o retorno parecer ótimo no papel se for mais difícil manter ocupação ou estabilidade." },
  { title: "O melhor investimento está no equilíbrio", text: "O melhor resultado costuma aparecer onde existe equilíbrio entre preço da diária, ocupação, retorno do imóvel e potencial do bairro." },
];

// ── Table highlights ─────────────────────────────────────────────
export interface TableHighlight {
  bairro: string;
  type: "max-adr" | "max-occ" | "max-yield" | "best-balance" | "max-risk";
}

export function getTableHighlights(bairros: BairroAirbnb[]): TableHighlight[] {
  if (!bairros.length) return [];
  const best = (fn: (b: BairroAirbnb) => number) => bairros.reduce((a, b) => fn(a) > fn(b) ? a : b);
  const worst = (fn: (b: BairroAirbnb) => number) => bairros.reduce((a, b) => fn(a) < fn(b) ? a : b);

  return [
    { bairro: best(b => Number(b.adr_medio_studio)).bairro, type: "max-adr" },
    { bairro: best(b => Number(b.ocupacao_media_studio)).bairro, type: "max-occ" },
    { bairro: best(b => Number(b.yield_bruto_airbnb)).bairro, type: "max-yield" },
    { bairro: getHighlightWinners(bairros)[0]?.bairro ?? "", type: "best-balance" },
  ];
}
