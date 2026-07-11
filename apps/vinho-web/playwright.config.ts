import { defineConfig, devices } from "@playwright/test";
import path from "path";

/**
 * Playwright configuration for Vinho web e2e.
 *
 * Mirrors the Strategic Nerds reference harness (futurenerds/web): a `setup`
 * project authenticates once and saves storage state, authenticated specs reuse
 * it, and `*.unauth.spec.ts` files run signed-out.
 *
 * Running locally requires a local Supabase stack with the seeded test user
 * (test@vinho.app / testpassword123) and Playwright browsers installed
 * (`pnpm exec playwright install --with-deps chromium`). See e2e/README.md.
 */

const isCI = !!process.env.CI;
const baseURL = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000";

export default defineConfig({
  testDir: "./e2e",
  testMatch: "**/*.spec.ts",

  timeout: 30000,
  expect: { timeout: 10000 },

  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  workers: isCI ? 2 : undefined,

  reporter: [
    ["html", { outputFolder: "playwright-report", open: isCI ? "never" : "on-failure" }],
    ["json", { outputFile: "playwright-report/results.json" }],
    ["list"],
  ],

  use: {
    baseURL,
    locale: "en-US",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "on-first-retry",
    viewport: { width: 1280, height: 720 },
    actionTimeout: 10000,
    navigationTimeout: 30000,
  },

  projects: [
    // Authenticates once and saves storage state for the authenticated projects.
    {
      name: "setup",
      testMatch: /.*\.setup\.ts/,
    },

    // Authenticated desktop Chrome — everything except *.unauth.spec.ts.
    {
      name: "chromium",
      testIgnore: /\.unauth\.spec\.ts/,
      use: {
        ...devices["Desktop Chrome"],
        storageState: path.join(__dirname, "e2e/.auth/user.json"),
      },
      dependencies: ["setup"],
    },

    // Signed-out flows (login page, validation).
    {
      name: "unauthenticated",
      testMatch: /.*\.unauth\.spec\.ts/,
      use: { ...devices["Desktop Chrome"] },
    },
  ],

  // Boots the Next.js dev server before the run (reused locally for fast
  // iteration). CI starts local Supabase first, then this compiles routes lazily.
  webServer: {
    command: "pnpm run dev",
    url: baseURL,
    reuseExistingServer: !isCI,
    timeout: 120000,
  },

  outputDir: "playwright-results",
});
