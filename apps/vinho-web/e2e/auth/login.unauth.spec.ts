/**
 * Signed-out login flow. Runs in the `unauthenticated` project (no storage
 * state), so it exercises the real auth boundary.
 */

import { test, expect } from "@playwright/test";

test.describe("Login page (signed out)", () => {
  test("renders the sign-in form", async ({ page }) => {
    await page.goto("/auth/login");

    await expect(page.getByText(/welcome back/i)).toBeVisible();
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.getByRole("button", { name: /sign in/i })).toBeVisible();
  });

  test("rejects invalid credentials without navigating away", async ({ page }) => {
    await page.goto("/auth/login");

    await page.locator('input[type="email"]').fill("nobody@vinho.app");
    await page.locator('input[type="password"]').fill("wrong-password");
    await page.getByRole("button", { name: /sign in/i }).click();

    // Stays on the login route and surfaces an error (toast or inline).
    await expect(page).toHaveURL(/\/auth\/login/);
    await expect(page.getByText(/invalid|incorrect|error/i).first()).toBeVisible({
      timeout: 15000,
    });
  });

  test("protected routes redirect to login when signed out", async ({ page }) => {
    await page.goto("/journal");
    await expect(page).toHaveURL(/\/auth\/login/);
  });
});
