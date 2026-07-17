import {
  Home, MapPin, TrendingUp, BarChart3, Paintbrush, ShieldCheck,
  Palette, Ruler, Sparkles, BookOpen, CheckSquare, HelpCircle, Send,
  SprayCan, DoorOpen, Target, Lock, Wifi, Star, Briefcase, Heart,
  GraduationCap, Camera, DollarSign, FileText, Zap, MousePointerClick,
  CalendarCheck, MessageSquare, Trophy, Package, BadgeCheck, Users, Clock, Phone,
  Calculator, Building2, PieChart, Megaphone,
} from "lucide-react";
import { DISTRICTS_MOCK, type DistrictRow } from "@/data/districtMetrics";

/* ─── Phases (4 macro-blocks) ─── */
export const PHASES = [
  { number: 1, label: "Onde investir", description: "Bairros, indicadores e inteligência de dados" },
  { number: 2, label: "Como validar a conta", description: "Escolha do ativo, matemática do investimento e simulação" },
  { number: 3, label: "O que faz um studio performar", description: "Produto, reforma, decoração e operação" },
  { number: 4, label: "Como agir com confiança", description: "Anúncio, precificação, evidências e próximo passo" },
] as const;

/* ─── Bairro data — fully derived from districtMetrics (single source of truth) ─── */

function deriveAvgBySize(adrMin: number, adrMax: number) {
  const mid = (adrMin + adrMax) / 2;
  return {
    "20–25 m²": Math.round(adrMin * 0.95),
    "26–35 m²": Math.round(mid),
    "36–50 m²": Math.round(adrMax * 0.95),
  };
}

export type BairroItem = {
  name: string;
  dailyMin: number;
  dailyMax: number;
  avgOccupancy: number;
  perSqm: number;
  avgBySize: { "20–25 m²": number; "26–35 m²": number; "36–50 m²": number };
};

function parseRange(label: string): [number, number] {
  const nums = label.replace(/[R$.\s]/g, "").split("–").map(Number);
  return [nums[0] || 0, nums[1] || 0];
}

export const BAIRRO_DATA: BairroItem[] = DISTRICTS_MOCK.map((d) => {
  const [adrMin, adrMax] = parseRange(d.adrRangeLabel);
  return {
    name: d.districtName,
    dailyMin: adrMin,
    dailyMax: adrMax,
    avgOccupancy: d.occupancyPercent,
    perSqm: d.priceSqm / 1000,
    avgBySize: deriveAvgBySize(adrMin, adrMax),
  };
});

export const DECORATION_LEVELS = [
  { value: "basico", label: "Básico", multiplier: 1.0 },
  { value: "premium", label: "Premium", multiplier: 1.2 },
  { value: "alto", label: "Alto padrão", multiplier: 1.45 },
] as const;

export const SECTIONS = [
  // Início
  { id: "hero", label: "Início", icon: Home, phase: 0 },
  // Bloco 1 — Onde investir
  { id: "mapa-bairros", label: "Mapa de Bairros", icon: MapPin, phase: 1 },
  { id: "mercado", label: "Mercado e Precificação", icon: DollarSign, phase: 1 },
  { id: "intelligence", label: "Short Stay Intelligence", icon: BarChart3, href: "/intelligence", phase: 1 },
  // Bloco 2 — Como validar a conta
  { id: "escolha-ativo", label: "Escolha do Ativo", icon: Building2, phase: 2 },
  { id: "rentabilidade", label: "Matemática do Investimento", icon: PieChart, phase: 2 },
  { id: "simulador", label: "Simulador de Receita", icon: Calculator, phase: 2 },
  // Bloco 3 — O que faz um studio performar
  { id: "reservas", label: "O que move reservas", icon: TrendingUp, phase: 3 },
  { id: "reforma", label: "Reforma inteligente", icon: Paintbrush, phase: 3 },
  { id: "antichecklist", label: "Anti-checklist", icon: ShieldCheck, phase: 3 },
  { id: "decoracao", label: "Decoração estratégica", icon: Palette, phase: 3 },
  { id: "tendencias", label: "Tendências 2026", icon: Sparkles, phase: 3 },
  // Bloco 4 — Como agir com confiança
  { id: "anuncio-pricing", label: "Anúncio e Precificação", icon: Megaphone, phase: 4 },
  { id: "casestudy", label: "Case study", icon: BookOpen, phase: 4 },
  { id: "checklist", label: "Checklist investidor", icon: CheckSquare, phase: 4 },
  { id: "faq", label: "FAQ", icon: HelpCircle, phase: 4 },
  { id: "cta-final", label: "Solicitar diagnóstico", icon: Send, phase: 4 },
] as const;

export type SectionItem = {
  id: string;
  label: string;
  icon: any;
  phase: number;
  href?: string;
};

export const DECISION_DRIVERS = [
  { id: "limpeza", title: "Limpeza", desc: "Fator #1 global: 90% dos hóspedes consideram limpeza o critério mais importante na escolha. Limpeza impecável = reviews 5 estrelas.", icon: SprayCan, priority: { executivo: 1, turista: 2, estudante: 3, casal: 2 } },
  { id: "checkin", title: "Check-in sem atrito", desc: "Fechadura digital ou key box eliminam esperas e reclamações. Hóspedes corporativos chegam tarde — check-in autônomo é decisivo.", icon: DoorOpen, priority: { executivo: 2, turista: 3, estudante: 2, casal: 4 } },
  { id: "precisao", title: "Precisão do anúncio", desc: "Fotos reais, descrição honesta e expectativa alinhada. Anúncios que entregam o que prometem têm 2x menos cancelamentos.", icon: Target, priority: { executivo: 3, turista: 1, estudante: 4, casal: 3 } },
  { id: "avaliacoes", title: "Avaliações e nota", desc: "Acima de 4.8 você entra no topo das buscas. Cada 0.1 ponto acima de 4.5 pode aumentar sua taxa de conversão em até 12%.", icon: Star, priority: { executivo: 5, turista: 4, estudante: 1, casal: 1 } },
  { id: "seguranca", title: "Segurança e acessibilidade", desc: "Portaria 24h, câmeras em áreas comuns, boa iluminação. Casais e turistas solo priorizam segurança acima do preço.", icon: Lock, priority: { executivo: 4, turista: 5, estudante: 5, casal: 5 } },
  { id: "ambiente", title: "Ambiente + trabalho + entretenimento", desc: "Wi-Fi rápido, mesa de trabalho, smart TV e boa acústica. Para estadias de 3+ dias, o setup do ambiente define a experiência.", icon: Wifi, priority: { executivo: 6, turista: 6, estudante: 6, casal: 6 } },
];

export type PersonaKey = "executivo" | "turista" | "estudante" | "casal";

export const PERSONAS: { key: PersonaKey; label: string; icon: typeof Briefcase }[] = [
  { key: "executivo", label: "Executivo", icon: Briefcase },
  { key: "turista", label: "Turista", icon: MapPin },
  { key: "estudante", label: "Estudante", icon: GraduationCap },
  { key: "casal", label: "Casal", icon: Heart },
];

export type TrendDifficulty = "easy" | "medium" | "advanced";
export type TrendImpact = "high" | "medium" | "low";

export interface TrendDetails {
  what: string;
  how: string[];
  checklist: string[];
  expectedImpact: string;
}

export interface TrendItem {
  id: number;
  numberLabel: string;
  title: string;
  short: string;
  tags: string[];
  difficulty: TrendDifficulty;
  impact: TrendImpact;
  details: TrendDetails;
}

export const TREND_TAG_ICONS: Record<string, typeof Camera> = {
  Fotos: Camera, Design: Palette, Operação: FileText, Precificação: DollarSign,
  "Experiência": Star, Automação: Zap, Escala: BarChart3,
};

export const TREND_TAG_COLORS: Record<string, string> = {
  Fotos: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  Design: "bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-300",
  Operação: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  Precificação: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
  "Experiência": "bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300",
  Automação: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300",
  Escala: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
};

export const TRENDS_2026: TrendItem[] = [
  { id: 1, numberLabel: "#1", title: "Fotografia profissional estratégica", short: "Fotos profissionais aumentam CTR, conversão e diária.", tags: ["Fotos"], difficulty: "medium", impact: "high", details: { what: "Hosts top investem em fotógrafos especializados em Airbnb.", how: ["Contrate fotógrafo com portfólio de interiores e short stay.", "Fotografe com luz natural e enquadramentos amplos.", "Priorize a foto principal como 'foto de capa'."], checklist: ["Foto de capa forte", "Cozinha/banheiro bem iluminados", "Sequência lógica"], expectedImpact: "+20% a +40% nas reservas." } },
  { id: 2, numberLabel: "#2", title: "Primeira foto extremamente forte", short: "A primeira imagem define se o usuário clica no anúncio.", tags: ["Fotos"], difficulty: "easy", impact: "high", details: { what: "A imagem de capa é o maior driver de cliques.", how: ["Use iluminação perfeita e enquadramento amplo.", "Inclua um elemento visual marcante.", "Evite fotos escuras ou muito fechadas."], checklist: ["Capa clara e ampla", "Elemento memorável visível"], expectedImpact: "Aumenta CTR e melhora a taxa de reserva." } },
  { id: 3, numberLabel: "#3", title: "Identidade visual do apartamento", short: "Um conceito único faz o anúncio se destacar.", tags: ["Design"], difficulty: "medium", impact: "high", details: { what: "Hosts profissionais criam um tema consistente.", how: ["Escolha um conceito: industrial, tropical, escandinavo.", "Mantenha paleta de cores consistente.", "Use 1–2 peças 'statement'."], checklist: ["Paleta definida", "Tema aplicado", "Peça marcante"], expectedImpact: "Diferencia o anúncio e aumenta cliques." } },
  { id: 4, numberLabel: "#4", title: "Self check-in ultra intuitivo", short: "Menos fricção no check-in, mais avaliações.", tags: ["Operação", "Automação"], difficulty: "medium", impact: "high", details: { what: "Além da fechadura digital, a experiência é guiada.", how: ["Crie vídeo de check-in (30–60s).", "Manual visual com fotos e passos curtos."], checklist: ["Fechadura digital + backup", "Vídeo curto", "Manual visual"], expectedImpact: "Reduz perguntas e melhora avaliações." } },
  { id: 5, numberLabel: "#5", title: "Guia digital personalizado da cidade", short: "Guia local aumenta satisfação e reviews.", tags: ["Experiência"], difficulty: "easy", impact: "medium", details: { what: "Um guia digital melhora a jornada do hóspede.", how: ["Recomende restaurantes, cafés e coworkings.", "Inclua transporte e turismo."], checklist: ["Top 10 lugares", "Mapa/links", "Dicas por perfil"], expectedImpact: "Melhora avaliação e recomendações." } },
  { id: 6, numberLabel: "#6", title: "Wi-Fi extremamente rápido", short: "Wi-Fi rápido é filtro decisivo para muitos hóspedes.", tags: ["Experiência"], difficulty: "easy", impact: "high", details: { what: "Infra de internet vira diferencial competitivo.", how: ["Instale fibra e roteador premium.", "Use repetidores se necessário."], checklist: ["Fibra ativa", "Roteador bom", "Senha fácil + QR code"], expectedImpact: "Aumenta reservas (trabalho remoto)." } },
  { id: 7, numberLabel: "#7", title: "Colchão padrão hotel", short: "Sono excelente = mais 5 estrelas.", tags: ["Experiência"], difficulty: "medium", impact: "high", details: { what: "Um dos maiores drivers de avaliação.", how: ["Use queen/king quando possível.", "Pillow top e travesseiros de qualidade."], checklist: ["Colchão premium", "2 tipos de travesseiro", "Protetor impermeável"], expectedImpact: "Aumenta reviews e recorrência." } },
  { id: 8, numberLabel: "#8", title: "Roupa de cama premium", short: "Sensação de hotel com enxoval superior.", tags: ["Experiência"], difficulty: "medium", impact: "medium", details: { what: "Percepção de valor sobe com enxoval.", how: ["Algodão 300+ fios, duvet, várias almofadas.", "Padronize cores e reposição."], checklist: ["Jogo completo reserva", "Toalhas boas"], expectedImpact: "Melhora nota e permite ADR maior." } },
  { id: 9, numberLabel: "#9", title: "Cortinas blackout", short: "Sono melhor para hóspedes de qualquer fuso.", tags: ["Experiência"], difficulty: "easy", impact: "medium", details: { what: "Blackout reduz reclamações e melhora conforto.", how: ["Instale trilho e tecido blackout real.", "Evite entrada lateral de luz."], checklist: ["Blackout total", "Vedação lateral"], expectedImpact: "Melhora avaliação de conforto." } },
  { id: 10, numberLabel: "#10", title: "Iluminação pensada para fotos", short: "Iluminação boa melhora fotos e experiência.", tags: ["Design", "Fotos"], difficulty: "medium", impact: "medium", details: { what: "A luz certa melhora o anúncio e o ambiente.", how: ["Use iluminação indireta e luz quente.", "Inclua luminárias decorativas."], checklist: ["Luz geral + indireta", "Luz de leitura"], expectedImpact: "Fotos mais atrativas." } },
  { id: 11, numberLabel: "#11", title: "Elemento de design único", short: "Um detalhe memorável aumenta lembrança e cliques.", tags: ["Design"], difficulty: "medium", impact: "medium", details: { what: "Studios de sucesso têm um 'wow factor'.", how: ["Parede artística, cadeira icônica, painel ripado ou luminária escultural."], checklist: ["1 peça wow", "Visível na capa"], expectedImpact: "Diferencia e aumenta CTR." } },
  { id: 12, numberLabel: "#12", title: "Smart TV com streaming", short: "Streaming é padrão esperado.", tags: ["Experiência"], difficulty: "easy", impact: "medium", details: { what: "TV + streaming reduz atrito e aumenta satisfação.", how: ["Smart TV, YouTube, Chromecast.", "Instruções simples."], checklist: ["Streaming pronto", "Guia rápido"], expectedImpact: "Melhora reviews." } },
  { id: 13, numberLabel: "#13", title: "Limpeza profissional padronizada", short: "Limpeza consistente = avaliações consistentes.", tags: ["Operação"], difficulty: "medium", impact: "high", details: { what: "Operação profissional exige padrão de hotel.", how: ["Checklist de limpeza e equipe fixa.", "Inspeção por fotos."], checklist: ["Checklist", "Padrão banheiro", "Reposição controlada"], expectedImpact: "Aumenta nota e reduz reclamações." } },
  { id: 14, numberLabel: "#14", title: "Checklists operacionais", short: "Processos permitem escalar sem perder qualidade.", tags: ["Operação", "Escala"], difficulty: "medium", impact: "high", details: { what: "Empreendedores criam processos replicáveis.", how: ["Check-in checklist, limpeza checklist, reposição checklist."], checklist: ["Processos documentados", "Responsáveis definidos"], expectedImpact: "Escala com menos erro." } },
  { id: 15, numberLabel: "#15", title: "Preço dinâmico automático", short: "Preço ajustado diariamente maximiza receita.", tags: ["Precificação", "Automação"], difficulty: "medium", impact: "high", details: { what: "Plataformas ajustam preço com base em demanda.", how: ["Use PriceLabs, Beyond ou Wheelhouse.", "Defina piso, teto e regras."], checklist: ["Ferramenta ativa", "Regras por temporada"], expectedImpact: "Maximiza ADR e ocupação." } },
  { id: 16, numberLabel: "#16", title: "Gestão profissional de calendário", short: "Calendário otimizado captura picos de demanda.", tags: ["Precificação", "Operação"], difficulty: "medium", impact: "medium", details: { what: "Hosts monitoram ocupação, eventos e feriados.", how: ["Antecipe datas-chave e ajuste regras."], checklist: ["Datas de pico mapeadas", "Regras de estadia mínima"], expectedImpact: "Aumenta receita em períodos fortes." } },
  { id: 17, numberLabel: "#17", title: "Estratégia de estadia mínima", short: "Regras por período melhoram ocupação e eficiência.", tags: ["Precificação"], difficulty: "easy", impact: "medium", details: { what: "Mínimo de noites varia por demanda.", how: ["Fim de semana: mínimo 2 noites.", "Alta temporada: mínimo 3 noites."], checklist: ["Regras por temporada"], expectedImpact: "Menos gaps e melhor ocupação." } },
  { id: 18, numberLabel: "#18", title: "Automatização de mensagens", short: "Automação reduz trabalho e melhora experiência.", tags: ["Automação", "Operação"], difficulty: "medium", impact: "medium", details: { what: "Mensagens padronizadas e automáticas.", how: ["Pré check-in, guia da casa, pós checkout.", "Use Hospitable ou Guesty."], checklist: ["Templates prontos", "Gatilhos configurados"], expectedImpact: "Menos esforço e menos erro." } },
  { id: 19, numberLabel: "#19", title: "Reviews estratégicas", short: "Pedir review na hora certa aumenta a taxa de avaliação.", tags: ["Operação"], difficulty: "easy", impact: "medium", details: { what: "Mensagem pós checkout pedindo avaliação.", how: ["Automatize a solicitação e seja cordial."], checklist: ["Mensagem automática"], expectedImpact: "Mais avaliações 5 estrelas." } },
  { id: 20, numberLabel: "#20", title: "Portfólio de unidades", short: "Hosts +100k escalam com padrão replicável.", tags: ["Escala"], difficulty: "advanced", impact: "high", details: { what: "Receita alta vem de escala e padronização.", how: ["Replicar operação e padrão em 3 a 10 unidades."], checklist: ["Padrão replicável", "Equipe e processos"], expectedImpact: "Transforma o Airbnb em negócio recorrente." } },
];

export const TREND_ALL_TAGS = ["Fotos", "Design", "Operação", "Precificação", "Experiência", "Automação", "Escala"];

export const TREND_IMPACT_ORDER: Record<TrendImpact, number> = { high: 0, medium: 1, low: 2 };
export const TREND_DIFF_ORDER: Record<TrendDifficulty, number> = { easy: 0, medium: 1, advanced: 2 };
export const trendDiffLabel: Record<TrendDifficulty, string> = { easy: "Fácil", medium: "Médio", advanced: "Avançado" };
export const trendDiffColor: Record<TrendDifficulty, string> = {
  easy: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
  medium: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  advanced: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
};
export const trendImpactLabel: Record<TrendImpact, string> = { high: "Alto impacto", medium: "Médio impacto", low: "Baixo impacto" };
export const trendImpactColor: Record<TrendImpact, string> = {
  high: "bg-primary/10 text-primary",
  medium: "bg-accent/10 text-accent-foreground",
  low: "bg-muted text-muted-foreground",
};

export type TrendSortMode = "impact" | "easy" | "pro";

export const CHECKLIST_ITEMS = [
  "Localização com demanda comprovada",
  "Condomínio permite short stay",
  "Análise de concorrência feita",
  "Orçamento de reforma definido",
  "Projeção financeira validada",
  "Fotos profissionais planejadas",
  "Mobília funcional selecionada",
  "Plano de precificação dinâmica",
  "Gestão operacional definida",
  "Documentação fiscal em ordem",
];

export const SCORE_TIERS = [
  { min: 0, max: 3, label: "Iniciante", color: "bg-destructive", desc: "Você precisa amadurecer o projeto antes de investir." },
  { min: 4, max: 6, label: "Em progresso", color: "bg-accent", desc: "Bom começo, mas faltam itens críticos. Considere um diagnóstico." },
  { min: 7, max: 8, label: "Quase pronto", color: "bg-primary/70", desc: "Falta pouco! Revise os itens pendentes e avance com confiança." },
  { min: 9, max: 10, label: "Pronto para investir", color: "bg-primary", desc: "Excelente! Seu planejamento está sólido. Hora de agir." },
];

export type SavedScenario = {
  id: string;
  name: string;
  bairro: string;
  metragem: number;
  ocupacao: number;
  diariaAtual: string;
  objetivo: string;
  rateBoost: number;
  reformaBudget: string;
  boostedDaily: number;
  receitaMensal: number;
  receitaAnual: number;
  paybackMonths: number | null;
};

export const SCENARIOS_KEY = "bwild_guide_scenarios";

export function loadScenarios(): SavedScenario[] {
  try {
    return JSON.parse(sessionStorage.getItem(SCENARIOS_KEY) || "[]");
  } catch { return []; }
}

export function persistScenarios(scenarios: SavedScenario[]) {
  sessionStorage.setItem(SCENARIOS_KEY, JSON.stringify(scenarios));
}

export const fmt = (v: number) => v.toLocaleString("pt-BR", { maximumFractionDigits: 0 });

export const TRUST_SIGNALS_DATA = [
  { label: "+200 studios", icon: Package },
  { label: "4.9 nota média", icon: Star },
  { label: "Operação própria", icon: BadgeCheck },
  { label: "+5 anos no mercado", icon: Clock },
];

export const FAQ_DATA = [
  { q: "Quanto custa começar um studio para short stay?", a: "Depende do estado do imóvel e do padrão desejado. Reformas leves começam em R$ 35.000 e projetos premium podem chegar a R$ 120.000. O simulador neste guia ajuda a estimar o retorno sobre cada faixa de investimento." },
  { q: "Qual o retorno médio de um studio em São Paulo?", a: "Studios bem posicionados e operados geram entre R$ 5.000 e R$ 12.000 de receita bruta mensal, dependendo do bairro, metragem e qualidade do anúncio. Descontando custos operacionais (limpeza, taxa de plataforma, condomínio, IPTU), o yield líquido fica entre 6% e 12% ao ano." },
  { q: "Preciso de CNPJ para operar no Airbnb?", a: "Não é obrigatório, mas altamente recomendado. Com CNPJ (MEI ou Simples), você pode emitir notas fiscais, ter conta PJ dedicada e otimizar a tributação. Sem CNPJ, a renda deve ser declarada como pessoa física e pode ter alíquota mais alta de IR." },
  { q: "E se o condomínio não permitir short stay?", a: "Verifique a convenção do condomínio antes de comprar. Se já possui o imóvel, consulte um advogado especializado. Muitos condomínios ainda não têm regras claras — nesse caso, é possível operar dentro da legalidade até que haja deliberação formal em assembleia." },
  { q: "A Bwild faz a gestão operacional do studio?", a: "Sim. A Bwild oferece gestão completa: precificação dinâmica, atendimento ao hóspede, limpeza profissional, manutenção e relatórios mensais. O investidor recebe o rendimento líquido sem se envolver na operação diária." },
  { q: "Qual a diferença entre short stay e aluguel tradicional?", a: "Short stay (menos de 90 dias) geralmente rende 40-80% mais que aluguel tradicional, mas envolve custos operacionais maiores e gestão ativa. Aluguel tradicional é mais previsível e passivo. A decisão depende do perfil do investidor e da localização." },
];
