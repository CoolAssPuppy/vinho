/**
 * Sharing management (authenticated). Verifies the sharing surface loads and the
 * invite entry point is present. Sending a real invite hits the
 * send-sharing-invitation edge function, which is covered by the pgTAP/integration
 * suites; here we assert the UI journey up to that boundary.
 */

import { test, expect } from "@playwright/test";

test.describe("Sharing", () => {
  test("sharing page loads with an invite entry point", async ({ page }) => {
    await page.goto("/sharing");
    await expect(page).toHaveURL(/\/sharing/);
    await expect(page.locator("main")).toBeVisible();
    await expect(page.getByText(/sharing|share/i).first()).toBeVisible();
  });

  test("exposes an email field to invite someone", async ({ page }) => {
    await page.goto("/sharing");
    // The invite control is an email input; assert it exists without submitting.
    const emailField = page.locator('input[type="email"]').first();
    await expect(emailField).toBeVisible({ timeout: 15000 });
  });
});
