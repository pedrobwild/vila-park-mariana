import { test, expect } from "../playwright-fixture";

// Verifica o comportamento de estado vazio em /admin/auditoria quando um filtro
// não retorna resultados, e confirma que a paginação é reiniciada/ajustada ao
// remover o filtro e voltar a ter resultados.
//
// Estratégia:
//   1. Login como admin e ir para /admin/auditoria.
//   2. pageSize=25; se houver >25 registros, navegar para página 2 para partir
//      de um estado paginado.
//   3. Aplicar busca por texto improvável (garante zero resultados).
//   4. Validar: "Nenhum registro encontrado." na tabela, rodapé "Nenhum registro",
//      Página "1 de 1", botões Anterior/Próxima desabilitados, e URL sem `page=`.
//   5. Limpar a busca e confirmar que os resultados voltam na página 1
//      (URL sem `page=`, rodapé mostrando "Mostrando 1–N de M").

const EMAIL = process.env.ADMIN_EMAIL ?? "admin@bewild.demo";
const PASS = process.env.ADMIN_PASS ?? "";

const NO_MATCH_QUERY = `zzz-no-match-${Date.now()}-xyz`;

test.describe("Auditoria — estado vazio e reset de paginação", () => {
  test.skip(!PASS, "ADMIN_PASS não definido; pulando teste de estado vazio.");

  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel(/e-?mail/i).fill(EMAIL);
    await page.getByLabel(/senha|password/i).fill(PASS);
    await page.getByRole("button", { name: /entrar|sign in/i }).click();
    await page.waitForURL(/\/admin(\/|$)/, { timeout: 15_000 });
  });

  test("filtro sem resultados exibe estado vazio; ao limpar, paginação reinicia", async ({
    page,
  }) => {
    await page.goto("/admin/auditoria");
    await expect(page.getByRole("heading", { name: /auditoria/i })).toBeVisible();

    await page.getByLabel(/registros por página/i).click();
    await page.getByRole("option", { name: /^25 \/ página$/i }).click();
    await page.waitForTimeout(300);

    // Se possível, navega para página 2 para provar que o filtro reseta a paginação.
    const nextBtn = page.getByRole("button", { name: /próxima/i });
    if (await nextBtn.isEnabled()) {
      await nextBtn.click();
      await page.waitForTimeout(400);
      await expect(page).toHaveURL(/[?&]page=2\b/);
    }

    // Aplica busca que garantidamente não retorna nada
    const searchBox = page.getByLabel(/^buscar$/i);
    await searchBox.fill(NO_MATCH_QUERY);

    // Aguarda debounce (300ms) + roundtrip
    await expect(page).toHaveURL(new RegExp(`q=${NO_MATCH_QUERY}`), { timeout: 5_000 });
    // Filtro deve resetar page
    await expect(page).not.toHaveURL(/[?&]page=\d+/);

    // Estado vazio na tabela
    const table = page.getByRole("table");
    await expect(table.getByText(/nenhum registro encontrado\./i)).toBeVisible();
    // Nenhuma linha de dados
    await expect(table.locator("tbody tr")).toHaveCount(1); // só a linha do empty state

    // Rodapé com "Nenhum registro" e paginação zerada
    await expect(page.getByText(/^nenhum registro$/i)).toBeVisible();
    await expect(page.getByText(/página\s+1\s+de\s+1/i)).toBeVisible();

    // Botões de navegação desabilitados
    await expect(page.getByRole("button", { name: /anterior/i })).toBeDisabled();
    await expect(page.getByRole("button", { name: /próxima/i })).toBeDisabled();

    // Limpa a busca — resultados voltam, ainda na página 1
    await searchBox.fill("");
    await expect(page).not.toHaveURL(/[?&]q=/, { timeout: 5_000 });
    await expect(page).not.toHaveURL(/[?&]page=\d+/);

    // Tabela deve mostrar registros novamente (>=1 linha de dados)
    await expect(table.getByText(/nenhum registro encontrado\./i)).toBeHidden();
    const dataRows = await table.locator("tbody tr").count();
    expect(dataRows).toBeGreaterThan(0);

    // Rodapé volta ao padrão "Mostrando X–Y de Z"
    await expect(
      page.locator("text=/Mostrando\\s+1[–-]\\d+\\s+de\\s+\\d+/i").first()
    ).toBeVisible();
    await expect(page.getByText(/página\s+1\s+de\s+\d+/i)).toBeVisible();
  });
});
