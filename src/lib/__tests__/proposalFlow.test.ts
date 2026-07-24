import { describe, it, expect } from "vitest";
import {
  buildProposalFlow,
  flowFromSaved,
  flowTotals,
  INCC_M_DEMO_MONTHLY,
  monthsBetweenISO,
} from "../proposalFlow";

describe("proposalFlow", () => {
  it("distribuição automática fecha com o valor final da proposta", () => {
    const p = {
      payment_method: "financiamento",
      final_price_brl: 500_000,
      down_payment_brl: 50_000,
      monthly_count: 12,
      monthly_brl: 10_000,
      balloon_count: 2,
      balloon_brl: 20_000,
      keys_brl: 500_000 - 50_000 - 12 * 10_000 - 2 * 20_000, // 290_000
    };
    const rows = buildProposalFlow(p, "2026-01-15");
    const { contractual } = flowTotals(rows);
    expect(Math.round(contractual)).toBe(500_000);
    // Sinal + 12 mensais + 2 intermediárias + chaves = 16
    expect(rows.length).toBe(16);
    expect(rows[0].seq).toBe("001/001-S");
    expect(rows.find((r) => r.kind === "chaves")?.seq).toBe("001/001-C");
  });

  it("à vista gera linha única sem correção", () => {
    const rows = buildProposalFlow(
      {
        payment_method: "a_vista",
        final_price_brl: 800_000,
        down_payment_brl: 0,
        monthly_count: 0,
        monthly_brl: 0,
        balloon_count: 0,
        balloon_brl: 0,
        keys_brl: 0,
      },
      "2026-03-10",
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].kind).toBe("unico");
    expect(rows[0].seq).toBe("001/001-S");
    expect(rows[0].correctedNow).toBe(800_000);
  });

  it("flowFromSaved recomputa sequência correta e aplica correção projetada", () => {
    const saved = [
      { seq_no: 1, kind: "sinal", due_date: "2026-01-15", amount_brl: 50_000 },
      { seq_no: 2, kind: "mensal", due_date: "2026-02-15", amount_brl: 10_000 },
      { seq_no: 3, kind: "mensal", due_date: "2026-03-15", amount_brl: 10_000 },
      { seq_no: 4, kind: "intermediaria", due_date: "2026-07-15", amount_brl: 30_000 },
      { seq_no: 5, kind: "chaves", due_date: "2026-12-15", amount_brl: 100_000 },
    ];
    const rows = flowFromSaved(saved, "2026-01-15");
    expect(rows.map((r) => r.seq)).toEqual([
      "001/001-S",
      "001/002-M",
      "002/002-M",
      "001/001-I",
      "001/001-C",
    ]);
    // Sinal (m=0) sem correção
    expect(rows[0].correctedNow).toBe(50_000);
    // Chaves: 11 meses -> 100_000 * (1.0045)^11
    const expected = 100_000 * Math.pow(1 + INCC_M_DEMO_MONTHLY, 11);
    expect(rows[4].correctedNow).toBeCloseTo(expected, 2);
  });

  it("monthsBetweenISO conta meses inteiros ajustando pelo dia", () => {
    expect(monthsBetweenISO("2026-01-15", "2026-02-15")).toBe(1);
    expect(monthsBetweenISO("2026-01-15", "2026-02-14")).toBe(0);
    expect(monthsBetweenISO("2026-01-15", "2027-01-15")).toBe(12);
  });
});
