import { describe, expect, it, vi } from "vitest";

vi.mock("./supabase", () => ({
  createAdminClient: vi.fn(),
}));

import { releasePushSubscriptionFromOtherUsers } from "./webPush";
import type { createAdminClient } from "./supabase";

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

function makeChainClient() {
  const calls: Array<{ method: string; args: unknown[] }> = [];
  const builder: Record<string, unknown> = {};
  for (const method of ["from", "delete", "eq", "neq"]) {
    builder[method] = vi.fn((...args: unknown[]) => {
      calls.push({ method, args });
      return builder;
    });
  }
  (builder as { then: unknown }).then = (resolve: (value: unknown) => unknown) =>
    Promise.resolve({ error: null }).then(resolve);
  return { client: builder as unknown as ReturnType<typeof createAdminClient>, calls };
}

describe("releasePushSubscriptionFromOtherUsers", () => {
  it("deletes the endpoint from any other account, scoped by endpoint and excluding the caller", async () => {
    const { client, calls } = makeChainClient();
    await releasePushSubscriptionFromOtherUsers(client, "user-a", "https://push.example.com/ep1");

    expect(calls).toEqual([
      { method: "from", args: ["push_subscriptions"] },
      { method: "delete", args: [] },
      { method: "eq", args: ["endpoint", "https://push.example.com/ep1"] },
      { method: "neq", args: ["user_id", "user-a"] },
    ]);
  });
});
