import { afterEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_ALERT_SETTINGS } from "./alerts";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
  vi.clearAllMocks();
});

describe("alertSettingsHaveDeliveryTimestamp", () => {
  it("is false for defaults", async () => {
    const { alertSettingsHaveDeliveryTimestamp } = await import("./notify");
    expect(alertSettingsHaveDeliveryTimestamp(DEFAULT_ALERT_SETTINGS)).toBe(false);
  });

  it("is true when a test or freeze cooldown is set", async () => {
    const { alertSettingsHaveDeliveryTimestamp } = await import("./notify");
    expect(
      alertSettingsHaveDeliveryTimestamp({
        ...DEFAULT_ALERT_SETTINGS,
        lastAlertSentAt: "2026-09-04T12:00:00.000Z",
      }),
    ).toBe(true);
    expect(
      alertSettingsHaveDeliveryTimestamp({
        ...DEFAULT_ALERT_SETTINGS,
        lastFloodAlertAt: "2026-09-04T12:00:00.000Z",
      }),
    ).toBe(true);
  });
});

describe("ensureAlertDeliveryEvidence", () => {
  it("heals last_alert_sent_at from a delivered alert_events row", async () => {
    const updateEq = vi.fn().mockReturnValue({
      select: vi.fn().mockResolvedValue({ data: [{ user_id: "user-1" }], error: null }),
    });
    const fromMock = vi.fn((table: string) => {
      if (table === "alert_events") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue({
                  data: [{ channels_sent: ["email"] }],
                  error: null,
                }),
              }),
            }),
          }),
        };
      }
      if (table === "alert_settings") {
        return {
          update: vi.fn().mockReturnValue({
            eq: updateEq,
          }),
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: {
                  user_id: "user-1",
                  enabled: true,
                  last_alert_sent_at: "2026-09-04T16:00:00.000Z",
                },
                error: null,
              }),
            }),
          }),
          upsert: vi.fn().mockResolvedValue({ error: null }),
        };
      }
      return {};
    });

    vi.doMock("./supabase", () => ({
      createServerClient: () => ({ from: fromMock }),
    }));

    const { ensureAlertDeliveryEvidence } = await import("./notify");
    const result = await ensureAlertDeliveryEvidence("user-1", DEFAULT_ALERT_SETTINGS);
    expect(result.hasDelivery).toBe(true);
    expect(result.settings.lastAlertSentAt).toBe("2026-09-04T16:00:00.000Z");
  });

  it("stays false when events were only skipped", async () => {
    const fromMock = vi.fn((table: string) => {
      if (table === "alert_events") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue({
                  data: [{ channels_sent: [] }],
                  error: null,
                }),
              }),
            }),
          }),
        };
      }
      return {};
    });

    vi.doMock("./supabase", () => ({
      createServerClient: () => ({ from: fromMock }),
    }));

    const { ensureAlertDeliveryEvidence } = await import("./notify");
    const result = await ensureAlertDeliveryEvidence("user-1", DEFAULT_ALERT_SETTINGS);
    expect(result.hasDelivery).toBe(false);
  });
});
