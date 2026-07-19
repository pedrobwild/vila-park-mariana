/**
 * Fonte única de FAQs do site.
 * - `generalFaq`: perguntas gerais sobre o empreendimento (usadas no Guia do Comprador).
 * - `investorFaq`: perguntas específicas de investimento (usadas no Guia do Investidor).
 * Textos hardcoded em pt-BR — o Guia do Investidor mantém sua estrutura i18n
 * (chaves `investorGuide.faq.*` e `investorGuide.extraFaq.*`) para EN.
 */
export type FaqItem = { question: string; answer: string };

export const generalFaq: FaqItem[] = [
  {
    question: "Onde fica o Vila Park?",
    answer:
      "O empreendimento fica na R. Baltazar Lisboa, 543, no bairro Vila Mariana, em São Paulo, a cerca de 900 metros da estação de metrô Vila Mariana.",
  },
  {
    question: "Quantos apartamentos tem o empreendimento?",
    answer:
      "O Vila Park é uma torre única, com 10 pavimentos e 33 apartamentos, totalizando 1.600 m² de área construída.",
  },
  {
    question: "O apartamento tem vaga de garagem?",
    answer:
      "Não. O empreendimento foi projetado sem vagas de garagem, com foco em mobilidade a pé e por transporte público — a estação de metrô Vila Mariana fica a apenas 900 metros.",
  },
  {
    question: "Quais tipologias estão disponíveis?",
    answer:
      "O Vila Park oferece apartamentos de 1 dormitório/studio, unidades com garden privativo e unidades com terraço descoberto.",
  },
  {
    question: "As áreas comuns já estão prontas?",
    answer:
      "As áreas comuns serão entregues decoradas e mobiliadas, no térreo e no 5º pavimento, para uso imediato dos moradores.",
  },
  {
    question: "Em que fase está a obra?",
    answer:
      "A obra está em andamento, com última atualização registrada em 07/07/2026. Para informações detalhadas sobre o cronograma, fale com a equipe comercial.",
  },
  {
    question: "Como faço para reservar uma unidade?",
    answer:
      "Preencha o formulário de reserva nesta página ou fale com a equipe comercial pelo WhatsApp. O time entrará em contato para apresentar as condições e dar sequência ao processo, conforme o Registro de Incorporação Imobiliária.",
  },
  {
    question: "Posso instalar ar-condicionado no apartamento?",
    answer:
      "Sim. As unidades contam com infraestrutura preparada para instalação de ar-condicionado.",
  },
];

/**
 * FAQ de investimento — o componente do Guia do Investidor lê essas chaves via i18n
 * (`investorGuide.faq.q1..q5` + `investorGuide.extraFaq.f1..f5`). Este array é a
 * documentação canônica das perguntas cobertas para evitar duplicação com o Guia do Comprador.
 */
export const investorFaqKeys = {
  primary: ["q1", "q2", "q3", "q4", "q5"] as const,
  extra: ["f1", "f2", "f3", "f4", "f5"] as const,
};
