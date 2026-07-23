import { test, expect } from "../playwright-fixture";

// Verifica o controle de acesso por perfil na área administrativa para o
// usuário 'incorporadora':
//   - Pode acessar /admin (gestão de unidades) e /admin/extrato.
//   - Ao tentar /admin/upload é redirecionado para /admin (guard bewildOnly).
//   - A aba "Campos personalizados" do UnitsManager NÃO aparece.
//
// Credenciais são lidas de env (INCORPORADORA_EMAIL / INCORPORADORA_PASS).
// Sem credenciais o teste é pulado, evitando falso-negativo em ambientes que
// não tenham o usuário demo semeado.

const EMAIL = process.env.INCORPORADORA_EMAIL ?? "incorporadora@vilapark.demo";
const PASS = process.env.INCORPORADORA_PASS ?? "";

test.describe("RBAC — perfil incorporadora", () => {
  test.skip(!PASS, "INCORPORADORA_PASS não definido; pulando teste de RBAC.");

  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel(/e-?mail/i).fill(EMAIL);
    await page.getByLabel(/senha|password/i).fill(PASS);
    await page.getByRole("button", { name: /entrar|sign in/i }).click();
    // Após login o Login.tsx redireciona para /admin.
    await page.waitForURL(/\/admin(\/|$)/, { timeout: 15_000 });
  });

  test("acessa /admin sem a aba Campos personalizados", async ({ page }) => {
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/admin$/);
    await expect(page.getByRole("tab", { name: /unidades/i }).first()).toBeVisible();
    await expect(
      page.getByRole("tab", { name: /campos personalizados/i }),
    ).toHaveCount(0);
    // Badge de perfil visível.
    await expect(page.getByText(/incorporadora/i).first()).toBeVisible();
  });

  test("acessa /admin/extrato", async ({ page }) => {
    await page.goto("/admin/extrato");
    await expect(page).toHaveURL(/\/admin\/extrato$/);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });

  test("é redirecionado ao tentar /admin/upload", async ({ page }) => {
    await page.goto("/admin/upload");
    // RequireAdmin bewildOnly redireciona silenciosamente para /admin.
    await page.waitForURL(/\/admin$/, { timeout: 10_000 });
    await expect(page).toHaveURL(/\/admin$/);
    // Item de upload não deve aparecer no menu lateral.
    await expect(page.getByRole("link", { name: /upload de plantas/i })).toHaveCount(0);
  });
});
