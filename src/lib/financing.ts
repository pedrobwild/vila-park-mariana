// Pure financing engine for the Vila Park Mariana financing simulator.
// All monetary values are in BRL (number, not string). No I/O, no React.

export type AmortSystem = "SAC" | "PRICE";

export interface FinancingInput {
  propertyValue: number;
  downPayment: number; // includes FGTS
  termMonths: number; // 12..420
  annualRate: number; // a.a. as percent, e.g. 11.19
  /** Interpreta annualRate como "efetiva" (default) ou "nominal". */
  annualRateType?: "efetiva" | "nominal";
  /** Optional buyer age (years) for MIP insurance calculation */
  buyerAgeYears?: number;
  /** Override direto da taxa MIP mensal (fração do saldo). Se ausente, usa mipRateForAge. */
  mipMonthlyRate?: number;
  /** DFI insurance monthly rate over property value (fraction). Default 0.00025 (~0,025% a.m.) */
  dfiMonthlyRate?: number;
  /** Fixed monthly admin fee (BRL). Default 25 */
  adminFee?: number;
}

export interface InstallmentRow {
  n: number;
  payment: number; // amortization + interest (banking installment, no insurance)
  interest: number;
  amortization: number;
  mip: number;
  dfi: number;
  admin: number;
  fullPayment: number; // payment + mip + dfi + admin
  balance: number; // after payment
}

export interface FinancingResult {
  system: AmortSystem;
  financedAmount: number;
  monthlyRate: number; // fraction
  firstInstallment: number; // full (with insurance/fees)
  lastInstallment: number; // full
  firstPayment: number; // banking installment only
  lastPayment: number;
  totalPaid: number; // sum of fullPayment
  totalInterest: number;
  totalInsurance: number;
  schedule: InstallmentRow[];
  cetMonthly: number; // fraction
  cetAnnual: number; // fraction
}

export const BRL = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
export const BRL2 = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
export const PCT = (v: number, digits = 2) =>
  `${(v * 100).toLocaleString("pt-BR", { minimumFractionDigits: digits, maximumFractionDigits: digits })}%`;
/** Format a percentage value already in percent units (e.g. 11.19 → "11,19%"). */
export const PCT_PT = (v: number, digits = 2) =>
  `${v.toLocaleString("pt-BR", { minimumFractionDigits: digits, maximumFractionDigits: digits })}%`;

/** Convert annual effective rate (percent) to monthly effective rate (fraction). */
export function annualToMonthly(annualPct: number): number {
  return Math.pow(1 + annualPct / 100, 1 / 12) - 1;
}

/** Convert monthly effective rate (fraction) to annual (fraction). */
export function monthlyToAnnual(monthly: number): number {
  return Math.pow(1 + monthly, 12) - 1;
}

/** Nominal a.a. (%) → mensal (fração). Regra brasileira: divide por 12. */
export function nominalAnnualToMonthly(nominalPct: number): number {
  return nominalPct / 100 / 12;
}

/** Nominal a.a. (%) → efetiva a.a. (%). Ex.: 10 → ~10,4713%. */
export function nominalToEffectiveAnnual(nominalPct: number): number {
  const im = nominalAnnualToMonthly(nominalPct);
  return (Math.pow(1 + im, 12) - 1) * 100;
}

/** Retorna a taxa mensal efetiva conforme o tipo declarado. */
export function monthlyRateFromAnnual(annualPct: number, type: "efetiva" | "nominal" = "efetiva"): number {
  return type === "nominal" ? nominalAnnualToMonthly(annualPct) : annualToMonthly(annualPct);
}

/** Retorna a taxa efetiva a.a. (%) equivalente, para ordenação/comparação. */
export function effectiveAnnualPct(annualPct: number, type: "efetiva" | "nominal" = "efetiva"): number {
  return type === "nominal" ? nominalToEffectiveAnnual(annualPct) : annualPct;
}

/**
 * Rough MIP monthly rate (fraction of outstanding balance) based on age.
 * Approximates real bank tables (younger = cheaper).
 */
export function mipRateForAge(age = 35): number {
  const a = Math.max(18, Math.min(80, age));
  // Piecewise: 0.02% at 18–30, ramp up to 0.35% at 75+
  if (a <= 30) return 0.0002;
  if (a <= 40) return 0.00025 + ((a - 30) / 10) * 0.00015; // .00025 → .0004
  if (a <= 50) return 0.0004 + ((a - 40) / 10) * 0.0004; // .0004 → .0008
  if (a <= 60) return 0.0008 + ((a - 50) / 10) * 0.0007; // .0008 → .0015
  if (a <= 70) return 0.0015 + ((a - 60) / 10) * 0.0012; // .0015 → .0027
  return 0.0027 + ((a - 70) / 10) * 0.0008;
}

/** Bank presets (jul/2026 SBPE effective a.a. + TR). */
export const BANK_PRESETS = [
  { id: "caixa", label: "Caixa", annualRate: 11.19 },
  { id: "itau", label: "Itaú", annualRate: 11.6 },
  { id: "santander", label: "Santander", annualRate: 11.69 },
  { id: "bradesco", label: "Bradesco", annualRate: 11.7 },
  { id: "inter-bonificada", label: "Banco Inter — SBPE Bonificada", annualRate: 9.4 },
  { id: "inter-procotista", label: "Banco Inter — Pró-Cotista FGTS", annualRate: 9.0 },
] as const;

export const ACQUISITION_COSTS = {
  itbiRate: 0.03, // 3% (São Paulo)
  registryRate: 0.015, // ~1,5% escritura + registro
  bankAppraisalFee: 3100,
} as const;

export function acquisitionCosts(propertyValue: number) {
  const itbi = propertyValue * ACQUISITION_COSTS.itbiRate;
  const registry = propertyValue * ACQUISITION_COSTS.registryRate;
  const appraisal = ACQUISITION_COSTS.bankAppraisalFee;
  return { itbi, registry, appraisal, total: itbi + registry + appraisal };
}

export interface MCMVCheck {
  eligible: boolean;
  reason?: string;
  suggestedRateMin: number;
  suggestedRateMax: number;
}

/** Minha Casa Minha Vida — Faixa 4 (2026): imóvel ≤ 600k e renda ≤ 13k. */
export function checkMCMV(propertyValue: number, monthlyIncome?: number): MCMVCheck {
  const suggestedRateMin = 10.0;
  const suggestedRateMax = 10.5;
  if (propertyValue <= 0) {
    return { eligible: false, reason: "Informe o valor do imóvel", suggestedRateMin, suggestedRateMax };
  }
  if (propertyValue > 600_000) {
    return { eligible: false, reason: "Imóvel acima de R$ 600.000", suggestedRateMin, suggestedRateMax };
  }
  if (monthlyIncome !== undefined && monthlyIncome <= 0) {
    return { eligible: false, reason: "Informe a renda familiar", suggestedRateMin, suggestedRateMax };
  }
  if (monthlyIncome !== undefined && monthlyIncome > 13_000) {
    return { eligible: false, reason: "Renda familiar acima de R$ 13.000", suggestedRateMin, suggestedRateMax };
  }
  return { eligible: true, suggestedRateMin, suggestedRateMax };
}

function priceInstallment(pv: number, i: number, n: number): number {
  if (i === 0) return pv / n;
  return (pv * i * Math.pow(1 + i, n)) / (Math.pow(1 + i, n) - 1);
}

export function simulate(system: AmortSystem, input: FinancingInput): FinancingResult {
  const {
    propertyValue,
    downPayment,
    termMonths: n,
    annualRate,
    annualRateType = "efetiva",
    buyerAgeYears = 35,
    mipMonthlyRate,
    dfiMonthlyRate = 0.00025,
    adminFee = 25,
  } = input;

  const financedAmount = Math.max(propertyValue - downPayment, 0);
  const i = monthlyRateFromAnnual(annualRate, annualRateType);
  const mipRate = mipMonthlyRate ?? mipRateForAge(buyerAgeYears);
  const dfi = propertyValue * dfiMonthlyRate;

  const schedule: InstallmentRow[] = [];
  let balance = financedAmount;
  let totalPaid = 0;
  let totalInterest = 0;
  let totalInsurance = 0;

  const priceInst = system === "PRICE" ? priceInstallment(financedAmount, i, n) : 0;
  const sacAmort = system === "SAC" ? financedAmount / n : 0;

  for (let k = 1; k <= n; k++) {
    const interest = balance * i;
    let amortization: number;
    let payment: number;
    if (system === "SAC") {
      amortization = sacAmort;
      payment = amortization + interest;
    } else {
      payment = priceInst;
      amortization = Math.max(payment - interest, 0);
    }
    if (k === n) {
      // final adjustment for floating point
      amortization = balance;
      payment = amortization + interest;
    }
    const mip = balance * mipRate;
    const fullPayment = payment + mip + dfi + adminFee;
    balance = Math.max(balance - amortization, 0);
    totalPaid += fullPayment;
    totalInterest += interest;
    totalInsurance += mip + dfi + adminFee;
    schedule.push({ n: k, payment, interest, amortization, mip, dfi, admin: adminFee, fullPayment, balance });
  }

  const first = schedule[0];
  const last = schedule[schedule.length - 1];

  // CET: rate that equates financedAmount to sum of fullPayments discounted.
  const cetMonthly = solveIRR(financedAmount, schedule.map((s) => s.fullPayment));
  const cetAnnual = monthlyToAnnual(cetMonthly);

  return {
    system,
    financedAmount,
    monthlyRate: i,
    firstInstallment: first?.fullPayment ?? 0,
    lastInstallment: last?.fullPayment ?? 0,
    firstPayment: first?.payment ?? 0,
    lastPayment: last?.payment ?? 0,
    totalPaid,
    totalInterest,
    totalInsurance,
    schedule,
    cetMonthly,
    cetAnnual,
  };
}

/** Solve monthly IRR: pv = Σ cf[k] / (1+r)^k. Bisection, robust. */
export function solveIRR(pv: number, cashflows: number[]): number {
  if (pv <= 0 || cashflows.length === 0) return 0;
  const npv = (r: number) =>
    cashflows.reduce((acc, cf, idx) => acc + cf / Math.pow(1 + r, idx + 1), 0) - pv;
  let lo = 0;
  let hi = 1; // 100%/mês upper bound
  // Ensure sign change
  if (npv(lo) < 0) return 0; // pv > total cf
  if (npv(hi) > 0) return hi;
  for (let it = 0; it < 100; it++) {
    const mid = (lo + hi) / 2;
    const v = npv(mid);
    if (Math.abs(v) < 1e-4) return mid;
    if (v > 0) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

export interface ExtraAmortInput {
  system: AmortSystem;
  base: FinancingInput;
  /** Extra payments keyed by installment number (1-based). */
  extras: Record<number, number>;
  strategy: "reduce-term" | "reduce-installment";
}

export interface ExtraAmortResult {
  baseline: FinancingResult;
  withExtra: FinancingResult;
  interestSaved: number;
  monthsSaved: number;
  installmentReduction: number; // avg reduction in banking installment
}

export function simulateWithExtras(inp: ExtraAmortInput): ExtraAmortResult {
  const baseline = simulate(inp.system, inp.base);
  const { base, extras, strategy, system } = inp;
  const i = monthlyRateFromAnnual(base.annualRate, base.annualRateType ?? "efetiva");
  const mipRate = base.mipMonthlyRate ?? mipRateForAge(base.buyerAgeYears ?? 35);
  const dfi = base.propertyValue * (base.dfiMonthlyRate ?? 0.00025);
  const admin = base.adminFee ?? 25;

  let balance = Math.max(base.propertyValue - base.downPayment, 0);
  let remainingTerm = base.termMonths;
  let priceInst = system === "PRICE" ? priceInstallment(balance, i, remainingTerm) : 0;
  const sacAmort0 = system === "SAC" ? balance / base.termMonths : 0;

  const schedule: InstallmentRow[] = [];
  let totalPaid = 0;
  let totalInterest = 0;
  let totalInsurance = 0;
  let k = 0;
  while (balance > 0.01 && k < base.termMonths + 24) {
    k++;
    const interest = balance * i;
    let amortization: number;
    let payment: number;
    if (system === "SAC") {
      amortization = sacAmort0;
      payment = amortization + interest;
    } else {
      payment = priceInst;
      amortization = Math.max(payment - interest, 0);
    }
    if (amortization > balance) {
      amortization = balance;
      payment = amortization + interest;
    }
    const mip = balance * mipRate;
    balance = Math.max(balance - amortization, 0);
    // Extra amortization applied AFTER regular amortization
    const extra = extras[k] ?? 0;
    if (extra > 0 && balance > 0) {
      const applied = Math.min(extra, balance);
      balance -= applied;
      amortization += applied;
      payment += applied;
      if (strategy === "reduce-installment" && system === "PRICE" && balance > 0) {
        remainingTerm = base.termMonths - k;
        if (remainingTerm > 0) priceInst = priceInstallment(balance, i, remainingTerm);
      }
      // For SAC reduce-installment, sacAmort stays (already fixed); reduce-term naturally shortens.
    }
    const fullPayment = payment + mip + dfi + admin;
    totalPaid += fullPayment;
    totalInterest += interest;
    totalInsurance += mip + dfi + admin;
    schedule.push({ n: k, payment, interest, amortization, mip, dfi, admin, fullPayment, balance });
  }

  const withExtra: FinancingResult = {
    system,
    financedAmount: baseline.financedAmount,
    monthlyRate: i,
    firstInstallment: schedule[0]?.fullPayment ?? 0,
    lastInstallment: schedule[schedule.length - 1]?.fullPayment ?? 0,
    firstPayment: schedule[0]?.payment ?? 0,
    lastPayment: schedule[schedule.length - 1]?.payment ?? 0,
    totalPaid,
    totalInterest,
    totalInsurance,
    schedule,
    cetMonthly: 0,
    cetAnnual: 0,
  };

  return {
    baseline,
    withExtra,
    interestSaved: baseline.totalInterest - totalInterest,
    monthsSaved: baseline.schedule.length - schedule.length,
    installmentReduction: baseline.firstInstallment - withExtra.firstInstallment,
  };
}

/**
 * Minimum required monthly income (30% commitment cap on first full installment).
 */
export function requiredIncome(firstFullInstallment: number, capPct = 0.3): number {
  return firstFullInstallment / capPct;
}

export type IncomeFitStatus = "ok" | "tight" | "over";
export function incomeFit(firstFullInstallment: number, monthlyIncome: number): IncomeFitStatus {
  if (monthlyIncome <= 0) return "over";
  const ratio = firstFullInstallment / monthlyIncome;
  if (ratio <= 0.25) return "ok";
  if (ratio <= 0.3) return "tight";
  return "over";
}
