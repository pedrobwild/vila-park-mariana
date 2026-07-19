import { describe, it, expect } from "vitest";
import {
  annualToMonthly,
  monthlyToAnnual,
  nominalAnnualToMonthly,
  nominalToEffectiveAnnual,
  monthlyRateFromAnnual,
  simulate,
  simulateWithExtras,
  checkMCMV,
  acquisitionCosts,
  requiredIncome,
  incomeFit,
  mipRateForAge,
} from "@/lib/financing";

describe("financing – rate conversions", () => {
  it("converte 12% a.a. em ~0,9489% a.m.", () => {
    const m = annualToMonthly(12);
    expect(m).toBeCloseTo(0.009488792934583046, 8);
    expect(monthlyToAnnual(m)).toBeCloseTo(0.12, 6);
  });
});

describe("financing – PRICE simulation", () => {
  const base = { propertyValue: 600_000, downPayment: 120_000, termMonths: 360, annualRate: 11.19 };
  it("produces constant banking installment for PRICE", () => {
    const r = simulate("PRICE", base);
    expect(r.schedule.length).toBe(360);
    // banking installment (no insurance) should be ~equal at first vs mid
    const p1 = r.schedule[0].payment;
    const p180 = r.schedule[179].payment;
    expect(Math.abs(p1 - p180)).toBeLessThan(1);
    expect(r.financedAmount).toBe(480_000);
    expect(r.totalInterest).toBeGreaterThan(0);
  });
  it("final balance is zero", () => {
    const r = simulate("PRICE", base);
    expect(r.schedule[r.schedule.length - 1].balance).toBeCloseTo(0, 2);
  });
});

describe("financing – SAC simulation", () => {
  const base = { propertyValue: 600_000, downPayment: 120_000, termMonths: 360, annualRate: 11.19 };
  it("first installment > last installment", () => {
    const r = simulate("SAC", base);
    expect(r.firstPayment).toBeGreaterThan(r.lastPayment);
  });
  it("SAC total interest < PRICE total interest", () => {
    const sac = simulate("SAC", base);
    const price = simulate("PRICE", base);
    expect(sac.totalInterest).toBeLessThan(price.totalInterest);
  });
});

describe("financing – zero rate edge case", () => {
  it("PRICE with 0% rate: installment = pv/n", () => {
    const r = simulate("PRICE", { propertyValue: 100_000, downPayment: 20_000, termMonths: 100, annualRate: 0 });
    expect(r.schedule[0].payment).toBeCloseTo(800, 2);
    expect(r.totalInterest).toBeCloseTo(0, 2);
  });
});

describe("financing – CET", () => {
  it("CET > contractual rate because of insurance/fees", () => {
    const r = simulate("PRICE", { propertyValue: 500_000, downPayment: 100_000, termMonths: 240, annualRate: 11.19 });
    expect(r.cetAnnual).toBeGreaterThan(0.1119);
  });
});

describe("financing – MCMV", () => {
  it("eligible when under caps", () => {
    expect(checkMCMV(500_000, 10_000).eligible).toBe(true);
  });
  it("not eligible when property > 600k", () => {
    expect(checkMCMV(700_000, 5_000).eligible).toBe(false);
  });
  it("not eligible when income > 13k", () => {
    expect(checkMCMV(400_000, 15_000).eligible).toBe(false);
  });
});

describe("financing – acquisition costs (SP)", () => {
  it("ITBI 3% + registry 1.5% + appraisal", () => {
    const c = acquisitionCosts(600_000);
    expect(c.itbi).toBe(18_000);
    expect(c.registry).toBe(9_000);
    expect(c.appraisal).toBe(3_100);
    expect(c.total).toBe(30_100);
  });
});

describe("financing – income analysis", () => {
  it("required income = installment / 0.3", () => {
    expect(requiredIncome(3_000)).toBeCloseTo(10_000, 6);
  });
  it("incomeFit thresholds", () => {
    expect(incomeFit(2_000, 10_000)).toBe("ok");
    expect(incomeFit(2_800, 10_000)).toBe("tight");
    expect(incomeFit(4_000, 10_000)).toBe("over");
  });
});

describe("financing – MIP increases with age", () => {
  it("50yo > 30yo", () => {
    expect(mipRateForAge(50)).toBeGreaterThan(mipRateForAge(30));
  });
});

describe("financing – extra amortization", () => {
  const base = { propertyValue: 600_000, downPayment: 120_000, termMonths: 360, annualRate: 11.19 };
  it("reduce-term saves interest and months", () => {
    const r = simulateWithExtras({
      system: "PRICE",
      base,
      extras: { 13: 20_000, 25: 20_000, 37: 20_000 },
      strategy: "reduce-term",
    });
    expect(r.interestSaved).toBeGreaterThan(0);
    expect(r.monthsSaved).toBeGreaterThan(0);
  });
  it("reduce-installment lowers installment (PRICE)", () => {
    const r = simulateWithExtras({
      system: "PRICE",
      base,
      extras: { 13: 50_000 },
      strategy: "reduce-installment",
    });
    expect(r.withExtra.schedule[20].payment).toBeLessThan(r.baseline.schedule[20].payment);
  });
});

describe("financing – nominal vs effective conversions", () => {
  it("MCMV 10% nominal a.a. → ~0,8333% a.m. e ~10,4713% efetiva a.a.", () => {
    expect(nominalAnnualToMonthly(10)).toBeCloseTo(0.008333333, 8);
    expect(nominalToEffectiveAnnual(10)).toBeCloseTo(10.4713067, 4);
  });
  it("monthlyRateFromAnnual respeita tipo declarado", () => {
    expect(monthlyRateFromAnnual(10, "nominal")).toBeCloseTo(0.008333333, 8);
    expect(monthlyRateFromAnnual(10, "efetiva")).toBeCloseTo(annualToMonthly(10), 10);
  });
});

describe("financing – anchor case (imóvel R$ 500k, 20%, 11,5% ef., 360m)", () => {
  const input = {
    propertyValue: 500_000,
    downPayment: 100_000,
    termMonths: 360,
    annualRate: 11.5,
  };
  it("SAC sem seguros: 1ª ≈ 4756,10 · última ≈ 1121,24 · juros totais ≈ 657.920", () => {
    const r = simulate("SAC", {
      ...input,
      mipMonthlyRate: 0,
      dfiMonthlyRate: 0,
      adminFee: 0,
    });
    expect(r.firstPayment).toBeCloseTo(4756.1, 0);
    expect(r.lastPayment).toBeCloseTo(1121.24, 0);
    expect(r.totalInterest).toBeGreaterThan(657_500);
    expect(r.totalInterest).toBeLessThan(658_500);
    expect(r.totalPaid).toBeCloseTo(1_057_920, -2);
  });
  it("Price sem seguros: parcela ≈ 3789,65 · juros totais ≈ 964.274", () => {
    const r = simulate("PRICE", {
      ...input,
      mipMonthlyRate: 0,
      dfiMonthlyRate: 0,
      adminFee: 0,
    });
    expect(r.firstPayment).toBeCloseTo(3789.65, 0);
    expect(r.totalInterest).toBeGreaterThan(963_500);
    expect(r.totalInterest).toBeLessThan(964_800);
  });
  it("SAC com seguros (MIP 0,025% a.m., DFI 0,008% a.m., tarifa R$25): 1ª ≈ 4921", () => {
    const r = simulate("SAC", {
      ...input,
      mipMonthlyRate: 0.00025,
      dfiMonthlyRate: 0.00008,
      adminFee: 25,
    });
    expect(r.firstInstallment).toBeCloseTo(4921.1, 0);
    // CET a.a. entre 12,0% e 12,6%
    expect(r.cetAnnual).toBeGreaterThan(0.12);
    expect(r.cetAnnual).toBeLessThan(0.126);
  });
});

