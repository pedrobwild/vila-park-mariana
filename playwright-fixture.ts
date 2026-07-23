// Re-export the Playwright test/expect API.
//
// No sandbox do Lovable, o pacote `lovable-agent-playwright-config/fixture`
// injeta configurações específicas do editor. Em CI (GitHub Actions) esse
// pacote não está disponível, então caímos para o `@playwright/test` base.
//
// Os specs deste projeto usam apenas a API pública (test/expect), então o
// fallback é transparente.
import type { test as BaseTest, expect as BaseExpect } from "@playwright/test";

let test: typeof BaseTest;
let expect: typeof BaseExpect;

try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mod = require("lovable-agent-playwright-config/fixture");
  test = mod.test;
  expect = mod.expect;
} catch {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mod = require("@playwright/test");
  test = mod.test;
  expect = mod.expect;
}

export { test, expect };
