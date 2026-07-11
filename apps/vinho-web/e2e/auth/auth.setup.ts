/**
 * Authentication setup for Vinho e2e.
 *
 * Signs in as the seeded test user and saves browser storage state so the
 * authenticated projects start already logged in. The test user is seeded by
 * supabase/seed.sql (test@vinho.app / testpassword123) and exists only against
 * a local Supabase stack.
 */

import { test as setup, expect } from "@playwright/test";
import path from "path";

const STORAGE_STATE = path.join(__dirname, "../.auth/user.json");

const TEST_USER = {
  email: process.env.E2E_TEST_EMAIL || "test@vinho.app",
  password: process.env.E2E_TEST_PASSWORD || "testpassword123",
};

setup("authenticate as the seeded test user", async ({ page }) => {
  await page.goto("/auth/login");
  await page.waitForLoadState("networkidle");

  await page.locator('input[type="email"]').fill(TEST_USER.email);
  await page.locator('input[type="password"]').fill(TEST_USER.password);
  await page.locator('button[type="submit"]').click();

  // Successful sign-in lands on the journal.
  await page.waitForURL(/\/journal/, { timeout: 30000 });
  await expect(page.locator("main")).toBeVisible();

  await page.context().storageState({ path: STORAGE_STATE });
});
