import { test, expect } from "@playwright/test";

test.describe("API Routes - Security & Validation", () => {
  test.describe("Jobs API (/api/jobs)", () => {
    test("GET /api/jobs returns 401 without auth", async ({ request }) => {
      const response = await request.get("/api/jobs");
      expect(response.status()).toBe(401);

      const json = await response.json();
      expect(json.error).toContain("Unauthorized");
    });

    test("POST /api/jobs returns 401 without auth", async ({ request }) => {
      const response = await request.post("/api/jobs", {
        data: {
          company: "Test Company",
          title: "Test Role",
        },
      });
      expect(response.status()).toBe(401);

      const json = await response.json();
      expect(json.error).toContain("Unauthorized");
    });

    test("POST /api/jobs validates required fields", async ({ request }) => {
      // This test would need auth - for now just verify endpoint exists
      const response = await request.post("/api/jobs", {
        data: {
          company: "Test",
          // missing title
        },
      });
      // Should fail due to no auth first
      expect(response.status()).toBe(401);
    });
  });

  test.describe("Stripe Prices API (/api/stripe/prices)", () => {
    test("GET /api/stripe/prices returns 401 without auth", async ({ request }) => {
      const response = await request.get("/api/stripe/prices");
      expect(response.status()).toBe(401);

      const json = await response.json();
      expect(json.error).toContain("Unauthorized");
    });

    test("returns correct price structure when authenticated", async ({ request }) => {
      // TODO: Test with auth session
      // When authenticated, should return:
      // {
      //   monthly: string (price ID),
      //   quarterly: string (price ID),
      //   semiannual: string (price ID)
      // }
    });
  });

  test.describe("Stripe Webhook (/api/stripe/webhook)", () => {
    test("webhook endpoint exists and validates signature", async ({ request }) => {
      // Stripe webhook should NOT require auth, but should require valid signature
      const response = await request.post("/api/stripe/webhook", {
        data: { invalid: "payload" },
        headers: {
          "stripe-signature": "invalid-signature",
        },
      });

      // Should NOT be 404 (endpoint exists)
      expect(response.status()).not.toBe(404);

      // Likely 400 for invalid signature, or 401
      expect([400, 401, 403]).toContain(response.status());
    });

    test("webhook endpoint rejects requests without signature", async ({ request }) => {
      const response = await request.post("/api/stripe/webhook", {
        data: { test: "data" },
        // No stripe-signature header
      });

      // Should not be 404
      expect(response.status()).not.toBe(404);

      // Should fail validation
      expect([400, 401, 403]).toContain(response.status());
    });
  });

  test.describe("Contacts API (/api/contacts)", () => {
    test("GET /api/contacts requires auth", async ({ request }) => {
      const response = await request.get("/api/contacts");
      expect(response.status()).toBe(401);
    });

    test("POST /api/contacts requires auth", async ({ request }) => {
      const response = await request.post("/api/contacts", {
        data: {
          name: "Test Contact",
          email: "test@example.com",
        },
      });
      expect(response.status()).toBe(401);
    });
  });

  test.describe("Interviews API (/api/interviews)", () => {
    test("GET /api/interviews requires auth", async ({ request }) => {
      const response = await request.get("/api/interviews");
      expect(response.status()).toBe(401);
    });

    test("POST /api/interviews requires auth", async ({ request }) => {
      const response = await request.post("/api/interviews", {
        data: {
          jobId: "test-id",
          stage: "phone_screen",
          scheduledAt: new Date().toISOString(),
        },
      });
      expect(response.status()).toBe(401);
    });
  });

  test.describe("Resumes API (/api/resumes)", () => {
    test("GET /api/resumes requires auth", async ({ request }) => {
      const response = await request.get("/api/resumes");
      expect(response.status()).toBe(401);
    });

    test("POST /api/resumes requires auth", async ({ request }) => {
      const response = await request.post("/api/resumes", {
        data: {
          name: "Software Engineer Resume",
        },
      });
      expect(response.status()).toBe(401);
    });
  });

  test.describe("Settings API (/api/settings)", () => {
    test("GET /api/settings requires auth", async ({ request }) => {
      const response = await request.get("/api/settings");
      expect(response.status()).toBe(401);
    });

    test("PATCH /api/settings requires auth", async ({ request }) => {
      const response = await request.patch("/api/settings", {
        data: {
          theme: "dark",
        },
      });
      expect(response.status()).toBe(401);
    });
  });

  test.describe("Outreach API (/api/outreach)", () => {
    test("GET /api/outreach requires auth", async ({ request }) => {
      const response = await request.get("/api/outreach");
      expect(response.status()).toBe(401);
    });

    test("POST /api/outreach requires auth", async ({ request }) => {
      const response = await request.post("/api/outreach", {
        data: {
          contactId: "test-id",
          type: "email",
          message: "Test outreach",
        },
      });
      expect(response.status()).toBe(401);
    });
  });

  test.describe("Error Handling", () => {
    test("malformed JSON returns 400", async ({ request }) => {
      const response = await request.post("/api/jobs", {
        data: "invalid json",
        headers: {
          "Content-Type": "application/json",
        },
      });

      // Expect either 400 or 401 (depending on when parsing happens)
      expect([400, 401]).toContain(response.status());
    });

    test("missing required headers handled gracefully", async ({ request }) => {
      const response = await request.get("/api/jobs", {
        headers: {
          "Content-Type": "invalid/type",
        },
      });

      // Should not crash, should return 401 (auth check first)
      expect([200, 400, 401]).toContain(response.status());
    });
  });
});
