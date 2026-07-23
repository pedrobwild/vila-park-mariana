import { test, expect } from "../playwright-fixture";

// Verifica que sort/dir/page/size em /admin/auditoria são refletidos na URL e
// preservados ao dar reload e ao navegar back/forward do histórico.

const EMAIL = process.env.ADMIN_EMAIL ?? "admin@bewild.demo";
const PASS = process.env.ADMIN_PASS ?? "";

async function collectFirstColumn(page: import("@playwright/test").Page) {
  return page.getByRole("table").locator("tbody tr td:first-child").allInnerTexts();
}

test.describe("Auditoria — estado de ordenação/paginação na URL", () => {
  test.skip(!PASS, "ADMIN_PASS não definido; pulando.");

  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel(/e-?mail/i).fill(EMAIL);
    await page.getByLabel(/senha|password/i).fill(PASS);
    await page.getByRole("button", { name: /entrar|sign in/i }).click();
    await page.waitForURL(/\/admin(\/|$)/, { timeout: 15_000 });
  });

  test("URL preserva sort/dir/page em reload e back/forward", async ({ page }) => {
    await page.goto("/admin/auditoria");
    await expect(page.getByRole("heading", { name: /auditoria/i })).toBeVisible();

    // Precisamos de pelo menos 2 páginas
    const totalText = await page
      .locator("text=/Mostrando\\s+\\d+–\\d+\\s+de\\s+\\d+/i")
      .first()
      .textContent()
      .catch(() => null);
    const total = totalText ? Number(totalText.match(/de\s+(\d+)/i)?.[1] ?? "0") : 0;
    test.skip(total <= 25, `Somente ${total} registro(s); precisamos de >25.`);

    // 1) Toggle sort para ASC via clique no header — URL deve refletir dir=asc
    await page.getByRole("button", { name: /data\/hora/i }).click();
    await page.waitForTimeout(400);
    await expect.poll(() => new URL(page.url()).searchParams.get("dir")).toBe("asc");

    // 2) Avançar para página 2 — URL deve conter page=2
    await page.getByRole("button", { name: /próxima/i }).click();
    await page.waitForTimeout(500);
    await expect.poll(() => new URL(page.url()).searchParams.get("page")).toBe("2");

    const snapshotPage2Asc = await collectFirstColumn(page);
    expect(snapshotPage2Asc.length).toBeGreaterThan(0);

    // 3) Reload — mesmo estado deve ser restaurado a partir da URL
    await page.reload();
    await expect(page.getByRole("heading", { name: /auditoria/i })).toBeVisible();
    await page.waitForTimeout(600);
    expect(new URL(page.url()).searchParams.get("dir")).toBe("asc");
    expect(new URL(page.url()).searchParams.get("page")).toBe("2");
    const afterReload = await collectFirstColumn(page);
    expect(afterReload).toEqual(snapshotPage2Asc);

    // 4) Back — volta para página 1 asc
    await page.goBack();
    await page.waitForTimeout(500);
    expect(new URL(page.url()).searchParams.get("dir")).toBe("asc");
    expect(new URL(page.url()).searchParams.get("page")).toBeNull();
    const page1Asc = await collectFirstColumn(page);
    expect(page1Asc.length).toBeGreaterThan(0);
    // continuidade: fim p1 asc <= topo p2 asc
    // (comparação de strings pt-BR de mesma máscara é comparável cronologicamente somente após parse;
    //  aqui basta garantir que os conjuntos são distintos)
    expect(page1Asc[0]).not.toEqual(snapshotPage2Asc[0]);

    // 5) Back novamente — volta ao estado desc default (sem dir na URL)
    await page.goBack();
    await page.waitForTimeout(500);
    expect(new URL(page.url()).searchParams.get("dir")).toBeNull();

    // 6) Forward duas vezes — retorna ao estado asc + page=2
    await page.goForward();
    await page.waitForTimeout(400);
    await page.goForward();
    await page.waitForTimeout(500);
    expect(new URL(page.url()).searchParams.get("dir")).toBe("asc");
    expect(new URL(page.url()).searchParams.get("page")).toBe("2");
    const afterForward = await collectFirstColumn(page);
    expect(afterForward).toEqual(snapshotPage2Asc);
  });
});
