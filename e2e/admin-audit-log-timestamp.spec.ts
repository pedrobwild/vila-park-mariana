import { test, expect, Page } from "../playwright-fixture";

// Valida que os registros de audit_logs gerados pelas ações administrativas
// possuem timestamp válido e RECENTE (dentro da janela de execução do teste).
//
// Cobre:
//   - Criação de custom_field_definitions via aba "Campos personalizados".
//   - Upload de imagem em /admin/upload.
//
// A UI renderiza a coluna "Data/hora" em pt-BR como "DD/MM/AAAA HH:MM:SS"
// (ver formatDate em src/pages/AdminAuditLog.tsx). Este teste faz o parse
// dessa string e compara com o Date.now() capturado ANTES da ação.

const EMAIL = process.env.ADMIN_EMAIL ?? "admin@bewild.demo";
const PASS = process.env.ADMIN_PASS ?? "";

const PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";

// Janela de tolerância: a linha deve estar entre (startedAt - SKEW) e (now + SKEW).
// SKEW cobre pequenas diferenças de relógio entre cliente e servidor.
const SKEW_MS = 5_000;
// Máximo de "idade" aceitável para considerar o registro recente.
const MAX_AGE_MS = 3 * 60_000;

/** Converte "DD/MM/AAAA HH:MM:SS" (pt-BR) para epoch ms no timezone local. */
function parsePtBrDateTime(input: string): number {
  const m = input
    .trim()
    .match(/^(\d{2})\/(\d{2})\/(\d{4})[,\s]+(\d{2}):(\d{2}):(\d{2})$/);
  if (!m) throw new Error(`Timestamp fora do formato esperado: "${input}"`);
  const [, dd, mm, yyyy, hh, mi, ss] = m;
  return new Date(
    Number(yyyy),
    Number(mm) - 1,
    Number(dd),
    Number(hh),
    Number(mi),
    Number(ss),
  ).getTime();
}

async function login(page: Page) {
  await page.goto("/login");
  await page.getByLabel(/e-?mail/i).fill(EMAIL);
  await page.getByLabel(/senha|password/i).fill(PASS);
  await page.getByRole("button", { name: /entrar|sign in/i }).click();
  await page.waitForURL(/\/admin(\/|$)/, { timeout: 15_000 });
}

async function firstRowTimestamp(page: Page): Promise<number> {
  const table = page.getByRole("table");
  await expect(table).toBeVisible();
  await expect(table.getByText(EMAIL).first()).toBeVisible({ timeout: 10_000 });
  const cell = table.locator("tbody tr").first().locator("td").first();
  const text = (await cell.innerText()).trim();
  return parsePtBrDateTime(text);
}

function assertRecent(ts: number, startedAt: number, label: string) {
  const now = Date.now();
  expect(
    ts,
    `${label}: timestamp ${new Date(ts).toISOString()} deve ser >= startedAt-SKEW (${new Date(startedAt - SKEW_MS).toISOString()})`,
  ).toBeGreaterThanOrEqual(startedAt - SKEW_MS);
  expect(
    ts,
    `${label}: timestamp deve ser <= now+SKEW (${new Date(now + SKEW_MS).toISOString()})`,
  ).toBeLessThanOrEqual(now + SKEW_MS);
  expect(
    now - ts,
    `${label}: registro deve ser recente (< ${MAX_AGE_MS}ms)`,
  ).toBeLessThan(MAX_AGE_MS);
}

test.describe("Auditoria — timestamp válido e recente", () => {
  test.skip(!PASS, "ADMIN_PASS não definido; pulando teste de timestamp.");

  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test("custom_field_definitions: novo registro possui timestamp recente", async ({ page }) => {
    await page.goto("/admin");
    await page.getByRole("tab", { name: /campos personalizados/i }).click();

    const label = `E2E Timestamp ${Date.now()}`;
    await page.getByRole("button", { name: /novo campo/i }).click();
    await page.getByLabel(/rótulo/i).fill(label);

    const startedAt = Date.now();
    await page.getByRole("button", { name: /^salvar$/i }).click();
    await expect(page.getByText(label)).toBeVisible({ timeout: 10_000 });

    // Cleanup: remove o campo criado
    const row = page.locator("tr", { hasText: label });
    await row.getByRole("button", { name: /excluir/i }).click();
    await page
      .getByRole("button", { name: /^(excluir|confirmar|remover)$/i })
      .last()
      .click();
    await expect(page.getByText(label)).toHaveCount(0, { timeout: 10_000 });

    await page.goto("/admin/auditoria");
    await expect(page.getByRole("heading", { name: /auditoria/i })).toBeVisible();
    await page.getByPlaceholder(/buscar por usuário/i).fill(EMAIL);
    await page.getByRole("combobox").first().click();
    await page
      .getByRole("option", { name: /campos personalizados \(definições\)/i })
      .click();
    await page.waitForTimeout(700);

    // Ordenação padrão é created_at desc → primeira linha é a mais recente.
    const ts = await firstRowTimestamp(page);
    assertRecent(ts, startedAt, "custom_field_definitions (linha)");

    // Confere também no diálogo de detalhes (campo "Data:")
    await page.getByRole("table").locator("tbody tr").first().click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    const dateLine = await dialog
      .locator("div", { hasText: /^Data:/ })
      .first()
      .innerText();
    const dialogTs = parsePtBrDateTime(dateLine.replace(/^Data:\s*/i, ""));
    assertRecent(dialogTs, startedAt, "custom_field_definitions (diálogo)");
  });

  test("/admin/upload: registro do upload possui timestamp recente", async ({ page }) => {
    await page.goto("/admin/upload");
    await expect(page.getByRole("heading", { name: /upload de imagens/i })).toBeVisible();

    const buffer = Buffer.from(PNG_BASE64, "base64");
    await page.setInputFiles("#file-input", {
      name: `e2e-timestamp-${Date.now()}.png`,
      mimeType: "image/png",
      buffer,
    });

    const startedAt = Date.now();
    await page.getByRole("button", { name: /^enviar/i }).click();
    await expect(page.getByText(/enviado:/i).first()).toBeVisible({ timeout: 20_000 });

    await page.goto("/admin/auditoria");
    await page.getByPlaceholder(/buscar por usuário/i).fill(EMAIL);
    await page.getByRole("combobox").nth(1).click();
    await page.getByRole("option", { name: /^upload$/i }).click();
    await page.waitForTimeout(700);

    const ts = await firstRowTimestamp(page);
    assertRecent(ts, startedAt, "upload de imagem");
  });
});
