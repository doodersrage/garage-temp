import { describe, expect, it } from "vitest";
import { freezeMapAggregateKey, normalizeGeocodeResults } from "./weatherCities";

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
