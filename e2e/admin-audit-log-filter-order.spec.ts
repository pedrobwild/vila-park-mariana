import { test, expect } from "../playwright-fixture";

// Verifica que /admin/auditoria mantém a ordenação por timestamp e a
// continuidade entre páginas mesmo com filtros de entidade e/ou ação aplicados.
//
// Estratégia:
//   1. Login como admin, ir para /admin/auditoria.
//   2. Aplicar filtro por entidade "custom_field_values".
//   3. Validar monotonicidade desc dentro das páginas e continuidade página 1→2.
//   4. Aplicar filtro combinado (entidade + ação "update") e revalidar.
//   5. Alternar sort para asc e validar continuidade espelhada.
//
// Se após o filtro não houver >pageSize registros, o teste é pulado.

const EMAIL = process.env.ADMIN_EMAIL ?? "admin@bewild.demo";
const PASS = process.env.ADMIN_PASS ?? "";

function parsePtBr(s: string): number {
  const m = s.trim().match(
    /^(\d{2})\/(\d{2})\/(\d{4})[ ,]+(\d{2}):(\d{2}):(\d{2})$/
  );
  if (!m) return NaN;
  const [, d, mo, y, h, mi, se] = m;
  return new Date(
    Number(y),
    Number(mo) - 1,
    Number(d),
    Number(h),
    Number(mi),
    Number(se)
  ).getTime();
}

async function collectTimestamps(page: import("@playwright/test").Page): Promise<number[]> {
  const cells = await page
    .getByRole("table")
    .locator("tbody tr td:first-child")
    .allInnerTexts();
  return cells.map((c) => parsePtBr(c)).filter((n) => !Number.isNaN(n));
}

async function collectEntities(page: import("@playwright/test").Page): Promise<string[]> {
  // Entidade é a 3ª coluna da tabela (Data/hora, Usuário, Entidade, Ação, Ações)
  return await page
    .getByRole("table")
    .locator("tbody tr td:nth-child(3)")
    .allInnerTexts();
}

async function collectActions(page: import("@playwright/test").Page): Promise<string[]> {
  return await page
    .getByRole("table")
    .locator("tbody tr td:nth-child(4)")
    .allInnerTexts();
}

function isMonotonic(arr: number[], dir: "asc" | "desc"): boolean {
  for (let i = 1; i < arr.length; i++) {
    if (dir === "desc" && arr[i] > arr[i - 1]) return false;
    if (dir === "asc" && arr[i] < arr[i - 1]) return false;
  }
  return true;
}

async function readTotal(page: import("@playwright/test").Page): Promise<number> {
  const t = await page
    .locator("text=/Mostrando\\s+\\d+–\\d+\\s+de\\s+\\d+/i")
    .first()
    .textContent()
    .catch(() => null);
  return t ? Number(t.match(/de\s+(\d+)/i)?.[1] ?? "0") : 0;
}

test.describe("Auditoria — filtros preservam ordenação e paginação", () => {
  test.skip(!PASS, "ADMIN_PASS não definido; pulando teste de filtro/ordenação.");

  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel(/e-?mail/i).fill(EMAIL);
    await page.getByLabel(/senha|password/i).fill(PASS);
    await page.getByRole("button", { name: /entrar|sign in/i }).click();
    await page.waitForURL(/\/admin(\/|$)/, { timeout: 15_000 });
  });

  test("aplica filtros de entidade e ação e mantém sort + continuidade entre páginas", async ({
    page,
  }) => {
    await page.goto("/admin/auditoria");
    await expect(page.getByRole("heading", { name: /auditoria/i })).toBeVisible();

    // pageSize baixo para forçar paginação
    await page.getByLabel(/registros por página/i).click();
    await page.getByRole("option", { name: /^25 \/ página$/i }).click();
    await page.waitForTimeout(300);

    // --- Filtro 1: entidade custom_field_values ---
    await page.getByLabel(/filtrar por entidade/i).click();
    await page
      .getByRole("option", { name: /campos personalizados \(valores\)/i })
      .click();
    await page.waitForTimeout(500);

    // URL deve refletir o filtro e resetar a page
    await expect(page).toHaveURL(/entity=custom_field_values/);
    await expect(page).not.toHaveURL(/[?&]page=/);

    const totalEntity = await readTotal(page);
    test.skip(
      totalEntity <= 25,
      `Somente ${totalEntity} registro(s) para entidade; precisamos de >25.`
    );

    // Todas as linhas devem pertencer à entidade filtrada
    const entPage1 = await collectEntities(page);
    expect(entPage1.length).toBeGreaterThan(0);
    for (const e of entPage1) {
      expect(e.toLowerCase()).toContain("custom_field_values");
    }

    // Sort desc por timestamp (default) dentro da página 1
    let ts1 = await collectTimestamps(page);
    // Se por algum motivo não estiver desc, força o toggle
    const header = page.getByRole("button", { name: /data\/hora/i });
    if (!isMonotonic(ts1, "desc")) {
      await header.click();
      await page.waitForTimeout(400);
      ts1 = await collectTimestamps(page);
    }
    expect(ts1.length).toBeGreaterThan(1);
    expect(isMonotonic(ts1, "desc")).toBe(true);

    // Avança para página 2 e valida continuidade + filtro persistido
    await page.getByRole("button", { name: /próxima/i }).click();
    await page.waitForTimeout(500);
    await expect(page).toHaveURL(/entity=custom_field_values/);
    await expect(page).toHaveURL(/[?&]page=2\b/);

    const entPage2 = await collectEntities(page);
    for (const e of entPage2) {
      expect(e.toLowerCase()).toContain("custom_field_values");
    }
    const ts2 = await collectTimestamps(page);
    expect(ts2.length).toBeGreaterThan(0);
    expect(isMonotonic(ts2, "desc")).toBe(true);
    expect(ts2[0]).toBeLessThanOrEqual(ts1[ts1.length - 1]);

    // Volta para página 1 e confirma estabilidade
    await page.getByRole("button", { name: /anterior/i }).click();
    await page.waitForTimeout(500);
    expect(await collectTimestamps(page)).toEqual(ts1);

    // --- Filtro 2: combina com ação "update" ---
    await page.getByLabel(/filtrar por ação/i).click();
    await page.getByRole("option", { name: /^alteração$/i }).click();
    await page.waitForTimeout(500);

    await expect(page).toHaveURL(/entity=custom_field_values/);
    await expect(page).toHaveURL(/action=update/);
    await expect(page).not.toHaveURL(/[?&]page=[2-9]/);

    const totalCombo = await readTotal(page);
    if (totalCombo > 1) {
      const actions1 = await collectActions(page);
      for (const a of actions1) {
        expect(a.toLowerCase()).toContain("alteração");
      }
      const comboTs1 = await collectTimestamps(page);
      expect(isMonotonic(comboTs1, "desc")).toBe(true);

      if (totalCombo > 25) {
        await page.getByRole("button", { name: /próxima/i }).click();
        await page.waitForTimeout(500);
        const comboTs2 = await collectTimestamps(page);
        expect(isMonotonic(comboTs2, "desc")).toBe(true);
        expect(comboTs2[0]).toBeLessThanOrEqual(comboTs1[comboTs1.length - 1]);
        await page.getByRole("button", { name: /anterior/i }).click();
        await page.waitForTimeout(400);
      }

      // --- Inverte para ASC e revalida com filtros mantidos ---
      await header.click();
      await page.waitForTimeout(500);
      await expect(page).toHaveURL(/dir=asc/);
      await expect(page).toHaveURL(/entity=custom_field_values/);
      await expect(page).toHaveURL(/action=update/);

      const asc1 = await collectTimestamps(page);
      expect(isMonotonic(asc1, "asc")).toBe(true);

      if (totalCombo > 25) {
        await page.getByRole("button", { name: /próxima/i }).click();
        await page.waitForTimeout(500);
        const asc2 = await collectTimestamps(page);
        expect(isMonotonic(asc2, "asc")).toBe(true);
        expect(asc2[0]).toBeGreaterThanOrEqual(asc1[asc1.length - 1]);
      }
    }
  });
});
