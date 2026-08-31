import { beforeEach, describe, expect, it, vi } from "vitest";

function mockQuery(result: { data?: unknown; error?: unknown }) {
  const builder: Record<string, unknown> = {};
  for (const method of ["select", "eq", "upsert", "update", "delete"]) {
    builder[method] = vi.fn(() => builder);
  }
  builder.maybeSingle = vi.fn(() => Promise.resolve(result));
  (builder as { then: unknown }).then = (
    resolve: (value: unknown) => unknown,
    reject?: (reason: unknown) => unknown,
  ) => Promise.resolve(result).then(resolve, reject);
  return builder;
}

const mockFrom = vi.fn();
vi.mock("./supabase", () => ({
  createServerClient: () => ({ from: (...args: unknown[]) => mockFrom(...args) }),
}));

beforeEach(() => {
  mockFrom.mockReset();
});

describe("getConnectionForHousehold", () => {
  it("returns null when no connection exists", async () => {
    mockFrom.mockReturnValueOnce(mockQuery({ data: null, error: null }));
    const { getConnectionForHousehold } = await import("./thermostatConnections");
    const result = await getConnectionForHousehold("house-1", "ecobee");
    expect(result).toBeNull();
    expect(mockFrom).toHaveBeenCalledWith("household_thermostat_connections");
  });

  it("maps a row to camelCase", async () => {
    mockFrom.mockReturnValueOnce(
      mockQuery({
        data: {
          id: "conn-1",
          household_id: "house-1",
          provider: "ecobee",
          refresh_token: "rt-abc",
          access_token: "at-abc",
          access_token_expires_at: "2026-09-01T00:00:00.000Z",
          external_device_id: "therm-1",
          connected_by: "user-1",
          created_at: "2026-08-31T00:00:00.000Z",
          updated_at: "2026-08-31T00:00:00.000Z",
        },
        error: null,
      }),
    );
    const { getConnectionForHousehold } = await import("./thermostatConnections");
    const result = await getConnectionForHousehold("house-1", "ecobee");
    expect(result).toEqual({
      id: "conn-1",
      householdId: "house-1",
      provider: "ecobee",
      refreshToken: "rt-abc",
      accessToken: "at-abc",
      accessTokenExpiresAt: "2026-09-01T00:00:00.000Z",
      externalDeviceId: "therm-1",
      connectedBy: "user-1",
      createdAt: "2026-08-31T00:00:00.000Z",
      updatedAt: "2026-08-31T00:00:00.000Z",
    });
  });
});

describe("saveConnection", () => {
  it("upserts on household_id,provider", async () => {
    const upsert = vi.fn(() => Promise.resolve({ error: null }));
    mockFrom.mockReturnValueOnce({ upsert });
    const { saveConnection } = await import("./thermostatConnections");
    const { error } = await saveConnection({
      householdId: "house-1",
      provider: "nest",
      refreshToken: "rt-xyz",
    });
    expect(error).toBeNull();
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        household_id: "house-1",
        provider: "nest",
        refresh_token: "rt-xyz",
      }),
      { onConflict: "household_id,provider" },
    );
  });
});

describe("deleteConnection", () => {
  it("scopes the delete to household and provider", async () => {
    const calls: Array<{ method: string; args: unknown[] }> = [];
    const builder: Record<string, unknown> = {};
    for (const method of ["delete", "eq"]) {
      builder[method] = vi.fn((...args: unknown[]) => {
        calls.push({ method, args });
        return builder;
      });
    }
    (builder as { then: unknown }).then = (resolve: (value: unknown) => unknown) =>
      Promise.resolve({ error: null }).then(resolve);
    mockFrom.mockReturnValueOnce(builder);

    const { deleteConnection } = await import("./thermostatConnections");
    const { error } = await deleteConnection("house-1", "ecobee");

    expect(error).toBeNull();
    expect(calls).toEqual([
      { method: "delete", args: [] },
      { method: "eq", args: ["household_id", "house-1"] },
      { method: "eq", args: ["provider", "ecobee"] },
    ]);
  });
});

describe("updateTokensAfterRefresh", () => {
  it("updates access token and expiry, keeps refresh_token if not rotated", async () => {
    const update = vi.fn(() => {
      const chain: Record<string, unknown> = {};
      chain.eq = vi.fn(() => chain);
      (chain as { then: unknown }).then = (resolve: (value: unknown) => unknown) =>
        Promise.resolve({ error: null }).then(resolve);
      return chain;
    });
    mockFrom.mockReturnValueOnce({ update });
    const { updateTokensAfterRefresh } = await import("./thermostatConnections");
    const { error } = await updateTokensAfterRefresh("house-1", "nest", {
      accessToken: "new-at",
      expiresAtMs: Date.parse("2026-09-01T00:00:00.000Z"),
    });
    expect(error).toBeNull();
    expect(update).toHaveBeenCalledWith(
      expect.not.objectContaining({ refresh_token: expect.anything() }),
    );
  });
});
