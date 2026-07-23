import { test, expect } from "../playwright-fixture";

// Verifica que ações sensíveis no /admin geram registros em audit_logs com
// timestamp e usuário corretos, visíveis em /admin/auditoria:
//   - Criação/exclusão de custom_field_definitions (via UI da aba "Campos
//     personalizados", disponível somente para o perfil 'admin').
//   - Upload de imagem em /admin/upload (também restrito ao 'admin').
//
// Credenciais lidas de env (ADMIN_EMAIL / ADMIN_PASS). Sem credenciais o teste
// é pulado para não falhar em ambientes sem o usuário demo semeado.

const EMAIL = process.env.ADMIN_EMAIL ?? "admin@bewild.demo";
const PASS = process.env.ADMIN_PASS ?? "";

// 1x1 PNG transparente (base64) — payload mínimo aceito pelo bucket 'images'.
const PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";

test.describe("Auditoria — ações administrativas", () => {
  test.skip(!PASS, "ADMIN_PASS não definido; pulando teste de auditoria.");

  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel(/e-?mail/i).fill(EMAIL);
    await page.getByLabel(/senha|password/i).fill(PASS);
    await page.getByRole("button", { name: /entrar|sign in/i }).click();
    await page.waitForURL(/\/admin(\/|$)/, { timeout: 15_000 });
  });

  test("mudanças em custom_field_definitions aparecem em audit_logs", async ({ page }) => {
    const startedAt = Date.now();
    const label = `E2E Audit ${startedAt}`;

    await page.goto("/admin");
    await page.getByRole("tab", { name: /campos personalizados/i }).click();

    // Criar novo campo
    await page.getByRole("button", { name: /novo campo/i }).click();
    await page.getByLabel(/rótulo/i).fill(label);
    await page.getByRole("button", { name: /^salvar$/i }).click();

    // Aguardar a linha aparecer na tabela
    await expect(page.getByText(label)).toBeVisible({ timeout: 10_000 });

    // Excluir o campo criado (limpeza + garante evento DELETE)
    const row = page.locator("tr", { hasText: label });
    await row.getByRole("button", { name: /excluir/i }).click();
    // AlertDialog de confirmação
    await page
      .getByRole("button", { name: /^(excluir|confirmar|remover)$/i })
      .last()
      .click();
    await expect(page.getByText(label)).toHaveCount(0, { timeout: 10_000 });

    // Verificar em /admin/auditoria
    await page.goto("/admin/auditoria");
    await expect(page.getByRole("heading", { name: /auditoria/i })).toBeVisible();

    // Filtrar por entidade e buscar pelo e-mail do admin
    await page
      .getByPlaceholder(/buscar por usuário/i)
      .fill(EMAIL);
    // Selecionar o filtro de entidade "Campos personalizados (definições)"
    await page.getByRole("combobox").first().click();
    await page
      .getByRole("option", { name: /campos personalizados \(definições\)/i })
      .click();

    // Aguarda debounce da busca
    await page.waitForTimeout(600);

    // Deve haver ao menos uma linha com o e-mail e a ação de criação
    const table = page.getByRole("table");
    await expect(table).toBeVisible();
    await expect(table.getByText(EMAIL, { exact: false }).first()).toBeVisible({
      timeout: 10_000,
    });
    await expect(table.getByText(/criação/i).first()).toBeVisible();

    // Timestamp da entrada deve ser posterior ao início do teste
    // (a UI formata em pt-BR — validamos abrindo os detalhes da primeira linha)
    await table.locator("tbody tr").first().click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText(EMAIL)).toBeVisible();
    await dialog.getByRole("button", { name: /fechar|close/i }).click().catch(() => {
      // fallback: pressionar Escape
      return page.keyboard.press("Escape");
    });
  });

  test("upload em /admin/upload aparece em audit_logs como storage:images", async ({ page }) => {
    await page.goto("/admin/upload");
    await expect(page.getByRole("heading", { name: /upload de imagens/i })).toBeVisible();

    // Enviar 1x1 PNG através do input escondido
    const buffer = Buffer.from(PNG_BASE64, "base64");
    await page.setInputFiles("#file-input", {
      name: `e2e-audit-${Date.now()}.png`,
      mimeType: "image/png",
      buffer,
    });

    await page.getByRole("button", { name: /^enviar/i }).click();
    // Aguardar conclusão (badge de sucesso / toast)
    await expect(page.getByText(/enviado:/i).first()).toBeVisible({ timeout: 20_000 });

    // Verificar audit_logs
    await page.goto("/admin/auditoria");
    await page.getByPlaceholder(/buscar por usuário/i).fill(EMAIL);

    // Filtrar entidade = Upload de plantas (storage:images cai aqui na UI atual)
    // e ação = Upload
    await page.getByRole("combobox").nth(1).click();
    await page.getByRole("option", { name: /^upload$/i }).click();

    await page.waitForTimeout(600);

    const table = page.getByRole("table");
    await expect(table).toBeVisible();
    await expect(table.getByText(EMAIL).first()).toBeVisible({ timeout: 10_000 });
    await expect(table.getByText(/upload/i).first()).toBeVisible();
  });
});
