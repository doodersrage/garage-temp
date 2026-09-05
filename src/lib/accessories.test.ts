import { describe, expect, it } from "vitest";
import { ACCESSORIES, getAccessory, accessoriesExcluding } from "./accessories";

describe("accessories", () => {
  it("lists claim puck and seven companion/kit paths", () => {
    expect(ACCESSORIES.length).toBe(8);
    expect(ACCESSORIES.map((a) => a.id)).toContain("claim-puck");
    expect(ACCESSORIES.map((a) => a.path)).toEqual(
      expect.arrayContaining([
        "/alert-beacon",
        "/door-puck",
        "/leak-puck",
        "/power-nudge",
        "/kit-labels",
        "/probe-mount-kit",
        "/claim-puck-case",
      ]),
    );
  });

  it("resolves accessories and excludes self from related", () => {
    expect(getAccessory("leak-puck").name).toBe("Leak contact puck");
    const related = accessoriesExcluding("leak-puck");
    expect(related.every((a) => a.id !== "leak-puck")).toBe(true);
    expect(related.length).toBe(ACCESSORIES.length - 1);
  });
});
