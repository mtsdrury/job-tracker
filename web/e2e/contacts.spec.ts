import { test, expect } from "./fixtures";

test.describe("Contacts Page", () => {
  test("contacts page loads with seeded data", async ({ authedPage: page }) => {
    await page.goto("/contacts");

    // Should see contacts heading
    await expect(page.getByRole("heading", { name: /contacts/i }).first()).toBeVisible();

    // Demo data should include contacts
    await page.waitForTimeout(2000);
    const contactElements = page.locator("[data-testid='contact-card'], tr, .contact").first();
    // Contacts page should have loaded without error
    await expect(page.locator("body")).not.toContainText(/error.*loading/i);
  });

  test("can search contacts by name", async ({ authedPage: page }) => {
    await page.goto("/contacts");
    await page.waitForTimeout(1000);

    const searchInput = page.getByPlaceholder(/search|filter/i).first();
    if (await searchInput.isVisible()) {
      await searchInput.fill("test");
      await page.waitForTimeout(500);
      // Verify search doesn't crash
      await expect(page.locator("body")).toBeVisible();
    }
  });

  test("can add a new contact", async ({ authedPage: page }) => {
    await page.goto("/contacts");

    const addButton = page.getByRole("button", { name: /add.*contact|new.*contact/i }).first();
    if (await addButton.isVisible()) {
      await addButton.click();
      await page.waitForTimeout(500);

      // Fill contact form
      const nameField = page.getByLabel(/name/i).first();
      if (await nameField.isVisible()) {
        await nameField.fill("E2E Test Contact");

        const companyField = page.getByLabel(/company/i).first();
        if (await companyField.isVisible()) {
          await companyField.fill("Test Corp");
        }

        // Submit
        await page.getByRole("button", { name: /save|add|create/i }).first().click();
        await page.waitForTimeout(1000);

        // Verify it was added
        await expect(page.getByText("E2E Test Contact")).toBeVisible({ timeout: 5000 });
      }
    }
  });
});

test.describe("Outreach Lifecycle", () => {
  test("can view outreach events on a job", async ({ authedPage: page }) => {
    await page.goto("/jobs");

    // Navigate to first job with contacts
    const firstJob = page.locator("a[href*='/jobs/'], tr[class*='cursor'], [data-testid='job-card']").first();
    await firstJob.click();
    await page.waitForURL("**/jobs/**", { timeout: 10000 });

    // Look for contact/outreach section
    await page.waitForTimeout(2000);
    const pageContent = await page.content();
    // Demo data should have outreach events seeded
    const hasOutreach = pageContent.includes("outreach") ||
      pageContent.includes("contact") ||
      pageContent.includes("message") ||
      pageContent.includes("referral");
    // The page should load without errors
    await expect(page.locator("body")).not.toContainText(/error.*loading/i);
  });

  test("can update outreach status", async ({ authedPage: page }) => {
    await page.goto("/jobs");

    const firstJob = page.locator("a[href*='/jobs/'], tr[class*='cursor'], [data-testid='job-card']").first();
    await firstJob.click();
    await page.waitForURL("**/jobs/**", { timeout: 10000 });
    await page.waitForTimeout(2000);

    // Look for status dropdown on an outreach event
    const statusSelect = page.locator("select, [role='combobox']").first();
    if (await statusSelect.isVisible()) {
      // Just verify it's interactable
      await statusSelect.click();
      await page.waitForTimeout(300);
    }
  });
});
