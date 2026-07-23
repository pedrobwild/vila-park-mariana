import { test, expect } from "../playwright-fixture";

/**
 * Garante que o AttributionControl do MapLibre permanece visível e com créditos
 * legíveis no basemap da home (#comparativo). Cobre tanto o estilo primário
 * (OpenFreeMap Positron) quanto o fallback (CARTO Positron) — em qualquer um
 * dos dois, os créditos devem estar presentes e legíveis.
 *
 * Observação: nesta build, o único mapa MapLibre montado em uma rota é o
 * VilaParkLocationMap na home. SaoPauloMap e MapaBairrosEmbed não estão
 * atualmente mapeados a nenhuma rota pública, então só há uma "tela" para
 * verificar. Se algum desses mapas voltar a ser montado, este teste deve ser
 * estendido com um novo bloco cobrindo a rota correspondente.
 */

async function assertAttributionVisible(page: import("@playwright/test").Page, scopeSelector: string) {
  const scope = page.locator(scopeSelector);
  await scope.scrollIntoViewIfNeeded();

  // Aguarda o canvas do MapLibre montar dentro do escopo
  const canvas = scope.locator("canvas.maplibregl-canvas").first();
  await expect(canvas).toBeVisible({ timeout: 15_000 });

  // AttributionControl padrão do MapLibre
  const attrib = scope.locator(".maplibregl-ctrl-attrib").first();
  await expect(attrib).toBeAttached({ timeout: 10_000 });
  await expect(attrib).toBeVisible();

  // Não pode estar oculto por CSS
  const cssState = await attrib.evaluate((el) => {
    const cs = getComputedStyle(el as HTMLElement);
    const rect = (el as HTMLElement).getBoundingClientRect();
    return {
      display: cs.display,
      visibility: cs.visibility,
      opacity: parseFloat(cs.opacity || "1"),
      pointerEvents: cs.pointerEvents,
      width: rect.width,
      height: rect.height,
    };
  });
  expect(cssState.display).not.toBe("none");
  expect(cssState.visibility).not.toBe("hidden");
  expect(cssState.opacity).toBeGreaterThan(0);
  expect(cssState.width).toBeGreaterThan(0);
  expect(cssState.height).toBeGreaterThan(0);

  // O attribution em MapLibre pode iniciar colapsado; se houver toggle, expande
  const toggle = scope.locator(".maplibregl-ctrl-attrib-button").first();
  if (await toggle.count()) {
    const expanded = await attrib.evaluate((el) => el.classList.contains("maplibregl-compact-show"));
    if (!expanded) {
      await toggle.click().catch(() => {});
    }
  }

  // Texto dos créditos deve mencionar pelo menos uma das fontes esperadas.
  // Basemap primário serve OSM data (via OpenFreeMap); fallback usa CARTO + OSM.
  const text = ((await attrib.textContent()) || "").trim();
  expect(text.length, "AttributionControl está renderizado, porém sem texto.").toBeGreaterThan(0);
  expect(
    text,
    `Créditos do basemap não mencionam nenhuma das fontes esperadas. Texto: "${text}"`,
  ).toMatch(/OpenStreetMap|OpenFreeMap|CARTO|MapLibre/i);

  // Precisa haver ao menos um link clicável nos créditos (requisito das licenças ODbL/CC).
  const links = attrib.locator("a");
  expect(await links.count()).toBeGreaterThan(0);
  const firstLink = links.first();
  await expect(firstLink).toBeVisible();
  const href = await firstLink.getAttribute("href");
  expect(href, "Link de créditos sem href — não atende às licenças do basemap.").toBeTruthy();
  // Links de crédito não podem ficar com pointer-events desabilitados
  const linkPointer = await firstLink.evaluate((el) => getComputedStyle(el as HTMLElement).pointerEvents);
  expect(linkPointer).not.toBe("none");
}

test("attribution do basemap permanece visível na home (#comparativo)", async ({ page }) => {
  await page.goto("/");
  await assertAttributionVisible(page, "#comparativo");
});
