/**
 * Normaliza string para comparação/dedupe robusto:
 * - lowercase
 * - remove diacríticos (acentos)
 * - remove pontuação
 * - colapsa espaços
 *
 * "Preço alto!" e "preco  ALTO" → "preco alto"
 */
export function normalizeKey(s: string): string {
  if (!s || typeof s !== "string") return "";
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Mapeia frequência percentual (0..1) para faixa textual PT-BR.
 * Bandas: ≥0.4 alta · ≥0.15 média · <0.15 baixa
 */
export function frequencyBand(pct: number): "alta" | "média" | "baixa" {
  if (pct >= 0.4) return "alta";
  if (pct >= 0.15) return "média";
  return "baixa";
}
