import { describe, expect, it } from "vitest";
import { timingSafeEqualHex } from "./timingSafeEqual";

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
