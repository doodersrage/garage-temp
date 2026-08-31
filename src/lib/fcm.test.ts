import { describe, expect, it, vi } from "vitest";
import { isStaleFcmError, releaseFcmTokenFromOtherUsers } from "./fcm";
import type { createAdminClient } from "./supabase";

describe("isStaleFcmError", () => {
  it("treats NOT_FOUND and UNREGISTERED as stale", () => {
    expect(isStaleFcmError(404)).toBe(true);
    expect(isStaleFcmError(400, "UNREGISTERED")).toBe(true);
    expect(isStaleFcmError(400, "NOT_FOUND")).toBe(true);
  });

  it("keeps other errors", () => {
    expect(isStaleFcmError(500)).toBe(false);
    expect(isStaleFcmError(403, "PERMISSION_DENIED")).toBe(false);
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

describe("releaseFcmTokenFromOtherUsers", () => {
  it("deletes the token from any other account, scoped by token and excluding the caller", async () => {
    const { client, calls } = makeChainClient();
    await releaseFcmTokenFromOtherUsers(client, "user-a", "tok-123");

    expect(calls).toEqual([
      { method: "from", args: ["fcm_device_tokens"] },
      { method: "delete", args: [] },
      { method: "eq", args: ["token", "tok-123"] },
      { method: "neq", args: ["user_id", "user-a"] },
    ]);
  });
});
