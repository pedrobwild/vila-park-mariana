/** Utilitários compartilhados das telas de Configurações. */

/** Converte texto em pt-BR ("1.234,56") para número. Retorna NaN se inválido. */
export function parsePtNumber(v: string): number {
  const s = String(v ?? "").trim();
  if (!s) return NaN;
  const normalized = s.replace(/\./g, "").replace(",", ".");
  const n = Number(normalized);
  return Number.isFinite(n) ? n : NaN;
}

/** Formata número para exibição pt-BR sem zeros supérfluos. */
export function formatPtNumber(n: number, maxDigits = 4): string {
  if (!Number.isFinite(n)) return "";
  return n.toLocaleString("pt-BR", { maximumFractionDigits: maxDigits });
}

export const brl = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

export function formatUpdatedAt(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const date = d.toLocaleDateString("pt-BR");
  const time = d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  return `${date} às ${time}`;
}
