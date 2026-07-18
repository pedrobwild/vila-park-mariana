#!/usr/bin/env tsx
/**
 * i18n parity report (CI-friendly).
 *
 * Compara pt.json vs en.json para os namespaces do guia do investidor
 * (investorGuide, investorQuiz, investorSim) e imprime um relatório
 * legível. Também emite anotações no formato do GitHub Actions
 * (`::error`, `::group`) para ficarem linkáveis no job log.
 *
 * Uso:
 *   npm run i18n:report            # sai 0 mesmo com divergências (informativo)
 *   npm run i18n:report -- --strict  # sai 1 se houver divergências (CI gate)
 *
 * Também gera um arquivo Markdown em i18n-parity-report.md para
 * anexar como artefato do job.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const PT_PATH = resolve(ROOT, "src/i18n/locales/pt.json");
const EN_PATH = resolve(ROOT, "src/i18n/locales/en.json");
const OUT_MD = resolve(ROOT, "i18n-parity-report.md");

const NAMESPACES = ["investorGuide", "investorQuiz", "investorSim"] as const;
const PLACEHOLDER_RE = /\{\{\s*([^{}\s,]+?)\s*(?:,[^{}]*)?\}\}/g;

const STRICT = process.argv.includes("--strict");
const GH = !!process.env.GITHUB_ACTIONS;

type Json = string | number | boolean | null | Json[] | { [k: string]: Json };

function loadJson(p: string): Json {
  return JSON.parse(readFileSync(p, "utf8")) as Json;
}

/** Flatten leaves — string values only — into `path -> value`. */
function flatten(node: Json, prefix = "", acc = new Map<string, string>()): Map<string, string> {
  if (typeof node === "string") {
    acc.set(prefix, node);
  } else if (Array.isArray(node)) {
    node.forEach((v, i) => flatten(v, `${prefix}[${i}]`, acc));
  } else if (node && typeof node === "object") {
    for (const [k, v] of Object.entries(node)) {
      flatten(v as Json, prefix ? `${prefix}.${k}` : k, acc);
    }
  }
  return acc;
}

function extractPlaceholders(str: string): Set<string> {
  const out = new Set<string>();
  let m: RegExpExecArray | null;
  while ((m = PLACEHOLDER_RE.exec(str)) !== null) out.add(m[1]);
  return out;
}

function subMap(map: Map<string, string>, ns: string): Map<string, string> {
  const out = new Map<string, string>();
  const prefix = `${ns}.`;
  for (const [k, v] of map) {
    if (k === ns || k.startsWith(prefix)) out.set(k, v);
  }
  return out;
}

interface NsReport {
  ns: string;
  missingInEn: string[];   // key existe em pt, falta em en
  missingInPt: string[];   // key existe em en, falta em pt
  placeholderMismatches: { key: string; pt: string[]; en: string[] }[];
}

function analyze(ns: string, pt: Map<string, string>, en: Map<string, string>): NsReport {
  const ptSub = subMap(pt, ns);
  const enSub = subMap(en, ns);
  const missingInEn: string[] = [];
  const missingInPt: string[] = [];
  const placeholderMismatches: NsReport["placeholderMismatches"] = [];

  for (const k of ptSub.keys()) if (!enSub.has(k)) missingInEn.push(k);
  for (const k of enSub.keys()) if (!ptSub.has(k)) missingInPt.push(k);

  for (const [k, ptVal] of ptSub) {
    const enVal = enSub.get(k);
    if (enVal === undefined) continue;
    const ptPh = [...extractPlaceholders(ptVal)].sort();
    const enPh = [...extractPlaceholders(enVal)].sort();
    if (ptPh.join("|") !== enPh.join("|")) {
      placeholderMismatches.push({ key: k, pt: ptPh, en: enPh });
    }
  }

  missingInEn.sort();
  missingInPt.sort();
  return { ns, missingInEn, missingInPt, placeholderMismatches };
}

function fmtList(items: string[]): string {
  return items.length ? items.map((k) => `  - ${k}`).join("\n") : "  (none)";
}

function renderConsole(reports: NsReport[]): { text: string; totalIssues: number } {
  const lines: string[] = [];
  let total = 0;
  lines.push("=".repeat(70));
  lines.push("i18n parity report — pt.json vs en.json");
  lines.push("Namespaces: " + NAMESPACES.join(", "));
  lines.push("=".repeat(70));

  for (const r of reports) {
    const issues =
      r.missingInEn.length + r.missingInPt.length + r.placeholderMismatches.length;
    total += issues;

    const header = `[${r.ns}] ${issues === 0 ? "OK" : `${issues} issue(s)`}`;
    if (GH) lines.push(`::group::${header}`);
    else lines.push(`\n${header}\n${"-".repeat(header.length)}`);

    lines.push(`Missing in en.json (${r.missingInEn.length}):`);
    lines.push(fmtList(r.missingInEn));
    lines.push(`Missing in pt.json (${r.missingInPt.length}):`);
    lines.push(fmtList(r.missingInPt));
    lines.push(`Placeholder mismatches (${r.placeholderMismatches.length}):`);
    if (r.placeholderMismatches.length) {
      for (const m of r.placeholderMismatches) {
        lines.push(`  - ${m.key}`);
        lines.push(`      pt: {${m.pt.join(", ")}}`);
        lines.push(`      en: {${m.en.join(", ")}}`);
      }
    } else {
      lines.push("  (none)");
    }

    if (GH) {
      for (const k of r.missingInEn)
        lines.push(`::error file=src/i18n/locales/en.json::Missing key: ${k}`);
      for (const k of r.missingInPt)
        lines.push(`::error file=src/i18n/locales/pt.json::Missing key: ${k}`);
      for (const m of r.placeholderMismatches)
        lines.push(
          `::error file=src/i18n/locales/en.json::Placeholder mismatch at ${m.key} — pt {${m.pt.join(", ")}} vs en {${m.en.join(", ")}}`,
        );
      lines.push("::endgroup::");
    }
  }

  lines.push("");
  lines.push("=".repeat(70));
  lines.push(`Summary: ${total} issue(s) across ${reports.length} namespace(s).`);
  lines.push("=".repeat(70));

  return { text: lines.join("\n"), totalIssues: total };
}

function renderMarkdown(reports: NsReport[], total: number): string {
  const md: string[] = [];
  md.push("# i18n parity report");
  md.push("");
  md.push("`pt.json` vs `en.json` — namespaces: " + NAMESPACES.map((n) => `\`${n}\``).join(", "));
  md.push("");
  md.push(`**Total issues:** ${total}`);
  md.push("");

  md.push("| Namespace | Missing in en | Missing in pt | Placeholder mismatches |");
  md.push("|---|---:|---:|---:|");
  for (const r of reports) {
    md.push(
      `| \`${r.ns}\` | ${r.missingInEn.length} | ${r.missingInPt.length} | ${r.placeholderMismatches.length} |`,
    );
  }
  md.push("");

  for (const r of reports) {
    const issues =
      r.missingInEn.length + r.missingInPt.length + r.placeholderMismatches.length;
    md.push(`## \`${r.ns}\` — ${issues === 0 ? "OK" : `${issues} issue(s)`}`);
    md.push("");
    md.push(`### Missing in \`en.json\` (${r.missingInEn.length})`);
    md.push(r.missingInEn.length ? r.missingInEn.map((k) => `- \`${k}\``).join("\n") : "_none_");
    md.push("");
    md.push(`### Missing in \`pt.json\` (${r.missingInPt.length})`);
    md.push(r.missingInPt.length ? r.missingInPt.map((k) => `- \`${k}\``).join("\n") : "_none_");
    md.push("");
    md.push(`### Placeholder mismatches (${r.placeholderMismatches.length})`);
    if (r.placeholderMismatches.length) {
      md.push("| Key | pt placeholders | en placeholders |");
      md.push("|---|---|---|");
      for (const m of r.placeholderMismatches) {
        md.push(`| \`${m.key}\` | \`{${m.pt.join(", ")}}\` | \`{${m.en.join(", ")}}\` |`);
      }
    } else {
      md.push("_none_");
    }
    md.push("");
  }
  return md.join("\n");
}

function main(): void {
  const pt = flatten(loadJson(PT_PATH));
  const en = flatten(loadJson(EN_PATH));
  const reports = NAMESPACES.map((ns) => analyze(ns, pt, en));
  const { text, totalIssues } = renderConsole(reports);
  console.log(text);

  const md = renderMarkdown(reports, totalIssues);
  writeFileSync(OUT_MD, md, "utf8");
  console.log(`\nMarkdown report written to: ${OUT_MD}`);

  // Append to GitHub Actions job summary when available (linkable in the job UI).
  const summaryPath = process.env.GITHUB_STEP_SUMMARY;
  if (summaryPath) {
    try {
      writeFileSync(summaryPath, md + "\n", { flag: "a" });
      console.log(`Appended to $GITHUB_STEP_SUMMARY: ${summaryPath}`);
    } catch (err) {
      console.warn(`Could not append to GITHUB_STEP_SUMMARY: ${(err as Error).message}`);
    }
  }

  if (STRICT && totalIssues > 0) {
    console.error(`\ni18n parity check failed (--strict): ${totalIssues} issue(s).`);
    process.exit(1);
  }
}

main();
