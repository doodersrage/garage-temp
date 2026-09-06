import { describe, expect, it } from "vitest";
import { COMPANION_APPS, COMPANION_APPS_HUB_PATH } from "./companionApps";

describe("companionApps", () => {
  it("lists phone, desktop, mood, and PWA clients", () => {
    expect(COMPANION_APPS_HUB_PATH).toBe("/apps");
    expect(COMPANION_APPS.map((app) => app.id)).toEqual([
      "android",
      "desktop",
      "bay-buddy",
      "pwa",
    ]);
    for (const app of COMPANION_APPS) {
      expect(app.path.startsWith("/")).toBe(true);
      expect(app.name.length).toBeGreaterThan(2);
      expect(app.summary.length).toBeGreaterThan(20);
    }
  });
});
