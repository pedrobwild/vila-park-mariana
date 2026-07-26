/**
 * Análise de valor presente (VPL) do fluxo de pagamento de uma proposta.
 *
 * Duas propostas com o mesmo desconto de tabela valem coisas diferentes para a
 * incorporadora quando o fluxo é mais ou menos alongado. O VPL traz cada parcela
 * a valor presente pela taxa de oportunidade e revela o desconto real embutido.
 *
 * Funções puras — sem React, sem Supabase.
 */

/** INCC-M demo: 0,45% a.m. — mesma taxa usada no extrato e no fluxo de pagamento. */
export const INCC_M_DEMO_MONTHLY = 0.0045;

export type VplInstallment = {
  /** Meses a partir da data da proposta. 0 = ato/sinal (não é descontado). */
  monthOffset: number;
  amountBrl: number;
};

const safeNum = (v: unknown): number => {
  const n = typeof v === "number" ? v : Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
};

/** Valor presente do fluxo: Σ parcela_i / (1 + taxa)^mês_i */
export function npv(installments: VplInstallment[], monthlyRate: number): number {
  const rate = Number.isFinite(monthlyRate) ? monthlyRate : 0;
  if (rate <= -1) return 0;
  return installments.reduce((acc, i) => {
    const months = Math.max(0, safeNum(i.monthOffset));
    return acc + safeNum(i.amountBrl) / Math.pow(1 + rate, months);
  }, 0);
}

/** Soma nominal do fluxo (sem desconto). */
export function nominalTotal(installments: VplInstallment[]): number {
  return installments.reduce((acc, i) => acc + safeNum(i.amountBrl), 0);
}

/** Corrige as parcelas futuras pelo INCC antes de descontar: parcela × (1 + incc)^mês */
export function applyInccCorrection(
  installments: VplInstallment[],
  monthlyIncc: number = INCC_M_DEMO_MONTHLY,
): VplInstallment[] {
  const incc = Number.isFinite(monthlyIncc) ? monthlyIncc : 0;
  if (incc <= -1) return installments.map((i) => ({ ...i }));
  return installments.map((i) => {
    const months = Math.max(0, safeNum(i.monthOffset));
    return {
      monthOffset: i.monthOffset,
      amountBrl: safeNum(i.amountBrl) * Math.pow(1 + incc, months),
    };
  });
}

/** Desconto real = 1 − VPL / preço de tabela (fração, ex.: 0.0812 = 8,12%). */
export function realDiscountPct(npvValue: number, listPriceBrl: number): number {
  const list = safeNum(listPriceBrl);
  if (list <= 0) return 0;
  return 1 - safeNum(npvValue) / list;
}

export type VplVerdict = "alongado" | "equilibrado" | "antecipado";

/** Compara o desconto real com o de tabela (ambos em fração). Tolerância: 0,5 p.p. */
export function vplVerdict(
  realPct: number,
  listDiscountPct: number,
  tolerance = 0.005,
): VplVerdict {
  const diff = safeNum(realPct) - safeNum(listDiscountPct);
  if (diff > tolerance) return "alongado";
  if (diff < -tolerance) return "antecipado";
  return "equilibrado";
}

export type VplAnalysis = {
  listPriceBrl: number;
  nominalBrl: number;
  npvBrl: number;
  /** fração */
  realDiscount: number;
  /** fração */
  listDiscount: number;
  verdict: VplVerdict;
};

/** Análise completa a partir do fluxo, do preço de tabela e das opções. */
export function analyzeVpl(
  installments: VplInstallment[],
  opts: {
    listPriceBrl: number;
    monthlyRate: number;
    correctByIncc?: boolean;
    monthlyIncc?: number;
  },
): VplAnalysis {
  const base = opts.correctByIncc
    ? applyInccCorrection(installments, opts.monthlyIncc ?? INCC_M_DEMO_MONTHLY)
    : installments;
  const nominalBrl = nominalTotal(base);
  const npvBrl = npv(base, opts.monthlyRate);
  const listPriceBrl = safeNum(opts.listPriceBrl);
  const realDiscount = realDiscountPct(npvBrl, listPriceBrl);
  const listDiscount =
    listPriceBrl > 0 ? 1 - nominalTotal(installments) / listPriceBrl : 0;
  return {
    listPriceBrl,
    nominalBrl,
    npvBrl,
    realDiscount,
    listDiscount,
    verdict: vplVerdict(realDiscount, listDiscount),
  };
}

/** Mapeia o fluxo já gerado por proposalFlow para o formato do VPL. */
export function installmentsFromFlow(
  rows: { monthsFromProposal: number; contractual: number }[],
): VplInstallment[] {
  return rows.map((r) => ({
    monthOffset: Math.max(0, safeNum(r.monthsFromProposal)),
    amountBrl: safeNum(r.contractual),
  }));
}
