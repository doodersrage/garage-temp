import { describe, expect, it } from "vitest";
import { shouldRunDailyRetention, RAW_READING_RETENTION_DAYS } from "./retentionSchedule";
import { computeIndoorOutdoorDelta } from "./indoorOutdoorDelta";
import { resolvePlanTierFromPriceId } from "./planTier";
import { parseIngestPayload, inferSensorKind } from "./ingestPayload";

describe("retention schedule", () => {
  it("runs at 03:00 UTC", () => {
    expect(shouldRunDailyRetention(new Date("2026-08-25T03:15:00.000Z"))).toBe(true);
    expect(shouldRunDailyRetention(new Date("2026-08-25T04:00:00.000Z"))).toBe(false);
  });

  it("keeps a 90-day default retention window", () => {
    expect(RAW_READING_RETENTION_DAYS).toBe(90);
  });
});

describe("plan tiers", () => {
  it("defaults to member", () => {
    expect(resolvePlanTierFromPriceId(undefined)).toBe("member");
  });
});

describe("ingest + indoor delta smoke", () => {
  it("infers door kind", () => {
    expect(inferSensorKind("door1", { key: "door1", bool: true })).toBe("door");
  });

  it("parses classic temp payload", () => {
    const { tempProbes } = parseIngestPayload({
      temp: { "0": { c: 10, f: 50, h: 40 } },
    });
    expect(tempProbes["0"]?.f).toBe(50);
  });

  it("computes outdoor delta", () => {
    const delta = computeIndoorOutdoorDelta(
      [{ timestamp: "t", tempf: 70, humidity: 40, probeLabel: "A" }],
      60,
      "clear",
      "Town",
    );
    expect(delta?.deltaF).toBe(10);
  });
});
