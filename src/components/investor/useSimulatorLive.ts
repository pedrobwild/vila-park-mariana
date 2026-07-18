import { useEffect, useState } from "react";
import { simulatorStorage, type SimulatorPersisted } from "./persistence";

/**
 * Live view of the persisted investor simulator inputs.
 * Polls localStorage (cheap) so downstream sections react to user edits.
 */
export function useSimulatorLive(intervalMs = 800): SimulatorPersisted | null {
  const [state, setState] = useState<SimulatorPersisted | null>(() =>
    typeof window !== "undefined" ? simulatorStorage.load() : null,
  );

  useEffect(() => {
    let last = JSON.stringify(state);
    const tick = () => {
      const next = simulatorStorage.load();
      const s = JSON.stringify(next);
      if (s !== last) {
        last = s;
        setState(next);
      }
    };
    const id = setInterval(tick, intervalMs);
    const onStorage = (e: StorageEvent) => {
      if (e.key && e.key.includes("simulator")) tick();
    };
    window.addEventListener("storage", onStorage);
    return () => {
      clearInterval(id);
      window.removeEventListener("storage", onStorage);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [intervalMs]);

  return state;
}

export interface DerivedSimInputs {
  hasInputs: boolean;
  price: number;
  capex: number;
  totalInvestment: number;
  daily: number;
  occupancy: number; // 0-100
  rent: number;
  condoIptu: number;
  mode: "tradicional" | "temporada";
  typoId: string;
  capexBoost: number;
}

const CAPEX_MAP: Record<string, { capex: number; rateBoost: number }> = {
  essencial: { capex: 25000, rateBoost: 1.0 },
  premium: { capex: 55000, rateBoost: 1.15 },
  signature: { capex: 95000, rateBoost: 1.3 },
};

export function deriveSimInputs(s: SimulatorPersisted | null): DerivedSimInputs {
  const capexLevel = CAPEX_MAP[s?.capexLevelId ?? "premium"] ?? CAPEX_MAP.premium;
  const price = Number(s?.price ?? 0) || 0;
  const daily = Number(s?.daily ?? 0) || 0;
  const rent = Number(s?.rent ?? 0) || 0;
  const condoIptu = Number(s?.condoIptu ?? 0) || 0;
  const occupancy = s?.occupancy ?? 70;
  const mode = (s?.mode as "tradicional" | "temporada") ?? "temporada";
  const totalInvestment = price + capexLevel.capex;
  return {
    hasInputs: price > 0 && (mode === "tradicional" ? rent > 0 : daily > 0),
    price,
    capex: capexLevel.capex,
    totalInvestment,
    daily,
    occupancy,
    rent,
    condoIptu,
    mode,
    typoId: s?.typoId ?? "studio",
    capexBoost: capexLevel.rateBoost,
  };
}

export function computeSeasonal(daily: number, occ: number, condo: number, boost = 1) {
  const boostedDaily = daily * boost;
  const nights = 30 * (occ / 100);
  const monthlyGross = boostedDaily * nights;
  const platformFee = monthlyGross * 0.18;
  const cleaningFee = monthlyGross * 0.12;
  const monthlyNet = monthlyGross - platformFee - cleaningFee - condo;
  return {
    monthlyGross,
    platformFee,
    cleaningFee,
    monthlyNet,
    annualGross: monthlyGross * 12,
    annualNet: monthlyNet * 12,
  };
}

export const fmtBRL = (v: number) =>
  `${v < 0 ? "-" : ""}${Math.abs(v).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  })}`;

export const fmtPct = (v: number, digits = 1) =>
  `${v.toFixed(digits).replace(".", ",")}%`;
