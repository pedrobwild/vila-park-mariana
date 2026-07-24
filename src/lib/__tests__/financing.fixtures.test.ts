/**
 * Regression fixtures for the shared financing engine.
 *
 * Both /ferramentas and /proposta/:token compose the SAME
 * `FinancingSimulatorResults` component, which internally calls
 * `simulate("SAC" | "PRICE", inputBase)` from src/lib/financing.
 * If either place ever drifts, the divergence would originate here.
 *
 * These snapshots lock the engine output for the reference inputs
 * shown in both routes, so any unintentional numeric change is caught.
 */
import { describe, it, expect } from "vitest";
import { simulate, type AmortSystem, type FinancingInput } from "@/lib/financing";

type Fixture = {
  name: string;
  system: AmortSystem;
  input: FinancingInput;
};

const FIXTURES: Fixture[] = [
  {
    name: "vila-park-sac-360m-11.19",
    system: "SAC",
    input: {
      propertyValue: 800_000,
      downPayment: 200_000,
      termMonths: 360,
      annualRate: 11.19,
      annualRateType: "efetiva",
      buyerAgeYears: 35,
    },
  },
  {
    name: "vila-park-price-360m-11.19",
    system: "PRICE",
    input: {
      propertyValue: 800_000,
      downPayment: 200_000,
      termMonths: 360,
      annualRate: 11.19,
      annualRateType: "efetiva",
      buyerAgeYears: 35,
    },
  },
  {
    name: "ferramentas-price-240m-10.5",
    system: "PRICE",
    input: {
      propertyValue: 500_000,
      downPayment: 100_000,
      termMonths: 240,
      annualRate: 10.5,
      annualRateType: "efetiva",
      buyerAgeYears: 40,
    },
  },
];

const r2 = (n: number) => Math.round(n * 100) / 100;
const r6 = (n: number) => Math.round(n * 1_000_000) / 1_000_000;

const pickRow = (row: {
  n: number;
  payment: number;
  interest: number;
  amortization: number;
  mip: number;
  dfi: number;
  admin: number;
  fullPayment: number;
  balance: number;
}) => ({
  n: row.n,
  payment: r2(row.payment),
  interest: r2(row.interest),
  amortization: r2(row.amortization),
  mip: r2(row.mip),
  dfi: r2(row.dfi),
  admin: r2(row.admin),
  fullPayment: r2(row.fullPayment),
  balance: r2(row.balance),
});

describe("financing engine · regression fixtures (shared by /ferramentas and /proposta)", () => {
  for (const fx of FIXTURES) {
    it(`${fx.name} → deterministic simulate() output`, () => {
      const r = simulate(fx.system, fx.input);
      const midIdx = Math.floor(r.schedule.length / 2);
      const summary = {
        system: r.system,
        financedAmount: r2(r.financedAmount),
        monthlyRate: r6(r.monthlyRate),
        firstInstallment: r2(r.firstInstallment),
        lastInstallment: r2(r.lastInstallment),
        firstPayment: r2(r.firstPayment),
        lastPayment: r2(r.lastPayment),
        totalPaid: r2(r.totalPaid),
        totalInterest: r2(r.totalInterest),
        totalInsurance: r2(r.totalInsurance),
        cetMonthly: r6(r.cetMonthly),
        cetAnnual: r6(r.cetAnnual),
        scheduleLength: r.schedule.length,
        firstRow: pickRow(r.schedule[0]),
        midRow: pickRow(r.schedule[midIdx]),
        lastRow: pickRow(r.schedule[r.schedule.length - 1]),
      };
      expect(summary).toMatchSnapshot();
    });
  }
});
