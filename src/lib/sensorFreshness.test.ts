import { describe, expect, it } from "vitest";
import { LAG_MS } from "./relativeTime";
import {
  freshnessDetailForSource,
  isSensorLagging,
  summarizeStaleSensors,
} from "./sensorFreshness";
import type { DeviceWithSensors } from "./devices";

const devices = [
  {
    id: "pull-1",
    source: "pull_url",
    name: "Garage pull",
    sensors: [],
  },
  {
    id: "push-1",
    source: "push",
    name: "ESP push",
    sensors: [],
  },
] as unknown as DeviceWithSensors[];

describe("sensorFreshness", () => {
  it("flags sensors older than LAG_MS as lagging", () => {
    const fresh = new Date(Date.now() - LAG_MS + 60_000).toISOString();
    const stale = new Date(Date.now() - LAG_MS - 60_000).toISOString();
    expect(isSensorLagging(fresh)).toBe(false);
    expect(isSensorLagging(stale)).toBe(true);
  });

  it("summarizes pull vs push stale counts", () => {
    const staleAt = new Date(Date.now() - LAG_MS - 60_000).toISOString();
    const summary = summarizeStaleSensors(
      [
        {
          sensor: { id: "s1", device_id: "pull-1", label: "Temp" },
          deviceName: "Garage pull",
          recorded_at: staleAt,
        },
        {
          sensor: { id: "s2", device_id: "push-1", label: "Temp" },
          deviceName: "ESP push",
          recorded_at: staleAt,
        },
      ],
      devices,
    );

    expect(summary.total).toBe(2);
    expect(summary.pullCount).toBe(1);
    expect(summary.pushCount).toBe(1);
    expect(summary.bannerMessage).toContain("look stale");
  });

  it("uses pull-specific freshness copy", () => {
    const text = freshnessDetailForSource(
      new Date(Date.now() - 5 * 60_000).toISOString(),
      "pull_url",
    );
    expect(text).toContain("Polled");
  });
});
