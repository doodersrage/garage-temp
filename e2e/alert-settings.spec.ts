import { test, expect } from "@playwright/test";
import { getE2ECredentials, signIn } from "./helpers/auth";

test.describe("alert settings", () => {
  test("alerts page requires sign-in", async ({ page }) => {
    await page.goto("/dashboard/alerts");
    await expect(page).toHaveURL(/signin/);
  });

  test("organized sections render when signed in", async ({ page }) => {
    test.skip(!getE2ECredentials(), "Set E2E_TEST_EMAIL and E2E_TEST_PASSWORD");

    await signIn(page, "/dashboard/alerts");
    await expect(page.getByRole("heading", { name: /Alerts/i }).first()).toBeVisible();
    await expect(page.getByRole("navigation", { name: /Alert settings sections/i })).toBeVisible();
    await expect(page.locator("#alert-section-basics")).toBeVisible();
    await expect(page.locator("#alert-section-triggers")).toBeVisible();
    await expect(page.locator("#alert-section-channels")).toBeVisible();
  });

  test("freeze threshold persists after save", async ({ page }) => {
    test.skip(!getE2ECredentials(), "Set E2E_TEST_EMAIL and E2E_TEST_PASSWORD");

    await signIn(page, "/dashboard/alerts");

    const threshold = page.locator("#freeze_threshold_f");
    await threshold.scrollIntoViewIfNeeded();

    const original = await threshold.inputValue();
    const trial = original === "31.5" ? "32" : "31.5";

    await threshold.fill(trial);
    await page.locator("#alert-settings-submit").click();
    await expect(page).toHaveURL(/alert_saved=1/, { timeout: 20_000 });
    await expect(page.locator("#freeze_threshold_f")).toHaveValue(trial);

    await threshold.fill(original);
    await page.locator("#alert-settings-submit").click();
    await expect(page).toHaveURL(/alert_saved=1/, { timeout: 20_000 });
    await expect(page.locator("#freeze_threshold_f")).toHaveValue(original);
  });
});

test.describe("dashboard overview", () => {
  test("overview loads for signed-in user", async ({ page }) => {
    test.skip(!getE2ECredentials(), "Set E2E_TEST_EMAIL and E2E_TEST_PASSWORD");

    await signIn(page, "/dashboard");
    await expect(page.getByRole("heading", { name: /Overview|Status|Getting started/i }).first()).toBeVisible();
    await expect(page.locator("#status")).toBeVisible();
  });
});
