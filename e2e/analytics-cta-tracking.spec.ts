import { test, expect } from "../playwright-fixture";

/**
 * Garante que os CTAs de conversão pós-extinção do Guia do Comprador
 * empurram eventos completos (id, target, location) em window.dataLayer.
 */

type DL = Array<Record<string, unknown>>;

async function primeDataLayer(page: import("@playwright/test").Page) {
  await page.addInitScript(() => {
    (window as unknown as { dataLayer: DL }).dataLayer = [];
  });
}

async function readEvents(page: import("@playwright/test").Page, event: string) {
  return await page.evaluate((ev) => {
    const dl = (window as unknown as { dataLayer?: DL }).dataLayer ?? [];
    return dl.filter((e) => e.event === ev);
  }, event);
}

test.describe("Analytics: CTA tracking (window.dataLayer)", () => {
  test("Guia do Investidor: 'Ver entorno completo' empurra cta_click com id/target/location", async ({ page }) => {
    await primeDataLayer(page);
    await page.goto("/guia-investidor");

    const link = page.getByRole("link", { name: /Ver entorno completo/i }).first();
    await link.scrollIntoViewIfNeeded();
    // Evita navegação para outra rota antes de lermos o dataLayer.
    await page.evaluate(() => {
      document.querySelectorAll("a").forEach((a) => a.setAttribute("target", "_blank"));
    });
    await link.click({ modifiers: ["Meta"] }).catch(async () => {
      // Fallback: dispara handler sem navegar.
      await link.evaluate((el) => (el as HTMLElement).click());
    });

    const events = await readEvents(page, "cta_click");
    const evt = events.find((e) => e.id === "entorno_ver_completo");
    expect(evt, "cta_click id=entorno_ver_completo deve existir").toBeTruthy();
    expect(evt).toMatchObject({
      event: "cta_click",
      id: "entorno_ver_completo",
      target: "/#comparativo",
      location: "guia-investidor:tese",
    });
    expect(typeof (evt as Record<string, unknown>).ts).toBe("number");
  });

  test("Home mobile: sticky CTA para #reserva empurra cta_click com id/target/location", async ({ browser }) => {
    const context = await browser.newContext({ viewport: { width: 390, height: 780 } });
    const page = await context.newPage();
    await page.addInitScript(() => {
      (window as unknown as { dataLayer: DL }).dataLayer = [];
    });

    await page.goto("/");
    // Sticky CTA aparece após scroll — força visibilidade rolando a página.
    await page.evaluate(() => window.scrollTo(0, 1200));

    const sticky = page.getByRole("link").filter({ has: page.locator('[href="#reserva"]') }).first();
    // Fallback direto por seletor caso a semântica varie.
    const anchor = page.locator('a[href="#reserva"]').first();
    await expect(anchor).toBeVisible();
    await anchor.click();

    const events = await page.evaluate(() => {
      const dl = (window as unknown as { dataLayer?: DL }).dataLayer ?? [];
      return dl.filter((e) => e.event === "cta_click");
    });
    const evt = events.find((e) => e.id === "sticky_reserva");
    expect(evt, "cta_click id=sticky_reserva deve existir").toBeTruthy();
    expect(evt).toMatchObject({
      event: "cta_click",
      id: "sticky_reserva",
      target: "#reserva",
      location: "home:sticky-mobile",
    });
    expect(typeof (evt as Record<string, unknown>).ts).toBe("number");

    await context.close();
  });

  test("Home: hero CTA primário empurra cta_click para #tipologias", async ({ page }) => {
    await primeDataLayer(page);
    await page.goto("/");

    const cta = page.locator('a[href="#tipologias"]').first();
    await expect(cta).toBeVisible();
    await cta.click();

    const events = await readEvents(page, "cta_click");
    const evt = events.find((e) => e.id === "hero_ctaPrimary");
    expect(evt).toMatchObject({
      event: "cta_click",
      id: "hero_ctaPrimary",
      target: "#tipologias",
      location: "home:hero",
    });
  });
});
