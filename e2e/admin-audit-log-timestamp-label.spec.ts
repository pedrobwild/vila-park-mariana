import { test, expect } from "../playwright-fixture";

// Verifica que o rótulo de tempo exibido na coluna Data/hora de /admin/auditoria:
//  (a) é uma string pt-BR parseável para uma Date válida (não NaN, não no futuro,
//      dentro de uma janela razoável — últimos 10 anos);
//  (b) corresponde exatamente ao valor exibido no diálogo de detalhes da mesma
//      linha (ambos derivados do mesmo `created_at`);
//  (c) permanece consistente ao navegar entre páginas: ao ir para a página 2 e
//      voltar para a página 1, os rótulos da página 1 são idênticos aos coletados
//      inicialmente (mesma ordem, mesmos valores).

const EMAIL = process.env.ADMIN_EMAIL ?? "admin@bewild.demo";
const PASS = process.env.ADMIN_PASS ?? "";

function parsePtBr(s: string): number {
  const m = s.trim().match(
    /^(\d{2})\/(\d{2})\/(\d{4})[ ,]+(\d{2}):(\d{2}):(\d{2})$/
  );
  if (!m) return NaN;
  const [, d, mo, y, h, mi, se] = m;
  return new Date(
    Number(y), Number(mo) - 1, Number(d),
    Number(h), Number(mi), Number(se)
  ).getTime();
}

async function collectTimestamps(page: import("@playwright/test").Page): Promise<string[]> {
  return await page
    .getByRole("table")
    .locator("tbody tr td:first-child")
    .allInnerTexts();
}

test.describe("Auditoria — consistência dos rótulos de tempo", () => {
  test.skip(!PASS, "ADMIN_PASS não definido; pulando teste de rótulos de tempo.");

  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel(/e-?mail/i).fill(EMAIL);
    await page.getByLabel(/senha|password/i).fill(PASS);
    await page.getByRole("button", { name: /entrar|sign in/i }).click();
    await page.waitForURL(/\/admin(\/|$)/, { timeout: 15_000 });
  });

  test("rótulo de tempo é válido, casa com o diálogo e é estável entre páginas", async ({
    page,
  }) => {
    await page.goto("/admin/auditoria");
    await expect(page.getByRole("heading", { name: /auditoria/i })).toBeVisible();

    await page.getByLabel(/registros por página/i).click();
    await page.getByRole("option", { name: /^25 \/ página$/i }).click();
    await page.waitForTimeout(300);

    const labelsP1 = (await collectTimestamps(page)).map((s) => s.trim());
    expect(labelsP1.length).toBeGreaterThan(0);

    // (a) todos os rótulos parseáveis, não NaN, não no futuro (com folga de 5s)
    //     e dentro dos últimos 10 anos
    const now = Date.now();
    const tenYearsAgo = now - 10 * 365 * 24 * 60 * 60 * 1000;
    for (const s of labelsP1) {
      const t = parsePtBr(s);
      expect(Number.isNaN(t), `rótulo não parseável: "${s}"`).toBe(false);
      expect(t).toBeLessThanOrEqual(now + 5_000);
      expect(t).toBeGreaterThan(tenYearsAgo);
    }

    // (b) diálogo de detalhes mostra a MESMA string do rótulo da linha
    const firstRow = page.getByRole("table").locator("tbody tr").first();
    const firstCellLabel = (await firstRow.locator("td:first-child").innerText()).trim();
    await firstRow.getByRole("button", { name: /^ver$/i }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByRole("heading", { name: /detalhes do registro/i })).toBeVisible();
    const dialogDate = (await dialog.locator("text=/Data:/").first().innerText())
      .replace(/^Data:\s*/i, "")
      .trim();
    expect(dialogDate).toBe(firstCellLabel);
    // fecha diálogo
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();

    // (c) estabilidade entre páginas: só faz sentido se houver >25 registros
    const totalText = await page
      .locator("text=/Mostrando\\s+\\d+[–-]\\d+\\s+de\\s+\\d+/i")
      .first()
      .textContent()
      .catch(() => null);
    const total = totalText ? Number(totalText.match(/de\s+(\d+)/i)?.[1] ?? "0") : 0;

    if (total > 25) {
      await page.getByRole("button", { name: /próxima/i }).click();
      await page.waitForTimeout(500);
      const labelsP2 = (await collectTimestamps(page)).map((s) => s.trim());
      expect(labelsP2.length).toBeGreaterThan(0);
      // rótulos da página 2 também devem ser válidos
      for (const s of labelsP2) {
        expect(Number.isNaN(parsePtBr(s)), `rótulo P2 não parseável: "${s}"`).toBe(false);
      }
      // não pode haver colisão entre listas de páginas distintas
      const setP1 = new Set(labelsP1);
      const overlap = labelsP2.filter((s) => setP1.has(s));
      // colisões só seriam aceitáveis se dois eventos ocorressem no mesmo segundo;
      // aceitamos até 1 colisão para não flakear em cenários densos.
      expect(overlap.length).toBeLessThanOrEqual(1);

      // volta para página 1 e confirma que os rótulos são IDÊNTICOS
      await page.getByRole("button", { name: /anterior/i }).click();
      await page.waitForTimeout(500);
      const labelsP1Again = (await collectTimestamps(page)).map((s) => s.trim());
      expect(labelsP1Again).toEqual(labelsP1);
    }
  });
});
