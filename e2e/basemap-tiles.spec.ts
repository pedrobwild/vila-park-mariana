import { test, expect, type Page } from "../playwright-fixture";

/**
 * Valida que o basemap (OpenFreeMap Positron ou fallback CARTO Positron) realmente
 * carrega tiles/vetores — ou seja, o mapa deixa de ser um canvas cinza uniforme —
 * e que os overlays do produto (anéis de caminhada + marcadores) permanecem
 * renderizados sobre o basemap na home (#comparativo).
 *
 * Tolerância a intermitência:
 *  - O carregamento é tentado até MAX_ATTEMPTS vezes.
 *  - A cada falha (timeout do canvas, sem tiles OK, canvas cinza) recarregamos a
 *    página com `page.reload()` e re-executamos o fluxo do zero.
 *  - Retentativas de tile individual (HTTP 5xx / abortado) são tratadas pelo
 *    próprio MapLibre; nós apenas garantimos que o resultado final seja válido.
 */

const TILE_HOST_PATTERNS = [
  /tiles\.openfreemap\.org/i,
  /basemaps\.cartocdn\.com/i,
  /tiles\.basemaps\.cartocdn\.com/i,
  /openfreemap/i,
];

const MAX_ATTEMPTS = 3;
const RELOAD_BACKOFF_MS = [0, 1_500, 4_000]; // espera antes de cada tentativa

// Um teste único pode ficar longo por causa dos reloads; damos folga.
test.setTimeout(120_000);
// Retentativas do Playwright cobrem falhas de infraestrutura (browser, sandbox).
test.describe.configure({ retries: 2 });

type Attempt = { attempt: number; reason: string; details?: unknown };

async function tryLoadBasemap(page: Page): Promise<{ ok: true } | { ok: false; reason: string; details?: unknown }> {
  const tileResponses: { url: string; status: number }[] = [];
  const onResponse = (res: import("../playwright-fixture").Response | any) => {
    const url = res.url();
    if (TILE_HOST_PATTERNS.some((rx) => rx.test(url))) {
      tileResponses.push({ url, status: res.status() });
    }
  };
  page.on("response", onResponse);

  try {
    // Dispara o lazy-load do mapa (IntersectionObserver)
    await page.locator("#comparativo").scrollIntoViewIfNeeded();

    // Aguarda o canvas do MapLibre montar
    const canvas = page.locator("#comparativo canvas.maplibregl-canvas").first();
    try {
      await expect(canvas).toBeVisible({ timeout: 15_000 });
    } catch (err) {
      return { ok: false, reason: "canvas-not-visible", details: String(err).slice(0, 300) };
    }

    // Aguarda a rede assentar após o carregamento dos tiles
    await page.waitForLoadState("networkidle", { timeout: 20_000 }).catch(() => {});

    // 1) Pelo menos uma resposta de tiles/estilo veio de OpenFreeMap ou CARTO
    const okTiles = tileResponses.filter((r) => r.status >= 200 && r.status < 400);
    if (okTiles.length === 0) {
      return {
        ok: false,
        reason: "no-tiles",
        details: `respostas observadas: ${JSON.stringify(tileResponses).slice(0, 400)}`,
      };
    }

    // 2) Canvas NÃO é cinza uniforme — deve haver variedade de cores.
    //    Amostramos algumas vezes com pequenas esperas para tolerar tiles em progresso.
    let diversity = { unique: 0, sampled: 0 };
    for (let i = 0; i < 4; i++) {
      diversity = await canvas.evaluate((el: HTMLCanvasElement) => {
        const w = el.width;
        const h = el.height;
        const gl = (el.getContext("webgl2") || el.getContext("webgl")) as WebGLRenderingContext | null;
        if (!gl) return { unique: 0, sampled: 0 };
        const sx = Math.max(0, Math.floor((w - 200) / 2));
        const sy = Math.max(0, Math.floor((h - 200) / 2));
        const sw = Math.min(200, w);
        const sh = Math.min(200, h);
        const pixels = new Uint8Array(sw * sh * 4);
        gl.readPixels(sx, sy, sw, sh, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
        const buckets = new Set<number>();
        for (let j = 0; j < pixels.length; j += 4) {
          const r = pixels[j] >> 4;
          const g = pixels[j + 1] >> 4;
          const b = pixels[j + 2] >> 4;
          buckets.add((r << 8) | (g << 4) | b);
        }
        return { unique: buckets.size, sampled: sw * sh };
      });
      if (diversity.unique > 8) break;
      await page.waitForTimeout(1_500);
    }

    if (diversity.unique <= 8) {
      return {
        ok: false,
        reason: "canvas-uniform",
        details: `${diversity.unique} cores distintas em ${diversity.sampled} px`,
      };
    }

    // 3) Overlays do produto continuam visíveis sobre o basemap
    const buildingMarker = page.locator("#comparativo [class*='maplibregl-marker']").first();
    try {
      await expect(buildingMarker).toBeVisible({ timeout: 5_000 });
      await expect(page.locator("#comparativo").getByText(/5\s*min/i).first()).toBeVisible({ timeout: 5_000 });
      await expect(page.locator("#comparativo").getByText(/12\s*min/i).first()).toBeVisible({ timeout: 5_000 });
    } catch (err) {
      return { ok: false, reason: "overlays-missing", details: String(err).slice(0, 300) };
    }

    return { ok: true };
  } finally {
    page.off("response", onResponse);
  }
}

test("basemap tiles carregam e overlays permanecem visíveis na home", async ({ page }) => {
  const attempts: Attempt[] = [];

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const wait = RELOAD_BACKOFF_MS[attempt - 1] ?? 0;
    if (wait > 0) await page.waitForTimeout(wait);

    if (attempt === 1) {
      await page.goto("/");
    } else {
      // eslint-disable-next-line no-console
      console.warn(`[basemap-tiles] tentativa ${attempt}: recarregando página (motivo anterior: ${attempts.at(-1)?.reason}).`);
      await page.reload({ waitUntil: "domcontentloaded" });
    }

    const result = await tryLoadBasemap(page);
    if (result.ok) {
      if (attempts.length > 0) {
        // eslint-disable-next-line no-console
        console.info(`[basemap-tiles] sucesso na tentativa ${attempt}. Falhas anteriores: ${JSON.stringify(attempts)}`);
      }
      return;
    }
    attempts.push({ attempt, reason: result.reason, details: result.details });
  }

  throw new Error(
    `Basemap não carregou após ${MAX_ATTEMPTS} tentativas com reload. Histórico: ${JSON.stringify(attempts, null, 2)}`,
  );
});
