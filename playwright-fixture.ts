// Re-export the Playwright test/expect API.
//
// No sandbox do Lovable, `lovable-agent-playwright-config/fixture` injeta
// configuração específica do editor. Em CI (GitHub Actions) esse pacote não
// existe, então caímos para o `@playwright/test` base. Os specs usam apenas
// a API pública (test/expect), então o fallback é transparente.
import { createRequire } from "node:module";

const req = createRequire(import.meta.url);

let mod: { test: unknown; expect: unknown };
try {
  mod = req("lovable-agent-playwright-config/fixture");
} catch {
  mod = req("@playwright/test");
}

export const test = mod.test as typeof import("@playwright/test").test;
export const expect = mod.expect as typeof import("@playwright/test").expect;
