import { describe, expect, it } from "vitest";
import { pathRequiresAuth } from "./routeAuth";

describe("pathRequiresAuth", () => {
  it("allows public home and Stripe webhook endpoints", () => {
    expect(pathRequiresAuth("/api/stripe/webhook")).toBe(false);
    expect(pathRequiresAuth("/api/home/demo-temps")).toBe(false);
    expect(pathRequiresAuth("/api/home/weather")).toBe(false);
    expect(pathRequiresAuth("/")).toBe(false);
    expect(pathRequiresAuth("/signin")).toBe(false);
  });

  it("requires auth for dashboard and protected APIs", () => {
    expect(pathRequiresAuth("/dashboard")).toBe(true);
    expect(pathRequiresAuth("/dashboard/alerts")).toBe(true);
    expect(pathRequiresAuth("/api/home/readings")).toBe(true);
    expect(pathRequiresAuth("/api/stripe/checkout")).toBe(true);
    expect(pathRequiresAuth("/api/user/alert-settings")).toBe(true);
    expect(pathRequiresAuth("/api/devices")).toBe(true);
    expect(pathRequiresAuth("/api/claims/pack")).toBe(true);
    expect(pathRequiresAuth("/api/alerts/export.csv")).toBe(true);
  });

  it("keeps token-based alert links public", () => {
    expect(pathRequiresAuth("/api/alerts/snooze")).toBe(false);
    expect(pathRequiresAuth("/api/alerts/ack")).toBe(false);
  });
});
