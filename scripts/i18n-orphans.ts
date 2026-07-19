#!/usr/bin/env tsx
/**
 * i18n orphan-key checker.
 *
 * Varre `src/` procurando usos de chaves i18n (t("…"), i18nKey="…",
 * useTranslation, Trans etc.) e compara com o conjunto plano de chaves
 * declaradas em `src/i18n/locales/{pt,en}.json`. Reporta:
 *
 *   - Chaves declaradas mas NUNCA referenciadas no código (órfãs)
 *   - Chaves referenciadas no código mas ausentes em pt.json ou en.json
 *
 * Uso:
 *   npm run i18n:orphans           # informativo (exit 0)
 *   npm run i18n:orphans -- --strict  # falha CI se houver órfãs/faltantes
 *
 * Namespaces cujas chaves são acessadas de forma dinâmica (ex.: `t(\`faq.${id}\`)`)
 * podem ser adicionados a IGNORED_PREFIXES para evitar falsos positivos.
 */
import { readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve, join, extname } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const SRC = resolve(ROOT, "src");
const PT_PATH = resolve(SRC, "i18n/locales/pt.json");
const EN_PATH = resolve(SRC, "i18n/locales/en.json");
const OUT_MD = resolve(ROOT, "i18n-orphans-report.md");

const STRICT = process.argv.includes("--strict");

/** Prefixos ignorados no relatório de órfãs (chaves acessadas dinamicamente). */
const IGNORED_PREFIXES: string[] = [
  // Ex.: "faq.items", quando renderizadas via .map com id dinâmico.
];

type Json = string | number | boolean | null | Json[] | { [k: string]: Json };

function loadJson(p: string): Json {
  return JSON.parse(readFileSync(p, "utf8")) as Json;
}

function flattenKeys(node: Json, prefix = "", acc: string[] = []): string[] {
  if (node === null) return acc;
  if (typeof node !== "object") {
    acc.push(prefix);
    return acc;
  }
  if (Array.isArray(node)) {
    // Arrays de strings: expõem o próprio prefixo (ex.: bullets).
    acc.push(prefix);
    return acc;
  }
  for (const [k, v] of Object.entries(node)) {
    flattenKeys(v as Json, prefix ? `${prefix}.${k}` : k, acc);
  }
  return acc;
}

function walkFiles(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      if (entry === "node_modules" || entry === "locales" || entry === "__tests__") continue;
      walkFiles(full, out);
    } else if (/\.(tsx?|jsx?)$/.test(extname(full))) {
      out.push(full);
    }
  }
  return out;
}

/**
 * Extrai chaves i18n usadas no código. Cobre:
 *   t("a.b")           t('a.b')            t(`a.b`)
 *   i18nKey="a.b"      i18nKey={"a.b"}
 *   useTranslation com t("a.b") já capturado acima
 *   Trans i18nKey="a.b"
 * Chaves com interpolação `${…}` viram um prefixo (parte estática antes do ${).
 */
function extractUsedKeys(source: string): { exact: Set<string>; prefixes: Set<string> } {
  const exact = new Set<string>();
  const prefixes = new Set<string>();
  const patterns: RegExp[] = [
    /\bt\(\s*["'`]([^"'`)]+)["'`]/g,
    /\bi18nKey\s*=\s*["'`]([^"'`]+)["'`]/g,
    /\bi18nKey\s*=\s*\{\s*["'`]([^"'`]+)["'`]\s*\}/g,
  ];
  for (const re of patterns) {
    let m: RegExpExecArray | null;
    while ((m = re.exec(source)) !== null) {
      const key = m[1];
      const dyn = key.indexOf("${");
      if (dyn >= 0) {
        const p = key.slice(0, dyn).replace(/\.$/, "");
        if (p) prefixes.add(p);
      } else {
        exact.add(key);
      }
    }
  }
  // Template literals: t(`a.b.${x}`) → prefixo "a.b"
  const tmpl = /\bt\(\s*`([^`]*)\$\{/g;
  let mm: RegExpExecArray | null;
  while ((mm = tmpl.exec(source)) !== null) {
    const p = mm[1].replace(/\.$/, "");
    if (p) prefixes.add(p);
  }
  return { exact, prefixes };
}

function isCovered(
  key: string,
  usedExact: Set<string>,
  usedPrefixes: Set<string>,
): boolean {
  if (usedExact.has(key)) return true;
  for (const p of usedPrefixes) if (key === p || key.startsWith(p + ".")) return true;
  for (const p of IGNORED_PREFIXES) if (key === p || key.startsWith(p + ".")) return true;
  return false;
}

function main(): void {
  const ptKeys = flattenKeys(loadJson(PT_PATH)).sort();
  const enKeys = flattenKeys(loadJson(EN_PATH)).sort();
  const declared = new Set<string>([...ptKeys, ...enKeys]);

  const files = walkFiles(SRC);
  const usedExact = new Set<string>();
  const usedPrefixes = new Set<string>();
  for (const f of files) {
    const src = readFileSync(f, "utf8");
    const { exact, prefixes } = extractUsedKeys(src);
    for (const k of exact) usedExact.add(k);
    for (const p of prefixes) usedPrefixes.add(p);
  }

  const orphans: string[] = [];
  for (const key of declared) {
    if (!isCovered(key, usedExact, usedPrefixes)) orphans.push(key);
  }
  orphans.sort();

  const missingInLocales: string[] = [];
  for (const key of usedExact) {
    if (!declared.has(key)) {
      // Só reportar se nenhum prefixo declarado o cobrir.
      const covered = [...declared].some((d) => key.startsWith(d + "."));
      if (!covered) missingInLocales.push(key);
    }
  }
  missingInLocales.sort();

  const lines: string[] = [];
  lines.push("=".repeat(70));
  lines.push("i18n orphan-key report");
  lines.push(`Scanned files: ${files.length}`);
  lines.push(`Declared keys: ${declared.size} (pt: ${ptKeys.length}, en: ${enKeys.length})`);
  lines.push(`Used exact: ${usedExact.size}   Used prefixes: ${usedPrefixes.size}`);
  lines.push("=".repeat(70));
  lines.push("");
  lines.push(`Orphan keys (declared but unused): ${orphans.length}`);
  for (const k of orphans) lines.push(`  - ${k}`);
  lines.push("");
  lines.push(`Missing in locales (used in code, not declared): ${missingInLocales.length}`);
  for (const k of missingInLocales) lines.push(`  - ${k}`);
  const text = lines.join("\n");
  console.log(text);

  const md: string[] = [];
  md.push("# i18n orphan-key report");
  md.push("");
  md.push(`- Declared keys: **${declared.size}** (pt: ${ptKeys.length}, en: ${enKeys.length})`);
  md.push(`- Scanned files: **${files.length}**`);
  md.push(`- Orphan keys: **${orphans.length}**`);
  md.push(`- Missing in locales: **${missingInLocales.length}**`);
  md.push("");
  md.push(`## Orphan keys (${orphans.length})`);
  md.push(orphans.length ? orphans.map((k) => `- \`${k}\``).join("\n") : "_none_");
  md.push("");
  md.push(`## Missing in locales (${missingInLocales.length})`);
  md.push(missingInLocales.length ? missingInLocales.map((k) => `- \`${k}\``).join("\n") : "_none_");
  md.push("");
  writeFileSync(OUT_MD, md.join("\n"), "utf8");
  console.log(`\nMarkdown report written to: ${OUT_MD}`);

  if (STRICT && (orphans.length > 0 || missingInLocales.length > 0)) {
    console.error(
      `\ni18n orphan check failed (--strict): ${orphans.length} orphan(s), ${missingInLocales.length} missing.`,
    );
    process.exit(1);
  }
}

main();
