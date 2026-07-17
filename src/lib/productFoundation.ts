/**
 * ═══════════════════════════════════════════════════════════════
 * SHORT STAY INTELLIGENCE — SÃO PAULO
 * Fase 1: Fundamentação do Produto
 * ═══════════════════════════════════════════════════════════════
 *
 * Este arquivo define a identidade, missão, público e tom do módulo.
 * TODAS as fases seguintes (UX, storytelling, score, interpretação)
 * devem herdar e respeitar estas definições.
 *
 * Princípio central:
 *   "Transformar dados em decisão."
 *
 * Diretriz principal:
 *   O módulo deve parecer um consultor digital, não uma planilha.
 * ═══════════════════════════════════════════════════════════════
 */

// ─── Identidade do Produto ──────────────────────────────────────

export const PRODUCT = {
  name: "Short Stay Intelligence",
  subtitle: "São Paulo",
  tagline: "Inteligência consultiva para investimento em short stay",
  mission:
    "Ajudar investidores leigos e semi-leigos a entender, comparar e decidir onde investir em studios para short stay em São Paulo — traduzindo dados complexos em leitura estratégica simples e acionável.",
  principle: "Transformar dados em decisão.",
  directive: "O módulo deve parecer um consultor digital, não uma planilha.",
} as const;

// ─── Público-Alvo ───────────────────────────────────────────────

export const AUDIENCE = {
  primary: "Investidor leigo ou semi-leigo",
  description:
    "Pessoa que tem interesse em investir em imóveis para short stay, mas não domina terminologia financeira avançada nem tem experiência prévia com Airbnb como operação de investimento.",
  needs: [
    "Entender qual bairro parece melhor para investir",
    "Saber onde o Airbnb rende mais do que aluguel tradicional",
    "Comparar bairros de forma clara e sem jargões",
    "Identificar onde há equilíbrio entre retorno e risco",
    "Diferenciar bairro premium de bairro rentável",
    "Tirar insights práticos para decisão de compra",
  ],
  questions: [
    "Qual bairro parece melhor para investir?",
    "Onde há mais equilíbrio?",
    "Onde existe maior retorno?",
    "Onde existe mais risco?",
    "Onde o Airbnb supera o aluguel tradicional?",
    "O que cada indicador significa na prática?",
    "Vale mais short stay ou aluguel comum?",
    "Qual a diferença entre bairro premium e bairro rentável?",
  ],
} as const;

// ─── Tom e Voz ──────────────────────────────────────────────────

export const TONE = {
  attributes: ["premium", "consultivo", "didático", "estratégico"] as const,
  description:
    "A comunicação deve soar como um consultor de investimentos experiente explicando para um amigo inteligente que não é do mercado. Nunca condescendente, nunca técnico demais.",
  rules: [
    "Usar linguagem simples sem ser simplista",
    "Explicar o 'por quê', não apenas o 'o quê'",
    "Traduzir números em significado prático",
    "Preferir frases curtas e diretas",
    "Evitar jargão financeiro sem explicação",
    "Não usar superlativos vazios — ser específico",
    "Sempre contextualizar: comparar, relativizar, exemplificar",
    "Tratar o investidor como alguém capaz, apenas inexperiente",
  ],
  avoid: [
    "Linguagem de planilha (ex: 'valor: 13.7%' sem contexto)",
    "Tom acadêmico ou técnico excessivo",
    "Recomendações absolutas ('este é o melhor bairro')",
    "Jargões sem tradução (cap rate, RevPAR sem explicar)",
    "Promessas de resultado garantido",
  ],
} as const;

// ─── Perguntas-Chave que o Produto Deve Responder ──────────────

export const CORE_QUESTIONS = [
  {
    id: "best-investment",
    question: "Qual bairro parece melhor para investir?",
    how: "Cruzando rentabilidade, liquidez e crescimento para identificar equilíbrio, não apenas o maior número isolado.",
  },
  {
    id: "best-balance",
    question: "Onde há mais equilíbrio?",
    how: "Identificando bairros com scores consistentes em todas as dimensões, sem extremos que indiquem risco.",
  },
  {
    id: "highest-return",
    question: "Onde existe maior retorno?",
    how: "Mostrando yield bruto Airbnb e delta yield, mas sempre contextualizando com liquidez e confiança dos dados.",
  },
  {
    id: "highest-risk",
    question: "Onde existe mais risco?",
    how: "Correlacionando retorno alto com liquidez baixa, confiança menor ou saturação elevada.",
  },
  {
    id: "airbnb-vs-traditional",
    question: "Onde o Airbnb supera o aluguel tradicional?",
    how: "Comparando yield Airbnb vs yield long-term via delta yield, explicando em linguagem de ganho adicional.",
  },
  {
    id: "indicator-meaning",
    question: "O que cada indicador significa na prática?",
    how: "Traduzindo cada métrica em linguagem leiga com exemplos concretos e mensagens-chave.",
  },
] as const;

// ─── Princípios de Comunicação de Dados ────────────────────────

export const DATA_COMMUNICATION = {
  principle: "Nunca mostrar apenas números. Sempre traduzir em significado.",
  examples: {
    bad: [
      "ADR: R$280",
      "Yield: 13.7%",
      "Ocupação: 72%",
    ],
    good: [
      "Pinheiros cobra diárias mais altas, o que posiciona o bairro como opção premium — mas isso, sozinho, não garante o melhor retorno.",
      "O yield de 13.7% indica que, para cada R$100 mil investidos, o retorno anual estimado seria de R$13.700 via Airbnb.",
      "Com 72% de ocupação, o imóvel fica alugado na maior parte do mês, reduzindo o tempo ocioso.",
    ],
  },
  narratives: [
    "Diária mais alta ajuda, mas não decide sozinha.",
    "O maior retorno pode estar em bairros menos óbvios.",
    "Rentabilidade alta com liquidez baixa exige cautela.",
    "O melhor investimento está no equilíbrio, não na fama do bairro.",
    "Cobrar mais por noite não garante melhor retorno final.",
  ],
} as const;

// ─── Perfis Estratégicos de Bairro ─────────────────────────────
// Definição conceitual dos perfis. A lógica de classificação
// automática está em intelligenceInsights.ts e deve respeitar
// estas definições.

export const NEIGHBORHOOD_PROFILES = {
  equilibrado: {
    label: "Equilibrado",
    description: "Boa combinação entre retorno, ocupação e liquidez.",
    investorFit: "Investidor que quer segurança com bom retorno.",
    color: "bg-blue-100",
    textColor: "text-blue-800",
  },
  premium: {
    label: "Premium",
    description: "Diárias altas e forte percepção de valor.",
    investorFit: "Investidor que busca posicionamento nobre e ticket mais alto.",
    color: "bg-amber-100",
    textColor: "text-amber-800",
  },
  "alto-retorno": {
    label: "Alto Retorno",
    description: "Yield elevado, mas pode exigir mais atenção operacional.",
    investorFit: "Investidor que aceita mais risco por maior retorno potencial.",
    color: "bg-emerald-100",
    textColor: "text-emerald-800",
  },
  "alta-ocupacao": {
    label: "Alta Ocupação",
    description: "Forte tração operacional e poucos dias vazios.",
    investorFit: "Investidor que prioriza fluxo constante de receita.",
    color: "bg-purple-100",
    textColor: "text-purple-800",
  },
  crescimento: {
    label: "Crescimento",
    description: "Sinais de valorização e expansão futura da demanda.",
    investorFit: "Investidor com horizonte de médio/longo prazo.",
    color: "bg-cyan-100",
    textColor: "text-cyan-800",
  },
  arriscado: {
    label: "Mais Arriscado",
    description: "Retorno atrativo no papel, mas com incertezas operacionais.",
    investorFit: "Investidor experiente que sabe gerenciar risco.",
    color: "bg-red-100",
    textColor: "text-red-800",
  },
} as const;

export type NeighborhoodProfileKey = keyof typeof NEIGHBORHOOD_PROFILES;

// ─── Hierarquia de Dimensões de Análise ────────────────────────
// Ordem de importância para o investidor leigo.

export const ANALYSIS_DIMENSIONS = [
  {
    key: "rentabilidade",
    friendlyName: "Retorno geral",
    priority: 1,
    question: "Quanto esse bairro pode render?",
  },
  {
    key: "liquidez",
    friendlyName: "Facilidade de operar",
    priority: 2,
    question: "É fácil manter ocupação e resultado?",
  },
  {
    key: "crescimento",
    friendlyName: "Potencial futuro",
    priority: 3,
    question: "Esse bairro tende a valorizar?",
  },
  {
    key: "yield_delta",
    friendlyName: "Vantagem do Airbnb",
    priority: 4,
    question: "O short stay vale mais que aluguel comum?",
  },
  {
    key: "confianca",
    friendlyName: "Confiabilidade da leitura",
    priority: 5,
    question: "Posso confiar nesses números?",
  },
] as const;

// ─── Disclaimers e Microcopy Institucional ─────────────────────

export const DISCLAIMERS = {
  general:
    "Esta análise é baseada em dados estimados e não constitui recomendação de investimento. Resultados passados não garantem retornos futuros. Consulte um profissional antes de tomar decisões financeiras.",
  dataSource:
    "Dados compilados a partir de fontes públicas e estimativas de mercado. A qualidade da leitura varia por bairro conforme o volume de dados disponíveis.",
  scores:
    "Os scores são índices relativos que comparam bairros entre si dentro desta amostra. Não representam valores absolutos de mercado.",
} as const;
