/**
 * Authenticated core journeys. Runs in the `chromium` project with the seeded
 * test user's storage state.
 */

import { test, expect } from "@playwright/test";

test.describe("Authenticated app shell", () => {
  test("journal loads for a signed-in user", async ({ page }) => {
    await page.goto("/journal");
    await expect(page).toHaveURL(/\/journal/);
    await expect(page.locator("main")).toBeVisible();
    await expect(page.getByText(/journal|tastings/i).first()).toBeVisible();
  });

  test("can navigate to the map", async ({ page }) => {
    await page.goto("/map");
    await expect(page).toHaveURL(/\/map/);
    await expect(page.locator("main")).toBeVisible();
  });

  test("can navigate to the scan page", async ({ page }) => {
    await page.goto("/scan");
    await expect(page).toHaveURL(/\/scan/);
    await expect(page.locator("main")).toBeVisible();
  });

  test("profile page loads", async ({ page }) => {
    await page.goto("/profile");
    await expect(page).toHaveURL(/\/profile/);
    await expect(page.locator("main")).toBeVisible();
  });
});
