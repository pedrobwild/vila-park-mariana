import { describe, it, expect } from "vitest";
import pt from "@/i18n/locales/pt.json";
import en from "@/i18n/locales/en.json";

type Json = Record<string, unknown>;

function collectKeys(obj: unknown, prefix = ""): string[] {
  if (obj === null || typeof obj !== "object" || Array.isArray(obj)) {
    return [prefix];
  }
  const out: string[] = [];
  for (const [k, v] of Object.entries(obj as Json)) {
    const path = prefix ? `${prefix}.${k}` : k;
    out.push(...collectKeys(v, path));
  }
  return out;
}

function diff(a: string[], b: string[]): string[] {
  const setB = new Set(b);
  return a.filter((k) => !setB.has(k)).sort();
}

const NAMESPACES = ["investorGuide", "investorQuiz", "investorSim"] as const;

describe("i18n parity — investor namespaces", () => {
  for (const ns of NAMESPACES) {
    it(`pt e en têm as mesmas chaves em "${ns}"`, () => {
      const ptNs = (pt as Json)[ns];
      const enNs = (en as Json)[ns];

      expect(ptNs, `pt.json não contém "${ns}"`).toBeDefined();
      expect(enNs, `en.json não contém "${ns}"`).toBeDefined();

      const ptKeys = collectKeys(ptNs).sort();
      const enKeys = collectKeys(enNs).sort();

      const missingInEn = diff(ptKeys, enKeys);
      const missingInPt = diff(enKeys, ptKeys);

      expect(
        { missingInEn, missingInPt },
        `Divergência em "${ns}":\n  faltando em en.json: ${missingInEn.join(", ") || "(nenhuma)"}\n  faltando em pt.json: ${missingInPt.join(", ") || "(nenhuma)"}`,
      ).toEqual({ missingInEn: [], missingInPt: [] });
    });
  }
});
