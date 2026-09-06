import { beforeEach, describe, expect, it, vi } from "vitest";

const { runtimeEnvStore } = vi.hoisted(() => ({
  runtimeEnvStore: new Map<string, string>(),
}));

vi.mock("./runtimeEnv", () => ({
  getRuntimeEnv: (key: string) => runtimeEnvStore.get(key),
}));

vi.mock("./supabase", () => ({
  createAdminClient: vi.fn(),
}));

import {
  getFcmConfigStatus,
  isFcmConfigured,
  isStaleFcmError,
  releaseFcmTokenFromOtherUsers,
} from "./fcm";
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

describe("FCM_SERVICE_ACCOUNT_JSON parsing", () => {
  beforeEach(() => {
    runtimeEnvStore.clear();
  });

  it("accepts normal service-account JSON", () => {
    runtimeEnvStore.set(
      "FCM_SERVICE_ACCOUNT_JSON",
      JSON.stringify({
        project_id: "demo",
        client_email: "svc@demo.iam.gserviceaccount.com",
        private_key: "-----BEGIN PRIVATE KEY-----\\nABC\\n-----END PRIVATE KEY-----\\n",
      }),
    );
    expect(isFcmConfigured()).toBe(true);
    expect(getFcmConfigStatus()).toBe("configured");
  });

  it("accepts over-escaped JSON left by a bad secrets push", () => {
    const good = JSON.stringify({
      project_id: "demo",
      client_email: "svc@demo.iam.gserviceaccount.com",
      private_key: "-----BEGIN PRIVATE KEY-----\\nABC\\n-----END PRIVATE KEY-----\\n",
    });
    runtimeEnvStore.set("FCM_SERVICE_ACCOUNT_JSON", good.replace(/"/g, '\\"'));
    expect(isFcmConfigured()).toBe(true);
    expect(getFcmConfigStatus()).toBe("configured");
  });

  it("reports invalid when JSON cannot be parsed into required fields", () => {
    runtimeEnvStore.set("FCM_SERVICE_ACCOUNT_JSON", "{not-json");
    expect(isFcmConfigured()).toBe(false);
    expect(getFcmConfigStatus()).toBe("invalid");
  });

  it("reports missing when unset", () => {
    expect(getFcmConfigStatus()).toBe("missing");
  });
});
