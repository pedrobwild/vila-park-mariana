// Motor de cálculo do Extrato do Cliente.
// SIMPLIFICADO: correção pro-rata geométrica com taxa fixa do contrato (~INCC-M).
// Produção usaria a série mensal do índice oficial publicado.

export type InstallmentKind = "sinal" | "mensal" | "intermediaria" | "chaves";

export interface Contract {
  id: string;
  unit_id: string;
  contract_number: string;
  client_name: string;
  contract_date: string;
  original_value: number;
  contract_value: number;
  monthly_index_rate: number;
  index_label: string;
  late_fine_rate: number;
  late_interest_monthly: number;
  status: string;
}

export interface Installment {
  id: string;
  contract_id: string;
  seq_label: string;
  kind: InstallmentKind;
  due_date: string;
  contractual_value: number;
  paid_date: string | null;
  paid_value: number;
  fine_value: number;
  interest_value: number;
  discount_value: number;
  admin_fee: number;
  insurance_fee: number;
  corrected_value: number | null;
}

const MS_PER_DAY = 86400000;

function toDate(d: string | Date): Date {
  if (d instanceof Date) return d;
  // 'YYYY-MM-DD' – parse como local
  const [y, m, day] = d.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, day ?? 1);
}

function monthsBetween(from: string | Date, to: string | Date): number {
  const a = toDate(from);
  const b = toDate(to);
  const days = (b.getTime() - a.getTime()) / MS_PER_DAY;
  return days / (365.25 / 12);
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Correção pro-rata geométrica de uma parcela em aberto até a data-base D. */
export function correctedAt(
  contractual: number,
  contractDate: string,
  baseDate: string | Date,
  monthlyRate: number,
): number {
  const months = Math.max(0, monthsBetween(contractDate, baseDate));
  return round2(contractual * Math.pow(1 + monthlyRate, months));
}

export interface StatementRow extends Installment {
  correctedNow: number;
  totalCharged: number; // valor pago se pago; senão corrigido + eventual multa/juros calculados até D
}

export interface StatementSummary {
  originalValue: number;
  contractValue: number;
  totalPago: number;
  valorQuitacao: number;
  totalContractual: number;
  totalCorrigido: number;
  totalMulta: number;
  totalJuros: number;
  totalDesconto: number;
  totalTaxas: number;
}

export interface StatementChecks {
  sumEqualsContract: boolean;
  paidHavePaidDate: boolean;
}

export interface StatementResult {
  rows: StatementRow[];
  summary: StatementSummary;
  checks: StatementChecks;
}

export function buildStatement(
  contract: Contract,
  installments: Installment[],
  baseDate: string | Date,
): StatementResult {
  const rows: StatementRow[] = installments
    .slice()
    .sort((a, b) => a.due_date.localeCompare(b.due_date))
    .map((i) => {
      const isPaid = !!i.paid_date && i.paid_value > 0;
      const correctedNow = isPaid
        ? Number(i.corrected_value ?? i.paid_value)
        : correctedAt(
            Number(i.contractual_value),
            contract.contract_date,
            baseDate,
            Number(contract.monthly_index_rate),
          );
      const totalCharged = isPaid ? Number(i.paid_value) : correctedNow;
      return { ...i, correctedNow, totalCharged };
    });

  const summary: StatementSummary = {
    originalValue: Number(contract.original_value),
    contractValue: Number(contract.contract_value),
    totalPago: round2(rows.reduce((s, r) => s + Number(r.paid_value || 0), 0)),
    valorQuitacao: round2(
      rows
        .filter((r) => !r.paid_date || Number(r.paid_value) === 0)
        .reduce((s, r) => s + r.correctedNow, 0),
    ),
    totalContractual: round2(rows.reduce((s, r) => s + Number(r.contractual_value), 0)),
    totalCorrigido: round2(rows.reduce((s, r) => s + r.correctedNow, 0)),
    totalMulta: round2(rows.reduce((s, r) => s + Number(r.fine_value || 0), 0)),
    totalJuros: round2(rows.reduce((s, r) => s + Number(r.interest_value || 0), 0)),
    totalDesconto: round2(rows.reduce((s, r) => s + Number(r.discount_value || 0), 0)),
    totalTaxas: round2(
      rows.reduce((s, r) => s + Number(r.admin_fee || 0) + Number(r.insurance_fee || 0), 0),
    ),
  };

  const checks: StatementChecks = {
    sumEqualsContract: Math.abs(summary.totalContractual - summary.contractValue) < 0.05,
    paidHavePaidDate: rows.every((r) => Number(r.paid_value) === 0 || !!r.paid_date),
  };

  return { rows, summary, checks };
}

export function formatBRL(n: number): string {
  return n.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function formatDateBR(d?: string | null): string {
  if (!d) return "—";
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
}
