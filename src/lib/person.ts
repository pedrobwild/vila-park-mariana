import type { CrmPerson } from "@/lib/crm";

export type MaritalStatus =
  | "solteiro"
  | "casado"
  | "uniao_estavel"
  | "divorciado"
  | "viuvo";

export const MARITAL_STATUS_LABEL: Record<MaritalStatus, string> = {
  solteiro: "Solteiro(a)",
  casado: "Casado(a)",
  uniao_estavel: "União estável",
  divorciado: "Divorciado(a)",
  viuvo: "Viúvo(a)",
};

export const MARITAL_STATUS_OPTIONS = Object.keys(MARITAL_STATUS_LABEL) as MaritalStatus[];

export const UF_LIST = [
  "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG",
  "PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO",
] as const;

export type UF = (typeof UF_LIST)[number];

// ── Masks / formatters ─────────────────────────────
export function normalizeCPF(v: string | null | undefined): string {
  const d = (v ?? "").replace(/\D/g, "");
  if (!d) return "";
  return d.length >= 11 ? d.slice(-11) : d.padStart(11, "0");
}

export function maskCPF(v: string): string {
  const d = v.replace(/\D/g, "").slice(0, 11);
  return d
    .replace(/^(\d{3})(\d)/, "$1.$2")
    .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d{1,2})$/, ".$1-$2");
}


export function maskCEP(v: string): string {
  const d = v.replace(/\D/g, "").slice(0, 8);
  return d.replace(/^(\d{5})(\d)/, "$1-$2");
}

export function maskBRLInput(v: string): string {
  const d = v.replace(/\D/g, "");
  if (!d) return "";
  const n = Number(d) / 100;
  return n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function parseBRLInput(v: string): number | null {
  if (!v || !v.trim()) return null;
  const cleaned = v.replace(/\./g, "").replace(",", ".").replace(/[^\d.-]/g, "");
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

export function formatBRLValue(n: number | null | undefined): string {
  if (n === null || n === undefined || !Number.isFinite(Number(n))) return "";
  return Number(n).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ── CPF validation ─────────────────────────────────
export function isValidCPF(raw: string): boolean {
  const cpf = raw.replace(/\D/g, "");
  if (cpf.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(cpf)) return false;
  const calc = (base: string, factor: number) => {
    let sum = 0;
    for (let i = 0; i < base.length; i++) sum += Number(base[i]) * (factor - i);
    const rest = (sum * 10) % 11;
    return rest === 10 ? 0 : rest;
  };
  const d1 = calc(cpf.slice(0, 9), 10);
  const d2 = calc(cpf.slice(0, 10), 11);
  return d1 === Number(cpf[9]) && d2 === Number(cpf[10]);
}

// ── Age from ISO date (YYYY-MM-DD) ─────────────────
export function ageFromISO(iso?: string | null): number | null {
  if (!iso) return null;
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return null;
  const now = new Date();
  let age = now.getFullYear() - y;
  const monthDiff = now.getMonth() + 1 - m;
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < d)) age--;
  return age >= 0 ? age : null;
}

export function formatDateBR(iso?: string | null): string {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return "—";
  return `${d}/${m}/${y}`;
}

// ── Completeness for contract ──────────────────────
export interface CompletenessResult {
  complete: boolean;
  missing: string[];
}

export function evaluateCompleteness(p: CrmPerson): CompletenessResult {
  const checks: Array<[string, unknown]> = [
    ["CPF", p.cpf],
    ["RG", p.rg],
    ["Data de nascimento", p.birth_date],
    ["Estado civil", p.marital_status],
    ["CEP", p.cep],
    ["Logradouro", p.street],
    ["Número", p.street_number],
    ["Cidade", p.city],
    ["UF", p.state],
  ];
  const missing = checks
    .filter(([, v]) => !v || (typeof v === "string" && !v.trim()))
    .map(([label]) => label);
  return { complete: missing.length === 0, missing };
}

// ── ViaCEP lookup ──────────────────────────────────
export interface ViaCEPResult {
  street?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
}

export async function fetchViaCEP(cep: string): Promise<ViaCEPResult | null> {
  const clean = cep.replace(/\D/g, "");
  if (clean.length !== 8) return null;
  try {
    const res = await fetch(`https://viacep.com.br/ws/${clean}/json/`);
    if (!res.ok) return null;
    const data = await res.json();
    if (data?.erro) return null;
    return {
      street: data.logradouro || undefined,
      neighborhood: data.bairro || undefined,
      city: data.localidade || undefined,
      state: data.uf || undefined,
    };
  } catch {
    return null;
  }
}
