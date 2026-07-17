import { describe, it, expect } from "vitest";
import {
  calculateInvestmentScore,
  calculateTrueYield,
  calculateAllScores,
  getGradeExplanation,
} from "@/lib/investmentScore";
import type { BairroAirbnb } from "@/types/intelligence";

// ── Test fixtures ────────────────────────────────────────────────

const baseBairro: BairroAirbnb = {
  id: 1,
  bairro: "Consolação",
  cidade: "São Paulo",
  periodo_inicio: "2024-01",
  periodo_fim: "2024-12",
  n_listings_total: 500,
  n_listings_studio_1q: 200,
  pct_studio_1q: 0.4,
  adr_medio_studio: 280,
  ocupacao_media_studio: 0.72,
  receita_anual_media_studio: 73000,
  estadia_media_noites: 3.5,
  porcentagem_reservas_30d_plus: 0.15,
  rating_medio: 4.6,
  percentual_superhost: 0.35,
  media_reviews_por_listing: 45,
  pct_politica_flexivel: 0.6,
  pct_politica_moderada: 0.3,
  pct_politica_rigida: 0.1,
  preco_m2_residencial_medio: 10500,
  aluguel_mensal_long_term_medio: 2800,
  dias_medio_venda_imovel: 120,
  numero_transacoes_imobiliarias_ano: 350,
  indice_criminalidade: 0.3,
  grau_saturacao_index: 0.45,
  risco_regulatorio: 0.2,
  risco_condominio: 0.15,
  area_media_estudio: 30,
  yield_bruto_airbnb: 0.085,
  yield_bruto_long_term: 0.05,
  delta_yield: 0.035,
  score_rentabilidade: 78,
  score_liquidez: 72,
  score_crescimento_potencial: 68,
  nivel_confianca_dados: "alto",
  fonte_primaria: "AirDNA",
  data_atualizacao: "2024-12-01",
};

function makeBairro(overrides: Partial<BairroAirbnb>): BairroAirbnb {
  return { ...baseBairro, ...overrides };
}

const sampleBairros: BairroAirbnb[] = [
  makeBairro({ bairro: "Consolação", yield_bruto_airbnb: 0.085, score_liquidez: 72, ocupacao_media_studio: 0.72, score_crescimento_potencial: 68 }),
  makeBairro({ bairro: "Pinheiros", id: 2, yield_bruto_airbnb: 0.065, score_liquidez: 85, ocupacao_media_studio: 0.78, score_crescimento_potencial: 55 }),
  makeBairro({ bairro: "Itaim", id: 3, yield_bruto_airbnb: 0.055, score_liquidez: 45, ocupacao_media_studio: 0.65, score_crescimento_potencial: 80, nivel_confianca_dados: "médio" }),
];

// ── Tests ────────────────────────────────────────────────────────

describe("calculateInvestmentScore", () => {
  it("returns score between 0 and 100", () => {
    const result = calculateInvestmentScore(sampleBairros[0], sampleBairros);
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
  });

  it("returns all 4 pillars", () => {
    const result = calculateInvestmentScore(sampleBairros[0], sampleBairros);
    expect(result.pillars).toHaveLength(4);
    const keys = result.pillars.map(p => p.key);
    expect(keys).toEqual(["retorno", "demanda", "operacao", "futuro"]);
  });

  it("assigns correct grade based on score", () => {
    const consolacao = calculateInvestmentScore(sampleBairros[0], sampleBairros);
    // Consolação has highest yield, should score well
    expect(["A+", "A", "B", "C", "D"]).toContain(consolacao.grade);
  });

  it("applies confidence penalty for non-alto data", () => {
    const itaim = calculateInvestmentScore(sampleBairros[2], sampleBairros);
    expect(itaim.confidenceFactor).toBeLessThan(1);
    expect(itaim.confidenceFactor).toBe(0.93);
  });

  it("applies liquidity risk penalty for low score_liquidez", () => {
    const itaim = calculateInvestmentScore(sampleBairros[2], sampleBairros);
    expect(itaim.liquidityRiskFactor).toBeLessThan(1);
    expect(itaim.liquidityRiskFactor).toBe(0.90);
  });

  it("no penalties for high-confidence high-liquidity bairro", () => {
    const consolacao = calculateInvestmentScore(sampleBairros[0], sampleBairros);
    expect(consolacao.confidenceFactor).toBe(1.0);
    expect(consolacao.liquidityRiskFactor).toBe(1.0);
  });

  it("produces a non-empty narrative string", () => {
    const result = calculateInvestmentScore(sampleBairros[0], sampleBairros);
    expect(result.narrative).toBeTruthy();
    expect(result.narrative).toContain("Consolação");
  });

  it("handles single bairro (all normalized to 50)", () => {
    const single = [sampleBairros[0]];
    const result = calculateInvestmentScore(single[0], single);
    // When min === max, normalize returns 50
    result.pillars.forEach(p => {
      expect(p.normalized).toBe(50);
    });
  });
});

describe("calculateTrueYield", () => {
  it("calculates annual revenue correctly", () => {
    const result = calculateTrueYield(baseBairro);
    // ADR 280 × occ 0.72 × 365
    const expected = 280 * 0.72 * 365;
    expect(result.annualRevenue).toBeCloseTo(expected, 0);
  });

  it("calculates property price correctly", () => {
    const result = calculateTrueYield(baseBairro);
    // preco_m2 10500 × area 30
    expect(result.propertyPrice).toBe(10500 * 30);
  });

  it("returns trueYield as annualRevenue / propertyPrice", () => {
    const result = calculateTrueYield(baseBairro);
    expect(result.trueYield).toBeCloseTo(result.annualRevenue / result.propertyPrice, 6);
  });

  it("returns 0 trueYield when propertyPrice is 0", () => {
    const zeroPriceBairro = makeBairro({ preco_m2_residencial_medio: 0 });
    const result = calculateTrueYield(zeroPriceBairro);
    expect(result.trueYield).toBe(0);
  });

  it("returns delta as trueYield minus yieldBrutoAirbnb", () => {
    const result = calculateTrueYield(baseBairro);
    expect(result.delta).toBeCloseTo(result.trueYield - 0.085, 6);
  });
});

describe("calculateAllScores", () => {
  it("returns sorted array (highest score first)", () => {
    const results = calculateAllScores(sampleBairros);
    expect(results).toHaveLength(3);
    for (let i = 1; i < results.length; i++) {
      expect(results[i - 1].investmentScore.score).toBeGreaterThanOrEqual(results[i].investmentScore.score);
    }
  });

  it("returns empty array for empty input", () => {
    expect(calculateAllScores([])).toEqual([]);
  });
});

describe("getGradeExplanation", () => {
  it("returns explanation for known grades", () => {
    expect(getGradeExplanation("A+")).toContain("Excelente");
    expect(getGradeExplanation("A")).toContain("Muito bom");
    expect(getGradeExplanation("B")).toContain("Bom");
    expect(getGradeExplanation("C")).toContain("Moderado");
    expect(getGradeExplanation("D")).toContain("Arriscado");
  });

  it("returns empty string for unknown grade", () => {
    expect(getGradeExplanation("F")).toBe("");
  });
});
