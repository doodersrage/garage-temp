import { beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_ALERT_SETTINGS, type AlertReading } from "./alerts";

const mockNotifyUser = vi.fn();
const mockMarkCooldown = vi.fn();
const mockMarkEscalation = vi.fn();
vi.mock("./notify", () => ({
  notifyUser: (...args: unknown[]) => mockNotifyUser(...args),
  markCooldown: (...args: unknown[]) => mockMarkCooldown(...args),
  markEscalation: (...args: unknown[]) => mockMarkEscalation(...args),
  getAlertSettingsForUser: vi.fn(),
  saveAlertSettingsForUser: vi.fn(),
}));

const mockBuildFreezeAlertContext = vi.fn();
vi.mock("./alertContext", () => ({
  buildFreezeAlertContext: (...args: unknown[]) => mockBuildFreezeAlertContext(...args),
}));

beforeEach(() => {
  mockNotifyUser.mockReset().mockResolvedValue(undefined);
  mockMarkCooldown.mockReset().mockResolvedValue(undefined);
  mockMarkEscalation.mockReset().mockResolvedValue(undefined);
  mockBuildFreezeAlertContext.mockReset().mockResolvedValue(null);
});

const freezingReading: AlertReading[] = [
  { label: "Garage", tempf: 30, humidity: 40 },
];

describe("sendThresholdAlertsIfNeeded context block", () => {
  it("sends the alert with no context when buildFreezeAlertContext returns null", async () => {
    const { sendThresholdAlertsIfNeeded } = await import("./alertNotifications");
    await sendThresholdAlertsIfNeeded(
      "user-1",
      "a@example.com",
      { ...DEFAULT_ALERT_SETTINGS, enabled: true },
      freezingReading,
      "house-1",
    );

    expect(mockBuildFreezeAlertContext).toHaveBeenCalled();
    expect(mockNotifyUser).toHaveBeenCalledTimes(1);
    const body = mockNotifyUser.mock.calls[0][3].body as string;
    expect(body).toContain("Garage is 30.0");
    expect(body).not.toContain("House thermostat");
    expect(mockMarkCooldown).toHaveBeenCalledWith("user-1", "last_alert_sent_at");
  });

  it("appends context to the alert body when provided", async () => {
    mockBuildFreezeAlertContext.mockResolvedValue(
      "House thermostat: 68°F, set to 70°F, actively heating -- this alert is from an unconditioned space and is expected to run colder.",
    );
    const { sendThresholdAlertsIfNeeded } = await import("./alertNotifications");
    await sendThresholdAlertsIfNeeded(
      "user-1",
      "a@example.com",
      { ...DEFAULT_ALERT_SETTINGS, enabled: true },
      freezingReading,
      "house-1",
    );

    expect(mockNotifyUser).toHaveBeenCalledTimes(1);
    const body = mockNotifyUser.mock.calls[0][3].body as string;
    expect(body).toContain("Garage is 30.0");
    expect(body).toContain("House thermostat: 68°F");
    expect(body.startsWith("Garage is 30.0")).toBe(true);
  });

  it("still sends the alert when context builder throws", async () => {
    mockBuildFreezeAlertContext.mockRejectedValue(new Error("context down"));
    const { sendThresholdAlertsIfNeeded } = await import("./alertNotifications");
    await sendThresholdAlertsIfNeeded(
      "user-1",
      "a@example.com",
      { ...DEFAULT_ALERT_SETTINGS, enabled: true },
      freezingReading,
      "house-1",
    );

    expect(mockNotifyUser).toHaveBeenCalledTimes(1);
    const body = mockNotifyUser.mock.calls[0][3].body as string;
    expect(body).toContain("Garage is 30.0");
    expect(mockMarkCooldown).toHaveBeenCalledWith("user-1", "last_alert_sent_at");
  });

  it("doesn't send an alert when nothing crosses threshold", async () => {
    const { sendThresholdAlertsIfNeeded } = await import("./alertNotifications");
    await sendThresholdAlertsIfNeeded(
      "user-1",
      "a@example.com",
      { ...DEFAULT_ALERT_SETTINGS, enabled: true },
      [{ label: "Garage", tempf: 70, humidity: 40 }],
      "house-1",
    );

    expect(mockBuildFreezeAlertContext).not.toHaveBeenCalled();
    expect(mockNotifyUser).not.toHaveBeenCalled();
  });
});
