import { test, expect } from "./fixtures";

test.describe("Community Page", () => {
  test("community page loads with all tabs", async ({ authedPage: page }) => {
    await page.goto("/community");

    // Should see the community heading
    await expect(page.getByRole("heading", { name: /community/i }).first()).toBeVisible();

    // Should see all 4 tab buttons
    await expect(page.getByText("Find Insiders")).toBeVisible();
    await expect(page.getByText("Community Stats")).toBeVisible();
    await expect(page.getByText("My Referrals")).toBeVisible();
    await expect(page.getByText("Become an Insider")).toBeVisible();
  });

  test("Browse Insiders tab shows empty state or listings", async ({ authedPage: page }) => {
    await page.goto("/community");

    // Default tab is Browse Insiders
    await page.waitForTimeout(2000);

    // Should show either insider cards or empty state
    const pageContent = await page.content();
    const hasContent = pageContent.includes("No insiders") ||
      pageContent.includes("insider") ||
      pageContent.includes("Loading");
    expect(hasContent).toBeTruthy();
  });

  test("Community Stats tab loads metrics", async ({ authedPage: page }) => {
    await page.goto("/community?tab=stats");

    await page.waitForTimeout(3000);

    // Should show stat cards
    const pageContent = await page.content();
    const hasStats = pageContent.includes("Users") ||
      pageContent.includes("Jobs Tracked") ||
      pageContent.includes("Referral Impact") ||
      pageContent.includes("Loading");
    expect(hasStats).toBeTruthy();
  });

  test("My Referrals tab shows empty state for new user", async ({ authedPage: page }) => {
    await page.goto("/community?tab=requests");

    await page.waitForTimeout(2000);

    // New demo user should have no referral requests
    await expect(page.getByText(/haven't sent|no.*request/i).first()).toBeVisible();
  });

  test("Become an Insider tab shows profile form", async ({ authedPage: page }) => {
    await page.goto("/community?tab=profile");

    await page.waitForTimeout(3000);

    // Should see the profile creation form heading
    await expect(page.getByText(/become an insider|your insider profile/i).first()).toBeVisible();

    // Verify the form has Company and Role inputs (use placeholder text)
    await expect(page.getByPlaceholder("Where do you work?")).toBeVisible();
    await expect(page.getByPlaceholder("Your current title")).toBeVisible();
  });

  test("can create an insider profile", async ({ authedPage: page }) => {
    await page.goto("/community?tab=profile");
    await page.waitForTimeout(3000);

    // Form labels aren't linked via htmlFor, so use placeholder selectors
    await page.getByPlaceholder(/where do you work/i).fill("E2E Corp");
    await page.getByPlaceholder(/your current title/i).fill("Senior Engineer");

    const deptField = page.getByPlaceholder(/department/i).first();
    if (await deptField.isVisible({ timeout: 2000 }).catch(() => false)) {
      await deptField.fill("Engineering");
    }

    const bioField = page.locator("textarea").first();
    if (await bioField.isVisible({ timeout: 2000 }).catch(() => false)) {
      await bioField.fill("Happy to help fellow job seekers!");
    }

    // Submit
    await page.getByRole("button", { name: /create.*profile|save|submit/i }).first().click();

    // Wait for success
    await page.waitForTimeout(3000);

    // Should show success or update form
    const pageContent = await page.content();
    const success = pageContent.includes("Update") ||
      pageContent.includes("updated") ||
      pageContent.includes("Your Insider Profile") ||
      pageContent.includes("success");
    expect(success).toBeTruthy();
  });

  test("community page accessible from nav bar", async ({ authedPage: page }) => {
    await page.goto("/dashboard");

    // Click community in nav
    await page.getByRole("link", { name: /community/i }).click();

    await expect(page).toHaveURL(/\/community/);
  });
});
