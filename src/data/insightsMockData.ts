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
      { icon: "brain", title: "Perfil dominante: Família em expansão", insight: "64% dos leads buscam mais espaço ou proximidade do trabalho. Sempre abra a reunião entendendo a rotina da família." },
      { icon: "shield", title: "Objeção #1 é preço (35%)", insight: "Reforce o diferencial de metragem e a proximidade do Metrô Vila Mariana (900m) para justificar o valor." },
      { icon: "target", title: "Sinal forte de compra", insight: "Pedido de 2ª visita ao decorado com cônjuge/família antecede fechamento em 68% dos casos — priorize agenda." },
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
            { description: "Preço está acima do praticado por outros lançamentos da região." },
            { description: "Dúvida sobre o prazo de entrega da torre." },
            { description: "Receio com o valor do condomínio." },
          ],
        },
        positive_point: { count: 112, examples: [] },
        objection_handling: { count: 71, examples: [] },
        potential_loss: { count: 19, examples: [] },
        future_promise: { count: 63, examples: [] },
        score_conversion: { count: 47, examples: [] },
      },
      answerScores: [
        { question: "Clareza sobre tipologias disponíveis", avg: 8.4, count: 47 },
        { question: "Confiança na incorporadora e entrega", avg: 7.6, count: 42 },
        { question: "Percepção de localização e mobilidade", avg: 8.9, count: 45 },
        { question: "Aderência ao perfil da família compradora", avg: 7.1, count: 39 },
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
            { objection: "Valor do condomínio", count: 4 },
          ],
        },
        {
          windowDays: 60, meetings: 34, avgScore: 74, positiveSentimentPct: 61,
          topObjections: [
            { objection: "Preço acima do mercado", count: 12 },
            { objection: "Concorrência na região", count: 8 },
            { objection: "Valor do condomínio", count: 7 },
          ],
        },
        {
          windowDays: 90, meetings: 47, avgScore: 72, positiveSentimentPct: 58,
          topObjections: [
            { objection: "Preço acima do mercado", count: 18 },
            { objection: "Valor do condomínio", count: 11 },
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
        "Comprador de 28–50 anos, em fase de mudança de vida (casamento, filhos ou troca de imóvel), que busca morar em Vila Mariana pela mobilidade (metrô a 900m), infraestrutura de lazer e educação, priorizando qualidade de vida no dia a dia.",
      ageRange: "28–50 anos",
      avgTicket: "R$ 650 mil – R$ 1,1 mi",
      professions: ["Executivos", "Profissionais liberais", "Casais jovens", "Famílias com filhos", "Servidores públicos"],
      motivations: [
        "Morar perto do trabalho e do metrô",
        "Trocar apartamento por um maior (garden/terraço)",
        "Primeiro imóvel próprio na região",
        "Qualidade de vida em bairro consolidado",
      ],
    },
    personalityProfiles: [
      {
        type: "Comprador Analítico",
        frequency: "alta",
        description:
          "Chega com pesquisas de mercado prontas. Compara metragem, valor do m² e prazo de entrega com outros lançamentos da região.",
        approachStrategy:
          "Traga dados comparativos de mercado em Vila Mariana e memorial de acabamentos detalhado. Deixe ele conferir a planta com calma.",
        pitfalls: "Não use argumentos emocionais sem dados concretos por trás.",
      },
      {
        type: "Executivo Ocupado",
        frequency: "alta",
        description:
          "Tem pouco tempo disponível. Quer decisão rápida, visita objetiva ao decorado e clareza sobre prazo de entrega.",
        approachStrategy:
          "Reuniões curtas e objetivas, com resumo executivo por escrito e agenda flexível para visita ao decorado.",
        pitfalls: "Evite reuniões longas ou envio de documentos densos sem resumo.",
      },
      {
        type: "Comprador de Primeira Viagem",
        frequency: "média",
        description:
          "Primeira compra de imóvel. Muitas dúvidas conceituais sobre financiamento, documentação e prazo de obra.",
        approachStrategy:
          "Eduque com linguagem simples sobre financiamento e etapas da obra. Mostre casos de clientes com perfil parecido.",
        pitfalls: "Não sobrecarregue com jargão técnico do mercado imobiliário.",
      },
      {
        type: "Família em Expansão",
        frequency: "média",
        description:
          "Busca trocar o imóvel atual por um com mais espaço (garden ou terraço). Decisão compartilhada com o cônjuge.",
        approachStrategy:
          "Foque em metragem, área de lazer do condomínio e proximidade de escolas. Convide o casal junto para a visita.",
        pitfalls: "Não conduza a conversa apenas com um dos decisores.",
      },
      {
        type: "Comprador Prático",
        frequency: "baixa",
        description:
          "Já conhece a região e decide rápido se enxergar valor. Prioriza studio ou 1 dormitório para uso próprio.",
        approachStrategy:
          "Destaque a mobilidade (metrô a 900m) e a praticidade do dia a dia perto de serviços e comércio.",
        pitfalls: "Não repita informações básicas que ele já pesquisou.",
      },
    ],
    topQuestions: [
      {
        question: "Qual a data prevista de entrega da torre?",
        frequency: "alta", evidenceCount: 22, frequencyPct: 47,
        idealAnswer:
          "A previsão de entrega está no memorial de incorporação. Trazemos o cronograma físico-financeiro atualizado na reunião de reserva.",
        context: "Surge logo após a apresentação das tipologias, quando o comprador quer se planejar.",
        evidence: [],
      },
      {
        question: "Quais as opções de tipologia disponíveis?",
        frequency: "alta", evidenceCount: 19, frequencyPct: 40,
        idealAnswer:
          "Temos unidades Garden, Terraço e Studio 1 dormitório, com plantas e metragens variadas. Posso enviar a tabela completa com disponibilidade.",
        context: "Aparece quando o comprador pergunta 'quais opções eu tenho hoje?'",
        evidence: [],
      },
      {
        question: "Como funciona o financiamento e as condições de pagamento?",
        frequency: "média", evidenceCount: 14, frequencyPct: 30,
        idealAnswer:
          "Trabalhamos com entrada parcelada, saldo financiável na entrega e parcerias com os principais bancos. Podemos simular junto com você.",
        context: "Costuma surgir na segunda reunião, após o comprador avaliar o orçamento em casa.",
        evidence: [],
      },
      {
        question: "Vocês têm outros empreendimentos entregues na região?",
        frequency: "média", evidenceCount: 12, frequencyPct: 26,
        idealAnswer:
          "Sim, temos histórico de entregas na região. Podemos agendar uma visita a um empreendimento já concluído.",
        context: "Surge quando o comprador quer validar a confiabilidade da incorporadora.",
        evidence: [],
      },
      {
        question: "Como é a mobilidade e o acesso ao metrô?",
        frequency: "média", evidenceCount: 9, frequencyPct: 19,
        idealAnswer:
          "O Vila Park fica a 900m do Metrô Vila Mariana e a 1,1km do Metrô Ana Rosa, com fácil acesso à Av. Paulista e ao restante da cidade.",
        context: "Perfil executivo ou família costuma perguntar sobre deslocamento diário.",
        evidence: [],
      },
    ],
    objections: [
      {
        objection: "Preço está acima de outros lançamentos que vi na região",
        frequency: "alta", evidenceCount: 18, frequencyPct: 38,
        rebuttal:
          "Comparação por m² não captura o diferencial de acabamento, área de lazer e localização a 900m do metrô. O valor reflete a qualidade construtiva do Vila Park.",
        evidence: [],
      },
      {
        objection: "Prazo de entrega é longo demais",
        frequency: "alta", evidenceCount: 11, frequencyPct: 23,
        rebuttal:
          "O cronograma segue o memorial de incorporação, com parcelas escalonadas até a entrega, o que facilita o planejamento financeiro.",
        evidence: [],
      },
      {
        objection: "Não sei se o valor do condomínio cabe no orçamento",
        frequency: "média", evidenceCount: 9, frequencyPct: 19,
        rebuttal:
          "O valor estimado do condomínio está descrito no memorial, considerando a infraestrutura de lazer e portaria. Podemos detalhar item a item.",
        evidence: [],
      },
      {
        objection: "Prefiro comprar um imóvel pronto",
        frequency: "média", evidenceCount: 7, frequencyPct: 15,
        rebuttal:
          "Comprar na planta permite escolher a melhor unidade disponível e parcelar a entrada até a entrega, além do potencial de valorização durante a obra.",
        evidence: [],
      },
      {
        objection: "Tenho receio sobre a região no futuro",
        frequency: "baixa", evidenceCount: 5, frequencyPct: 11,
        rebuttal:
          "Vila Mariana é um bairro já consolidado, com infraestrutura completa de mobilidade, lazer, educação e serviços — não depende de expectativa futura.",
        evidence: [],
      },
    ],
    hiddenObjections: [
      {
        objection: "Medo de assinar contrato longo com a incorporadora",
        signals: "Perguntas insistentes sobre distrato e cláusulas de saída.",
        approach: "Deixe claro desde o início as condições contratuais e ofereça o memorial de incorporação para leitura calma.",
      },
      {
        objection: "Insegurança sobre a solidez da incorporadora",
        signals: "Pesquisas online durante a reunião, perguntas sobre outros empreendimentos.",
        approach: "Envie material institucional e ofereça visita a um empreendimento já entregue.",
      },
      {
        objection: "Comparação inconsciente com aluguel atual",
        signals: "Menciona 'e se eu continuar alugando?' em tom retórico.",
        approach: "Traga simulação comparando parcela de financiamento com o valor do aluguel atual pago pelo cliente.",
      },
    ],
    buyingSignals: [
      { signal: "Pergunta sobre unidades específicas disponíveis", meaning: "Alto interesse — passou da fase de avaliação genérica." },
      { signal: "Menciona conversar com cônjuge ou família", meaning: "Está validando decisão — avanço para próxima etapa." },
      { signal: "Pede segunda visita com cônjuge/família", meaning: "Sinal forte — quer alinhar decisão em conjunto." },
      { signal: "Pergunta sobre condições de financiamento e ITBI", meaning: "Está aterrissando na parte prática — proximidade do fechamento." },
      { signal: "Solicita ver planta em tamanho maior ou visitar o decorado", meaning: "Engajamento emocional — quer visualizar a compra." },
    ],
    closingArguments: [
      {
        argument: "Localização consolidada em Vila Mariana",
        when: "Quando o comprador está comparando com outros bairros",
        example: "Bairro com infraestrutura completa de metrô, educação, lazer e serviços já estabelecida.",
      },
      {
        argument: "Metrô Vila Mariana a 900m",
        when: "Contra objeção de mobilidade",
        example: "Menos de 10 minutos a pé até o Metrô Vila Mariana, com acesso direto à Av. Paulista.",
      },
      {
        argument: "Diversidade de tipologias (Garden, Terraço, Studio)",
        when: "Perfil família em expansão ou comprador prático",
        example: "Há opção para cada momento de vida: do studio 1 dorm ao garden com mais espaço.",
      },
      {
        argument: "Valorização durante a obra",
        when: "Objeção de prazo",
        example: "Comprar na planta permite parcelar a entrada e acompanhar a valorização até a entrega.",
      },
    ],
    actionItems: [
      { priority: "alta", item: "Preparar tabela comparativa de tipologias para próxima reunião", owner: "Corretor" },
      { priority: "alta", item: "Enviar case de cliente já morando em empreendimento entregue", owner: "Marketing" },
      { priority: "média", item: "Agendar visita ao decorado do Vila Park", owner: "Corretor" },
      { priority: "média", item: "Compartilhar memorial de incorporação após primeira reunião", owner: "Corretor" },
      { priority: "baixa", item: "Preparar material sobre condições de financiamento", owner: "Marketing" },
    ],
    sentimentSummary:
      "Predominância positiva (62%) com objeções concentradas em preço e valor do condomínio. Compradores analíticos convertem melhor com tabela comparativa e memorial detalhado. Famílias em expansão respondem bem a visitas conjuntas ao decorado.",
  };
  return { ...base, ...overrides };
}

export const MOCK_CORRETORES = [
  { id: "mock-amanda", name: "Amanda Silva", email: "amanda@vilapark.com.br" },
  { id: "mock-juliana", name: "Juliana Costa", email: "juliana@vilapark.com.br" },
  { id: "mock-rafael", name: "Rafael Mendes", email: "rafael@vilapark.com.br" },
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
