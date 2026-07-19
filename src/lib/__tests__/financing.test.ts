import { describe, it, expect } from "vitest";
import {
  annualToMonthly,
  monthlyToAnnual,
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
