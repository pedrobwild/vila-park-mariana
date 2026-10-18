/**
 * Demanda de quem ainda busca imóvel (simulador de /ferramentas, modo "busca").
 *
 * Grava, só com consentimento, uma linha anônima em public.simulacoes_busca:
 * sem nome, contato ou IP; renda e idade só em faixas. A leitura é só do papel
 * admin (Bewild), em números agregados por bairro (admin_demanda_busca_por_bairro).
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { checkMCMV } from "@/lib/financing";

/** Muda quando o texto do consentimento mudar; fica gravada em cada linha. */
export const CONSENTIMENTO_VERSAO = "2026-10-18";

export const TEXTO_CONSENTIMENTO =
  "Autorizo a Bewild a usar os dados desta simulação de forma anônima — sem nome, contato, renda ou idade exatas — " +
  "em estudos de mercado imobiliário, compartilhados com parceiros apenas em números agregados por bairro.";

export type PrazoCompra = "ate_3_meses" | "3_a_6_meses" | "6_a_12_meses" | "mais_de_12_meses" | "nao_sei";

export const PRAZOS_COMPRA: { valor: PrazoCompra; rotulo: string }[] = [
  { valor: "ate_3_meses", rotulo: "Nos próximos 3 meses" },
  { valor: "3_a_6_meses", rotulo: "Em 3 a 6 meses" },
  { valor: "6_a_12_meses", rotulo: "Em 6 a 12 meses" },
  { valor: "mais_de_12_meses", rotulo: "Daqui a mais de 1 ano" },
  { valor: "nao_sei", rotulo: "Ainda não sei" },
];

export const ROTULO_PRAZO_COMPRA: Record<string, string> = {
  ...Object.fromEntries(PRAZOS_COMPRA.map((p) => [p.valor, p.rotulo])),
  nao_informado: "Não informado",
};

export function isPrazoCompra(v: unknown): v is PrazoCompra {
  return typeof v === "string" && PRAZOS_COMPRA.some((p) => p.valor === v);
}

export type FaixaRenda = "ate_5k" | "5k_10k" | "10k_15k" | "15k_25k" | "25k_40k" | "acima_40k";
export type FaixaIdade = "18_24" | "25_34" | "35_44" | "45_54" | "55_mais";

export const ROTULO_FAIXA_RENDA: Record<string, string> = {
  ate_5k: "Até R$ 5 mil",
  "5k_10k": "R$ 5 a 10 mil",
  "10k_15k": "R$ 10 a 15 mil",
  "15k_25k": "R$ 15 a 25 mil",
  "25k_40k": "R$ 25 a 40 mil",
  acima_40k: "Acima de R$ 40 mil",
  nao_informado: "Não informada",
};

/** Renda familiar mensal → faixa (a renda exata nunca é gravada). */
export function faixaRenda(renda: number): FaixaRenda | null {
  if (!Number.isFinite(renda) || renda <= 0) return null;
  if (renda <= 5_000) return "ate_5k";
  if (renda <= 10_000) return "5k_10k";
  if (renda <= 15_000) return "10k_15k";
  if (renda <= 25_000) return "15k_25k";
  if (renda <= 40_000) return "25k_40k";
  return "acima_40k";
}

/** Idade → faixa (a idade exata nunca é gravada). */
export function faixaIdade(idade: number): FaixaIdade | null {
  if (!Number.isFinite(idade) || idade < 18) return null;
  if (idade <= 24) return "18_24";
  if (idade <= 34) return "25_34";
  if (idade <= 44) return "35_44";
  if (idade <= 54) return "45_54";
  return "55_mais";
}

/** O que o simulador entrega para montar o registro (subconjunto do Snapshot). */
export interface DadosSimulacaoBusca {
  propertyValue: number;
  downPayment: number;
  fgts: number;
  termMonths: number;
  system: "SAC" | "PRICE";
  bankId: string;
  buyerAge: number;
  monthlyIncome: number;
  empreendimento?: string;
  bairro?: string;
  metragem?: number;
  prazoCompra?: PrazoCompra | "";
}

export interface RegistroSimulacaoBusca {
  sessao: string;
  consentimento_versao: string;
  empreendimento: string | null;
  bairro: string | null;
  metragem: number | null;
  valor_imovel: number;
  prazo_compra: PrazoCompra | null;
  entrada_pct: number;
  usa_fgts: boolean;
  prazo_financiamento_meses: number;
  sistema: "SAC" | "PRICE";
  banco_id: string | null;
  elegivel_mcmv: boolean;
  faixa_renda: FaixaRenda | null;
  faixa_idade: FaixaIdade | null;
}

const textoOuNulo = (v: string | undefined, max: number) => {
  const t = (v ?? "").trim().replace(/\s+/g, " ");
  return t ? t.slice(0, max) : null;
};

/** Monta a linha anônima. Não leva renda, idade, código da simulação nem nada que identifique a pessoa. */
export function montarRegistroBusca(d: DadosSimulacaoBusca, sessao: string): RegistroSimulacaoBusca {
  const entradaPct = d.propertyValue > 0 ? (d.downPayment / d.propertyValue) * 100 : 0;
  const metragem = d.metragem && d.metragem >= 10 && d.metragem <= 1000 ? Math.round(d.metragem * 100) / 100 : null;
  return {
    sessao,
    consentimento_versao: CONSENTIMENTO_VERSAO,
    empreendimento: textoOuNulo(d.empreendimento, 120),
    bairro: textoOuNulo(d.bairro, 80),
    metragem,
    valor_imovel: Math.round(d.propertyValue),
    prazo_compra: isPrazoCompra(d.prazoCompra) ? d.prazoCompra : null,
    entrada_pct: Math.round(Math.min(Math.max(entradaPct, 0), 100) * 100) / 100,
    usa_fgts: d.fgts > 0,
    prazo_financiamento_meses: Math.round(d.termMonths),
    sistema: d.system,
    banco_id: textoOuNulo(d.bankId, 60),
    elegivel_mcmv: checkMCMV(d.propertyValue, d.monthlyIncome || undefined).eligible,
    faixa_renda: faixaRenda(d.monthlyIncome),
    faixa_idade: faixaIdade(d.buyerAge),
  };
}

const CHAVE_SESSAO = "vp_busca_sessao";

/**
 * Id aleatório desta aba do navegador (some ao fechar a aba). Serve só para
 * contar a última simulação de cada visita; não liga a pessoa a nada.
 */
export function idSessaoBusca(): string {
  const novo = () =>
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
          const r = (Math.random() * 16) | 0;
          return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
        });
  try {
    const salvo = sessionStorage.getItem(CHAVE_SESSAO);
    if (salvo) return salvo;
    const id = novo();
    sessionStorage.setItem(CHAVE_SESSAO, id);
    return id;
  } catch {
    return novo();
  }
}

// O cliente gerado (types.ts) ainda não conhece a tabela nova; quando o Lovable
// regerar os tipos depois da migration, este cast pode sair.
const db = supabase as unknown as SupabaseClient;

let ultimoEnviado = "";

/**
 * Grava a simulação (fire-and-forget). Ignora repetição idêntica na mesma aba.
 * Erros não aparecem para a pessoa: a simulação dela não depende disto.
 */
export async function registrarSimulacaoBusca(registro: RegistroSimulacaoBusca): Promise<boolean> {
  const chave = JSON.stringify(registro);
  if (chave === ultimoEnviado) return true;
  ultimoEnviado = chave;
  try {
    const { error } = await db.from("simulacoes_busca").insert(registro);
    if (error) {
      ultimoEnviado = "";
      console.warn("[demandaBusca] não foi possível registrar a simulação", error.message);
      return false;
    }
    return true;
  } catch (e) {
    ultimoEnviado = "";
    console.warn("[demandaBusca] não foi possível registrar a simulação", e);
    return false;
  }
}

/** Para testes. */
export function __resetDemandaBusca() {
  ultimoEnviado = "";
}

/* ---------- leitura agregada (admin) ---------- */

export interface DemandaBairro {
  bairro: string;
  bairro_chave: string;
  pessoas: number;
  simulacoes: number;
  ultima_simulacao: string | null;
  valor_mediano: number | null;
  metragem_mediana: number | null;
  preco_m2_mediano: number | null;
  entrada_pct_mediana: number | null;
  pct_fgts: number | null;
  pct_mcmv: number | null;
  prazo_compra: Record<string, number>;
  faixa_renda: Record<string, number>;
  empreendimentos: { nome: string; pessoas: number }[];
}

const numOuNulo = (v: unknown) => (v === null || v === undefined || v === "" ? null : Number(v));

/** Converte a linha da RPC (numeric chega como string) para números. */
export function normalizarDemandaBairro(r: Record<string, unknown>): DemandaBairro {
  return {
    bairro: String(r.bairro ?? "Bairro não informado"),
    bairro_chave: String(r.bairro_chave ?? ""),
    pessoas: Number(r.pessoas ?? 0),
    simulacoes: Number(r.simulacoes ?? 0),
    ultima_simulacao: (r.ultima_simulacao as string | null) ?? null,
    valor_mediano: numOuNulo(r.valor_mediano),
    metragem_mediana: numOuNulo(r.metragem_mediana),
    preco_m2_mediano: numOuNulo(r.preco_m2_mediano),
    entrada_pct_mediana: numOuNulo(r.entrada_pct_mediana),
    pct_fgts: numOuNulo(r.pct_fgts),
    pct_mcmv: numOuNulo(r.pct_mcmv),
    prazo_compra: (r.prazo_compra as Record<string, number>) ?? {},
    faixa_renda: (r.faixa_renda as Record<string, number>) ?? {},
    empreendimentos: (r.empreendimentos as { nome: string; pessoas: number }[]) ?? [],
  };
}

export async function buscarDemandaPorBairro(desde: Date | null): Promise<DemandaBairro[]> {
  const { data, error } = await db.rpc("admin_demanda_busca_por_bairro", {
    _desde: desde ? desde.toISOString() : null,
  });
  if (error) throw new Error(error.message);
  return ((data as Record<string, unknown>[] | null) ?? []).map(normalizarDemandaBairro);
}

/** % de pessoas que pretendem comprar em até 6 meses (entre as que responderam). */
export function pctCompraAte6Meses(prazo: Record<string, number>): number | null {
  const respondeu = Object.entries(prazo)
    .filter(([k]) => k !== "nao_informado")
    .reduce((a, [, n]) => a + n, 0);
  if (respondeu === 0) return null;
  const curto = (prazo.ate_3_meses ?? 0) + (prazo["3_a_6_meses"] ?? 0);
  return (curto / respondeu) * 100;
}

/** Abaixo disto, o bairro não deve ir para relatório de parceiro. */
export const AMOSTRA_MINIMA_PARCEIRO = 5;

/* ---------- apresentação e exportação do agregado ---------- */

export function topEmpreendimentos(d: DemandaBairro, n = 3) {
  if (d.empreendimentos.length === 0) return "—";
  return d.empreendimentos
    .slice(0, n)
    .map((e) => `${e.nome} (${e.pessoas})`)
    .join(", ");
}

export function maiorFatia(dist: Record<string, number>, rotulos: Record<string, string>) {
  const entradas = Object.entries(dist).filter(([k]) => k !== "nao_informado");
  if (entradas.length === 0) return "—";
  const [k] = entradas.sort((a, b) => b[1] - a[1])[0];
  return rotulos[k] ?? k;
}

/** Exporta o agregado (nunca linhas individuais) para montar relatório de parceiro. */
export function demandaParaCsv(linhas: DemandaBairro[]): string {
  const cab = [
    "Bairro", "Pessoas", "Simulações", "Amostra pequena", "Valor mediano (R$)", "Metragem mediana (m²)",
    "Preço por m² mediano (R$)", "Entrada mediana (%)", "Compra em até 6 meses (%)", "Usa FGTS (%)",
    "Enquadra no MCMV (%)", "Faixa de renda mais comum", "Empreendimentos citados",
  ];
  const esc = (v: string) => (/[;"\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  const num = (v: number | null, d = 0) =>
    v === null ? "" : v.toLocaleString("pt-BR", { maximumFractionDigits: d, useGrouping: false });
  const linhasCsv = linhas.map((d) =>
    [
      d.bairro, String(d.pessoas), String(d.simulacoes), d.pessoas < AMOSTRA_MINIMA_PARCEIRO ? "sim" : "não",
      num(d.valor_mediano), num(d.metragem_mediana, 1), num(d.preco_m2_mediano), num(d.entrada_pct_mediana, 1),
      num(pctCompraAte6Meses(d.prazo_compra), 0), num(d.pct_fgts, 0), num(d.pct_mcmv, 0),
      maiorFatia(d.faixa_renda, ROTULO_FAIXA_RENDA), topEmpreendimentos(d, 5),
    ]
      .map(esc)
      .join(";"),
  );
  return "﻿" + [cab.join(";"), ...linhasCsv].join("\n");
}
