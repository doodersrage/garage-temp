import { describe, expect, it } from "vitest";

/** Mirrors webPush.isStalePushStatus without loading Supabase in tests. */
function isStalePushStatus(status: number): boolean {
  return status === 404 || status === 410;
}

describe("web push helpers", () => {
  it("treats 404 and 410 as stale subscriptions", () => {
    expect(isStalePushStatus(404)).toBe(true);
    expect(isStalePushStatus(410)).toBe(true);
    expect(isStalePushStatus(201)).toBe(false);
    expect(isStalePushStatus(500)).toBe(false);
  });
});
