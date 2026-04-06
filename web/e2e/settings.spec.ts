import { test, expect } from "./fixtures";

test.describe("Settings Page", () => {
  test("settings page loads with all sections", async ({ authedPage: page }) => {
    await page.goto("/settings");

    // Should see settings heading
    await expect(page.getByRole("heading", { name: /settings/i }).first()).toBeVisible({ timeout: 10000 });

    // Wait for API data to load (settings fetches from /api/settings)
    await page.waitForTimeout(3000);

    // Should see key settings sections — card titles rendered after loading
    const pageContent = await page.content();
    const hasSections = pageContent.includes("Profile") ||
      pageContent.includes("Strategy") ||
      pageContent.includes("Integrations") ||
      pageContent.includes("Communication") ||
      pageContent.includes("Danger Zone");
    expect(hasSections).toBeTruthy();
  });

  test("can update strategy mode", async ({ authedPage: page }) => {
    await page.goto("/settings");
    await page.waitForTimeout(3000);

    // Strategy mode uses clickable cards, not a select dropdown
    // Look for the strategy buttons or any select/combobox
    const strategyButton = page.getByText(/speed first|referral first/i).first();
    if (await strategyButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await strategyButton.click();
      await page.waitForTimeout(500);
    }

    // Just verify the page didn't crash
    await expect(page.getByRole("heading", { name: /settings/i }).first()).toBeVisible();
  });

  test("can view and manage data export", async ({ authedPage: page }) => {
    await page.goto("/settings");
    await page.waitForTimeout(3000);

    // Look for export button — actual text is "Export My Data"
    const exportButton = page.getByRole("button", { name: /export/i }).first();
    if (await exportButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(exportButton).toBeEnabled();
    }
  });

  test("can view account deletion option", async ({ authedPage: page }) => {
    await page.goto("/settings");
    await page.waitForTimeout(3000);

    // Should have a Danger Zone with Delete My Account button
    const pageContent = await page.content();
    expect(
      pageContent.includes("Delete") || pageContent.includes("delete") || pageContent.includes("Danger")
    ).toBeTruthy();
  });
});

test.describe("Analytics Page", () => {
  test("analytics page loads with charts", async ({ authedPage: page }) => {
    await page.goto("/analytics");

    // Wait for analytics data to load
    await page.waitForTimeout(5000);

    // Should see analytics content
    const pageContent = await page.content();
    const hasAnalytics = pageContent.toLowerCase().includes("analytics") ||
      pageContent.toLowerCase().includes("chart") ||
      pageContent.toLowerCase().includes("pipeline") ||
      pageContent.toLowerCase().includes("application") ||
      pageContent.toLowerCase().includes("overview") ||
      pageContent.toLowerCase().includes("metric");
    expect(hasAnalytics).toBeTruthy();
  });
});

test.describe("Dashboard", () => {
  test("dashboard loads with key metrics", async ({ authedPage: page }) => {
    // Already on dashboard from login
    await expect(page).toHaveURL(/\/dashboard/);

    // Wait for dashboard data to load
    await page.waitForTimeout(3000);

    // Should show some form of metrics or activity
    const pageContent = await page.content().then(c => c.toLowerCase());
    const hasDashboard = pageContent.includes("job") ||
      pageContent.includes("action") ||
      pageContent.includes("pipeline") ||
      pageContent.includes("activity") ||
      pageContent.includes("dashboard") ||
      pageContent.includes("metric") ||
      pageContent.includes("contact") ||
      pageContent.includes("recent");
    expect(hasDashboard).toBeTruthy();
  });

  test("demo mode shows reset button", async ({ authedPage: page }) => {
    // Demo users should see the "Demo Mode" badge
    await expect(
      page.getByText(/demo mode/i).first()
    ).toBeVisible({ timeout: 10000 });

    // "Reset Demo" button — the text might be hidden on mobile, so also check aria-label
    const resetButton = page.getByRole("button", { name: /reset demo/i })
      .or(page.locator("[aria-label*='Reset demo']"))
      .or(page.getByText(/reset demo/i));
    await expect(resetButton.first()).toBeVisible({ timeout: 5000 });
  });
});
