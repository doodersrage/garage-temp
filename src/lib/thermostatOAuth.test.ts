import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockGetConnectionForHousehold = vi.fn();
const mockUpdateTokensAfterRefresh = vi.fn();
vi.mock("./thermostatConnections", () => ({
  getConnectionForHousehold: (...args: unknown[]) =>
    mockGetConnectionForHousehold(...args),
  updateTokensAfterRefresh: (...args: unknown[]) =>
    mockUpdateTokensAfterRefresh(...args),
}));

beforeEach(() => {
  mockGetConnectionForHousehold.mockReset();
  mockUpdateTokensAfterRefresh.mockReset().mockResolvedValue({ error: null });
  vi.unstubAllEnvs();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("refreshNestTokens", () => {
  it("returns tokens on success", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({ access_token: "at", refresh_token: "rt", expires_in: 3600 }),
          { status: 200 },
        ),
      ),
    );
    const { refreshNestTokens } = await import("./thermostatOAuth");
    const result = await refreshNestTokens("cid", "csecret", "rt-old");
    expect(result?.accessToken).toBe("at");
    expect(result?.refreshToken).toBe("rt");
  });

  it("returns null on a non-ok response", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("nope", { status: 400 })));
    const { refreshNestTokens } = await import("./thermostatOAuth");
    expect(await refreshNestTokens("cid", "csecret", "rt-old")).toBeNull();
  });
});

describe("refreshEcobeeTokens", () => {
  it("returns tokens on success", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({ access_token: "at", refresh_token: "rt", expires_in: 3600 }),
          { status: 200 },
        ),
      ),
    );
    const { refreshEcobeeTokens } = await import("./thermostatOAuth");
    const result = await refreshEcobeeTokens("cid", "rt-old");
    expect(result?.accessToken).toBe("at");
  });
});

describe("exchangeNestCode / exchangeEcobeeCode", () => {
  it("requires both an access_token and refresh_token in the response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ access_token: "at" }), { status: 200 }),
      ),
    );
    const { exchangeNestCode, exchangeEcobeeCode } = await import("./thermostatOAuth");
    expect(await exchangeNestCode("cid", "secret", "code", "https://x/cb")).toBeNull();
    expect(await exchangeEcobeeCode("cid", "code", "https://x/cb")).toBeNull();
  });

  it("returns tokens when both are present", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({ access_token: "at", refresh_token: "rt", expires_in: 1800 }),
          { status: 200 },
        ),
      ),
    );
    const { exchangeEcobeeCode } = await import("./thermostatOAuth");
    const result = await exchangeEcobeeCode("cid", "code", "https://x/cb");
    expect(result).toEqual(
      expect.objectContaining({ accessToken: "at", refreshToken: "rt" }),
    );
  });
});

describe("buildNestAuthorizeUrl / buildEcobeeAuthorizeUrl", () => {
  it("returns null when required env vars are missing", async () => {
    const { buildNestAuthorizeUrl, buildEcobeeAuthorizeUrl } = await import(
      "./thermostatOAuth"
    );
    expect(buildNestAuthorizeUrl("state", "https://x/cb")).toBeNull();
    expect(buildEcobeeAuthorizeUrl("state", "https://x/cb")).toBeNull();
  });

  it("builds a valid authorize URL once configured", async () => {
    vi.stubEnv("NEST_CLIENT_ID", "nest-cid");
    vi.stubEnv("NEST_PROJECT_ID", "proj-1");
    vi.stubEnv("ECOBEE_CLIENT_ID", "ecobee-cid");
    const { buildNestAuthorizeUrl, buildEcobeeAuthorizeUrl } = await import(
      "./thermostatOAuth"
    );
    const nestUrl = buildNestAuthorizeUrl("state-1", "https://x/cb");
    expect(nestUrl).toContain("https://nestservices.google.com/partnerconnections/proj-1/auth");
    expect(nestUrl).toContain("state=state-1");

    const ecobeeUrl = buildEcobeeAuthorizeUrl("state-2", "https://x/cb");
    expect(ecobeeUrl).toContain("https://api.ecobee.com/authorize");
    expect(ecobeeUrl).toContain("state=state-2");
  });
});

describe("resolveAccessTokenForHousehold", () => {
  it("returns null when there's no connection", async () => {
    mockGetConnectionForHousehold.mockResolvedValue(null);
    const { resolveAccessTokenForHousehold } = await import("./thermostatOAuth");
    expect(await resolveAccessTokenForHousehold("house-1", "ecobee")).toBeNull();
  });

  it("returns the stored access token when it's still fresh", async () => {
    mockGetConnectionForHousehold.mockResolvedValue({
      refreshToken: "rt",
      accessToken: "still-fresh",
      accessTokenExpiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    });
    const { resolveAccessTokenForHousehold } = await import("./thermostatOAuth");
    const result = await resolveAccessTokenForHousehold("house-1", "ecobee");
    expect(result).toBe("still-fresh");
    expect(mockUpdateTokensAfterRefresh).not.toHaveBeenCalled();
  });

  it("refreshes and persists when the access token is expired, and returns null if unconfigured", async () => {
    mockGetConnectionForHousehold.mockResolvedValue({
      refreshToken: "rt-old",
      accessToken: "stale",
      accessTokenExpiresAt: new Date(Date.now() - 1000).toISOString(),
    });
    const { resolveAccessTokenForHousehold } = await import("./thermostatOAuth");
    // ECOBEE_CLIENT_ID not stubbed -> refresh helper can't run -> null, no persist.
    const result = await resolveAccessTokenForHousehold("house-1", "ecobee");
    expect(result).toBeNull();
    expect(mockUpdateTokensAfterRefresh).not.toHaveBeenCalled();
  });

  it("persists refreshed tokens once configured", async () => {
    mockGetConnectionForHousehold.mockResolvedValue({
      refreshToken: "rt-old",
      accessToken: null,
      accessTokenExpiresAt: null,
    });
    vi.stubEnv("ECOBEE_CLIENT_ID", "ecobee-cid");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({ access_token: "fresh-at", refresh_token: "rt-new", expires_in: 3600 }),
          { status: 200 },
        ),
      ),
    );
    const { resolveAccessTokenForHousehold } = await import("./thermostatOAuth");
    const result = await resolveAccessTokenForHousehold("house-1", "ecobee");
    expect(result).toBe("fresh-at");
    expect(mockUpdateTokensAfterRefresh).toHaveBeenCalledWith(
      "house-1",
      "ecobee",
      expect.objectContaining({ accessToken: "fresh-at", refreshToken: "rt-new" }),
    );
  });
});
