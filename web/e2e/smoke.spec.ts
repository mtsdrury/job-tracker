import { test, expect } from "@playwright/test";

test.describe("Smoke Tests", () => {
  test("landing page loads and shows hero content", async ({ page }) => {
    await page.goto("/");

    // Check page title or heading
    const heading = page.locator("h1, h2");
    await expect(heading.first()).toBeVisible();

    // Check that page is not showing error
    const errorElement = page.locator("text=/error|Error/i");
    await expect(errorElement).not.toBeVisible();
  });

  test("login page renders", async ({ page }) => {
    await page.goto("/login");

    // Check for login form elements
    await expect(page.locator("text=/sign in|login/i").first()).toBeVisible();
  });

  test("404 page renders for unknown routes", async ({ page }) => {
    const response = await page.goto("/nonexistent-page-xyz");

    // Should get a 404 response
    expect(response?.status()).toBe(404);
  });

  test("navigation is accessible", async ({ page }) => {
    await page.goto("/");

    // Check that page loads without crashing
    const body = page.locator("body");
    await expect(body).toBeVisible();
  });
});
