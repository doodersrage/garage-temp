import { describe, expect, it } from "vitest";
import {
  HISTORY_POLL_STALE_MS,
  isCollectHistoryStale,
} from "./cronHealth";

describe("cronHealth", () => {
  it("marks history poll stale after two missed 15-minute slots plus grace", () => {
    const fresh = new Date(Date.now() - HISTORY_POLL_STALE_MS + 60_000).toISOString();
    const stale = new Date(Date.now() - HISTORY_POLL_STALE_MS - 60_000).toISOString();

    expect(isCollectHistoryStale(fresh)).toBe(false);
    expect(isCollectHistoryStale(stale)).toBe(true);
    expect(isCollectHistoryStale(null)).toBe(true);
  });
});
