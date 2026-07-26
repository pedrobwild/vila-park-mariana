import { describe, expect, it } from "vitest";
import {
  INCC_M_DEMO_MONTHLY,
  analyzeVpl,
  applyInccCorrection,
  installmentsFromFlow,
  npv,
  realDiscountPct,
  vplVerdict,
  type VplInstallment,
} from "@/lib/vpl";
import { buildProposalFlow } from "@/lib/proposalFlow";

const LIST = 500_000;

describe("vpl — valor presente do fluxo de pagamento", () => {
  it("fluxo só com ato: VPL = valor nominal e desconto real = desconto nominal", () => {
    const flow: VplInstallment[] = [{ monthOffset: 0, amountBrl: 460_000 }];
    const value = npv(flow, 0.008);
    expect(value).toBeCloseTo(460_000, 6);
    expect(realDiscountPct(value, LIST)).toBeCloseTo(0.08, 10);
  });

  it("fluxo alongado tem VPL menor que o valor nominal", () => {
    const flow: VplInstallment[] = [
      { monthOffset: 0, amountBrl: 50_000 },
      { monthOffset: 12, amountBrl: 200_000 },
      { monthOffset: 24, amountBrl: 210_000 },
    ];
    const nominal = 460_000;
    const value = npv(flow, 0.008);
    expect(value).toBeLessThan(nominal);
    expect(realDiscountPct(value, LIST)).toBeGreaterThan(0.08);
  });

  it("taxa zero: VPL = valor nominal", () => {
    const flow: VplInstallment[] = [
      { monthOffset: 0, amountBrl: 100_000 },
      { monthOffset: 18, amountBrl: 360_000 },
    ];
    expect(npv(flow, 0)).toBeCloseTo(460_000, 6);
  });

  it("INCC ligado com taxa de desconto igual ao INCC: VPL ≈ nominal", () => {
    const flow: VplInstallment[] = [
      { monthOffset: 0, amountBrl: 50_000 },
      { monthOffset: 10, amountBrl: 150_000 },
      { monthOffset: 30, amountBrl: 260_000 },
    ];
    const corrected = applyInccCorrection(flow, INCC_M_DEMO_MONTHLY);
    expect(npv(corrected, INCC_M_DEMO_MONTHLY)).toBeCloseTo(460_000, 4);
  });

  it("protege contra preço de tabela inválido e taxa <= -1", () => {
    expect(realDiscountPct(100, 0)).toBe(0);
    expect(realDiscountPct(100, -5)).toBe(0);
    expect(npv([{ monthOffset: 1, amountBrl: 100 }], -1)).toBe(0);
  });

  it("veredito respeita a tolerância de 0,5 p.p.", () => {
    expect(vplVerdict(0.09, 0.08)).toBe("alongado");
    expect(vplVerdict(0.082, 0.08)).toBe("equilibrado");
    expect(vplVerdict(0.07, 0.08)).toBe("antecipado");
  });

  it("integra com o fluxo gerado por proposalFlow sem recalcular parcelamento", () => {
    const rows = buildProposalFlow(
      {
        payment_method: "direto",
        final_price_brl: 460_000,
        down_payment_brl: 60_000,
        monthly_count: 24,
        monthly_brl: 5_000,
        balloon_count: 2,
        balloon_brl: 20_000,
        keys_brl: 240_000,
      },
      "2026-07-19",
    );
    const flow = installmentsFromFlow(rows);
    expect(flow[0].monthOffset).toBe(0);
    const a = analyzeVpl(flow, { listPriceBrl: LIST, monthlyRate: 0.008 });
    expect(a.npvBrl).toBeLessThan(a.nominalBrl);
    expect(a.realDiscount).toBeGreaterThan(a.listDiscount);
    expect(a.verdict).toBe("alongado");
  });
});
