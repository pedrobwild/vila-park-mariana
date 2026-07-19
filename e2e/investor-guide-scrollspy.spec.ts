import { test, expect } from "../playwright-fixture";

// Garante que a navegação por seções do Guia do Investidor:
//   1) NÃO expõe chips para "nearby"/"amenities" (removidos),
//   2) Mantém sincronismo com o scroll (aria-current="true" migra
//      conforme cada seção-alvo entra na viewport).

const REMOVED_LABELS = [
  /nearby/i, /amenities/i, /entorno/i, /comodidades/i,
];

const SYNCED_SECTIONS: Array<{ id: string; ptLabel: RegExp }> = [
  { id: "diagnostico", ptLabel: /Diagnóstico/i },
  { id: "tese",        ptLabel: /Tese/i },
  { id: "typologies",  ptLabel: /Tipologias/i },
  { id: "simulador",   ptLabel: /Simulador/i },
  { id: "matematica",  ptLabel: /Retorno/i },
  { id: "mercado",     ptLabel: /Mercado/i },
  { id: "eventos",     ptLabel: /Eventos/i },
  { id: "faq",         ptLabel: /FAQ/i },
];

test.describe("Guia do Investidor — scrollspy e nav", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => localStorage.setItem("bwild_lang", "pt"));
    await page.goto("/guia-investidor");
  });

  test("nav não expõe chips de seções removidas (nearby/amenities)", async ({ page }) => {
    const nav = page.getByRole("navigation", { name: /guia do investidor/i });
    await expect(nav).toBeVisible();
    const buttons = nav.getByRole("button");
    const count = await buttons.count();
    for (let i = 0; i < count; i++) {
      const label = (await buttons.nth(i).innerText()).trim();
      for (const bad of REMOVED_LABELS) {
        expect(label, `chip "${label}" não deveria existir`).not.toMatch(bad);
      }
    }
    // Sanity: nav consolidada tem exatamente 10 chips.
    expect(count).toBe(10);
  });

  test("navegação por scroll atualiza aria-current do chip ativo", async ({ page }) => {
    const nav = page.getByRole("navigation", { name: /guia do investidor/i });
    await expect(nav).toBeVisible();

    for (const { id, ptLabel } of SYNCED_SECTIONS) {
      // Alvo existe (sem seções órfãs).
      const section = page.locator(`#${id}`);
      await expect(section, `#${id} deve existir`).toHaveCount(1);

      // Rola até a seção sem clicar no chip — o scrollspy precisa reagir sozinho.
      await section.evaluate((el) => {
        el.scrollIntoView({ behavior: "auto", block: "start" });
      });
      // Compensa offset do sticky nav (128+8) para garantir top <= 0.
      await page.evaluate(() => window.scrollBy(0, 150));

      const chip = nav.getByRole("button", { name: ptLabel, exact: false }).first();
      await expect(chip, `chip da seção ${id} deve existir`).toBeVisible();
      await expect
        .poll(async () => chip.getAttribute("aria-current"), { timeout: 3000 })
        .toBe("true");
    }
  });
});
