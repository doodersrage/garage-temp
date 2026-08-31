import { describe, expect, it } from "vitest";
import { escapeHtml } from "./htmlEscape";
import { verifyInboundSignature } from "./inboundSigning";

describe("escapeHtml", () => {
  it("escapes markup", () => {
    expect(escapeHtml(`<img src=x onerror="alert(1)">`)).toBe(
      "&lt;img src=x onerror=&quot;alert(1)&quot;&gt;",
    );
  });
});

describe("verifyInboundSignature", () => {
  it("rejects missing signing secret (fail closed)", async () => {
    expect(await verifyInboundSignature(null, "{}", "abc")).toBe(false);
    expect(await verifyInboundSignature("", "{}", "abc")).toBe(false);
  });
});
