import { test, expect } from "../playwright-fixture";

// Verifica que o tooltip do card "Rentabilidade do aluguel" (DealMarketHeader)
// mantém fonte e data de referência corretas em dois cenários:
//   1) análise carregada do cache do banco (cached: true);
//   2) após clicar em "Atualizar análise" (cached: false, releitura dos
//      indicadores do bairro via refreshToken).
//
// A chamada à edge function `market-intel` é interceptada para tornar o teste
// determinístico e não consumir créditos de IA.
//
// Credenciais lidas de env (ADMIN_EMAIL / ADMIN_PASS). Sem credenciais o teste
// é pulado para não falhar em ambientes sem o usuário demo semeado.

const EMAIL = process.env.ADMIN_EMAIL ?? "admin@bewild.demo";
const PASS = process.env.ADMIN_PASS ?? "";

function intelResponse(cached: boolean) {
  return {
    success: true,
    cached,
    payload: {
      secoes: [
        {
          id: "valor_m2",
          titulo: "Valor do m²",
          texto: cached
            ? "Texto da análise em cache para o bairro."
            : "Texto da análise atualizada agora para o bairro.",
          refs: [1],
        },
      ],
    },
    sources: [{ n: 1, titulo: "fonte-e2e.com.br", url: "https://fonte-e2e.com.br/relatorio" }],
    model: "sonar",
    generated_at: new Date().toISOString(),
  };
}

test.describe("CRM — tooltip de mercado após atualizar análise", () => {
  test.skip(!PASS, "ADMIN_PASS não definido; pulando teste de tooltip de mercado.");

  test("fonte e data de referência permanecem corretas no cache e após recarga", async ({
    page,
  }) => {
    let refreshCalls = 0;
    await page.route("**/functions/v1/market-intel", async (route) => {
      const isRefresh = (route.request().postData() ?? "").includes('"refresh":true');
      if (isRefresh) refreshCalls++;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(intelResponse(!isRefresh)),
      });
    });

    await page.goto("/login");
    await page.getByLabel(/e-?mail/i).fill(EMAIL);
    await page.getByLabel(/senha|password/i).fill(PASS);
    await page.getByRole("button", { name: /entrar|sign in/i }).click();
    await page.waitForURL(/\/admin(\/|$)/, { timeout: 15_000 });

    await page.goto("/admin?tab=crm");

    // Abre o primeiro negócio disponível no pipeline.
    const firstDeal = page
      .locator('[data-testid="crm-deal-card"], [role="button"]')
      .filter({ hasText: /R\$|proposta|negócio/i })
      .first();
    if ((await firstDeal.count()) === 0) {
      test.skip(true, "Nenhum negócio no pipeline para inspecionar.");
    }
    await firstDeal.click();

    const sheet = page.getByRole("dialog");
    await expect(sheet).toBeVisible({ timeout: 10_000 });

    // Garante finalidade LONG STAY (card de rentabilidade só existe nesse modo).
    const finalidade = sheet.getByLabel(/finalidade/i);
    await finalidade.click();
    await page.getByRole("option", { name: /long stay|locação (de )?longa/i }).click();

    const card = sheet
      .locator("div", { hasText: /^Rentabilidade do aluguel/i })
      .filter({ has: page.locator("p") })
      .first();
    await expect(card).toBeVisible({ timeout: 10_000 });

    const readTooltip = async () => {
      await card.hover();
      const tip = page.getByRole("tooltip").first();
      await expect(tip).toBeVisible({ timeout: 5_000 });
      const text = (await tip.innerText()).replace(/\s+/g, " ").trim();
      // Fecha o tooltip antes da próxima interação.
      await page.mouse.move(0, 0);
      return text;
    };

    // ── Cenário 1: dados vindos do cache ──────────────────────────────
    const beforeText = await readTooltip();
    // Fórmula por extenso, nota de rentabilidade bruta e bloco de fonte.
    expect(beforeText).toMatch(/aluguel anual/i);
    expect(beforeText).toMatch(/rentabilidade bruta/i);
    expect(beforeText).toMatch(/Fonte:\s*.+/i);
    const beforeFonte = beforeText.match(/Fonte:\s*([^·]+)/i)?.[1].trim();
    const beforeRef = beforeText.match(/ref\.\s*([^\s·]+)/i)?.[1];
    expect(beforeFonte).toBeTruthy();

    // ── Cenário 2: clicar em "Atualizar análise" ──────────────────────
    const refreshBtn = sheet.getByRole("button", { name: /atualizar análise/i });
    if ((await refreshBtn.count()) === 0) {
      await sheet.getByRole("button", { name: /gerar análise do bairro/i }).click();
      await expect(sheet.getByRole("button", { name: /atualizar análise/i })).toBeVisible({
        timeout: 15_000,
      });
    }
    await sheet.getByRole("button", { name: /atualizar análise/i }).click();

    await expect
      .poll(() => refreshCalls, { timeout: 15_000 })
      .toBeGreaterThan(0);
    await expect(sheet.getByText(/atualizada agora/i)).toBeVisible({ timeout: 15_000 });

    // Tooltip deve continuar íntegro: mesma fonte, mesma data de referência.
    const afterText = await readTooltip();
    expect(afterText).toMatch(/aluguel anual/i);
    expect(afterText).toMatch(/rentabilidade bruta/i);
    const afterFonte = afterText.match(/Fonte:\s*([^·]+)/i)?.[1].trim();
    const afterRef = afterText.match(/ref\.\s*([^\s·]+)/i)?.[1];
    expect(afterFonte).toBe(beforeFonte);
    expect(afterRef).toBe(beforeRef);
    expect(afterText).not.toMatch(/Fonte:\s*—/);
  });
});
