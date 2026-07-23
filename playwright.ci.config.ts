import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright config para execução em CI (GitHub Actions).
 *
 * Independente de `lovable-agent-playwright-config` (que só existe no sandbox
 * do editor). Sobe o preview de produção do Vite via `webServer` e executa
 * apenas os specs listados em `testMatch`.
 *
 * Para expandir a suíte no CI, adicione o arquivo em `testMatch`.
 */
export default defineConfig({
  testDir: "./e2e",
  testMatch: [
    "vilapark-map-analytics.spec.ts",
  ],
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [["list"], ["html", { open: "never", outputFolder: "playwright-report" }]],
  timeout: 90_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: "http://127.0.0.1:4173",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "npm run build && npm run preview -- --host 127.0.0.1 --port 4173 --strictPort",
    url: "http://127.0.0.1:4173",
    reuseExistingServer: false,
    timeout: 180_000,
    stdout: "pipe",
    stderr: "pipe",
  },
});
