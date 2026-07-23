import { test, expect } from "../playwright-fixture";
import type { Page } from "@playwright/test";

/**
 * Analytics do VilaParkLocationMap (home #comparativo).
 * Garante que window.dataLayer recebe eventos com payload consistente
 * (poi_id, poi_name, category, distance_label, distance_m, source, filters...).
 */

type DL = Array<Record<string, unknown>>;

test.setTimeout(90_000);
test.describe.configure({ retries: 1 });

async function primeDataLayer(page: Page) {
  await page.addInitScript(() => {
    (window as unknown as { dataLayer: DL }).dataLayer = [];
  });
}

async function readEvents(page: Page, event: string) {
  return await page.evaluate((ev) => {
    const dl = (window as unknown as { dataLayer?: DL }).dataLayer ?? [];
    return dl.filter((e) => e.event === ev);
  }, event);
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

test.describe("Analytics: VilaParkLocationMap (window.dataLayer)", () => {
  test("map_poi_select carrega poi_id/name/category/distance/source ao clicar na lista", async ({ page }) => {
    await primeDataLayer(page);
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/");
    await waitMapReady(page);

    const item = page.locator("#comparativo button[aria-pressed]", { hasText: "Parque da Aclimação" }).first();
    await item.scrollIntoViewIfNeeded();
    await item.click();

    await expect
      .poll(async () => (await readEvents(page, "map_poi_select")).length, { timeout: 3_000 })
      .toBeGreaterThan(0);

    const evt = (await readEvents(page, "map_poi_select"))[0] as Record<string, unknown>;
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
    });
    expect(Array.isArray(evt.filters)).toBe(true);
    expect(typeof evt.dedup_key).toBe("string");
  });

  test("map_poi_select repetido no mesmo POI é deduplicado dentro da janela", async ({ page }) => {
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
  });

  test("map_filter_toggle envia category, filter_action e filters", async ({ page }) => {
    await primeDataLayer(page);
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/");
    await waitMapReady(page);

    // Filtro "Lazer" (leisure). Estado inicial: todos ativos.
    const chip = page.locator("#comparativo button[aria-pressed]", { hasText: /^Lazer$/ }).first();
    await chip.scrollIntoViewIfNeeded();
    await chip.click();

    await expect
      .poll(async () => (await readEvents(page, "map_filter_toggle")).length, { timeout: 3_000 })
      .toBeGreaterThan(0);

    const evt = (await readEvents(page, "map_filter_toggle"))[0] as Record<string, unknown>;
    expect(evt).toMatchObject({
      event: "map_filter_toggle",
      location: "home:comparativo",
      component: "VilaParkLocationMap",
      category: "leisure",
      filter_action: "off",
    });
    expect(Array.isArray(evt.filters)).toBe(true);
    expect((evt.filters as string[])).not.toContain("leisure");
    expect(typeof evt.filters_count).toBe("number");
    expect(typeof evt.filters_key).toBe("string");
  });

  test("map_filter_reset dispara ao clicar em 'Todos' com filtros completos", async ({ page }) => {
    await primeDataLayer(page);
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/");
    await waitMapReady(page);

    // Primeiro remove uma categoria para diferenciar o estado.
    const leisureChip = page.locator("#comparativo button[aria-pressed]", { hasText: /^Lazer$/ }).first();
    await leisureChip.scrollIntoViewIfNeeded();
    await leisureChip.click();

    const allChip = page.locator("#comparativo button[aria-pressed]", { hasText: /^Todos$/ }).first();
    await allChip.click();

    await expect
      .poll(async () => (await readEvents(page, "map_filter_reset")).length, { timeout: 3_000 })
      .toBeGreaterThan(0);

    const evt = (await readEvents(page, "map_filter_reset"))[0] as Record<string, unknown>;
    expect(evt).toMatchObject({
      event: "map_filter_reset",
      location: "home:comparativo",
      component: "VilaParkLocationMap",
      dedup_key: "filter:reset",
    });
    const filters = evt.filters as string[];
    expect(filters).toEqual(expect.arrayContaining(["mobility", "leisure", "education", "services", "gastronomy"]));
    expect(evt.filters_count).toBe(5);
  });

  test("map_bounds_toggle envia mode full_radius / nearby", async ({ page }) => {
    await primeDataLayer(page);
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/");
    await waitMapReady(page);

    const btn = page.locator("#comparativo button", { hasText: /Ver raio completo/i }).first();
    await btn.scrollIntoViewIfNeeded();
    await btn.click();

    await expect
      .poll(async () => (await readEvents(page, "map_bounds_toggle")).length, { timeout: 3_000 })
      .toBeGreaterThan(0);

    const first = (await readEvents(page, "map_bounds_toggle"))[0] as Record<string, unknown>;
    expect(first).toMatchObject({
      event: "map_bounds_toggle",
      location: "home:comparativo",
      component: "VilaParkLocationMap",
      mode: "full_radius",
      dedup_key: "bounds:full_radius",
    });
    expect(Array.isArray(first.filters)).toBe(true);

    // Volta ao entorno.
    const back = page.locator("#comparativo button", { hasText: /Voltar ao entorno/i }).first();
    await back.click();

    await expect
      .poll(async () => (await readEvents(page, "map_bounds_toggle")).length, { timeout: 3_000 })
      .toBeGreaterThan(1);

    const events = await readEvents(page, "map_bounds_toggle");
    const nearby = events.find((e) => e.mode === "nearby");
    expect(nearby).toBeTruthy();
    expect(nearby).toMatchObject({ dedup_key: "bounds:nearby" });
  });
});
