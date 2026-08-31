import { describe, expect, it } from "vitest";
import {
  formatLiveTempDetail,
  formatLiveTempF,
} from "./temperatureFormat";

describe("formatLiveTempF", () => {
  it("rounds to hundredths", () => {
    expect(formatLiveTempF(89.78001)).toBe("89.78°F");
    expect(formatLiveTempF(89.60001)).toBe("89.60°F");
  });

  it("handles non-finite values", () => {
    expect(formatLiveTempF(Number.NaN)).toBe("—");
  });
});

describe("formatLiveTempDetail", () => {
  it("rounds C and humidity", () => {
    expect(formatLiveTempDetail(32.10001, 61.666)).toBe(
      "32.10°C · 61.67% humidity",
    );
  });
});
