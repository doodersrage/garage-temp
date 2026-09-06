import { describe, expect, it } from "vitest";
import {
  ANALYTICS_CSP_SCRIPT_HOSTS,
  DEFAULT_GA_MEASUREMENT_ID,
  resolveGaCookieDomain,
  resolveGaMeasurementId,
  shouldLoadGoogleAnalytics,
} from "./analytics";

describe("ANALYTICS_CSP_SCRIPT_HOSTS", () => {
  it("includes Ahrefs and Google hosts for future CSP", () => {
    expect(ANALYTICS_CSP_SCRIPT_HOSTS).toContain("https://analytics.ahrefs.com");
    expect(ANALYTICS_CSP_SCRIPT_HOSTS).toContain("https://www.googletagmanager.com");
  });
});

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

  it("skips mobile OAuth handoff path", () => {
    expect(shouldLoadGoogleAnalytics("/app/oauth", { prod: true })).toBe(false);
    expect(shouldLoadGoogleAnalytics("/app/oauth?exchange=abc", { prod: true })).toBe(
      false,
    );
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
