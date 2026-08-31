import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AstroCookies } from "astro";

// getAuthFromCookies runs on essentially every authenticated request. It
// must create a fresh auth client per call rather than using the shared
// `supabase` singleton -- see the doc comment on that export in
// ./supabase.ts for why (Cloudflare Workers can interleave concurrent
// requests from different users within one isolate's shared global
// scope). These tests guard that regression directly: the shared
// `supabase` mock throws if anything ever calls it, and we assert
// createAuthClient() is invoked fresh for every call.
const sharedSingletonSetSession = vi.fn(() => {
  throw new Error("getAuthFromCookies must never use the shared `supabase` singleton");
});

const mockCreateAuthClient = vi.fn();
vi.mock("./supabase", () => ({
  supabase: { auth: { setSession: sharedSingletonSetSession } },
  createAuthClient: (...args: unknown[]) => mockCreateAuthClient(...args),
}));

function makeFakeClient(result: { data: { session: unknown; user: unknown }; error: unknown }) {
  return {
    auth: {
      setSession: vi.fn(() => Promise.resolve(result)),
    },
  };
}

function makeMockCookies(values: Record<string, string>) {
  const deleted: string[] = [];
  const cookies = {
    get: (name: string) =>
      values[name] !== undefined ? { value: values[name] } : undefined,
    delete: vi.fn((name: string) => {
      deleted.push(name);
    }),
    _deleted: deleted,
  };
  return cookies as unknown as AstroCookies & { _deleted: string[] };
}

beforeEach(() => {
  mockCreateAuthClient.mockReset();
  sharedSingletonSetSession.mockClear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("getAuthFromCookies", () => {
  it("returns null without creating a client when cookies are missing", async () => {
    const { getAuthFromCookies } = await import("./auth");
    const cookies = makeMockCookies({});
    const result = await getAuthFromCookies(cookies);

    expect(result).toEqual({ session: null, user: null });
    expect(mockCreateAuthClient).not.toHaveBeenCalled();
    expect(sharedSingletonSetSession).not.toHaveBeenCalled();
  });

  it("creates a fresh client per call and returns its session/user", async () => {
    const session = { access_token: "new-access", refresh_token: "new-refresh" };
    const user = { id: "user-1" };
    const fakeClient = makeFakeClient({ data: { session, user }, error: null });
    mockCreateAuthClient.mockReturnValue(fakeClient);

    const { getAuthFromCookies } = await import("./auth");
    const cookies = makeMockCookies({
      "sb-access-token": "at-1",
      "sb-refresh-token": "rt-1",
    });
    const result = await getAuthFromCookies(cookies);

    expect(mockCreateAuthClient).toHaveBeenCalledTimes(1);
    expect(fakeClient.auth.setSession).toHaveBeenCalledWith({
      access_token: "at-1",
      refresh_token: "rt-1",
    });
    expect(result).toEqual({ session, user });
    expect(sharedSingletonSetSession).not.toHaveBeenCalled();
  });

  it("creates a brand-new client instance on every call, never reusing one", async () => {
    const clientA = makeFakeClient({
      data: { session: { access_token: "a" }, user: { id: "user-a" } },
      error: null,
    });
    const clientB = makeFakeClient({
      data: { session: { access_token: "b" }, user: { id: "user-b" } },
      error: null,
    });
    mockCreateAuthClient.mockReturnValueOnce(clientA).mockReturnValueOnce(clientB);

    const { getAuthFromCookies } = await import("./auth");

    const resultA = await getAuthFromCookies(
      makeMockCookies({ "sb-access-token": "at-a", "sb-refresh-token": "rt-a" }),
    );
    const resultB = await getAuthFromCookies(
      makeMockCookies({ "sb-access-token": "at-b", "sb-refresh-token": "rt-b" }),
    );

    expect(mockCreateAuthClient).toHaveBeenCalledTimes(2);
    // Each call's result must come from its own client -- proof that a
    // second concurrent/sequential call can never bleed into the first.
    expect(resultA.user).toEqual({ id: "user-a" });
    expect(resultB.user).toEqual({ id: "user-b" });
    expect(clientA.auth.setSession).toHaveBeenCalledTimes(1);
    expect(clientB.auth.setSession).toHaveBeenCalledTimes(1);
  });

  it("clears cookies and returns null when the session is invalid", async () => {
    const fakeClient = makeFakeClient({
      data: { session: null, user: null },
      error: { message: "invalid" },
    });
    mockCreateAuthClient.mockReturnValue(fakeClient);

    const { getAuthFromCookies } = await import("./auth");
    const cookies = makeMockCookies({
      "sb-access-token": "at-1",
      "sb-refresh-token": "rt-1",
    });
    const result = await getAuthFromCookies(cookies);

    expect(result).toEqual({ session: null, user: null });
    expect((cookies as unknown as { _deleted: string[] })._deleted).toEqual([
      "sb-access-token",
      "sb-refresh-token",
    ]);
  });
});
