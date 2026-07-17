/**
 * Fixed fictitious insights data for the /insights page.
 * Used as a static demo so the dashboard always renders consistently,
 * regardless of the elephant-insights edge function status.
 */

const totalForFrequency = 47;

function makeDashboard(overrides: Partial<any> = {}) {
  const base = {
    __mock: true,
    executiveTakeaways: [
      { icon: "brain", title: "Perfil dominante: Analítico", insight: "68% dos investidores decidem por dados. Sempre abra a reunião com AirDNA + simulador ao vivo." },
      { icon: "shield", title: "Objeção #1 é preço (38%)", insight: "Reforce diferencial de design (+30% ocupação) e yield líquido 30% acima da média da região." },
      { icon: "target", title: "Sinal forte de compra", insight: "Pedido de 2ª reunião com cônjuge/sócio antecede fechamento em 71% dos casos — priorize agenda." },
    ],
    metrics: {
      totalForFrequency,
      noShowCount: 6,
      scheduledCount: 53,
      avgSentiment: { positive: 62, neutral: 21, mixed: 11, negative: 6 },
      reasonsByType: {
        objection: {
          count: 84,
          examples: [
            { description: "Preço está acima do praticado por outros studios da região." },
            { description: "Dúvida sobre a real ocupação prometida no cenário Airbnb." },
            { description: "Receio da entrega no prazo (dezembro/2026)." },
          ],
        },
        positive_point: { count: 112, examples: [] },
        objection_handling: { count: 71, examples: [] },
        potential_loss: { count: 19, examples: [] },
        future_promise: { count: 63, examples: [] },
        score_conversion: { count: 47, examples: [] },
      },
      answerScores: [
        { question: "Clareza sobre rentabilidade projetada", avg: 8.4, count: 47 },
        { question: "Confiança na incorporadora e entrega", avg: 7.6, count: 42 },
        { question: "Percepção de localização e demanda", avg: 8.9, count: 45 },
        { question: "Aderência ao perfil do investidor", avg: 7.1, count: 39 },
        { question: "Objeção de preço tratada com dados", avg: 6.3, count: 34 },
      ],
      competitors: [
        { name: "Vitacon", mentions: 14 },
        { name: "You Inc", mentions: 9 },
        { name: "Setin", mentions: 5 },
        { name: "Cyrela", mentions: 4 },
        { name: "Helbor", mentions: 2 },
      ],
    },
    trends: {
      windows: [
        {
          windowDays: 30, meetings: 18, avgScore: 78, positiveSentimentPct: 66,
          topObjections: [
            { objection: "Preço acima do mercado", count: 7 },
            { objection: "Prazo de entrega longo", count: 5 },
            { objection: "Ocupação Airbnb realista?", count: 4 },
          ],
        },
        {
          windowDays: 60, meetings: 34, avgScore: 74, positiveSentimentPct: 61,
          topObjections: [
            { objection: "Preço acima do mercado", count: 12 },
            { objection: "Concorrência na região", count: 8 },
            { objection: "Ocupação Airbnb realista?", count: 7 },
          ],
        },
        {
          windowDays: 90, meetings: 47, avgScore: 72, positiveSentimentPct: 58,
          topObjections: [
            { objection: "Preço acima do mercado", count: 18 },
            { objection: "Ocupação Airbnb realista?", count: 11 },
            { objection: "Prazo de entrega longo", count: 9 },
          ],
        },
      ],
      delta30vs60: { meetings: 2, avgScore: 4, positiveSentimentPct: 5 },
      weekly: Array.from({ length: 12 }).map((_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (11 - i) * 7);
        const iso = d.toISOString().slice(0, 10);
        const meetings = [2, 3, 4, 3, 5, 4, 6, 5, 7, 6, 8, 7][i];
        const avgScore = [65, 68, 70, 69, 72, 74, 73, 76, 75, 78, 79, 82][i];
        return { weekStart: iso, label: `S${i + 1}`, meetings, avgScore };
      }),
    },
    buyerPersona: {
      summary:
        "Investidor de 34–52 anos, executivo de médio/alto escalão ou profissional liberal, que busca renda passiva em imóveis com gestão simplificada e valorização de médio prazo em bairros premium de São Paulo.",
      ageRange: "34–52 anos",
      avgTicket: "R$ 850 mil – R$ 1,2 mi",
      professions: ["Executivos", "Médicos", "Advogados", "Empresários", "Engenheiros"],
      motivations: [
        "Diversificar carteira além de renda fixa",
        "Renda passiva mensal previsível",
        "Valorização em bairro consolidado",
        "Proteção contra inflação",
      ],
    },
    personalityProfiles: [
      {
        type: "Investidor Analítico",
        frequency: "alta",
        description:
          "Chega com planilhas e questiona cada premissa. Compara ADR, ocupação e yield com benchmarks públicos (AirDNA, mercado).",
        approachStrategy:
          "Traga fontes primárias (AirDNA, IBGE, comparáveis reais). Ofereça o simulador para ele mesmo ajustar as premissas.",
        pitfalls: "Não use argumentos emocionais nem projeções otimistas sem dados por trás.",
      },
      {
        type: "Executivo Ocupado",
        frequency: "alta",
        description:
          "Tem capital, mas pouco tempo. Quer solução turnkey e clareza sobre quem opera o imóvel no dia a dia.",
        approachStrategy:
          "Enfatize gestão Bwild (turnkey), relatórios mensais e zero dor de cabeça. Reuniões curtas e objetivas.",
        pitfalls: "Evite reuniões longas ou envio de documentos densos sem resumo executivo.",
      },
      {
        type: "Investidor Iniciante",
        frequency: "média",
        description:
          "Primeira compra para investimento. Muitas dúvidas conceituais sobre Airbnb, tributação e como funciona a operação.",
        approachStrategy:
          "Eduque com o Guia do Investidor. Simplifique termos e mostre casos de investidores similares.",
        pitfalls: "Não sobrecarregue com jargão técnico. Não pule a etapa de contextualização.",
      },
      {
        type: "Comprador Conservador",
        frequency: "média",
        description:
          "Prefere renda fixa e compara tudo com CDI. Busca segurança acima de tudo e teme volatilidade.",
        approachStrategy:
          "Foque em spread vs CDI + valorização patrimonial. Mostre histórico de valorização da região.",
        pitfalls: "Não prometa retornos agressivos. Evite comparar com ativos de alto risco.",
      },
      {
        type: "Colecionador de Ativos",
        frequency: "baixa",
        description:
          "Já tem múltiplos imóveis e busca completar portfólio em bairros premium. Decisão rápida se enxergar valor.",
        approachStrategy:
          "Destaque exclusividade da localização (Bela Cintra), diferencial arquitetônico e potencial de valorização.",
        pitfalls: "Não trate como investidor iniciante nem repita informações básicas.",
      },
    ],
    topQuestions: [
      {
        question: "Qual a ocupação realista do Airbnb no primeiro ano?",
        frequency: "alta", evidenceCount: 22, frequencyPct: 47,
        idealAnswer:
          "Trabalhamos com premissa conservadora de 65% no primeiro ano, subindo para 75%+ a partir do segundo. AirDNA aponta 78% de média para studios na região.",
        context: "Surge logo após apresentação do yield projetado, quando o investidor quer validar a premissa.",
        evidence: [],
      },
      {
        question: "Quem faz a gestão operacional do imóvel?",
        frequency: "alta", evidenceCount: 19, frequencyPct: 40,
        idealAnswer:
          "A Bwild oferece gestão turnkey: precificação dinâmica, atendimento 24/7, limpeza, manutenção e relatórios mensais. O investidor não toca em nada.",
        context: "Aparece quando o investidor pergunta 'e depois de pronto, como funciona?'",
        evidence: [],
      },
      {
        question: "Como funciona a tributação da receita de Airbnb?",
        frequency: "média", evidenceCount: 14, frequencyPct: 30,
        idealAnswer:
          "Pessoa física: carnê-leão até R$ 27,5% (com deduções). Vale estudar PJ acima de ~R$ 8k/mês. Podemos indicar contador especializado.",
        context: "Costuma surgir na segunda reunião, após o investidor discutir com contador.",
        evidence: [],
      },
      {
        question: "Vocês têm cases de investidores que já receberam?",
        frequency: "média", evidenceCount: 12, frequencyPct: 26,
        idealAnswer:
          "Sim, temos 3 empreendimentos entregues e 47 investidores recebendo mensalmente. Podemos agendar conversa com um deles.",
        context: "Surge quando o investidor demonstra ceticismo sobre a operação real.",
        evidence: [],
      },
      {
        question: "E se a regulação de Airbnb mudar em São Paulo?",
        frequency: "média", evidenceCount: 9, frequencyPct: 19,
        idealAnswer:
          "O studio funciona também como aluguel de temporada (30d+) e long-term. Nosso modelo é híbrido, então mitigamos o risco regulatório.",
        context: "Perfil analítico ou conservador levanta como risco macro.",
        evidence: [],
      },
    ],
    objections: [
      {
        objection: "Preço está acima de outros studios que vi na região",
        frequency: "alta", evidenceCount: 18, frequencyPct: 38,
        rebuttal:
          "Comparação por m² não captura design otimizado + gestão turnkey. Nosso yield líquido é 30% acima da média AirDNA da região.",
        evidence: [],
      },
      {
        objection: "Prazo de entrega em dez/2026 é longo demais",
        frequency: "alta", evidenceCount: 11, frequencyPct: 23,
        rebuttal:
          "A valorização durante a obra (VGV) historicamente supera 25% em Jardins/Bela Cintra. E a parcela é escalonada até a entrega.",
        evidence: [],
      },
      {
        objection: "Não confio na projeção de ocupação",
        frequency: "média", evidenceCount: 9, frequencyPct: 19,
        rebuttal:
          "Usamos dados AirDNA (públicos) + histórico de 3 empreendimentos entregues. Cenário conservador está no simulador para o investidor testar.",
        evidence: [],
      },
      {
        objection: "Prefiro comprar pronto e alugar direto",
        frequency: "média", evidenceCount: 7, frequencyPct: 15,
        rebuttal:
          "Pronto: perde valorização + 40–50% do yield potencial (Airbnb vs long-term). Compare o cenário completo no simulador.",
        evidence: [],
      },
      {
        objection: "E se o mercado de Airbnb saturar?",
        frequency: "baixa", evidenceCount: 5, frequencyPct: 11,
        rebuttal:
          "Bela Cintra tem barreira de entrada altíssima (poucos terrenos). Além disso, modelo híbrido (temporada + long-term) mitiga saturação.",
        evidence: [],
      },
    ],
    hiddenObjections: [
      {
        objection: "Medo de ficar preso a uma operadora",
        signals: "Perguntas insistentes sobre contrato de gestão e cláusulas de saída.",
        approach: "Deixe claro desde o início: contrato de 12 meses, renovação opcional, transparência total nos relatórios.",
      },
      {
        objection: "Insegurança sobre a solidez da incorporadora",
        signals: "Pesquisas online durante a reunião, perguntas sobre outros empreendimentos.",
        approach: "Envie institucional Bwild + tour virtual de empreendimentos entregues. Ofereça conversa com investidores atuais.",
      },
      {
        objection: "Comparação inconsciente com CDI",
        signals: "Menciona 'e se eu deixar no CDB?' em tom retórico.",
        approach: "Traga o gráfico de yield líquido + valorização vs CDI de 5 anos. O spread real é 4-6 pp a.a.",
      },
    ],
    buyingSignals: [
      { signal: "Pergunta sobre unidades específicas disponíveis", meaning: "Alto interesse — passou da fase de avaliação genérica." },
      { signal: "Menciona conversar com contador ou família", meaning: "Está validando decisão — avanço para próxima etapa." },
      { signal: "Pede segunda reunião com sócio/cônjuge", meaning: "Sinal forte — quer alinhar decisão a dois." },
      { signal: "Pergunta sobre condições de financiamento e ITBI", meaning: "Está aterrissando na parte prática — proximidade do fechamento." },
      { signal: "Solicita ver planta em tamanho maior ou visitar stand", meaning: "Engajamento emocional — quer visualizar a compra." },
    ],
    closingArguments: [
      {
        argument: "Escassez de terrenos em Bela Cintra",
        when: "Quando o investidor está comparando com outros bairros",
        example: "Apenas 3 empreendimentos novos previstos para a região nos próximos 24 meses.",
      },
      {
        argument: "Diferencial de design Bwild (+30% ocupação)",
        when: "Contra objeção de preço",
        example: "Projetos com nossa curadoria têm 30% mais ocupação vs padrão de mercado (dados AirDNA).",
      },
      {
        argument: "Gestão turnkey completa",
        when: "Perfil executivo ocupado",
        example: "Você recebe relatório mensal, dinheiro na conta, e não precisa se envolver com nada operacional.",
      },
      {
        argument: "Valorização durante a obra",
        when: "Objeção de prazo",
        example: "Histórico mostra 25%+ de valorização até a entrega em Jardins/Bela Cintra.",
      },
    ],
    actionItems: [
      { priority: "alta", item: "Preparar comparativo yield vs CDI para próxima reunião", owner: "Corretor" },
      { priority: "alta", item: "Enviar case de investidor Bwild já recebendo", owner: "Marketing" },
      { priority: "média", item: "Agendar visita ao stand de vendas", owner: "Corretor" },
      { priority: "média", item: "Compartilhar Guia do Investidor após primeira reunião", owner: "Corretor" },
      { priority: "baixa", item: "Preparar material sobre tributação Airbnb", owner: "Marketing" },
    ],
    sentimentSummary:
      "Predominância positiva (62%) com objeções concentradas em preço e ocupação. Investidores analíticos convertem melhor com dados AirDNA e simulador. Perfil conservador exige comparação explícita com CDI.",
  };
  return { ...base, ...overrides };
}

export const MOCK_CORRETORES = [
  { id: "mock-amanda", name: "Amanda Silva", email: "amanda@bwild.com.br" },
  { id: "mock-juliana", name: "Juliana Costa", email: "juliana@bwild.com.br" },
  { id: "mock-rafael", name: "Rafael Mendes", email: "rafael@bwild.com.br" },
];

export const MOCK_CORRETOR_DATA: Record<string, {
  amandaName: string;
  totalMeetings: number;
  totalDurationMinutes: number;
  positiveSentimentPct: number;
  latestMeeting: string;
  dashboard: any;
}> = {
  "mock-amanda": {
    amandaName: "Amanda Silva",
    totalMeetings: 28,
    totalDurationMinutes: 1420,
    positiveSentimentPct: 68,
    latestMeeting: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    dashboard: makeDashboard(),
  },
  "mock-juliana": {
    amandaName: "Juliana Costa",
    totalMeetings: 19,
    totalDurationMinutes: 980,
    positiveSentimentPct: 58,
    latestMeeting: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    dashboard: makeDashboard({
      metrics: {
        ...makeDashboard().metrics,
        avgSentiment: { positive: 58, neutral: 24, mixed: 12, negative: 6 },
      },
    }),
  },
  "mock-rafael": {
    amandaName: "Rafael Mendes",
    totalMeetings: 12,
    totalDurationMinutes: 620,
    positiveSentimentPct: 71,
    latestMeeting: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    dashboard: makeDashboard({
      metrics: {
        ...makeDashboard().metrics,
        avgSentiment: { positive: 71, neutral: 18, mixed: 8, negative: 3 },
      },
    }),
  },
};

export const MOCK_CONSOLIDATED = {
  totalMeetings: 59,
  totalDurationMinutes: 3020,
  corretoresCount: 3,
  latestMeeting: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
  noShowCount: 6,
  scheduledCount: 53,
  noShowRate: Math.round((6 / 53) * 100),
  cached: true,
  cacheAge: 12,
  dashboard: makeDashboard(),
};
