import { test, expect } from "../playwright-fixture";
import type { Locator, Page } from "@playwright/test";

/**
 * i18n do VilaParkLocationMap: alterna PT ↔ EN e verifica que todos os textos
 * novos do mapa (filtros, botão de raio, rótulos permanentes 5/12 min, popup
 * "Como chegar / Get directions" e disclaimer) mudam corretamente sem quebrar
 * layout — mesmo container/altura antes e depois.
 */

test.setTimeout(90_000);
test.describe.configure({ retries: 1 });

// Espelha src/i18n/locales/{pt,en}.json → chave "map"
const COPY = {
  pt: {
    filtersAll: "Todos",
    boundsFull: "Ver raio completo",
    boundsBack: "Voltar ao entorno",
    radius500: "5 min a pé",
    radius1000: "12 min a pé",
    directions: /Como chegar/i,
    disclaimer: /Posições dos pontos são aproximadas/i,
    catLeisure: "Lazer",
    catMobility: "Mobilidade",
  },
  en: {
    filtersAll: "All",
    boundsFull: "See full radius",
    boundsBack: "Back to neighborhood",
    radius500: "5 min walk",
    radius1000: "12 min walk",
    directions: /Get directions/i,
    disclaimer: /approximate, for visual reference/i,
    catLeisure: "Leisure",
    catMobility: "Mobility",
  },
} as const;

async function waitMapReady(page: Page): Promise<Locator> {
  const section = page.locator("#comparativo");
  await section.scrollIntoViewIfNeeded();
  const canvas = section.locator("canvas.maplibregl-canvas").first();
  await expect(canvas).toBeVisible({ timeout: 20_000 });
  await page.addStyleTag({
    content: `*,*::before,*::after{animation-duration:0s!important;transition-duration:0s!important;}
              .motion-safe\\:animate-ping{animation:none!important;}`,
  });
  await page.waitForTimeout(400);
  return section;
}

async function switchLanguage(page: Page, to: "pt" | "en") {
  // O LanguageSwitcher (variant compact/full) tem aria-label "Language..." / "Idioma..."
  const btn = page.getByRole("button", { name: /Idioma|Language|lang/i }).first();
  await btn.click();
  // A i18n troca; aguarda um efeito colateral confirmado (filtro "All"/"Todos").
  await expect(
    page.locator("#comparativo").getByRole("button", { name: to === "pt" ? "Todos" : "All", exact: true }),
  ).toBeVisible({ timeout: 5_000 });
}

async function assertCopyForLang(section: Locator, page: Page, lang: "pt" | "en") {
  const c = COPY[lang];

  // Filtros: "Todos" / "All" e uma categoria (Lazer / Leisure).
  await expect(section.getByRole("button", { name: c.filtersAll, exact: true })).toBeVisible();
  await expect(section.getByRole("button", { name: new RegExp(c.catLeisure) })).toBeVisible();
  await expect(section.getByRole("button", { name: new RegExp(c.catMobility) })).toBeVisible();

  // Botão de bounds: começa mostrando "Ver raio completo" / "See full radius"
  const boundsBtn = section.getByRole("button", { name: c.boundsFull });
  await expect(boundsBtn).toBeVisible();
  // Alterna e valida o rótulo inverso.
  await boundsBtn.click();
  await expect(section.getByRole("button", { name: c.boundsBack })).toBeVisible();
  // Volta ao estado inicial.
  await section.getByRole("button", { name: c.boundsBack }).click();
  await expect(section.getByRole("button", { name: c.boundsFull })).toBeVisible();

  // Rótulos permanentes dos anéis (5 min / 12 min) — markers do MapLibre.
  await expect(section.getByText(c.radius500, { exact: false }).first()).toBeVisible();
  await expect(section.getByText(c.radius1000, { exact: false }).first()).toBeVisible();

  // Popup "Como chegar" / "Get directions": clica no primeiro item da lista/carrossel
  // para abrir o popup do POI.
  const anyPoiButton = section
    .locator('button[aria-pressed]')
    .filter({ hasNot: page.locator('[aria-label^="Vila Park"]') })
    .first();
  await anyPoiButton.scrollIntoViewIfNeeded();
  await anyPoiButton.click();

  const popup = section.locator(".maplibregl-popup").first();
  await expect(popup).toBeVisible({ timeout: 5_000 });
  await expect(popup.getByRole("link", { name: c.directions })).toBeVisible();

  // Fecha o popup (evita interferência entre asserts subsequentes).
  const closeBtn = popup.locator("button.maplibregl-popup-close-button").first();
  if (await closeBtn.isVisible().catch(() => false)) {
    await closeBtn.click();
  }

  // Disclaimer traduzido.
  await expect(section.getByText(c.disclaimer)).toBeVisible();
}

async function captureMapMetrics(section: Locator) {
  const mapContainer = section.locator(".maplibregl-map").first();
  const box = await mapContainer.boundingBox();
  const listOrCarousel = section.locator('[aria-label*="Pontos"], [aria-label*="Points"]').first();
  const listBox = await listOrCarousel.boundingBox().catch(() => null);
  return { map: box, list: listBox };
}

test("mapa da home traduz PT ↔ EN mantendo layout", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  const section = await waitMapReady(page);

  // Garante estado inicial em PT (troca se necessário).
  const isPt = await section
    .getByRole("button", { name: "Todos", exact: true })
    .isVisible()
    .catch(() => false);
  if (!isPt) await switchLanguage(page, "pt");

  // 1) PT: valida todos os textos e captura métricas do layout.
  await assertCopyForLang(section, page, "pt");
  const ptMetrics = await captureMapMetrics(section);
  expect(ptMetrics.map).not.toBeNull();

  // 2) PT → EN
  await switchLanguage(page, "en");
  await assertCopyForLang(section, page, "en");
  const enMetrics = await captureMapMetrics(section);

  // 3) Layout preservado: mesma altura de mapa (± 2px) e mesma coluna X inicial.
  expect(enMetrics.map).not.toBeNull();
  expect(Math.abs((enMetrics.map!.height ?? 0) - (ptMetrics.map!.height ?? 0))).toBeLessThanOrEqual(2);
  expect(Math.abs((enMetrics.map!.width ?? 0) - (ptMetrics.map!.width ?? 0))).toBeLessThanOrEqual(2);

  // 4) EN → PT (garante reversibilidade e ausência de resíduos).
  await switchLanguage(page, "pt");
  await assertCopyForLang(section, page, "pt");
  const ptAgain = await captureMapMetrics(section);
  expect(Math.abs((ptAgain.map!.height ?? 0) - (ptMetrics.map!.height ?? 0))).toBeLessThanOrEqual(2);

  // Sanidade final: nenhum texto de i18n missing (ex.: "map.filters.all" cru).
  const missing = await section
    .getByText(/^map\.[a-z.]+$/i)
    .count();
  expect(missing).toBe(0);
});
