import { describe, expect, it } from "vitest";
import {
  parseFeedDeviceMeta,
  parseTempFeedPayload,
  sanitizeJsonRoot,
} from "./tempFeedConfig";

describe("sanitizeJsonRoot", () => {
  it("defaults to temp and rejects invalid keys", () => {
    expect(sanitizeJsonRoot("")).toBe("temp");
    expect(sanitizeJsonRoot("readings")).toBe("readings");
    expect(sanitizeJsonRoot("data.temp")).toBe("temp");
    expect(sanitizeJsonRoot("1bad")).toBe("temp");
  });
});

describe("parseTempFeedPayload", () => {
  it("reads probes from the default temp root", () => {
    const probes = parseTempFeedPayload({
      temp: { "0": { f: 40, c: 4.4, h: 50 } },
    });
    expect(probes["0"]?.f).toBe(40);
    expect(probes.avg?.f).toBe(40);
  });

  it("reads probes from a custom JSON root key", () => {
    const probes = parseTempFeedPayload(
      {
        readings: { bay: { f: 38, h: 55 } },
      },
      "readings",
    );
    expect(probes.bay?.f).toBe(38);
    expect(probes.avg?.f).toBe(38);
  });

  it("errors when the configured root is missing", () => {
    expect(() =>
      parseTempFeedPayload({ temp: { "0": { f: 40 } } }, "readings"),
    ).toThrow(/missing a "readings" object/);
  });
});

describe("parseFeedDeviceMeta", () => {
  it("extracts battery and rssi from feed root or meta object", () => {
    expect(
      parseFeedDeviceMeta({ battery_pct: 88, rssi: -62, temp: { t1: { f: 40, h: 50 } } }),
    ).toEqual({ battery_pct: 88, rssi: -62 });
    expect(parseFeedDeviceMeta({ meta: { battery_pct: 50 } })).toEqual({ battery_pct: 50 });
  });
});
