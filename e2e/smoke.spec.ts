import { test, expect } from "@playwright/test";

test.describe("public smoke", () => {
  test("home page loads", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/ThermalTrace/i);
  });

  test("pricing page loads", async ({ page }) => {
    await page.goto("/pricing");
    await expect(page.getByRole("heading", { name: /Plans that grow/i })).toBeVisible();
  });

  test("pricing page billing interval toggle", async ({ page }) => {
    await page.goto("/pricing");
    const monthlyBtn = page.getByRole("button", { name: "Monthly" });
    const annualBtn = page.getByRole("button", { name: /Annual/i });
    await expect(monthlyBtn).toBeVisible();
    await expect(annualBtn).toBeVisible();

    await monthlyBtn.click();
    await expect(monthlyBtn).toHaveAttribute("aria-pressed", "true");

    await annualBtn.click();
    await expect(annualBtn).toHaveAttribute("aria-pressed", "true");
  });

  test("500 error page loads", async ({ page }) => {
    await page.goto("/500");
    await expect(page.getByRole("heading", { name: /Something went wrong/i })).toBeVisible();
  });

  test("compare page loads", async ({ page }) => {
    await page.goto("/compare");
    await expect(page.getByRole("heading", { name: /Built for homeowners/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /See plans & pricing/i }).first()).toBeVisible();
  });

  test("case study CTA links to pricing", async ({ page }) => {
    await page.goto("/stories/garage-freeze-alert");
    await expect(page.getByRole("heading", { name: /pipes froze/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /See plans & pricing/i })).toBeVisible();
  });

  test("system status page loads", async ({ page }) => {
    await page.goto("/system-status");
    await expect(page.getByRole("heading", { name: /System status/i })).toBeVisible();
  });

  test("API docs page loads", async ({ page }) => {
    await page.goto("/docs/api");
    await expect(page.getByRole("heading", { name: /API documentation/i })).toBeVisible();
  });
});
