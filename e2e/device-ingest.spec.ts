import { test, expect } from "@playwright/test";
import { getE2ECredentials, signIn } from "./helpers/auth";

test.describe("device ingest", () => {
  test("ingest rejects an unknown key", async ({ request }) => {
    const res = await request.post("/api/ingest/not-a-real-key", {
      data: { temp1: 40 },
    });
    expect(res.status()).toBe(401);
  });

  test("create device, POST a reading, see it land, then clean up", async ({ page }) => {
    test.skip(!getE2ECredentials(), "Set E2E_TEST_EMAIL and E2E_TEST_PASSWORD");

    await signIn(page, "/dashboard/temperature");

    const deviceName = `E2E ingest ${Date.now()}`;
    await page.locator("#device-name").fill(deviceName);
    await page.getByRole("button", { name: /Create push device/i }).click();

    // The API redirects with the raw ingest key and new device id in the URL.
    await page.waitForURL(/ingest_key=.+&device_created=1&focus_device=.+/, {
      timeout: 20_000,
    });
    const url = new URL(page.url());
    const ingestKey = url.searchParams.get("ingest_key");
    const deviceId = url.searchParams.get("focus_device");
    expect(ingestKey).toBeTruthy();
    expect(deviceId).toBeTruthy();

    try {
      await expect(page.locator("#ingest-key-value")).toHaveText(ingestKey!);

      // This is the core product loop: probe posts JSON, dashboard reflects it.
      const ingestRes = await page.request.post(`/api/ingest/${ingestKey}`, {
        data: { temp1: 41.2, battery: 90 },
      });
      expect(ingestRes.ok()).toBeTruthy();

      await page.reload();
      const deviceRow = page
        .locator("li", { has: page.locator(`form input[name="device_id"][value="${deviceId}"]`) })
        .first();
      await expect(deviceRow).toBeVisible();
      await expect(deviceRow.getByText("No POSTs yet")).toHaveCount(0);
    } finally {
      // Always remove the device this test created, even if an assertion above failed.
      page.once("dialog", (dialog) => dialog.accept());
      const deleteButton = page
        .locator("form", { has: page.locator(`input[name="device_id"][value="${deviceId}"]`) })
        .filter({ has: page.getByRole("button", { name: "Delete" }) })
        .getByRole("button", { name: "Delete" });
      if (await deleteButton.count()) {
        await deleteButton.click();
        await page.waitForLoadState("networkidle").catch(() => {});
      }
    }
  });
});
