import { describe, expect, it } from "vitest";
import {
  REGISTER_NEXT_DEVICES,
  buildRegisterHref,
  sanitizeRegisterNext,
} from "./registerUrl";

describe("registerUrl", () => {
  it("defaults next to Devices", () => {
    expect(buildRegisterHref()).toBe(
      `/register?next=${encodeURIComponent(REGISTER_NEXT_DEVICES)}`,
    );
  });

  it("keeps a safe custom next and ref", () => {
    expect(buildRegisterHref({ next: "/dashboard/alerts", ref: "ABC" })).toBe(
      "/register?next=%2Fdashboard%2Falerts&ref=abc",
    );
  });

  it("rejects protocol-relative next", () => {
    expect(sanitizeRegisterNext("//evil.example")).toBeNull();
    expect(buildRegisterHref({ next: "//evil.example" })).toContain(
      encodeURIComponent(REGISTER_NEXT_DEVICES),
    );
  });
});
