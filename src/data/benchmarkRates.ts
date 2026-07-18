/**
 * Fonte única de verdade para as taxas de referência de mercado
 * usadas nos comparativos de investimento (Retorno total, Benchmark,
 * Simulador de receita). Atualize APENAS este arquivo quando revisar
 * as taxas — todos os componentes leem daqui.
 *
 * Vigência: rótulo curto exibido nas notas metodológicas.
 * Fontes: Copom (Selic), B3/CETIP (CDI), IFIX (B3), regra da Poupança.
 */

export interface BenchmarkRates {
  /** Rótulo curto para exibição (ex.: "03/2026 · Copom") */
  vintage: string;
  /** Data ISO da vigência (para ordenação/auditoria) */
  vintageIso: string;
  /** Selic meta anual, % */
  selic: number;
  /** CDI anual, % */
  cdi: number;
  /** IFIX — dividend yield médio 12 meses, % (isento de IR para PF) */
  ifix: number;
  /** Poupança anual, % (regra Selic > 8,5%) */
  poupanca: number;
  /** Alíquota de IR aplicada a Selic/CDI (longo prazo PF) */
  irFixedIncome: number;
}

export const BENCHMARK_RATES: BenchmarkRates = {
  vintage: "03/2026 (Copom)",
  vintageIso: "2026-03",
  selic: 14.75,
  cdi: 14.65,
  ifix: 11.2,
  poupanca: 7.6,
  irFixedIncome: 0.15,
};

/** Retorno líquido de IR (para Selic/CDI). IFIX e Poupança já são isentos. */
export function netOfIR(grossPct: number, isTaxExempt = false): number {
  if (isTaxExempt) return grossPct;
  return grossPct * (1 - BENCHMARK_RATES.irFixedIncome);
}
