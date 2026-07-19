import { test, expect } from "../playwright-fixture";

// Confirma que o FAQ da home (#faq) carrega em pt e en, e que o accordion
// abre/fecha cada uma das 8 perguntas.

async function runFaqSuite(page: import("@playwright/test").Page, lang: "pt" | "en") {
  await page.goto("/");
  await page.evaluate((l) => localStorage.setItem("bwild_lang", l), lang);
  await page.goto("/#faq");

  const faq = page.locator("#faq");
  await expect(faq).toBeVisible();
  await faq.scrollIntoViewIfNeeded();

  const triggers = faq.getByRole("button").filter({ hasNot: page.locator("a") });
  // O Accordion renderiza um botão por item — deve haver 8.
  await expect(triggers).toHaveCount(8);

  for (let i = 0; i < 8; i++) {
    const trigger = triggers.nth(i);
    await expect(trigger).toBeVisible();
    await expect(trigger).toHaveAttribute("aria-expanded", "false");

    await trigger.click();
    await expect(trigger).toHaveAttribute("aria-expanded", "true");

    // O painel controlado pelo trigger deve estar visível com conteúdo não vazio.
    const controls = await trigger.getAttribute("aria-controls");
    expect(controls).toBeTruthy();
    const panel = page.locator(`#${controls}`);
    await expect(panel).toBeVisible();
    const text = (await panel.innerText()).trim();
    expect(text.length).toBeGreaterThan(0);

    // Fecha para o próximo (Accordion type="single" collapsible).
    await trigger.click();
    await expect(trigger).toHaveAttribute("aria-expanded", "false");
  }
}

test.describe("Home FAQ (#faq)", () => {
  test("carrega e opera as 8 perguntas em pt-BR", async ({ page }) => {
    await runFaqSuite(page, "pt");
    // Sanity de idioma: primeira pergunta em pt.
    await expect(
      page.locator("#faq").getByRole("button", { name: /Onde fica o Vila Park/i }).first(),
    ).toBeVisible();
  });

  test("carrega e opera as 8 perguntas em inglês", async ({ page }) => {
    await runFaqSuite(page, "en");
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await expect(
      page.locator("#faq").getByRole("button", { name: /Where is Vila Park/i }).first(),
    ).toBeVisible();
  });
});
