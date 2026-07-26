/**
 * Tipos e cálculos de apoio das análises avançadas do painel do CRM.
 *
 * O banco (crm_dashboard_advanced) devolve apenas dados agregados e as linhas
 * brutas das propostas; o valor presente (VPL) é calculado aqui no aplicativo,
 * reaproveitando o mesmo motor do fluxo de pagamento e do simulador.
 */

import { buildProposalFlow } from "@/lib/proposalFlow";
import { analyzeVpl, installmentsFromFlow, type VplAnalysis } from "@/lib/vpl";

export type DrillItem =
  | {
      tipo: "deal";
      id: string;
      titulo: string | null;
      pessoa: string | null;
      corretor: string | null;
      etapa: string | null;
      valor_brl: number | null;
      atualizado_em: string | null;
    }
  | {
      tipo: "unit";
      id: string;
      code: string;
      area_m2: number | null;
      andar: number | null;
      face: string | null;
      price_brl: number | null;
      status: string | null;
      interessados: number | null;
    };

export interface Bucket {
  rotulo: string;
  itens_total: number;
  itens: DrillItem[];
}

export interface PrevisaoEtapa extends Bucket {
  stage_id: string;
  label: string;
  position: number;
  prob_pct: number;
  deals: number;
  valor_brl: number;
  valor_ponderado_brl: number;
}

export interface AdvancedData {
  periodo: { de: string; ate: string };
  previsao: {
    por_etapa: Omit<PrevisaoEtapa, "rotulo">[];
    total_ponderado_brl: number;
    total_aberto_brl: number;
    velocidade: {
      por_etapa: { stage_id: string; label: string; position: number; dias_medio: number; amostras: number }[];
      ciclo_medio_dias: number | null;
      ciclo_mediano_dias: number | null;
      amostras: number;
    };
    trimestre: {
      rotulo: string;
      ganho_brl: number;
      ganho_unid: number;
      ponderado_a_fechar_brl: number;
      projecao_brl: number;
    };
    comparativo: {
      periodo_anterior: { de: string; ate: string };
      deals_criados: number;
      deals_criados_anterior: number;
      deals_criados_var_pct: number | null;
      deals_ganhos: number;
      deals_ganhos_anterior: number;
      deals_ganhos_var_pct: number | null;
      vgv_ganho_brl: number;
      vgv_ganho_anterior_brl: number;
      vgv_ganho_var_pct: number | null;
    };
  };
  absorcao: {
    resumo: {
      total_unidades: number;
      disponiveis: number;
      vendidas: number;
      vendidas_periodo: number;
      vgv_total_brl: number;
      vgv_vendido_brl: number;
      vso_pct: number | null;
      vendas_media_mensal: number;
      meses_de_estoque: number | null;
    };
    por_tipologia: AbsorcaoGrupo[];
    por_andar: AbsorcaoGrupo[];
    por_face: AbsorcaoGrupo[];
    ranking: { mais_procuradas: RankingUnidade[]; menos_procuradas: RankingUnidade[] };
  };
  rentabilidade: {
    propostas: PropostaRow[];
    parametros: {
      vpl_monthly_rate: number;
      vpl_correct_by_incc: boolean;
      proposal_incc_monthly: number;
      proposal_balloon_every_months: number;
    };
    impacto: {
      vgv_tabela_brl: number;
      vgv_proposto_brl: number;
      desconto_nominal_brl: number;
    };
  };
  produtividade: CorretorRow[];
}

export interface AbsorcaoGrupo extends Bucket {
  area_m2?: number | null;
  andar?: number | null;
  face?: string | null;
  total: number;
  vendidas: number;
  disponiveis: number;
  vso_pct: number | null;
  preco_medio_brl: number;
  interessados: number;
  propostas: number;
}

export interface RankingUnidade {
  unit_id: string;
  code: string;
  area_m2: number | null;
  andar: number | null;
  face: string | null;
  price_brl: number | null;
  unit_status: string | null;
  interested_count: number;
  proposals_count: number;
  best_proposal_brl: number | null;
}

export interface PropostaRow {
  id: string;
  deal_id: string;
  titulo_negocio: string | null;
  unit_id: string;
  unit_code: string;
  area_m2: number | null;
  corretor: string | null;
  etapa: string | null;
  status: string;
  created_at: string;
  list_price_brl: number | null;
  discount_pct: number | null;
  discount_brl: number | null;
  final_price_brl: number | null;
  payment_method: string;
  down_payment_brl: number | null;
  monthly_count: number | null;
  monthly_brl: number | null;
  balloon_count: number | null;
  balloon_brl: number | null;
  keys_brl: number | null;
}

export interface CorretorRow extends Bucket {
  broker_id: string;
  corretor: string;
  equipe: string | null;
  in_rotation: boolean;
  weight: number | null;
  assigned_count: number | null;
  last_assigned_at: string | null;
  deals_total: number;
  deals_abertos: number;
  deals_ganhos: number;
  deals_perdidos: number;
  vgv_aberto_brl: number;
  vgv_ganho_brl: number;
  taxa_conversao_pct: number | null;
  ticket_medio_brl: number;
  primeira_resposta_horas: number | null;
  tarefas_abertas: number;
  tarefas_atrasadas: number;
  sla_cumprido_pct: number | null;
  funil: { stage_id: string; label: string; deals: number }[];
}

export type PropostaVpl = PropostaRow & {
  vpl: VplAnalysis;
  /** Diferença entre desconto real (VPL) e desconto de tabela, em pontos percentuais. */
  gapPp: number;
};

const num = (v: unknown) => (typeof v === "number" ? v : Number(v ?? 0)) || 0;

/** Calcula o VPL de cada proposta usando os parâmetros globais do CRM. */
export function computePropostasVpl(
  propostas: PropostaRow[],
  parametros: AdvancedData["rentabilidade"]["parametros"],
): PropostaVpl[] {
  return propostas.map((p) => {
    const flow = buildProposalFlow(
      {
        payment_method: p.payment_method,
        final_price_brl: num(p.final_price_brl),
        down_payment_brl: num(p.down_payment_brl),
        monthly_count: num(p.monthly_count),
        monthly_brl: num(p.monthly_brl),
        balloon_count: num(p.balloon_count),
        balloon_brl: num(p.balloon_brl),
        keys_brl: num(p.keys_brl),
      },
      p.created_at.slice(0, 10),
      {
        inccMonthly: parametros.proposal_incc_monthly,
        balloonEveryMonths: parametros.proposal_balloon_every_months,
      },
    );
    const vpl = analyzeVpl(installmentsFromFlow(flow), {
      listPriceBrl: num(p.list_price_brl),
      monthlyRate: parametros.vpl_monthly_rate,
      correctByIncc: parametros.vpl_correct_by_incc,
      monthlyIncc: parametros.proposal_incc_monthly,
    });
    return { ...p, vpl, gapPp: (vpl.realDiscount - vpl.listDiscount) * 100 };
  });
}

/** Soma dos VPLs — usada no resumo do impacto comercial. */
export function totalNpv(rows: PropostaVpl[]): number {
  return rows.reduce((acc, r) => acc + r.vpl.npvBrl, 0);
}

export const VERDICT_LABEL: Record<string, string> = {
  alongado: "Fluxo alongado",
  equilibrado: "Equilibrado",
  antecipado: "Fluxo antecipado",
};

export function formatPct(v: number | null | undefined, digits = 1): string {
  if (v === null || v === undefined || !Number.isFinite(Number(v))) return "—";
  return `${Number(v).toLocaleString("pt-BR", { maximumFractionDigits: digits })}%`;
}

export function formatNum(v: number | null | undefined, digits = 1): string {
  if (v === null || v === undefined || !Number.isFinite(Number(v))) return "—";
  return Number(v).toLocaleString("pt-BR", { maximumFractionDigits: digits });
}
