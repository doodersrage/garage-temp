import { describe, expect, it } from "vitest";
import { compareGuides } from "./compareGuides";

describe("compareGuides", () => {
  it("keeps hub teasers distinct from sub-page ledes", () => {
    expect(compareGuides.length).toBe(5);
    for (const guide of compareGuides) {
      expect(guide.lede.length).toBeGreaterThan(guide.summary.length);
      expect(guide.lede).not.toBe(guide.summary);
      expect(guide.rows.length).toBeGreaterThanOrEqual(4);
      expect(guide.faqs.length).toBeGreaterThanOrEqual(3);
    }
  });
});
