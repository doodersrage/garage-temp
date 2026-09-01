import { describe, expect, it } from "vitest";
import { listLowBatteryDevices, lowBatteryBannerMessage } from "./deviceBatteryUi";
import type { DeviceWithSensors } from "./devices";

const devices = [
  {
    id: "a",
    name: "Garage ESP",
    enabled: true,
    source: "push",
    meta: { battery_pct: 12 },
    sensors: [],
  },
  {
    id: "b",
    name: "Attic",
    enabled: true,
    source: "push",
    meta: { battery_pct: 88 },
    sensors: [],
  },
  {
    id: "c",
    name: "Pull feed",
    enabled: true,
    source: "pull_url",
    meta: { battery_pct: 5 },
    sensors: [],
  },
] as unknown as DeviceWithSensors[];

describe("deviceBatteryUi", () => {
  it("lists only enabled push devices below threshold", () => {
    const low = listLowBatteryDevices(devices, 20);
    expect(low).toHaveLength(1);
    expect(low[0]?.name).toBe("Garage ESP");
  });

  it("builds a banner message", () => {
    const low = listLowBatteryDevices(devices, 20);
    expect(lowBatteryBannerMessage(low)).toContain("Garage ESP");
  });
});
