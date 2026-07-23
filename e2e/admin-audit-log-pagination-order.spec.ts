import { test, expect } from "../playwright-fixture";

// Verifica que /admin/auditoria ordena por timestamp (created_at) de forma
// consistente e mantém a ordem correta ao navegar entre páginas.
//
// Estratégia:
//   1. Login como admin, ir para /admin/auditoria.
//   2. Definir pageSize baixo (25) para garantir múltiplas páginas.
//   3. Garantir sort desc por Data/hora (default).
//   4. Coletar timestamps da página 1, avançar para página 2, coletar de novo.
//   5. Validar: monotonicidade decrescente dentro de cada página, e o primeiro
//      timestamp da página 2 <= último timestamp da página 1.
//   6. Inverter para asc e refazer as verificações espelhadas.
//
// Se não houver registros suficientes para 2 páginas, o teste é pulado.

const EMAIL = process.env.ADMIN_EMAIL ?? "admin@bewild.demo";
const PASS = process.env.ADMIN_PASS ?? "";

// "23/07/2026 14:35:07" -> Date
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

function isMonotonic(arr: number[], dir: "asc" | "desc"): boolean {
  for (let i = 1; i < arr.length; i++) {
    if (dir === "desc" && arr[i] > arr[i - 1]) return false;
    if (dir === "asc" && arr[i] < arr[i - 1]) return false;
  }
  return true;
}

test.describe("Auditoria — ordenação por timestamp entre páginas", () => {
  test.skip(!PASS, "ADMIN_PASS não definido; pulando teste de ordenação.");

  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel(/e-?mail/i).fill(EMAIL);
    await page.getByLabel(/senha|password/i).fill(PASS);
    await page.getByRole("button", { name: /entrar|sign in/i }).click();
    await page.waitForURL(/\/admin(\/|$)/, { timeout: 15_000 });
  });

  test("mantém ordem por Data/hora ao paginar (desc e asc)", async ({ page }) => {
    await page.goto("/admin/auditoria");
    await expect(page.getByRole("heading", { name: /auditoria/i })).toBeVisible();

    // Garante pageSize = 25 (default), mas explicitamos para robustez
    await page.getByLabel(/registros por página/i).click();
    await page.getByRole("option", { name: /^25 \/ página$/i }).click();
    await page.waitForTimeout(400);

    // Precisamos de pelo menos 2 páginas para o teste fazer sentido
    const totalText = await page
      .locator("text=/Mostrando\\s+\\d+–\\d+\\s+de\\s+\\d+/i")
      .first()
      .textContent()
      .catch(() => null);
    const total = totalText ? Number(totalText.match(/de\s+(\d+)/i)?.[1] ?? "0") : 0;
    test.skip(total <= 25, `Somente ${total} registro(s); precisamos de >25 para paginação.`);

    // --- DESC (default) ---
    // O header "Data/hora" deve estar como sort ativo desc; se estiver asc, clicar para inverter.
    const header = page.getByRole("button", { name: /data\/hora/i });
    // Estado inicial esperado: desc. Validamos a monotonia; se falhar, forçamos desc.
    let page1 = await collectTimestamps(page);
    if (!isMonotonic(page1, "desc")) {
      await header.click();
      await page.waitForTimeout(400);
      page1 = await collectTimestamps(page);
    }
    expect(page1.length).toBeGreaterThan(1);
    expect(isMonotonic(page1, "desc")).toBe(true);

    await page.getByRole("button", { name: /próxima/i }).click();
    await page.waitForTimeout(500);
    const page2 = await collectTimestamps(page);
    expect(page2.length).toBeGreaterThan(0);
    expect(isMonotonic(page2, "desc")).toBe(true);
    // Continuidade entre páginas: topo da página 2 <= fim da página 1
    expect(page2[0]).toBeLessThanOrEqual(page1[page1.length - 1]);

    // Voltar para página 1 e confirmar que os timestamps são os mesmos coletados antes
    await page.getByRole("button", { name: /anterior/i }).click();
    await page.waitForTimeout(500);
    const page1Again = await collectTimestamps(page);
    expect(page1Again).toEqual(page1);

    // --- ASC ---
    await header.click(); // toggle para asc
    await page.waitForTimeout(500);
    const asc1 = await collectTimestamps(page);
    expect(asc1.length).toBeGreaterThan(1);
    expect(isMonotonic(asc1, "asc")).toBe(true);

    await page.getByRole("button", { name: /próxima/i }).click();
    await page.waitForTimeout(500);
    const asc2 = await collectTimestamps(page);
    expect(asc2.length).toBeGreaterThan(0);
    expect(isMonotonic(asc2, "asc")).toBe(true);
    // Continuidade: topo da página 2 >= fim da página 1
    expect(asc2[0]).toBeGreaterThanOrEqual(asc1[asc1.length - 1]);
  });
});
