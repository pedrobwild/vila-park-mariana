import type { Database } from "@/integrations/supabase/types";

export type DealPurpose = Database["public"]["Enums"]["crm_deal_purpose"];
export type NeighborhoodMetrics =
  Database["public"]["Tables"]["market_neighborhood_metrics"]["Row"];

export const PURPOSE_LABEL: Record<DealPurpose, string> = {
  short_stay: "Short stay (temporada)",
  long_stay: "Long stay (aluguel)",
  moradia: "Moradia",
};

export const PURPOSE_SHORT_LABEL: Record<DealPurpose, string> = {
  short_stay: "Short stay",
  long_stay: "Long stay",
  moradia: "Moradia",
};

export const DEFAULT_BAIRRO = "Vila Mariana";
export const DEFAULT_CIDADE = "São Paulo";

export interface MarketMetric {
  key: string;
  label: string;
  /** Valor formatado, ou null quando não há dado para o bairro. */
  value: string | null;
  /** Explicação curta da métrica (o que ela representa). */
  hint: string;
  fonte: string;
  dataReferencia: string | null;
  /** Texto do tooltip quando não há valor. */
  emptyHint?: string;
}

const nOrNull = (v: unknown): number | null => {
  if (v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

export const fmtPctValue = (v: number | null) =>
  v == null ? null : `${v.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;

export const fmtBRLValue = (v: number | null, digits = 0) =>
  v == null
    ? null
    : v.toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL",
        maximumFractionDigits: digits,
      });

export const fmtIntValue = (v: number | null) =>
  v == null ? null : v.toLocaleString("pt-BR");

export const fmtDateRef = (iso: string | null) => {
  if (!iso) return null;
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("pt-BR");
};

/** Normaliza nome de bairro para comparação (sem acento, caixa baixa). */
export function normalizeBairro(s: string | null | undefined): string {
  if (!s) return "";
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Monta as métricas exibidas no cabeçalho do negócio conforme a finalidade.
 * Métrica sem dado volta com `value: null` para o componente mostrar
 * "Sem dados para este bairro" em vez de zero.
 */
export function buildMarketMetrics(
  purpose: DealPurpose,
  m: NeighborhoodMetrics | null,
): MarketMetric[] {
  const fonte = m?.fonte ?? "—";
  const dataReferencia = m?.data_referencia ?? null;
  const base = (
    key: string,
    label: string,
    value: string | null,
    hint: string,
  ): MarketMetric => ({ key, label, value, hint, fonte, dataReferencia });

  const precoM2 = nOrNull(m?.preco_m2_brl);
  const aluguel = nOrNull(m?.aluguel_mensal_brl);
  const areaMedia = nOrNull(m?.area_media_m2);

  if (purpose === "short_stay") {
    return [
      base(
        "ocupacao",
        "Ocupação média",
        fmtPctValue(nOrNull(m?.ocupacao_media_pct)),
        "Taxa média de ocupação dos studios anunciados no bairro.",
      ),
      base(
        "adr",
        "Diária média",
        fmtBRLValue(nOrNull(m?.adr_medio_brl)),
        "ADR — diária média praticada pelos studios do bairro.",
      ),
      base(
        "anuncios",
        "Anúncios ativos",
        fmtIntValue(nOrNull(m?.anuncios_ativos)),
        "Total de anúncios ativos de temporada no bairro.",
      ),
      base(
        "m2",
        "Valor do m²",
        fmtBRLValue(precoM2),
        "Preço médio do m² residencial no bairro.",
      ),
    ];
  }

  if (purpose === "long_stay") {
    const aluguelM2 =
      aluguel != null &&
      areaMedia != null &&
      aluguel > 0 &&
      areaMedia > 0
        ? aluguel / areaMedia
        : null;
    const rentabilidade =
      aluguelM2 != null && precoM2 != null && precoM2 > 0 && aluguelM2 > 0
        ? ((aluguelM2 * 12) / precoM2) * 100
        : null;
    return [
      base(
        "aluguel",
        "Aluguel médio",
        fmtBRLValue(aluguel),
        "Aluguel mensal médio de longa duração no bairro.",
      ),
      base(
        "aluguel_m2",
        "Aluguel por m²",
        aluguelM2 == null ? null : `${fmtBRLValue(aluguelM2, 2)}/m²`,
        "Aluguel mensal médio dividido pela área média do bairro.",
      ),
      {
        ...base(
          "rentabilidade",
          "Rentabilidade do aluguel",
          rentabilidade == null
            ? null
            : `${rentabilidade.toLocaleString("pt-BR", {
                minimumFractionDigits: 1,
                maximumFractionDigits: 1,
              })}% a.a.`,
          "Aluguel anual do bairro ÷ valor de venda do m². Rentabilidade bruta, antes de condomínio, IPTU, vacância e IR.",
        ),
        emptyHint: "Sem dados suficientes para este bairro.",
      },

      base(
        "m2",
        "Valor do m²",
        fmtBRLValue(precoM2),
        "Preço médio do m² residencial no bairro.",
      ),
    ];
  }

  return [
    base("m2", "Valor do m²", fmtBRLValue(precoM2), "Preço médio do m² residencial no bairro."),
    base(
      "valorizacao",
      "Valorização 12 meses",
      fmtPctValue(nOrNull(m?.valorizacao_12m_pct)),
      "Variação do preço do m² nos últimos 12 meses.",
    ),
    base(
      "venda",
      "Tempo médio de venda",
      nOrNull(m?.dias_medio_venda) == null
        ? null
        : `${fmtIntValue(nOrNull(m?.dias_medio_venda))} dias`,
      "Tempo médio até a venda de um imóvel no bairro.",
    ),
    base(
      "aluguel",
      "Aluguel médio",
      fmtBRLValue(aluguel),
      "Referência de aluguel mensal de longa duração no bairro.",
    ),
  ];
}
