import { test, expect } from "../playwright-fixture";

// Garante que, ao alternar o LanguageSwitcher para EN em /guia-investidor,
// nav, seções e cards do quiz aparecem em inglês, sem misturar pt-BR.
test.describe("Guia do Investidor — troca de idioma para EN", () => {
  test("toggle LanguageSwitcher renderiza conteúdo 100% em inglês", async ({ page }) => {
    // Começa em pt-BR (default). Limpa qualquer preferência anterior.
    await page.goto("/");
    await page.evaluate(() => localStorage.removeItem("bwild_lang"));

    await page.goto("/guia-investidor#simulador");

    // Sanity: em pt-BR o nav mostra "Início" antes do toggle.
    const nav = page.getByRole("navigation", { name: /guia do investidor|investor guide/i });
    await expect(nav).toBeVisible();
    await expect(nav.getByRole("button", { name: "Início", exact: true }).first()).toBeVisible();

    // Clica no LanguageSwitcher (variant compact em desktop). O aria-label em
    // pt-BR é "Idioma: Português — EN".
    const switcher = page.getByRole("button", { name: /Idioma: Português/i }).first();
    await expect(switcher).toBeVisible();
    await switcher.click();

    // Aguarda persistência do i18next e re-render.
    await expect
      .poll(async () => page.evaluate(() => localStorage.getItem("bwild_lang")))
      .toBe("en");
    await expect(page.locator("html")).toHaveAttribute("lang", "en");

    // NAV — labels de seções em inglês (sectionLabels.*).
    for (const label of ["Start", "Thesis", "Typologies", "Return", "Simulator", "FAQ"]) {
      await expect(nav.getByRole("button", { name: label, exact: true }).first()).toBeVisible();
    }

    // HERO em inglês.
    await expect(page.getByText("Investor Guide", { exact: true }).first()).toBeVisible();
    await expect(
      page.getByRole("button", { name: /Discover my investor profile/i }).first(),
    ).toBeVisible();

    // Card do QUIZ em inglês (primeira pergunta + progresso).
    await expect(page.getByText(/Question 1 of 4/i).first()).toBeVisible();
    await expect(
      page.getByRole("heading", { name: /What's your main goal with Vila Park\?/i }),
    ).toBeVisible();
    await expect(page.getByText(/Recurring monthly income/i).first()).toBeVisible();
    await expect(page.getByText(/Asset appreciation/i).first()).toBeVisible();

    // SIMULADOR em inglês (título + labels de campo + modos).
    const sim = page.locator("#simulador");
    await expect(sim).toBeVisible();
    await expect(sim.getByText(/Investor simulator/i).first()).toBeVisible();
    await expect(sim.getByText(/Long-term rental/i).first()).toBeVisible();
    await expect(sim.getByText(/Short stay/i).first()).toBeVisible();
    await expect(sim.getByText(/Unit price/i).first()).toBeVisible();

    // NÃO deve misturar pt-BR em nenhuma dessas superfícies após o toggle.
    // Termos exclusivos de pt-BR que não colidem com inglês:
    const ptOnly = [
      "Diagnóstico do investidor",
      "Qual é o seu principal objetivo com o Vila Park?",
      "Renda mensal recorrente",
      "Simulador do investidor",
      "Aluguel tradicional",
      "Preço da unidade",
      "Início", // nav label
    ];
    for (const term of ptOnly) {
      await expect(
        page.getByText(term, { exact: false }),
        `Conteúdo pt-BR "${term}" ainda visível após trocar para EN`,
      ).toHaveCount(0);
    }
  });
});
