import { describe, it, expect } from "vitest";
import { resolveProfile, type QuizAnswers } from "@/lib/investorQuiz";

describe("resolveProfile", () => {
  it("returns exact match for known profile key", () => {
    const answers: QuizAnswers = { objective: "renda", risk: "conservador", priority: "fluxo" };
    const profile = resolveProfile(answers);
    expect(profile.name).toBe("Investidor de renda estável");
    expect(profile.weights.demanda).toBe(0.35);
  });

  it("returns exact match for aggressive yield profile", () => {
    const answers: QuizAnswers = { objective: "renda", risk: "arrojado", priority: "retorno" };
    const profile = resolveProfile(answers);
    expect(profile.name).toBe("Investidor agressivo de yield");
    expect(profile.weights.retorno).toBe(0.50);
  });

  it("returns exact match for patrimonial profile", () => {
    const answers: QuizAnswers = { objective: "valorizacao", risk: "conservador", priority: "facilidade" };
    const profile = resolveProfile(answers);
    expect(profile.name).toBe("Investidor patrimonial");
    expect(profile.weights.futuro).toBe(0.40);
  });

  it("dynamically generates profile for non-exact match", () => {
    const answers: QuizAnswers = { objective: "equilibrio", risk: "moderado", priority: "fluxo" };
    const profile = resolveProfile(answers);
    // Should be dynamically generated, not one of the 3 exact matches
    expect(profile.name).not.toBe("Investidor de renda estável");
    expect(profile.name).not.toBe("Investidor agressivo de yield");
    expect(profile.name).not.toBe("Investidor patrimonial");
  });

  it("dynamic profile weights sum to 1", () => {
    const combos: QuizAnswers[] = [
      { objective: "equilibrio", risk: "moderado", priority: "fluxo" },
      { objective: "renda", risk: "moderado", priority: "facilidade" },
      { objective: "valorizacao", risk: "arrojado", priority: "retorno" },
      { objective: "equilibrio", risk: "conservador", priority: "retorno" },
    ];

    for (const answers of combos) {
      const profile = resolveProfile(answers);
      const sum = Object.values(profile.weights).reduce((a, b) => a + b, 0);
      expect(sum).toBeCloseTo(1.0, 5);
    }
  });

  it("dynamic profile has all required fields", () => {
    const answers: QuizAnswers = { objective: "equilibrio", risk: "arrojado", priority: "retorno" };
    const profile = resolveProfile(answers);
    expect(profile.name).toBeTruthy();
    expect(profile.description).toBeTruthy();
    expect(profile.icon).toBeTruthy();
    expect(profile.color).toBeTruthy();
    expect(profile.textColor).toBeTruthy();
    expect(profile.weights).toHaveProperty("retorno");
    expect(profile.weights).toHaveProperty("demanda");
    expect(profile.weights).toHaveProperty("operacao");
    expect(profile.weights).toHaveProperty("futuro");
  });

  it("arrojado risk boosts retorno weight", () => {
    const moderado = resolveProfile({ objective: "equilibrio", risk: "moderado", priority: "fluxo" });
    const arrojado = resolveProfile({ objective: "equilibrio", risk: "arrojado", priority: "fluxo" });
    expect(arrojado.weights.retorno).toBeGreaterThan(moderado.weights.retorno);
  });

  it("conservador risk boosts demanda weight", () => {
    const moderado = resolveProfile({ objective: "equilibrio", risk: "moderado", priority: "retorno" });
    const conservador = resolveProfile({ objective: "equilibrio", risk: "conservador", priority: "retorno" });
    expect(conservador.weights.demanda).toBeGreaterThan(moderado.weights.demanda);
  });
});
