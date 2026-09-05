import { describe, expect, it } from "vitest";
import { isBayMood, isValidBayId, resolveBayMood } from "./bayMood";

describe("resolveBayMood", () => {
  it("prioritizes panic over other moods", () => {
    expect(
      resolveBayMood({
        wetContact: true,
        feedHealthy: false,
        freezeMarginF: 1,
        doorOpen: true,
      }),
    ).toBe("panic");
  });

  it("returns offline when feed is unhealthy", () => {
    expect(
      resolveBayMood({
        wetContact: false,
        feedHealthy: false,
        freezeMarginF: 20,
        doorOpen: false,
      }),
    ).toBe("offline");
  });

  it("returns shiver when freeze margin is tight", () => {
    expect(
      resolveBayMood({
        wetContact: false,
        feedHealthy: true,
        freezeMarginF: 3,
        doorOpen: false,
      }),
    ).toBe("shiver");
  });

  it("returns drafty when door is open", () => {
    expect(
      resolveBayMood({
        wetContact: false,
        feedHealthy: true,
        freezeMarginF: 20,
        doorOpen: true,
      }),
    ).toBe("drafty");
  });

  it("returns cozy when calm", () => {
    expect(
      resolveBayMood({
        wetContact: false,
        feedHealthy: true,
        freezeMarginF: 15,
        doorOpen: false,
      }),
    ).toBe("cozy");
  });
});

describe("bay id / mood guards", () => {
  it("validates mood names", () => {
    expect(isBayMood("cozy")).toBe(true);
    expect(isBayMood("nope")).toBe(false);
  });

  it("validates bay ids", () => {
    expect(isValidBayId("garage")).toBe(true);
    expect(isValidBayId("shop.bay_1")).toBe(true);
    expect(isValidBayId("bad id")).toBe(false);
  });
});
