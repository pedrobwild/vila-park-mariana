import { test, expect, Page } from "../playwright-fixture";

// Valida que o modal "Detalhes do registro" em /admin/auditoria contém o payload
// esperado (metadata.new para inserts, metadata.old + metadata.new para updates,
// metadata.old para deletes) tanto para custom_field_definitions quanto para
// custom_field_values.

const EMAIL = process.env.ADMIN_EMAIL ?? "admin@bewild.demo";
const PASS = process.env.ADMIN_PASS ?? "";

async function openFirstDetail(page: Page): Promise<Record<string, unknown>> {
  // Clica no primeiro "Ver" da tabela e retorna o JSON do <pre> parseado.
  await page.getByRole("button", { name: /^ver$/i }).first().click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  const raw = await dialog.locator("pre").innerText();
  const parsed = JSON.parse(raw) as Record<string, unknown>;
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  return parsed;
}

async function filterAudit(
  page: Page,
  opts: { entity: RegExp; action?: RegExp; search?: string },
) {
  await page.goto("/admin/auditoria");
  await expect(page.getByRole("heading", { name: /log de auditoria|auditoria/i })).toBeVisible();
  if (opts.search) {
    await page.getByPlaceholder(/buscar/i).fill(opts.search);
  }
  await page.getByRole("combobox").first().click();
  await page.getByRole("option", { name: opts.entity }).click();
  if (opts.action) {
    await page.getByRole("combobox").nth(1).click();
    await page.getByRole("option", { name: opts.action }).click();
  }
  // Aguarda debounce e reload.
  await page.waitForTimeout(700);
}

test.describe("Auditoria — payload JSON dos detalhes", () => {
  test.skip(!PASS, "ADMIN_PASS não definido; pulando teste de payload de auditoria.");

  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel(/e-?mail/i).fill(EMAIL);
    await page.getByLabel(/senha|password/i).fill(PASS);
    await page.getByRole("button", { name: /entrar|sign in/i }).click();
    await page.waitForURL(/\/admin(\/|$)/, { timeout: 15_000 });
  });

  test("custom_field_definitions: new (insert), old+new (update), old (delete)", async ({ page }) => {
    const stamp = Date.now();
    const labelA = `E2E JSON ${stamp}`;
    const labelB = `E2E JSON ${stamp} (upd)`;

    // --- Criar campo ---
    await page.goto("/admin");
    await page.getByRole("tab", { name: /campos personalizados/i }).click();
    await page.getByRole("button", { name: /novo campo/i }).click();
    await page.getByLabel(/rótulo/i).fill(labelA);
    await page.getByRole("button", { name: /^salvar$/i }).click();
    await expect(page.getByText(labelA)).toBeVisible({ timeout: 10_000 });

    // --- Editar campo (gera update) ---
    const row = page.locator("tr", { hasText: labelA });
    await row.getByRole("button", { name: /editar/i }).click();
    const labelInput = page.getByLabel(/rótulo/i);
    await labelInput.fill(labelB);
    await page.getByRole("button", { name: /^salvar$/i }).click();
    await expect(page.getByText(labelB)).toBeVisible({ timeout: 10_000 });

    // --- Excluir campo (gera delete) ---
    const row2 = page.locator("tr", { hasText: labelB });
    await row2.getByRole("button", { name: /excluir/i }).click();
    await page
      .getByRole("button", { name: /^(excluir|confirmar|remover)$/i })
      .last()
      .click();
    await expect(page.getByText(labelB)).toHaveCount(0, { timeout: 10_000 });

    // --- Verificar payload do INSERT ---
    await filterAudit(page, {
      entity: /campos personalizados \(definições\)/i,
      action: /criação/i,
      search: labelA,
    });
    let meta = await openFirstDetail(page);
    expect(meta).toHaveProperty("new");
    expect((meta.new as Record<string, unknown>).label).toBe(labelA);
    expect(meta).not.toHaveProperty("old");

    // --- Verificar payload do UPDATE ---
    await filterAudit(page, {
      entity: /campos personalizados \(definições\)/i,
      action: /alteração/i,
      search: labelB,
    });
    meta = await openFirstDetail(page);
    expect(meta).toHaveProperty("old");
    expect(meta).toHaveProperty("new");
    expect((meta.old as Record<string, unknown>).label).toBe(labelA);
    expect((meta.new as Record<string, unknown>).label).toBe(labelB);

    // --- Verificar payload do DELETE ---
    await filterAudit(page, {
      entity: /campos personalizados \(definições\)/i,
      action: /exclusão/i,
      search: labelB,
    });
    meta = await openFirstDetail(page);
    expect(meta).toHaveProperty("old");
    expect((meta.old as Record<string, unknown>).label).toBe(labelB);
    expect(meta).not.toHaveProperty("new");
  });

  test("custom_field_values: new (insert) e old+new (update) ao editar unidade", async ({ page }) => {
    const stamp = Date.now();
    const fieldLabel = `E2E Val ${stamp}`;
    const valueA = `valor-a-${stamp}`;
    const valueB = `valor-b-${stamp}`;

    // 1. Criar um campo personalizado do tipo texto
    await page.goto("/admin");
    await page.getByRole("tab", { name: /campos personalizados/i }).click();
    await page.getByRole("button", { name: /novo campo/i }).click();
    await page.getByLabel(/rótulo/i).fill(fieldLabel);
    await page.getByRole("button", { name: /^salvar$/i }).click();
    await expect(page.getByText(fieldLabel)).toBeVisible({ timeout: 10_000 });

    // 2. Editar a primeira unidade preenchendo o campo (gera INSERT em custom_field_values)
    await page.getByRole("tab", { name: /unidades/i }).click();
    await page
      .locator("tbody tr")
      .first()
      .getByRole("button", { name: /editar/i })
      .click();
    // O DynamicFieldInput usa o label como rótulo do input
    await page.getByLabel(fieldLabel).fill(valueA);
    await page.getByRole("button", { name: /^salvar$/i }).click();
    await page.waitForTimeout(800);

    // 3. Editar novamente alterando o valor (gera UPDATE em custom_field_values)
    await page
      .locator("tbody tr")
      .first()
      .getByRole("button", { name: /editar/i })
      .click();
    const fieldInput = page.getByLabel(fieldLabel);
    await fieldInput.fill(valueB);
    await page.getByRole("button", { name: /^salvar$/i }).click();
    await page.waitForTimeout(800);

    // --- Verificar payload do INSERT em custom_field_values ---
    await filterAudit(page, {
      entity: /campos personalizados \(valores\)/i,
      action: /criação/i,
      search: valueA,
    });
    let meta = await openFirstDetail(page);
    expect(meta).toHaveProperty("new");
    expect(JSON.stringify(meta.new)).toContain(valueA);
    expect(meta).not.toHaveProperty("old");

    // --- Verificar payload do UPDATE em custom_field_values ---
    await filterAudit(page, {
      entity: /campos personalizados \(valores\)/i,
      action: /alteração/i,
      search: valueB,
    });
    meta = await openFirstDetail(page);
    expect(meta).toHaveProperty("old");
    expect(meta).toHaveProperty("new");
    expect(JSON.stringify(meta.old)).toContain(valueA);
    expect(JSON.stringify(meta.new)).toContain(valueB);

    // Limpeza: remove o campo personalizado criado (também limpa os valores por cascade)
    await page.goto("/admin");
    await page.getByRole("tab", { name: /campos personalizados/i }).click();
    const row = page.locator("tr", { hasText: fieldLabel });
    await row.getByRole("button", { name: /excluir/i }).click();
    await page
      .getByRole("button", { name: /^(excluir|confirmar|remover)$/i })
      .last()
      .click();
    await expect(page.getByText(fieldLabel)).toHaveCount(0, { timeout: 10_000 });
  });
});
