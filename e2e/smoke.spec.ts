import { test, expect } from "@playwright/test";

test.describe("public smoke", () => {
  test("home page loads", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/Garage/i);
  });

  test("pricing page loads", async ({ page }) => {
    await page.goto("/pricing");
    await expect(page.getByRole("heading", { name: /Plans & pricing/i })).toBeVisible();
  });

  test("compare page loads", async ({ page }) => {
    await page.goto("/compare");
    await expect(page.getByRole("heading", { name: /Compare options/i })).toBeVisible();
  });

  test("system status page loads", async ({ page }) => {
    await page.goto("/system-status");
    await expect(page.getByRole("heading", { name: /System status/i })).toBeVisible();
  });
});
