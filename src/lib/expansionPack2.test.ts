import { describe, expect, it } from "vitest";
import {
  DEFAULT_ALERT_SETTINGS,
  parseChannelSeverity,
} from "./alerts";
import {
  freezeMapAggregateKey,
  normalizeGeocodeResults,
} from "./weatherCities";
import { quietHoursAllowsSmsCritical, shouldSuppressForQuietHours } from "./quietHours";
import { resolvePlanTierFromPriceId, resolveStripePriceId } from "./planTier";

describe("normalizeGeocodeResults", () => {
  it("keeps valid OpenWeather geocode rows and builds labels", () => {
    const results = normalizeGeocodeResults([
      { name: "Nashville", state: "TN", country: "US", lat: 36.16, lon: -86.78 },
      { name: "Broken", lat: "x", lon: -1 },
      null,
    ]);
    expect(results).toHaveLength(1);
    expect(results[0]?.label).toBe("Nashville, TN, US");
    expect(results[0]?.lat).toBeCloseTo(36.16);
  });

  it("returns empty for non-arrays", () => {
    expect(normalizeGeocodeResults(null)).toEqual([]);
    expect(normalizeGeocodeResults({})).toEqual([]);
  });
});

describe("freezeMapAggregateKey", () => {
  it("prefers numeric city ids", () => {
    expect(freezeMapAggregateKey({ cityId: "4644585", lat: 1, lon: 2 })).toBe("4644585");
  });

  it("falls back to geo keys rounded to 2 decimals", () => {
    expect(freezeMapAggregateKey({ cityId: null, lat: 36.1627, lon: -86.7816 })).toBe(
      "geo:36.16,-86.78",
    );
  });

  it("returns null when neither id nor coords are usable", () => {
    expect(freezeMapAggregateKey({ cityId: "geo-custom", lat: null, lon: null })).toBeNull();
  });
});

describe("parseChannelSeverity", () => {
  it("keeps known kinds and channels only", () => {
    expect(
      parseChannelSeverity({
        threshold: ["sms", "email", "carrier-pigeon"],
        mystery: ["email"],
        forecast: "sms",
      }),
    ).toEqual({
      threshold: ["sms", "email"],
    });
  });

  it("returns empty for invalid JSON shapes", () => {
    expect(parseChannelSeverity(null)).toEqual({});
    expect(parseChannelSeverity([])).toEqual({});
  });
});

describe("quiet hours SMS critical", () => {
  const base = {
    ...DEFAULT_ALERT_SETTINGS,
    quietHoursEnabled: true,
    quietHoursStart: "00:00",
    quietHoursEnd: "23:59",
    quietHoursTimezone: "UTC",
    quietHoursBypassFreeze: false,
    quietHoursSmsCritical: true,
  };

  it("suppresses non-SMS channels during quiet hours", () => {
    expect(shouldSuppressForQuietHours(base, "threshold")).toBe(true);
  });

  it("allows SMS for threshold/forecast when sms critical is on", () => {
    expect(quietHoursAllowsSmsCritical(base, "threshold")).toBe(true);
    expect(quietHoursAllowsSmsCritical(base, "forecast")).toBe(true);
    expect(quietHoursAllowsSmsCritical(base, "rate")).toBe(false);
  });

  it("does not allow SMS critical when setting is off", () => {
    expect(
      quietHoursAllowsSmsCritical(
        { ...base, quietHoursSmsCritical: false },
        "threshold",
      ),
    ).toBe(false);
  });
});

describe("annual stripe price mapping", () => {
  it("defaults unknown price ids to member", () => {
    expect(resolvePlanTierFromPriceId("price_unknown")).toBe("member");
  });

  it("resolveStripePriceId falls back when annual unset", () => {
    const env = import.meta.env as Record<string, string | undefined>;
    const prev = {
      memberM: env.STRIPE_PRICE_ID,
      memberA: env.STRIPE_PRICE_ID_ANNUAL,
      proM: env.STRIPE_PRICE_ID_PRO,
      proA: env.STRIPE_PRICE_ID_PRO_ANNUAL,
    };
    env.STRIPE_PRICE_ID = "";
    env.STRIPE_PRICE_ID_ANNUAL = "";
    env.STRIPE_PRICE_ID_PRO = "";
    env.STRIPE_PRICE_ID_PRO_ANNUAL = "";

    expect(resolveStripePriceId("member", "monthly")).toBeUndefined();
    expect(resolveStripePriceId("member", "annual")).toBeUndefined();

    env.STRIPE_PRICE_ID = prev.memberM;
    env.STRIPE_PRICE_ID_ANNUAL = prev.memberA;
    env.STRIPE_PRICE_ID_PRO = prev.proM;
    env.STRIPE_PRICE_ID_PRO_ANNUAL = prev.proA;
  });
});
