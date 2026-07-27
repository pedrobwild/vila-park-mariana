import { describe, expect, it } from "vitest";
import { buildMarketMetrics, type NeighborhoodMetrics } from "@/lib/marketMetrics";

const base = {
  bairro: "Vila Mariana",
  cidade: "São Paulo",
  fonte: "AirDNA",
  data_referencia: "2026-07-01",
  aluguel_mensal_brl: 4000,
  area_media_m2: 40,
  preco_m2_brl: 12000,
} as unknown as NeighborhoodMetrics;

const find = (m: NeighborhoodMetrics | null) =>
  buildMarketMetrics("long_stay", m).find((x) => x.key === "rentabilidade");

describe("buildMarketMetrics · rentabilidade do aluguel (long stay)", () => {
  it("calcula (aluguel_m2 × 12) ÷ preço_m2 × 100 com 1 casa decimal", () => {
    // 4000/40 = 100/m² → 1200 ao ano ÷ 12000 = 10%
    expect(find(base)?.value).toBe("10,0% a.a.");
  });

  it("arredonda para uma casa decimal", () => {
    const m = { ...base, aluguel_mensal_brl: 2050 } as NeighborhoodMetrics;
    // 51,25/m² → 615 ÷ 12000 = 5,125%
    expect(find(m)?.value).toBe("5,1% a.a.");
  });

  it("retorna null quando falta o preço do m²", () => {
    const m = { ...base, preco_m2_brl: null } as unknown as NeighborhoodMetrics;
    expect(find(m)?.value).toBeNull();
  });

  it("retorna null quando falta o aluguel", () => {
    const m = { ...base, aluguel_mensal_brl: null } as unknown as NeighborhoodMetrics;
    expect(find(m)?.value).toBeNull();
  });

  it("retorna null quando não há dados do bairro", () => {
    expect(find(null)?.value).toBeNull();
  });

  it("expõe tooltip de ausência de dados", () => {
    expect(find(null)?.emptyHint).toBe("Sem dados suficientes para este bairro.");
  });

  it("não expõe mais o card de vacância", () => {
    expect(buildMarketMetrics("long_stay", base).map((m) => m.key)).not.toContain("vacancia");
  });
});
