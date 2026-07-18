import { test, expect } from "../playwright-fixture";

const SIM_KEY = "vp_investor_simulator_v1";
const QUIZ_KEY = "vp_investor_quiz_v1";

test.describe("InvestorSimulator — persistência", () => {
  test("após reload, tipologia do simulatorStorage prevalece sobre a recomendação do quiz", async ({ page }) => {
    // 1) Abre a origem para poder escrever no localStorage do host correto.
    await page.goto("/");

    // 2) Semeia estado: simulador com 'terrace' + inputs; quiz recomendando 'studio'.
    await page.evaluate(
      ([simKey, quizKey]) => {
        localStorage.setItem(
          simKey,
          JSON.stringify({
            typoId: "terrace",
            mode: "tradicional",
            capexLevelId: "premium",
            price: "850000",
            rent: "4000",
            daily: "",
            occupancy: 70,
            condoIptu: "1300",
          }),
        );
        localStorage.setItem(
          quizKey,
          JSON.stringify({
            step: 4,
            answers: { risk: "low", horizon: "long", objective: "renda", ticket: "baixo" },
            resultTypoId: "studio",
          }),
        );
      },
      [SIM_KEY, QUIZ_KEY],
    );

    // 3) Recarrega direto na âncora do simulador.
    await page.goto("/guia-investidor#simulador");
    const sim = page.locator("#simulador");
    await expect(sim).toBeVisible();

    // 4) Deixa mount effects + persistência com debounce (250ms) assentarem.
    await page.waitForTimeout(600);

    // 5) A tipologia selecionada dentro do simulador deve ser 'terrace'
    //    (identificada pela classe 'border-accent') e NÃO 'studio' do quiz.
    const selectedInSim = sim.locator("button.border-accent", {
      has: page.locator("p.text-sm.font-semibold"),
    });
    await expect(selectedInSim).toHaveCount(1);
    await expect(selectedInSim).toContainText(/terraço|terrace/i);
    await expect(selectedInSim).not.toContainText(/studio/i);

    // 6) Inputs persistidos permanecem preenchidos.
    await expect(page.locator("#price")).toHaveValue("850.000");
    await expect(page.locator("#rent")).toHaveValue("4.000");
    await expect(page.locator("#condo")).toHaveValue("1.300");

    // 7) O simulatorStorage não foi sobrescrito para 'studio' pelo quiz.
    const stored = await page.evaluate((k) => localStorage.getItem(k), SIM_KEY);
    expect(stored).toBeTruthy();
    const parsed = JSON.parse(stored as string);
    expect(parsed.typoId).toBe("terrace");
  });
});
