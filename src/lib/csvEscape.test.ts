import { describe, expect, it } from "vitest";
import { escapeCsvField } from "./csvEscape";

describe("escapeCsvField", () => {
  it("leaves plain values untouched", () => {
    expect(escapeCsvField("hello")).toBe("hello");
    expect(escapeCsvField(42)).toBe("42");
  });

  it("quotes values containing commas, quotes, or newlines", () => {
    expect(escapeCsvField("a,b")).toBe('"a,b"');
    expect(escapeCsvField('say "hi"')).toBe('"say ""hi"""');
    expect(escapeCsvField("line1\nline2")).toBe('"line1\nline2"');
  });

  it("neutralizes leading formula characters (CSV injection)", () => {
    expect(escapeCsvField("=cmd|' /C calc'!A1")).toBe("'=cmd|' /C calc'!A1");
    expect(escapeCsvField("+1+1")).toBe("'+1+1");
    expect(escapeCsvField("@SUM(A1:A2)")).toBe("'@SUM(A1:A2)");
    expect(escapeCsvField("\tsneaky")).toBe("'\tsneaky");
  });

  it("still quotes a neutralized formula value that also needs CSV quoting", () => {
    expect(escapeCsvField("=A1,B1")).toBe('"\'=A1,B1"');
  });

  it("does not corrupt legitimate plain numbers, including negatives", () => {
    // Negative readings (e.g. sub-freezing temperatures) are core to this
    // app and must stay plain numeric text in the exported CSV, not get
    // quoted into a string a spreadsheet would sort/chart incorrectly.
    expect(escapeCsvField("-5.2")).toBe("-5.2");
    expect(escapeCsvField(-5.2)).toBe("-5.2");
    expect(escapeCsvField("+3")).toBe("+3");
    expect(escapeCsvField("0")).toBe("0");
  });

  it("does not flag a legitimate hyphenated word", () => {
    expect(escapeCsvField("well-known")).toBe("well-known");
  });
});
