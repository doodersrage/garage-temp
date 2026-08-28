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
  await page.waitForURL(new RegExp(next.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
}
