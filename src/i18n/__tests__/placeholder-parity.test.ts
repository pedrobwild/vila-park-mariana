import { describe, it, expect } from "vitest";
import pt from "../locales/pt.json";
import en from "../locales/en.json";

type JSONValue = string | number | boolean | null | JSONValue[] | { [k: string]: JSONValue };

const PLACEHOLDER_RE = /\{\{\s*([^{}\s,]+?)\s*(?:,[^{}]*)?\}\}/g;

function extractPlaceholders(str: string): Set<string> {
  const out = new Set<string>();
  let m: RegExpExecArray | null;
  while ((m = PLACEHOLDER_RE.exec(str)) !== null) out.add(m[1]);
  return out;
}

function walk(node: JSONValue, path: string, acc: Map<string, Set<string>>): void {
  if (typeof node === "string") {
    const ph = extractPlaceholders(node);
    if (ph.size > 0) acc.set(path, ph);
    return;
  }
  if (Array.isArray(node)) {
    node.forEach((v, i) => walk(v, `${path}[${i}]`, acc));
    return;
  }
  if (node && typeof node === "object") {
    for (const [k, v] of Object.entries(node)) {
      walk(v as JSONValue, path ? `${path}.${k}` : k, acc);
    }
  }
}

function diff(a: Set<string>, b: Set<string>): string[] {
  return [...a].filter((x) => !b.has(x));
}

describe("i18n placeholder parity (pt ↔ en)", () => {
  it("cada chave com placeholders {{...}} tem o mesmo conjunto em pt e en", () => {
    const ptMap = new Map<string, Set<string>>();
    const enMap = new Map<string, Set<string>>();
    walk(pt as JSONValue, "", ptMap);
    walk(en as JSONValue, "", enMap);

    const allKeys = new Set<string>([...ptMap.keys(), ...enMap.keys()]);
    const mismatches: string[] = [];

    for (const key of allKeys) {
      const ptPh = ptMap.get(key) ?? new Set<string>();
      const enPh = enMap.get(key) ?? new Set<string>();
      const missingInEn = diff(ptPh, enPh);
      const missingInPt = diff(enPh, ptPh);
      if (missingInEn.length || missingInPt.length) {
        mismatches.push(
          `- ${key}\n    pt: {${[...ptPh].join(", ")}}\n    en: {${[...enPh].join(", ")}}` +
            (missingInEn.length ? `\n    missing in en: ${missingInEn.join(", ")}` : "") +
            (missingInPt.length ? `\n    missing in pt: ${missingInPt.join(", ")}` : ""),
        );
      }
    }

    expect(
      mismatches,
      `Placeholders divergentes entre pt.json e en.json:\n${mismatches.join("\n")}`,
    ).toEqual([]);
  });
});
