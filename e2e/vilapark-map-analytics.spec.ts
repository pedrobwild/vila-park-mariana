import { test, expect } from "../playwright-fixture";
import type { Page } from "@playwright/test";

/**
 * Analytics do VilaParkLocationMap (home #comparativo).
 * Valida contrato estrito do payload em window.dataLayer para cada evento:
 *  - map_poi_select: poi_id, poi_name, category, distance_label, distance_m,
 *    source, filters, filters_count, filters_key, dedup_key
 *  - map_filter_toggle: category, filter_action, filters, filters_count,
 *    filters_key, dedup_key
 *  - map_filter_reset:  filters, filters_count, filters_key, dedup_key
 *  - map_bounds_toggle: mode, filters, filters_count, filters_key, dedup_key
 *
 * Todos os eventos devem carregar envelope { location, component, event }.
 */

type EventPayload = Record<string, unknown>;
type DL = Array<EventPayload>;

const ALL_CATEGORIES_SORTED = ["education", "gastronomy", "leisure", "mobility", "services"] as const;
const ALL_FILTERS_KEY = ALL_CATEGORIES_SORTED.join(",");

test.setTimeout(90_000);
test.describe.configure({ retries: 1 });

async function primeDataLayer(page: Page) {
  await page.addInitScript(() => {
    (window as unknown as { dataLayer: DL }).dataLayer = [];
  });
}

async function readEvents(page: Page, event: string): Promise<EventPayload[]> {
  return await page.evaluate((ev) => {
    const dl = (window as unknown as { dataLayer?: DL }).dataLayer ?? [];
    return dl.filter((e) => e.event === ev);
  }, event);
}

async function waitForEvent(page: Page, event: string, min = 1) {
  await expect
    .poll(async () => (await readEvents(page, event)).length, { timeout: 3_000 })
    .toBeGreaterThanOrEqual(min);
}

async function waitMapReady(page: Page) {
  const section = page.locator("#comparativo");
  await section.scrollIntoViewIfNeeded();
  const canvas = section.locator("canvas.maplibregl-canvas").first();
  await expect(canvas).toBeVisible({ timeout: 20_000 });
  await page.waitForFunction(
    () => {
      const c = document.querySelector("#comparativo canvas.maplibregl-canvas") as HTMLCanvasElement | null;
      return !!c && c.width > 0;
    },
    null,
    { timeout: 20_000 },
  );
  await page.waitForTimeout(300);
}

/**
 * Verifica que o payload contém EXATAMENTE o conjunto de chaves esperado
 * (nem mais, nem menos), além de validar os tipos primitivos.
 */
function assertKeys(payload: EventPayload, expected: readonly string[]) {
  const actual = Object.keys(payload).sort();
  const sortedExpected = [...expected].sort();
  expect(actual, `chaves inesperadas: ${actual.filter((k) => !sortedExpected.includes(k)).join(",")} | faltando: ${sortedExpected.filter((k) => !actual.includes(k)).join(",")}`).toEqual(sortedExpected);
}

function assertFiltersConsistency(payload: EventPayload) {
  const filters = payload.filters as string[];
  expect(Array.isArray(filters)).toBe(true);
  // sempre ordenado alfabeticamente
  expect(filters).toEqual([...filters].sort());
  expect(payload.filters_count).toBe(filters.length);
  expect(payload.filters_key).toBe(filters.join(","));
}

test.describe("Analytics: VilaParkLocationMap (window.dataLayer)", () => {
  test("map_poi_select tem payload completo e consistente ao clicar na lista", async ({ page }) => {
    await primeDataLayer(page);
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/");
    await waitMapReady(page);

    const item = page.locator("#comparativo button[aria-pressed]", { hasText: "Parque da Aclimação" }).first();
    await item.scrollIntoViewIfNeeded();
    await item.click();

    await waitForEvent(page, "map_poi_select");
    const evt = (await readEvents(page, "map_poi_select"))[0]!;

    assertKeys(evt, [
      "event",
      "location",
      "component",
      "poi_id",
      "poi_name",
      "category",
      "distance_label",
      "distance_m",
      "source",
      "filters",
      "filters_count",
      "filters_key",
      "dedup_key",
    ]);

    expect(evt).toMatchObject({
      event: "map_poi_select",
      location: "home:comparativo",
      component: "VilaParkLocationMap",
      poi_id: "parque-da-aclimacao",
      poi_name: "Parque da Aclimação",
      category: "leisure",
      distance_label: "950 m",
      distance_m: 950,
      source: "list",
      filters_key: ALL_FILTERS_KEY,
      filters_count: 5,
      dedup_key: "poi:parque-da-aclimacao:list",
    });
    assertFiltersConsistency(evt);
    expect(evt.filters).toEqual([...ALL_CATEGORIES_SORTED]);
  });

  test("map_poi_select repetido no mesmo POI/source é deduplicado dentro da janela", async ({ page }) => {
    await primeDataLayer(page);
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/");
    await waitMapReady(page);

    const item = page.locator("#comparativo button[aria-pressed]", { hasText: "Parque da Aclimação" }).first();
    await item.scrollIntoViewIfNeeded();
    await item.click();
    await item.click();
    await item.click();

    const events = await readEvents(page, "map_poi_select");
    const forThisPoi = events.filter((e) => e.poi_id === "parque-da-aclimacao" && e.source === "list");
    expect(forThisPoi.length).toBe(1);
    expect(forThisPoi[0]!.dedup_key).toBe("poi:parque-da-aclimacao:list");
  });

  test("map_filter_toggle tem payload completo (category, filter_action, filters*)", async ({ page }) => {
    await primeDataLayer(page);
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/");
    await waitMapReady(page);

    const chip = page.locator("#comparativo button[aria-pressed]", { hasText: /^Lazer$/ }).first();
    await chip.scrollIntoViewIfNeeded();
    await chip.click();

    await waitForEvent(page, "map_filter_toggle");
    const evt = (await readEvents(page, "map_filter_toggle"))[0]!;

    assertKeys(evt, [
      "event",
      "location",
      "component",
      "category",
      "filter_action",
      "filters",
      "filters_count",
      "filters_key",
      "dedup_key",
    ]);

    expect(evt).toMatchObject({
      event: "map_filter_toggle",
      location: "home:comparativo",
      component: "VilaParkLocationMap",
      category: "leisure",
      filter_action: "off",
      dedup_key: "filter:leisure:off",
      filters_count: 4,
    });
    assertFiltersConsistency(evt);
    expect(evt.filters as string[]).not.toContain("leisure");
    expect(evt.filters).toEqual(ALL_CATEGORIES_SORTED.filter((c) => c !== "leisure"));
  });

  test("map_filter_reset tem payload completo com todas as categorias", async ({ page }) => {
    await primeDataLayer(page);
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/");
    await waitMapReady(page);

    const leisureChip = page.locator("#comparativo button[aria-pressed]", { hasText: /^Lazer$/ }).first();
    await leisureChip.scrollIntoViewIfNeeded();
    await leisureChip.click();

    const allChip = page.locator("#comparativo button[aria-pressed]", { hasText: /^Todos$/ }).first();
    await allChip.click();

    await waitForEvent(page, "map_filter_reset");
    const evt = (await readEvents(page, "map_filter_reset"))[0]!;

    assertKeys(evt, [
      "event",
      "location",
      "component",
      "filters",
      "filters_count",
      "filters_key",
      "dedup_key",
    ]);

    expect(evt).toMatchObject({
      event: "map_filter_reset",
      location: "home:comparativo",
      component: "VilaParkLocationMap",
      dedup_key: "filter:reset",
      filters_count: 5,
      filters_key: ALL_FILTERS_KEY,
    });
    assertFiltersConsistency(evt);
    expect(evt.filters).toEqual([...ALL_CATEGORIES_SORTED]);
  });

  test("map_bounds_toggle tem payload completo em full_radius e nearby", async ({ page }) => {
    await primeDataLayer(page);
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/");
    await waitMapReady(page);

    const btn = page.locator("#comparativo button", { hasText: /Ver raio completo/i }).first();
    await btn.scrollIntoViewIfNeeded();
    await btn.click();

    await waitForEvent(page, "map_bounds_toggle");
    const first = (await readEvents(page, "map_bounds_toggle"))[0]!;

    assertKeys(first, [
      "event",
      "location",
      "component",
      "mode",
      "filters",
      "filters_count",
      "filters_key",
      "dedup_key",
    ]);

    expect(first).toMatchObject({
      event: "map_bounds_toggle",
      location: "home:comparativo",
      component: "VilaParkLocationMap",
      mode: "full_radius",
      dedup_key: "bounds:full_radius",
      filters_key: ALL_FILTERS_KEY,
      filters_count: 5,
    });
    assertFiltersConsistency(first);

    const back = page.locator("#comparativo button", { hasText: /Voltar ao entorno/i }).first();
    await back.click();

    await waitForEvent(page, "map_bounds_toggle", 2);
    const events = await readEvents(page, "map_bounds_toggle");
    const nearby = events.find((e) => e.mode === "nearby")!;
    expect(nearby).toBeTruthy();

    assertKeys(nearby, [
      "event",
      "location",
      "component",
      "mode",
      "filters",
      "filters_count",
      "filters_key",
      "dedup_key",
    ]);
    expect(nearby).toMatchObject({
      mode: "nearby",
      dedup_key: "bounds:nearby",
      filters_count: 5,
      filters_key: ALL_FILTERS_KEY,
    });
    assertFiltersConsistency(nearby);
  });
});
