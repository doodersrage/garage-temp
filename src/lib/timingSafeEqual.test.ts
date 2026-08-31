import { describe, expect, it } from "vitest";
import { timingSafeEqual, timingSafeEqualHex } from "./timingSafeEqual";

describe("timingSafeEqualHex", () => {
  it("returns true for identical hex strings", () => {
    expect(timingSafeEqualHex("deadbeef", "deadbeef")).toBe(true);
    expect(timingSafeEqualHex("", "")).toBe(true);
  });

  it("returns false when content differs", () => {
    expect(timingSafeEqualHex("deadbeef", "deadbeee")).toBe(false);
    expect(timingSafeEqualHex("aaaaaaaa", "bbbbbbbb")).toBe(false);
  });

  it("returns false when lengths differ, without throwing", () => {
    expect(timingSafeEqualHex("dead", "deadbeef")).toBe(false);
    expect(timingSafeEqualHex("deadbeef", "dead")).toBe(false);
    expect(timingSafeEqualHex("", "a")).toBe(false);
  });

  it("is case-sensitive (callers must normalize case before comparing)", () => {
    expect(timingSafeEqualHex("deadbeef", "DEADBEEF")).toBe(false);
  });
});

describe("timingSafeEqual", () => {
  it("returns true for identical strings, including non-hex content", () => {
    expect(timingSafeEqual("Bearer some-secret-token", "Bearer some-secret-token")).toBe(true);
    expect(timingSafeEqual("", "")).toBe(true);
  });

  it("returns false when content differs", () => {
    expect(timingSafeEqual("Bearer correct", "Bearer wrong")).toBe(false);
  });

  it("returns false when lengths differ, without throwing", () => {
    expect(timingSafeEqual("short", "much longer string")).toBe(false);
    expect(timingSafeEqual("", "a")).toBe(false);
  });
});
