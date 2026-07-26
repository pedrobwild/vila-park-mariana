/**
 * Gerador único do fluxo de pagamento proposto.
 * Usado pela página pública (/proposta/:token) e pela configuração do admin
 * (Dialog "Configurar fluxo de pagamento" em ProposalsSection).
 *
 * INCC-M demo: 0,45% a.m. — mesma taxa usada nos contratos do sistema.
 * O índice oficial vigente será aplicado no contrato definitivo.
 */

export const INCC_M_DEMO_MONTHLY = 0.0045;

export type FlowKind = "sinal" | "mensal" | "intermediaria" | "chaves" | "unico";

export type FlowRow = {
  parcela: number;
  seq: string;
  kind: FlowKind;
  dueDate: string; // ISO yyyy-mm-dd
  contractual: number;
  correctedNow: number;
  monthsFromProposal: number;
};

export type ProposalLike = {
  payment_method: string;
  final_price_brl: number | string;
  down_payment_brl: number | string;
  monthly_count: number;
  monthly_brl: number | string;
  balloon_count: number;
  balloon_brl: number | string;
  keys_brl: number | string;
};

export type SavedInstallment = {
  seq_no: number;
  kind: string;
  due_date: string;
  amount_brl: number | string;
};

export const FLOW_KIND_LABEL: Record<FlowKind, string> = {
  sinal: "Ato / sinal",
  mensal: "Mensal",
  intermediaria: "Intermediária",
  chaves: "Chaves",
  unico: "Pagamento único",
};

const num = (v: unknown) => (typeof v === "number" ? v : Number(v ?? 0)) || 0;
const pad3 = (v: number) => String(v).padStart(3, "0");

export function parseISODateLocal(iso: string): Date {
  const s = iso.length > 10 ? iso.slice(0, 10) : iso;
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Adiciona meses preservando o dia; se o mês alvo não tiver o dia, usa o último dia do mês. */
export function addMonthsSafe(base: Date, months: number): Date {
  const targetY = base.getFullYear();
  const targetIdx = base.getMonth() + months;
  const y = targetY + Math.floor(targetIdx / 12);
  const m = ((targetIdx % 12) + 12) % 12;
  const lastDay = new Date(y, m + 1, 0).getDate();
  return new Date(y, m, Math.min(base.getDate(), lastDay));
}

/** Meses entre duas datas ISO (inteiros, positivo se b > a). */
export function monthsBetweenISO(aISO: string, bISO: string): number {
  const a = parseISODateLocal(aISO);
  const b = parseISODateLocal(bISO);
  const rawMonths = (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth());
  // Ajuste: se o dia do mês em b for menor que o dia em a, ainda não completou o mês.
  const dayAdjust = b.getDate() < a.getDate() ? -1 : 0;
  return rawMonths + dayAdjust;
}

export function correctedByINCC(
  contractual: number,
  months: number,
  monthlyRate: number = INCC_M_DEMO_MONTHLY,
): number {
  if (months <= 0) return contractual;
  return contractual * Math.pow(1 + monthlyRate, months);
}

export type FlowOptions = {
  /** Índice de correção mensal (decimal). Padrão: INCC-M de demonstração. */
  inccMonthly?: number;
  /** Cadência das parcelas intermediárias, em meses. Padrão: 6. */
  balloonEveryMonths?: number;
};

/** Normaliza a data de referência da proposta para ISO (yyyy-mm-dd). */
export function proposalDateISO(input: string): string {
  const s = input;
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return s.slice(0, 10);
  return toISODate(d);
}

/**
 * Distribuição automática a partir da estrutura da proposta.
 * Determinística: parte da data da proposta e projeta vencimentos futuros.
 */
export function buildProposalFlow(
  p: ProposalLike,
  proposalDate: string,
  opts: FlowOptions = {},
): FlowRow[] {
  const incc = opts.inccMonthly ?? INCC_M_DEMO_MONTHLY;
  const every = Math.max(1, Math.floor(opts.balloonEveryMonths ?? 6));
  const rows: FlowRow[] = [];

  if (p.payment_method === "a_vista") {
    const value = num(p.final_price_brl);
    rows.push({
      parcela: 1,
      seq: "001/001-S",
      kind: "unico",
      dueDate: proposalDate,
      contractual: value,
      correctedNow: value,
      monthsFromProposal: 0,
    });
    return rows;
  }

  const base = parseISODateLocal(proposalDate);
  let parcela = 0;

  if (num(p.down_payment_brl) > 0) {
    parcela++;
    const v = num(p.down_payment_brl);
    rows.push({
      parcela,
      seq: "001/001-S",
      kind: "sinal",
      dueDate: toISODate(base),
      contractual: v,
      correctedNow: v,
      monthsFromProposal: 0,
    });
  }

  const N = Math.max(0, p.monthly_count | 0);
  const B = Math.max(0, p.balloon_count | 0);
  let balloonIdx = 0;

  for (let i = 1; i <= N; i++) {
    parcela++;
    const due = addMonthsSafe(base, i);
    const v = num(p.monthly_brl);
    rows.push({
      parcela,
      seq: `${pad3(i)}/${pad3(N)}-M`,
      kind: "mensal",
      dueDate: toISODate(due),
      contractual: v,
      correctedNow: correctedByINCC(v, i, incc),
      monthsFromProposal: i,
    });
    if (B > 0 && i % every === 0 && balloonIdx < B) {
      balloonIdx++;
      parcela++;
      const vb = num(p.balloon_brl);
      rows.push({
        parcela,
        seq: `${pad3(balloonIdx)}/${pad3(B)}-I`,
        kind: "intermediaria",
        dueDate: toISODate(due),
        contractual: vb,
        correctedNow: correctedByINCC(vb, i, incc),
        monthsFromProposal: i,
      });
    }
  }

  if (num(p.keys_brl) > 0) {
    parcela++;
    const keysM = N + 1;
    const due = addMonthsSafe(base, keysM);
    const v = num(p.keys_brl);
    rows.push({
      parcela,
      seq: "001/001-C",
      kind: "chaves",
      dueDate: toISODate(due),
      contractual: v,
      correctedNow: correctedByINCC(v, keysM, incc),
      monthsFromProposal: keysM,
    });
  }

  return rows;
}

/**
 * Constrói o fluxo a partir de parcelas SALVAS (crm_proposal_installments).
 * Ordena por seq_no; recomputa sequência estilo mercado pelas contagens por tipo.
 */
export function flowFromSaved(
  installments: SavedInstallment[],
  proposalDate: string,
): FlowRow[] {
  const sorted = [...installments].sort((a, b) => a.seq_no - b.seq_no);

  const counts = { sinal: 0, mensal: 0, intermediaria: 0, chaves: 0, unico: 0 };
  for (const s of sorted) {
    const k = (s.kind as FlowKind) ?? "mensal";
    if (k in counts) counts[k]++;
  }

  const idx = { sinal: 0, mensal: 0, intermediaria: 0, chaves: 0, unico: 0 };
  const rows: FlowRow[] = [];
  let parcela = 0;

  for (const s of sorted) {
    parcela++;
    const kind = (s.kind as FlowKind) ?? "mensal";
    idx[kind]++;
    const total = counts[kind] || 1;
    let seq: string;
    switch (kind) {
      case "sinal":
        seq = `${pad3(idx.sinal)}/${pad3(counts.sinal || 1)}-S`;
        break;
      case "mensal":
        seq = `${pad3(idx.mensal)}/${pad3(total)}-M`;
        break;
      case "intermediaria":
        seq = `${pad3(idx.intermediaria)}/${pad3(total)}-I`;
        break;
      case "chaves":
        seq = `${pad3(idx.chaves)}/${pad3(counts.chaves || 1)}-C`;
        break;
      case "unico":
      default:
        seq = "001/001-S";
        break;
    }
    const months = Math.max(0, monthsBetweenISO(proposalDate, s.due_date));
    const contractual = num(s.amount_brl);
    rows.push({
      parcela,
      seq,
      kind,
      dueDate: s.due_date,
      contractual,
      correctedNow: correctedByINCC(contractual, months),
      monthsFromProposal: months,
    });
  }

  return rows;
}

/** Soma contratual e projetada. */
export function flowTotals(rows: FlowRow[]): { contractual: number; corrected: number } {
  return rows.reduce(
    (acc, r) => ({
      contractual: acc.contractual + r.contractual,
      corrected: acc.corrected + r.correctedNow,
    }),
    { contractual: 0, corrected: 0 },
  );
}
