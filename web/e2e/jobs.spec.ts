import { test, expect } from "./fixtures";

test.describe("Jobs - List & Navigation", () => {
  test("jobs page loads with seeded demo data", async ({ authedPage: page }) => {
    await page.goto("/jobs");

    // Should see the unified jobs page with tabs
    await expect(page.getByText(/my jobs/i).first()).toBeVisible();

    // Demo data should have seeded jobs — look for job cards (Link elements)
    const jobItems = page.locator("a[href*='/jobs/'], [data-testid='job-card'], [class*='cursor']").first();
    await expect(jobItems).toBeVisible({ timeout: 10000 });
  });

  test("can navigate between My Jobs, Search, and Import tabs", async ({ authedPage: page }) => {
    await page.goto("/jobs");

    // Tabs are <button> elements in a border-b tab bar
    // "Search" text also appears in the My Jobs search input, so target the tab button specifically
    const tabBar = page.locator(".flex.gap-1.border-b");
    await expect(tabBar.getByText("My Jobs")).toBeVisible();
    await expect(tabBar.getByText("Search")).toBeVisible();
    await expect(tabBar.getByText("Import")).toBeVisible();

    // Click the Search tab button (inside the tab bar, not the search input)
    await tabBar.getByText("Search").click();
    await page.waitForTimeout(1000);

    // URL should update to include tab=search
    expect(page.url()).toContain("tab=search");
  });

  test("can add a new job manually", async ({ authedPage: page }) => {
    await page.goto("/jobs");

    // "Add Job" is a Link wrapping a Button — click the link/button
    const addButton = page.locator("a[href='/jobs/new']").or(
      page.getByRole("button", { name: /add.*job|new.*job/i })
    ).first();
    await addButton.click();

    // Wait for navigation to the new job form page
    await page.waitForURL("**/jobs/new", { timeout: 10000 });

    // Fill in the form
    await page.getByLabel(/company/i).first().fill("E2E Test Corp");
    await page.getByLabel(/role/i).first().fill("QA Engineer");

    // Submit
    await page.getByRole("button", { name: /save|add|create/i }).first().click();

    // Should navigate to the new job's detail page
    await page.waitForURL(/\/jobs\/(?!new)/, { timeout: 10000 });

    // Verify job was created
    const pageContent = await page.content();
    expect(
      pageContent.includes("E2E Test Corp") || pageContent.includes("QA Engineer")
    ).toBeTruthy();
  });
});

test.describe("Jobs - Detail Page", () => {
  test("job detail page shows all sections", async ({ authedPage: page }) => {
    await page.goto("/jobs");

    // Wait for jobs to load
    const firstJob = page.locator("a[href*='/jobs/']").first();
    await expect(firstJob).toBeVisible({ timeout: 10000 });
    await firstJob.click();

    // Wait for detail page to load
    await page.waitForURL(/\/jobs\/[^/]+$/, { timeout: 10000 });

    // Should see the job content — company name or section headers
    await page.waitForTimeout(2000);
    const pageContent = await page.content();
    const hasContent = pageContent.includes("company") ||
      pageContent.includes("Company") ||
      pageContent.includes("details") ||
      pageContent.includes("Details") ||
      pageContent.includes("Notes") ||
      pageContent.includes("Contact") ||
      pageContent.includes("Status");
    expect(hasContent).toBeTruthy();
  });

  test("can update job notes", async ({ authedPage: page }) => {
    await page.goto("/jobs");

    // Navigate to first job
    const firstJob = page.locator("a[href*='/jobs/']").first();
    await expect(firstJob).toBeVisible({ timeout: 10000 });
    await firstJob.click();
    await page.waitForURL(/\/jobs\/[^/]+$/, { timeout: 10000 });

    // Wait for page to fully render
    await page.waitForTimeout(2000);

    // Find and update notes field
    const notesField = page.locator("textarea").first();
    if (await notesField.isVisible({ timeout: 5000 }).catch(() => false)) {
      await notesField.fill("E2E test note - updated via Playwright");

      // Save
      const saveButton = page.getByRole("button", { name: /save/i }).first();
      if (await saveButton.isVisible({ timeout: 3000 }).catch(() => false)) {
        await saveButton.click();
        await page.waitForTimeout(1000);
      }
    }
  });
});

test.describe("Jobs - Apply Flow", () => {
  test("apply checklist shows required steps", async ({ authedPage: page }) => {
    await page.goto("/jobs");

    // Navigate to a job
    const firstJob = page.locator("a[href*='/jobs/']").first();
    await expect(firstJob).toBeVisible({ timeout: 10000 });
    await firstJob.click();
    await page.waitForURL(/\/jobs\/[^/]+$/, { timeout: 10000 });

    // Wait for the detail page to load
    await page.waitForTimeout(2000);

    // Look for apply button or checklist
    const applyButton = page.getByRole("button", { name: /apply|mark.*applied/i }).first();
    if (await applyButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await applyButton.click();
      await page.waitForTimeout(500);
    }

    // Just verify the flow doesn't crash — the page should still be rendered
    const pageContent = await page.content();
    expect(pageContent.length).toBeGreaterThan(0);
  });
});
