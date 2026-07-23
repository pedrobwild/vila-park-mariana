import { test, expect } from "../playwright-fixture";

/**
 * Valida que o basemap (OpenFreeMap Positron ou fallback CARTO Positron) realmente
 * carrega tiles/vetores — ou seja, o mapa deixa de ser um canvas cinza uniforme —
 * e que os overlays do produto (anéis de caminhada + marcadores) permanecem
 * renderizados sobre o basemap na home (#comparativo).
 */

const TILE_HOST_PATTERNS = [
  /tiles\.openfreemap\.org/i,
  /basemaps\.cartocdn\.com/i,
  /tiles\.basemaps\.cartocdn\.com/i,
  /openfreemap/i,
];

test("basemap tiles carregam e overlays permanecem visíveis na home", async ({ page }) => {
  const tileResponses: { url: string; status: number }[] = [];
  page.on("response", (res) => {
    const url = res.url();
    if (TILE_HOST_PATTERNS.some((rx) => rx.test(url))) {
      tileResponses.push({ url, status: res.status() });
    }
  });

  await page.goto("/");
  // Dispara o lazy-load do mapa (IntersectionObserver)
  await page.locator("#comparativo").scrollIntoViewIfNeeded();

  // Aguarda o canvas do MapLibre montar
  const canvas = page.locator("#comparativo canvas.maplibregl-canvas").first();
  await expect(canvas).toBeVisible({ timeout: 15_000 });

  // Aguarda a rede assentar após o carregamento dos tiles
  await page.waitForLoadState("networkidle", { timeout: 20_000 }).catch(() => {});

  // 1) Pelo menos uma resposta de tiles/estilo veio de OpenFreeMap ou CARTO
  const okTiles = tileResponses.filter((r) => r.status >= 200 && r.status < 400);
  expect(
    okTiles.length,
    `Nenhum tile de basemap foi carregado. Respostas observadas: ${JSON.stringify(tileResponses).slice(0, 500)}`,
  ).toBeGreaterThan(0);

  // 2) Canvas NÃO é cinza uniforme — deve haver variedade de cores (ruas, água, áreas verdes, labels)
  const diversity = await canvas.evaluate((el: HTMLCanvasElement) => {
    const w = el.width;
    const h = el.height;
    // Usa o próprio contexto WebGL do MapLibre para ler pixels
    const gl = (el.getContext("webgl2") || el.getContext("webgl")) as WebGLRenderingContext | null;
    if (!gl) return { unique: 0, sampled: 0, reason: "no-webgl" as const };
    // Amostra uma região central 200x200
    const sx = Math.max(0, Math.floor((w - 200) / 2));
    const sy = Math.max(0, Math.floor((h - 200) / 2));
    const sw = Math.min(200, w);
    const sh = Math.min(200, h);
    const pixels = new Uint8Array(sw * sh * 4);
    gl.readPixels(sx, sy, sw, sh, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
    const buckets = new Set<number>();
    for (let i = 0; i < pixels.length; i += 4) {
      // quantiza pra reduzir ruído de anti-aliasing
      const r = pixels[i] >> 4;
      const g = pixels[i + 1] >> 4;
      const b = pixels[i + 2] >> 4;
      buckets.add((r << 8) | (g << 4) | b);
    }
    return { unique: buckets.size, sampled: sw * sh, reason: "ok" as const };
  });

  expect(
    diversity.unique,
    `Canvas parece uniforme (${diversity.unique} cores distintas em ${diversity.sampled} px amostrados) — basemap provavelmente não renderizou.`,
  ).toBeGreaterThan(8);

  // 3) Overlays do produto continuam visíveis sobre o basemap
  //    Marcador do empreendimento (aria-label do botão principal)
  const buildingMarker = page
    .locator("#comparativo [class*='maplibregl-marker']")
    .first();
  await expect(buildingMarker).toBeVisible();

  //    Anéis de caminhada expõem seus labels de tempo (5 min / 12 min)
  await expect(page.locator("#comparativo").getByText(/5\s*min/i).first()).toBeVisible();
  await expect(page.locator("#comparativo").getByText(/12\s*min/i).first()).toBeVisible();
});
