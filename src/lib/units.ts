import type { Database } from "@/integrations/supabase/types";

export type Unit = Database["public"]["Tables"]["units"]["Row"];
export type UnitStatus = Database["public"]["Enums"]["unit_status"];
export type CustomFieldDef = Database["public"]["Tables"]["custom_field_definitions"]["Row"];
export type CustomFieldValue = Database["public"]["Tables"]["custom_field_values"]["Row"];
export type CustomFieldType = Database["public"]["Enums"]["custom_field_type"];

export const STATUS_LABEL: Record<UnitStatus, string> = {
  disponivel: "Disponível",
  reservado: "Reservado",
  vendido: "Vendido",
};

export const STATUS_BADGE: Record<UnitStatus, string> = {
  disponivel: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20",
  reservado: "bg-amber-500/10 text-amber-700 border-amber-500/20",
  vendido: "bg-muted text-muted-foreground border-border",
};

export const FIELD_TYPE_LABEL: Record<CustomFieldType, string> = {
  text: "Texto",
  currency: "Valor (R$)",
  number: "Número",
  date: "Data",
  boolean: "Sim / Não",
  select: "Lista de opções",
};

export const formatBRL = (n: number | null | undefined) =>
  n == null
    ? "—"
    : n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

export const formatNumber = (n: number | null | undefined) =>
  n == null ? "—" : n.toLocaleString("pt-BR");

export const formatArea = (n: number | null | undefined) =>
  n == null ? "—" : `${n.toLocaleString("pt-BR", { maximumFractionDigits: 2 })} m²`;

/** Parse a "R$ 1.234.567,89" or plain number string into a number (BRL). */
export function parseCurrencyInput(v: string): number {
  const clean = v.replace(/[^\d,.-]/g, "").replace(/\./g, "").replace(",", ".");
  const n = Number(clean);
  return Number.isFinite(n) ? n : 0;
}

export function formatCurrencyInput(n: number): string {
  if (!Number.isFinite(n) || n === 0) return "";
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function formatCustomValue(def: CustomFieldDef, raw: unknown): string {
  if (raw == null || raw === "") return "—";
  switch (def.field_type) {
    case "currency":
      return formatBRL(Number(raw));
    case "number":
      return formatNumber(Number(raw));
    case "boolean":
      return raw ? "Sim" : "Não";
    case "date":
      try {
        return new Date(String(raw)).toLocaleDateString("pt-BR");
      } catch {
        return String(raw);
      }
    default:
      return String(raw);
  }
}
