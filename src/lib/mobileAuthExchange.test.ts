import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const runtimeEnvStore = new Map<string, string>();
const mockInsert = vi.fn();
const mockDeleteChain = {
  eq: vi.fn(),
  gt: vi.fn(),
  select: vi.fn(),
  maybeSingle: vi.fn(),
};

vi.mock("./runtimeEnv", () => ({
  getRuntimeEnv: (key: string) => runtimeEnvStore.get(key),
}));

vi.mock("./supabase", () => ({
  createServerClient: () => ({
    from: () => ({
      insert: mockInsert,
      delete: () => mockDeleteChain,
    }),
  }),
}));

describe("mobileAuthExchange", () => {
  beforeEach(() => {
    runtimeEnvStore.clear();
    mockInsert.mockReset();
    mockDeleteChain.eq.mockReset();
    mockDeleteChain.gt.mockReset();
    mockDeleteChain.select.mockReset();
    mockDeleteChain.maybeSingle.mockReset();

    mockDeleteChain.eq.mockReturnValue(mockDeleteChain);
    mockDeleteChain.gt.mockReturnValue(mockDeleteChain);
    mockDeleteChain.select.mockReturnValue(mockDeleteChain);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it("returns null when no dedicated exchange/cron secret is configured", async () => {
    runtimeEnvStore.set("SUPABASE_SERVICE_ROLE_KEY", "service-role-not-allowed");
    const { createMobileExchangeToken } = await import("./mobileAuthExchange");
    await expect(createMobileExchangeToken("a", "r")).resolves.toBeNull();
  });

  it("creates a signed token with jti and records the exchange row", async () => {
    runtimeEnvStore.set("MOBILE_EXCHANGE_SECRET", "test-secret");
    mockInsert.mockResolvedValue({ error: null });
    const { createMobileExchangeToken } = await import("./mobileAuthExchange");

    const token = await createMobileExchangeToken("access", "refresh");
    expect(token).toMatch(/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/);
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        jti: expect.any(String),
        expires_at: expect.any(String),
      }),
    );
  });

  it("rejects a valid HMAC token when jti was already consumed", async () => {
    runtimeEnvStore.set("CRON_SECRET", "cron-secret");
    mockInsert.mockResolvedValue({ error: null });
    mockDeleteChain.maybeSingle.mockResolvedValue({ data: null, error: null });

    const mod = await import("./mobileAuthExchange");
    const token = await mod.createMobileExchangeToken("access", "refresh");
    expect(token).toBeTruthy();

    await expect(mod.verifyMobileExchangeToken(token!)).resolves.toBeNull();
  });

  it("consumes jti once and returns session tokens", async () => {
    runtimeEnvStore.set("MOBILE_EXCHANGE_SECRET", "test-secret");
    mockInsert.mockResolvedValue({ error: null });
    mockDeleteChain.maybeSingle.mockResolvedValue({
      data: { jti: "will-be-overwritten" },
      error: null,
    });

    const mod = await import("./mobileAuthExchange");
    const token = await mod.createMobileExchangeToken("access", "refresh");
    expect(token).toBeTruthy();

    const insertedJti = mockInsert.mock.calls[0][0].jti as string;
    mockDeleteChain.maybeSingle.mockResolvedValue({
      data: { jti: insertedJti },
      error: null,
    });

    await expect(mod.verifyMobileExchangeToken(token!)).resolves.toEqual({
      access_token: "access",
      refresh_token: "refresh",
    });
    expect(mockDeleteChain.eq).toHaveBeenCalledWith("jti", insertedJti);
  });
});
