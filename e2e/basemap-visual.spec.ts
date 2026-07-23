import { test, expect } from "../playwright-fixture";

/**
 * Visual regression: home #comparativo (mapa Vila Park).
 *
 * Captura screenshots baseline do container do mapa e compara pixel-a-pixel
 * (com tolerância) para detectar regressões visuais em:
 *  - Basemap: ruas, nomes de rua e rótulos de bairro (tiles Positron)
 *  - Marcadores: pino cobre do empreendimento + POIs
 *  - Anéis de caminhada: 500 m e 1 km com halo
 *
 * Como funciona:
 *  - A primeira execução grava as baselines em e2e/basemap-visual.spec.ts-snapshots/.
 *  - Execuções seguintes comparam contra a baseline e falham se o diff exceder o threshold.
 *  - Para atualizar baselines intencionalmente: `bunx playwright test --update-snapshots`.
 *
 * Estabilidade:
 *  - Aguarda `idle` do MapLibre + carregamento de tiles antes do snapshot.
 *  - Desativa animações CSS e o pulso do marcador cobre (motion-safe:animate-ping).
 *  - Máscara controles de zoom (nav) e attribution — layout externo que pode variar.
 *  - `maxDiffPixelRatio` tolera antialiasing e micro-variações de renderização de fonte
 *    entre execuções, sem esconder regressões reais no basemap ou overlays.
 */

test.setTimeout(90_000);
test.describe.configure({ retries: 1 });

test("home #comparativo — snapshot visual do mapa (basemap + marcadores + anéis)", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });

  // Injeta CSS que neutraliza animações / cursores piscantes para snapshot estável.
  await page.addStyleTag({
    content: `
      *, *::before, *::after {
        animation-duration: 0s !important;
        animation-delay: 0s !important;
        transition-duration: 0s !important;
        transition-delay: 0s !important;
      }
      /* Pulso do marcador do empreendimento (motion-safe:animate-ping) */
      .motion-safe\\:animate-ping { animation: none !important; opacity: 0.35 !important; }
    `,
  });

  // Rola até a seção e dispara o lazy-mount do mapa.
  const section = page.locator("#comparativo");
  await section.scrollIntoViewIfNeeded();

  const mapContainer = section.locator(".maplibregl-map").first();
  await mapContainer.waitFor({ state: "visible", timeout: 30_000 });

  // Aguarda MapLibre ficar `idle` (todos os tiles resolvidos e frame renderizado).
  await page.waitForFunction(
    () => {
      const canvas = document.querySelector("#comparativo .maplibregl-canvas") as HTMLCanvasElement | null;
      if (!canvas || canvas.width === 0) return false;
      // Sanidade: canvas não uniforme (basemap realmente pintado).
      const gl =
        (canvas.getContext("webgl2") as WebGLRenderingContext | null) ||
        (canvas.getContext("webgl") as WebGLRenderingContext | null);
      if (!gl) return true;
      const px = new Uint8Array(4 * 32 * 32);
      gl.readPixels(
        Math.floor(canvas.width / 2) - 16,
        Math.floor(canvas.height / 2) - 16,
        32,
        32,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        px,
      );
      const uniq = new Set<string>();
      for (let i = 0; i < px.length; i += 4) uniq.add(`${px[i] >> 4},${px[i + 1] >> 4},${px[i + 2] >> 4}`);
      return uniq.size > 4;
    },
    null,
    { timeout: 30_000 },
  );

  // Folga extra para labels vetoriais e glyphs assentarem.
  await page.waitForTimeout(1_500);

  await expect(mapContainer).toHaveScreenshot("vilapark-map.png", {
    // Máscara elementos que variam entre ambientes/versões sem afetar o produto.
    mask: [
      section.locator(".maplibregl-ctrl-top-right"),
      section.locator(".maplibregl-ctrl-attrib"),
    ],
    // Tolerância a antialiasing de fontes vetoriais e variações mínimas de tile.
    maxDiffPixelRatio: 0.02,
    animations: "disabled",
    caret: "hide",
  });
});
