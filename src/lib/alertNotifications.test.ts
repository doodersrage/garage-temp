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

const mockFetchThermostatAnnotation = vi.fn();
vi.mock("./thermostatCorrelation", () => ({
  fetchThermostatAnnotationForHousehold: (...args: unknown[]) =>
    mockFetchThermostatAnnotation(...args),
}));

beforeEach(() => {
  mockNotifyUser.mockReset().mockResolvedValue(undefined);
  mockMarkCooldown.mockReset().mockResolvedValue(undefined);
  mockMarkEscalation.mockReset().mockResolvedValue(undefined);
  mockFetchThermostatAnnotation.mockReset().mockResolvedValue(null);
});

const freezingReading: AlertReading[] = [
  { label: "Garage", tempf: 30, humidity: 40 },
];

describe("sendThresholdAlertsIfNeeded thermostat annotation", () => {
  it("sends the alert with no annotation when there's no connected thermostat", async () => {
    const { sendThresholdAlertsIfNeeded } = await import("./alertNotifications");
    await sendThresholdAlertsIfNeeded(
      "user-1",
      "a@example.com",
      { ...DEFAULT_ALERT_SETTINGS, enabled: true },
      freezingReading,
      "house-1",
    );

    expect(mockFetchThermostatAnnotation).toHaveBeenCalledWith("house-1");
    expect(mockNotifyUser).toHaveBeenCalledTimes(1);
    const body = mockNotifyUser.mock.calls[0][3].body as string;
    expect(body).toContain("Garage is 30.0");
    expect(body).not.toContain("House thermostat");
    expect(mockMarkCooldown).toHaveBeenCalledWith("user-1", "last_alert_sent_at");
  });

  it("appends the annotation to the alert body when a thermostat is connected", async () => {
    mockFetchThermostatAnnotation.mockResolvedValue(
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
    // The underlying alert message is untouched, just appended to.
    expect(body.startsWith("Garage is 30.0")).toBe(true);
  });

  it("still sends the alert even if the thermostat lookup throws, never blocking or delaying it", async () => {
    mockFetchThermostatAnnotation.mockRejectedValue(new Error("provider down"));
    const { sendThresholdAlertsIfNeeded } = await import("./alertNotifications");
    // fetchThermostatAnnotationForHousehold already fails closed internally
    // (see its own tests), and the call site here also catches on top of
    // that -- a bug in the thermostat-lookup path must never be able to
    // block or delay a real freeze alert.
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
    expect(body).not.toContain("House thermostat");
    expect(mockMarkCooldown).toHaveBeenCalledWith("user-1", "last_alert_sent_at");
  });

  it("doesn't send an alert or look up a thermostat when nothing crosses threshold", async () => {
    const { sendThresholdAlertsIfNeeded } = await import("./alertNotifications");
    await sendThresholdAlertsIfNeeded(
      "user-1",
      "a@example.com",
      { ...DEFAULT_ALERT_SETTINGS, enabled: true },
      [{ label: "Garage", tempf: 70, humidity: 40 }],
      "house-1",
    );

    expect(mockFetchThermostatAnnotation).not.toHaveBeenCalled();
    expect(mockNotifyUser).not.toHaveBeenCalled();
  });

  it("works with no householdId (annotation lookup receives undefined, resolves to no annotation)", async () => {
    const { sendThresholdAlertsIfNeeded } = await import("./alertNotifications");
    await sendThresholdAlertsIfNeeded(
      "user-1",
      "a@example.com",
      { ...DEFAULT_ALERT_SETTINGS, enabled: true },
      freezingReading,
    );

    expect(mockFetchThermostatAnnotation).toHaveBeenCalledWith(undefined);
    expect(mockNotifyUser).toHaveBeenCalledTimes(1);
  });
});
