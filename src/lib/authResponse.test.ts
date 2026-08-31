import { describe, expect, it } from "vitest";
import { prefersJsonAuthError } from "./authResponse";

describe("prefersJsonAuthError", () => {
  it("treats explicit JSON Accept as API", () => {
    const req = new Request("https://example.com/api/stripe/checkout", {
      headers: { Accept: "application/json" },
    });
    expect(prefersJsonAuthError(req)).toBe(true);
  });

  it("treats form posts like the pricing upgrade button as redirects", () => {
    const req = new Request("https://example.com/api/stripe/checkout", {
      method: "POST",
      headers: {
        Accept: "text/html,application/xhtml+xml",
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });
    expect(prefersJsonAuthError(req)).toBe(false);
  });

  it("treats Playwright-style */* JSON bodies as API", () => {
    const req = new Request("https://example.com/api/stripe/checkout", {
      method: "POST",
      headers: {
        Accept: "*/*",
        "Content-Type": "application/json",
      },
    });
    expect(prefersJsonAuthError(req)).toBe(true);
  });
});
