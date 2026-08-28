import type { Page } from "@playwright/test";

export function getE2ECredentials(): { email: string; password: string } | null {
  const email = process.env.E2E_TEST_EMAIL?.trim();
  const password = process.env.E2E_TEST_PASSWORD;
  if (!email || !password) return null;
  return { email, password };
}

export async function signIn(page: Page, next = "/dashboard/alerts"): Promise<void> {
  const creds = getE2ECredentials();
  if (!creds) {
    throw new Error("E2E_TEST_EMAIL and E2E_TEST_PASSWORD are required");
  }

  await page.goto(`/signin?next=${encodeURIComponent(next)}`);
  await page.locator('input[name="email"]').fill(creds.email);
  await page.locator('input[name="password"]').fill(creds.password);
  await page.getByRole("button", { name: /sign in/i }).click();

  const escapedNext = next.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const result = await Promise.race([
    page.waitForURL(new RegExp(escapedNext), { timeout: 25_000 }).then(() => "ok" as const),
    page
      .locator('[role="alert"]')
      .filter({ hasText: /sign/i })
      .waitFor({ timeout: 25_000 })
      .then(async () => {
        const message = (await page.locator('[role="alert"]').first().textContent())?.trim();
        throw new Error(message || "Sign-in failed — check E2E_TEST_EMAIL / E2E_TEST_PASSWORD");
      }),
  ]);

  if (result !== "ok") {
    throw new Error("Sign-in did not reach the dashboard");
  }
}
