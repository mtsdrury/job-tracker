import { test as base, expect, type Page, type APIRequestContext } from "@playwright/test";

/**
 * Shared E2E fixtures for KnowSomeone.
 *
 * Creates a demo user via the /api/demo/start endpoint, then logs in
 * with those credentials using NextAuth's credentials provider.
 *
 * Every test file that imports `test` from this module gets a fresh
 * authenticated session with seeded data (jobs, contacts, outreach, etc.).
 */

interface DemoCredentials {
  email: string;
  password: string;
}

interface AuthFixtures {
  demoCredentials: DemoCredentials;
  authedPage: Page;
}

async function createDemoUser(request: APIRequestContext): Promise<DemoCredentials> {
  // Retry up to 3 times in case of transient failures
  let lastError: Error | null = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await request.post("/api/demo/start");
    if (res.ok()) {
      const data = await res.json();
      if (data.email && data.password) {
        return { email: data.email, password: data.password };
      }
    }
    lastError = new Error(`Demo start failed: ${res.status()} (attempt ${attempt + 1})`);
    // Small backoff before retry
    if (attempt < 2) {
      await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
    }
  }
  throw lastError;
}

async function loginWithCredentials(
  page: Page,
  creds: DemoCredentials
): Promise<void> {
  await page.goto("/login");

  // Wait for the form to be interactive
  await page.getByLabel(/email/i).waitFor({ state: "visible", timeout: 10000 });

  await page.getByLabel(/email/i).fill(creds.email);
  await page.getByLabel(/password/i).fill(creds.password);
  await page.getByRole("button", { name: /sign in/i }).click();

  // Wait for redirect to dashboard
  await page.waitForURL("**/dashboard", { timeout: 15000 });
}

export const test = base.extend<AuthFixtures>({
  demoCredentials: async ({ request }, use) => {
    const creds = await createDemoUser(request);
    await use(creds);
  },

  authedPage: async ({ page, request }, use) => {
    const creds = await createDemoUser(request);
    await loginWithCredentials(page, creds);
    await use(page);
  },
});

export { expect };
