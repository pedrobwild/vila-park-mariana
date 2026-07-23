import { describe, it, expect } from "vitest";
import {
  buildStatement,
  correctedAt,
  round2,
  type Contract,
  type Installment,
} from "../contractStatement";

const baseContract: Contract = {
  id: "c1",
  unit_id: "u1",
  contract_number: "VP-TEST-0001",
  client_name: "Teste",
  contract_date: "2025-01-15",
  original_value: 100000,
  contract_value: 100000,
  monthly_index_rate: 0.01, // 1% a.m. para verificação fácil
  index_label: "INCC-M",
  late_fine_rate: 0.02,
  late_interest_monthly: 0.01,
  status: "ativo",
};

function mkInst(over: Partial<Installment> & Pick<Installment, "id" | "kind" | "due_date" | "contractual_value">): Installment {
  return {
    contract_id: "c1",
    seq_label: "X",
    paid_date: null,
    paid_value: 0,
    fine_value: 0,
    interest_value: 0,
    discount_value: 0,
    admin_fee: 0,
    insurance_fee: 0,
    corrected_value: null,
    ...over,
  } as Installment;
}

describe("correctedAt", () => {
  it("compõe geometricamente ~12 meses a 1%", () => {
    const v = correctedAt(1000, "2025-01-15", "2026-01-15", 0.01);
    // ~1000 * 1.01^12 ≈ 1126.83
    expect(v).toBeGreaterThan(1125);
    expect(v).toBeLessThan(1130);
  });

  it("retorna o próprio valor quando meses <= 0", () => {
    const v = correctedAt(500, "2026-01-15", "2025-01-15", 0.01);
    expect(v).toBe(500);
  });
});

describe("buildStatement — agregados e conferências", () => {
  const installments: Installment[] = [
    mkInst({
      id: "i1",
      kind: "sinal",
      due_date: "2025-01-15",
      contractual_value: 5000,
      paid_date: "2025-01-15",
      paid_value: 5000,
      corrected_value: 5000,
    }),
    mkInst({
      id: "i2",
      kind: "mensal",
      due_date: "2025-02-15",
      contractual_value: 25000,
      paid_date: "2025-02-15",
      paid_value: 25250,
      corrected_value: 25250,
    }),
    // Parcela em aberto após 12 meses
    mkInst({
      id: "i3",
      kind: "chaves",
      due_date: "2026-12-30",
      contractual_value: 70000,
    }),
  ];

  it("Σ contractual = contract_value (conferência 1)", () => {
    const r = buildStatement(baseContract, installments, "2026-01-15");
    expect(r.summary.totalContractual).toBe(100000);
    expect(r.checks.sumEqualsContract).toBe(true);
  });

  it("TOTAL PAGO = Σ paid_value", () => {
    const r = buildStatement(baseContract, installments, "2026-01-15");
    expect(r.summary.totalPago).toBe(round2(5000 + 25250));
  });

  it("VALOR QUITAÇÃO = Σ corrigido das em aberto na data-base", () => {
    const r = buildStatement(baseContract, installments, "2026-01-15");
    // 70000 * 1.01^12 ≈ 78878.29
    expect(r.summary.valorQuitacao).toBeGreaterThan(78800);
    expect(r.summary.valorQuitacao).toBeLessThan(78950);
  });

  it("total corrigido = soma das linhas corrigidas", () => {
    const r = buildStatement(baseContract, installments, "2026-01-15");
    const sum = round2(r.rows.reduce((s, x) => s + x.correctedNow, 0));
    expect(r.summary.totalCorrigido).toBe(sum);
  });

  it("detecta parcela paga sem paid_date (conferência 3)", () => {
    const bad = installments.map((i) =>
      i.id === "i1" ? { ...i, paid_date: null, paid_value: 5000 } : i,
    );
    const r = buildStatement(baseContract, bad, "2026-01-15");
    expect(r.checks.paidHavePaidDate).toBe(false);
  });

  it("falha conferência 1 quando somatório diverge", () => {
    const bad = installments.map((i) =>
      i.id === "i3" ? { ...i, contractual_value: 60000 } : i,
    );
    const r = buildStatement(baseContract, bad, "2026-01-15");
    expect(r.checks.sumEqualsContract).toBe(false);
  });
});
