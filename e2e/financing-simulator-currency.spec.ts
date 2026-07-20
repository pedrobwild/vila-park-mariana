import { test, expect } from "../playwright-fixture";

test.describe("FinancingSimulator — currency input", () => {
  test.beforeEach(async ({ page }) => {
    // Garante estado limpo entre testes (o simulador persiste em localStorage).
    await page.goto("/ferramentas");
    await page.evaluate(() => localStorage.removeItem("vp_financing_sim_v1"));
    await page.reload();
  });

  test("aceita valor do imóvel com 6 dígitos digitados sequencialmente sem travar", async ({ page }) => {
    const pv = page.locator("#pv");
    await pv.click();
    // Digita 850000 tecla a tecla — reproduz o bug em que o cursor travava após 4 dígitos.
    await page.keyboard.type("850000", { delay: 30 });

    // Enquanto focado o input mostra dígitos crus.
    await expect(pv).toHaveValue("850000");

    // Ao perder o foco, formata em BRL com separador de milhar.
    await pv.blur();
    await expect(pv).toHaveValue(/850\.000/);
  });

  test("aceita renda familiar com 5 dígitos sem cortar o valor", async ({ page }) => {
    const income = page.locator("#income");
    await income.click();
    await page.keyboard.type("15000", { delay: 30 });
    await expect(income).toHaveValue("15000");

    await income.blur();
    await expect(income).toHaveValue(/15\.000/);
  });

  test("permite continuar digitando após formatação (foco preserva valor numérico)", async ({ page }) => {
    const pv = page.locator("#pv");
    await pv.click();
    await page.keyboard.type("8500", { delay: 20 });
    await pv.blur();
    await expect(pv).toHaveValue(/8\.500/);

    // Refoca e adiciona mais dígitos — o valor cru deve reaparecer para edição.
    await pv.click();
    await expect(pv).toHaveValue("8500");
    await page.keyboard.press("End");
    await page.keyboard.type("00", { delay: 20 });
    await expect(pv).toHaveValue("850000");
    await pv.blur();
    await expect(pv).toHaveValue(/850\.000/);
  });

  test("simulação usa o valor final correto (850.000) após digitação sequencial", async ({ page }) => {
    // Preenche mínimo necessário para uma simulação válida.
    await page.locator("#pv").click();
    await page.keyboard.type("850000", { delay: 20 });
    await page.locator("#pv").blur();

    await page.locator("#income").click();
    await page.keyboard.type("18000", { delay: 20 });
    await page.locator("#income").blur();

    // Gera simulação.
    const generate = page.getByRole("button", { name: /gerar simula[cç][aã]o/i });
    await generate.scrollIntoViewIfNeeded();
    await generate.click();

    // O resumo pós-simulação deve mencionar o valor total corretamente formatado.
    await expect(page.getByText(/850\.000/).first()).toBeVisible({ timeout: 10_000 });
  });
});
