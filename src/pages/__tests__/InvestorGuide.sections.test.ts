import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

// Após a poda do Guia do Investidor (nearby/amenities removidos como seções),
// garantimos por inspeção estática que:
//   1. Não existem <section id="nearby"> nem <section id="amenities"> no arquivo.
//   2. Os arrays sectionIds e navSectionIds NÃO listam "nearby"/"amenities".
//   3. O tipo SectionId não declara "nearby"/"amenities".
// Isso protege contra regressões em que a navegação volte a apontar para âncoras
// inexistentes (scrollspy quebrado).

const SRC = readFileSync(
  resolve(__dirname, "../../pages/InvestorGuide.tsx"),
  "utf-8",
);

function extractArray(name: string): string[] {
  const re = new RegExp(`const\\s+${name}\\s*:\\s*SectionId\\[\\]\\s*=\\s*\\[([\\s\\S]*?)\\];`, "m");
  const m = SRC.match(re);
  if (!m) throw new Error(`Array ${name} não encontrado em InvestorGuide.tsx`);
  return Array.from(m[1].matchAll(/"([a-zA-Z]+)"/g)).map((x) => x[1]);
}

function extractSectionIdUnion(): string[] {
  const re = /type\s+SectionId\s*=\s*([\s\S]*?);/m;
  const m = SRC.match(re);
  if (!m) throw new Error("type SectionId não encontrado");
  return Array.from(m[1].matchAll(/"([a-zA-Z]+)"/g)).map((x) => x[1]);
}

describe("InvestorGuide — seções removidas (nearby/amenities)", () => {
  const REMOVED = ["nearby", "amenities"] as const;

  it("não renderiza <section id=\"nearby\"> nem id=\"amenities\"", () => {
    for (const id of REMOVED) {
      const re = new RegExp(`<section[^>]*id=["']${id}["']`);
      expect(SRC).not.toMatch(re);
    }
  });

  it("não renderiza <div id=\"nearby\"> nem id=\"amenities\" como âncora de seção", () => {
    // O componente ainda pode ter divs internas com esses nomes — mas nenhuma
    // deve estar servindo como âncora scroll-mt-*.
    for (const id of REMOVED) {
      const re = new RegExp(`<div[^>]*id=["']${id}["'][^>]*scroll-mt`);
      expect(SRC).not.toMatch(re);
    }
  });

  it("SectionId union não declara nearby/amenities", () => {
    const union = extractSectionIdUnion();
    for (const id of REMOVED) expect(union).not.toContain(id);
  });

  it("sectionIds (scrollspy) não referencia nearby/amenities", () => {
    const ids = extractArray("sectionIds");
    for (const id of REMOVED) expect(ids).not.toContain(id);
    // sanity: âncoras essenciais permanecem.
    for (const kept of ["hero", "tese", "typologies", "simulador", "mercado", "faq"]) {
      expect(ids).toContain(kept);
    }
  });

  it("navSectionIds (chips do menu) não referencia nearby/amenities e tem 10 grupos", () => {
    const nav = extractArray("navSectionIds");
    for (const id of REMOVED) expect(nav).not.toContain(id);
    expect(nav).toEqual([
      "hero", "diagnostico", "tese", "typologies", "simulador",
      "matematica", "mercado", "eventos", "faq", "cta",
    ]);
  });

  it("toda entrada de navSectionIds está declarada em sectionIds e existe como <section id=...>", () => {
    const nav = extractArray("navSectionIds");
    const ids = extractArray("sectionIds");
    for (const id of nav) {
      expect(ids).toContain(id);
      const re = new RegExp(`<section[^>]*id=["']${id}["']`);
      expect(SRC).toMatch(re);
    }
  });
});
