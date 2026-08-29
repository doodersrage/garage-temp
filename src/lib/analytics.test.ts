import { describe, expect, it } from "vitest";
import {
  DEFAULT_GA_MEASUREMENT_ID,
  resolveGaCookieDomain,
  resolveGaMeasurementId,
  shouldLoadGoogleAnalytics,
} from "./analytics";

describe("resolveGaMeasurementId", () => {
  it("returns default when env is unset", () => {
    expect(resolveGaMeasurementId({})).toBe(DEFAULT_GA_MEASUREMENT_ID);
  });

  it("returns env override", () => {
    expect(resolveGaMeasurementId({ GA_MEASUREMENT_ID: "G-TEST123" })).toBe(
      "G-TEST123",
    );
  });

  it("returns null when disabled", () => {
    expect(resolveGaMeasurementId({ GA_MEASUREMENT_ID: "off" })).toBeNull();
  });
});

describe("shouldLoadGoogleAnalytics", () => {
  it("skips non-production", () => {
    expect(shouldLoadGoogleAnalytics("/", { prod: false })).toBe(false);
  });

  it("loads on marketing pages in production", () => {
    expect(shouldLoadGoogleAnalytics("/pricing", { prod: true })).toBe(true);
  });

  it("skips dashboard and api routes", () => {
    expect(shouldLoadGoogleAnalytics("/dashboard", { prod: true })).toBe(false);
    expect(shouldLoadGoogleAnalytics("/api/contact", { prod: true })).toBe(false);
  });

  it("loads on post-checkout success under dashboard", () => {
    expect(
      shouldLoadGoogleAnalytics("/dashboard/history", {
        prod: true,
        search: "subscription=success",
      }),
    ).toBe(true);
  });
});

describe("resolveGaCookieDomain", () => {
  it("returns registrable domain for apex host", () => {
    expect(resolveGaCookieDomain("thermaltrace.dev")).toBe(".thermaltrace.dev");
  });

  it("returns undefined for localhost", () => {
    expect(resolveGaCookieDomain("localhost")).toBeUndefined();
  });
});
