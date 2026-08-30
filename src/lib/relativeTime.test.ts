import { describe, expect, it, vi, afterEach } from "vitest";
import {
  LAG_MS,
  STALE_MS,
  formatRelativeAge,
  freshnessDetail,
} from "./relativeTime";

describe("formatRelativeAge", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("marks lagging after 30 minutes and stale after 2 hours", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-15T12:00:00Z"));

    const fresh = formatRelativeAge("2026-01-15T11:45:00Z");
    expect(fresh.lagging).toBe(false);
    expect(fresh.stale).toBe(false);
    expect(fresh.label).toBe("15m ago");

    const lagging = formatRelativeAge(
      new Date(Date.now() - LAG_MS - 60_000).toISOString(),
    );
    expect(lagging.lagging).toBe(true);
    expect(lagging.stale).toBe(false);

    const stale = formatRelativeAge(
      new Date(Date.now() - STALE_MS - 60_000).toISOString(),
    );
    expect(stale.lagging).toBe(true);
    expect(stale.stale).toBe(true);
  });

  it("builds live freshness copy", () => {
    expect(
      freshnessDetail({
        label: "22m ago",
        lagging: true,
        stale: false,
        absolute: null,
      }),
    ).toBe("May be offline · last seen 22m ago");
    expect(
      freshnessDetail({
        label: "3h ago",
        lagging: true,
        stale: true,
        absolute: null,
      }),
    ).toBe("Offline · last seen 3h ago");
  });
});
