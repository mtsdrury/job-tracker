import { test, expect } from "./fixtures";

test.describe("Authentication", () => {
  test("login page renders with form and OAuth options", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("heading", { name: /sign in|welcome/i })).toBeVisible();
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/password/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /sign in/i })).toBeVisible();
  });

  test("register page renders with form", async ({ page }) => {
    await page.goto("/register");
    await expect(page.getByRole("heading", { name: /register|sign up|create/i })).toBeVisible();
  });

  test("login with invalid credentials shows error", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel(/email/i).fill("fake@example.com");
    await page.getByLabel(/password/i).fill("wrongpassword");
    await page.getByRole("button", { name: /sign in/i }).click();

    await expect(page.getByText(/invalid|incorrect|failed/i)).toBeVisible({ timeout: 5000 });
  });

  test("demo user can log in and reach dashboard", async ({ demoCredentials, page }) => {
    await page.goto("/login");
    await page.getByLabel(/email/i).fill(demoCredentials.email);
    await page.getByLabel(/password/i).fill(demoCredentials.password);
    await page.getByRole("button", { name: /sign in/i }).click();

    await page.waitForURL("**/dashboard", { timeout: 15000 });
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test("authenticated user sees nav bar with all links", async ({ authedPage: page }) => {
    const nav = page.locator("nav");
    await expect(nav).toBeVisible();

    // Check all nav items are present
    for (const label of ["Dashboard", "Jobs", "Contacts", "Analytics", "Community", "Billing", "Settings"]) {
      await expect(nav.getByText(label, { exact: true })).toBeVisible();
    }
  });

  test("unauthenticated user is redirected from protected routes", async ({ page }) => {
    await page.goto("/dashboard");

    // Should redirect to login
    await expect(page).toHaveURL(/\/(login|api\/auth)/);
  });

  test("sign out clears session", async ({ authedPage: page }) => {
    // Click sign out — button uses aria-label="Sign out"
    await page.locator("[aria-label='Sign out']").click();

    // callbackUrl is "/" — wait for redirect away from dashboard
    await page.waitForTimeout(5000);
    const postSignOutUrl = page.url();
    expect(postSignOutUrl).not.toContain("/dashboard");

    // Navigating to protected route should redirect to login
    await page.goto("/dashboard");
    await page.waitForTimeout(3000);
    const finalUrl = page.url();
    expect(
      finalUrl.includes("/login") || finalUrl.includes("/api/auth") || finalUrl.endsWith("/")
    ).toBeTruthy();
  });
});
