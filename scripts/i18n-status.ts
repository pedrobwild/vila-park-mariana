#!/usr/bin/env tsx
/**
 * i18n status page generator.
 *
 * Escreve `docs/i18n-status.md` — página de saúde de paridade i18n
 * por namespace (investorGuide, investorQuiz, investorSim) com:
 *   - Badge geral de saúde
 *   - Tabela por namespace: total de chaves, faltantes em en/pt,
 *     placeholders divergentes, status
 *   - Detalhamento por namespace com lista de chaves e mismatches
 *   - Versão: commit git + timestamp de geração
 *
 * Uso:
 *   npm run i18n:status
 */
import { execSync } from "node:child_process";
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const PT_PATH = resolve(ROOT, "src/i18n/locales/pt.json");
const EN_PATH = resolve(ROOT, "src/i18n/locales/en.json");
const OUT_DIR = resolve(ROOT, "docs");
const OUT_MD = resolve(OUT_DIR, "i18n-status.md");
const OUT_JSON = resolve(OUT_DIR, "i18n-status.json");

const NAMESPACES = ["investorGuide", "investorQuiz", "investorSim"] as const;
const PLACEHOLDER_RE = /\{\{\s*([^{}\s,]+?)\s*(?:,[^{}]*)?\}\}/g;

type Json = string | number | boolean | null | Json[] | { [k: string]: Json };

function loadJson(p: string): Json {
  return JSON.parse(readFileSync(p, "utf8")) as Json;
}

function flatten(node: Json, prefix = "", acc = new Map<string, string>()): Map<string, string> {
  if (typeof node === "string") acc.set(prefix, node);
  else if (Array.isArray(node)) node.forEach((v, i) => flatten(v, `${prefix}[${i}]`, acc));
  else if (node && typeof node === "object") {
    for (const [k, v] of Object.entries(node))
      flatten(v as Json, prefix ? `${prefix}.${k}` : k, acc);
  }
  return acc;
}

function extractPlaceholders(s: string): Set<string> {
  const out = new Set<string>();
  let m: RegExpExecArray | null;
  while ((m = PLACEHOLDER_RE.exec(s)) !== null) out.add(m[1]);
  return out;
}

function subMap(map: Map<string, string>, ns: string): Map<string, string> {
  const out = new Map<string, string>();
  const prefix = `${ns}.`;
  for (const [k, v] of map) if (k === ns || k.startsWith(prefix)) out.set(k, v);
  return out;
}

interface NsHealth {
  ns: string;
  totalKeysPt: number;
  totalKeysEn: number;
  missingInEn: string[];
  missingInPt: string[];
  placeholderMismatches: { key: string; pt: string[]; en: string[] }[];
}

function analyze(ns: string, pt: Map<string, string>, en: Map<string, string>): NsHealth {
  const ptSub = subMap(pt, ns);
  const enSub = subMap(en, ns);
  const missingInEn: string[] = [];
  const missingInPt: string[] = [];
  const placeholderMismatches: NsHealth["placeholderMismatches"] = [];

  for (const k of ptSub.keys()) if (!enSub.has(k)) missingInEn.push(k);
  for (const k of enSub.keys()) if (!ptSub.has(k)) missingInPt.push(k);

  for (const [k, ptVal] of ptSub) {
    const enVal = enSub.get(k);
    if (enVal === undefined) continue;
    const ptPh = [...extractPlaceholders(ptVal)].sort();
    const enPh = [...extractPlaceholders(enVal)].sort();
    if (ptPh.join("|") !== enPh.join("|"))
      placeholderMismatches.push({ key: k, pt: ptPh, en: enPh });
  }

  missingInEn.sort();
  missingInPt.sort();
  return {
    ns,
    totalKeysPt: ptSub.size,
    totalKeysEn: enSub.size,
    missingInEn,
    missingInPt,
    placeholderMismatches,
  };
}

function issueCount(h: NsHealth): number {
  return h.missingInEn.length + h.missingInPt.length + h.placeholderMismatches.length;
}

function statusBadge(issues: number): string {
  if (issues === 0) return "🟢 healthy";
  if (issues <= 3) return "🟡 warning";
  return "🔴 critical";
}

function safeGit(cmd: string): string {
  try {
    return execSync(`git ${cmd}`, { cwd: ROOT, stdio: ["ignore", "pipe", "ignore"] })
      .toString()
      .trim();
  } catch {
    return "n/a";
  }
}

function render(reports: NsHealth[]): string {
  const totalIssues = reports.reduce((s, r) => s + issueCount(r), 0);
  const overall = statusBadge(totalIssues);
  const commit = safeGit("rev-parse --short HEAD");
  const branch = safeGit("rev-parse --abbrev-ref HEAD");
  const generatedAt = new Date().toISOString();

  const md: string[] = [];
  md.push("# i18n status");
  md.push("");
  md.push("> Auto-gerado por `npm run i18n:status`. Não edite manualmente.");
  md.push("");
  md.push(`**Overall:** ${overall} — ${totalIssues} issue(s)`);
  md.push("");
  md.push("| Field | Value |");
  md.push("|---|---|");
  md.push(`| Generated at | \`${generatedAt}\` |`);
  md.push(`| Commit | \`${commit}\` |`);
  md.push(`| Branch | \`${branch}\` |`);
  md.push(`| Sources | \`src/i18n/locales/pt.json\`, \`src/i18n/locales/en.json\` |`);
  md.push("");

  md.push("## Health per namespace");
  md.push("");
  md.push("| Namespace | Status | Keys (pt / en) | Missing in en | Missing in pt | Placeholder mismatches |");
  md.push("|---|---|---:|---:|---:|---:|");
  for (const r of reports) {
    const issues = issueCount(r);
    md.push(
      `| \`${r.ns}\` | ${statusBadge(issues)} | ${r.totalKeysPt} / ${r.totalKeysEn} | ${r.missingInEn.length} | ${r.missingInPt.length} | ${r.placeholderMismatches.length} |`,
    );
  }
  md.push("");

  md.push("## Details");
  md.push("");
  for (const r of reports) {
    const issues = issueCount(r);
    md.push(`### \`${r.ns}\` — ${statusBadge(issues)} (${issues} issue(s))`);
    md.push("");
    md.push(`- Keys em \`pt.json\`: **${r.totalKeysPt}**`);
    md.push(`- Keys em \`en.json\`: **${r.totalKeysEn}**`);
    md.push("");

    md.push(`#### Missing in \`en.json\` (${r.missingInEn.length})`);
    md.push(r.missingInEn.length ? r.missingInEn.map((k) => `- \`${k}\``).join("\n") : "_none_");
    md.push("");

    md.push(`#### Missing in \`pt.json\` (${r.missingInPt.length})`);
    md.push(r.missingInPt.length ? r.missingInPt.map((k) => `- \`${k}\``).join("\n") : "_none_");
    md.push("");

    md.push(`#### Placeholder mismatches (${r.placeholderMismatches.length})`);
    if (r.placeholderMismatches.length) {
      md.push("| Key | pt placeholders | en placeholders |");
      md.push("|---|---|---|");
      for (const m of r.placeholderMismatches)
        md.push(`| \`${m.key}\` | \`{${m.pt.join(", ")}}\` | \`{${m.en.join(", ")}}\` |`);
    } else {
      md.push("_none_");
    }
    md.push("");
  }

  md.push("---");
  md.push("");
  md.push(
    "Regenerate com `npm run i18n:status`. Para checar em CI use `npm run i18n:check` (falha o build se houver divergência).",
  );
  md.push("");
  return md.join("\n");
}

function main(): void {
  const pt = flatten(loadJson(PT_PATH));
  const en = flatten(loadJson(EN_PATH));
  const reports = NAMESPACES.map((ns) => analyze(ns, pt, en));
  mkdirSync(OUT_DIR, { recursive: true });
  const md = render(reports);
  writeFileSync(OUT_MD, md, "utf8");
  console.log(`i18n status page written to: ${OUT_MD}`);
}

main();
