import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// updateUserDisplayPreferences must create a fresh auth client per call
// rather than using the shared `supabase` singleton -- see the doc
// comment on that export in ./supabase.ts. A shared client's setSession()
// followed by an implicit updateUser() is a race under Cloudflare
// Workers' concurrent-request model: a different in-flight request's
// setSession() could land in between and this call would silently apply
// to that other user's account instead.
const sharedSingletonSetSession = vi.fn(() => {
  throw new Error(
    "updateUserDisplayPreferences must never use the shared `supabase` singleton",
  );
});

const mockCreateAuthClient = vi.fn();
vi.mock("./supabase", () => ({
  supabase: { auth: { setSession: sharedSingletonSetSession } },
  createAuthClient: (...args: unknown[]) => mockCreateAuthClient(...args),
}));

function makeFakeClient(opts: {
  sessionOk?: boolean;
  updateUserError?: { message: string } | null;
  updatedUser?: unknown;
}) {
  const { sessionOk = true, updateUserError = null, updatedUser = { id: "user-1" } } = opts;
  return {
    auth: {
      setSession: vi.fn(() =>
        Promise.resolve(
          sessionOk
            ? { data: { session: { access_token: "at" } }, error: null }
            : { data: { session: null }, error: { message: "invalid" } },
        ),
      ),
      updateUser: vi.fn(() =>
        Promise.resolve(
          updateUserError
            ? { data: { user: null }, error: updateUserError }
            : { data: { user: updatedUser }, error: null },
        ),
      ),
    },
  };
}

beforeEach(() => {
  mockCreateAuthClient.mockReset();
  sharedSingletonSetSession.mockClear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("updateUserDisplayPreferences", () => {
  it("uses a fresh client per call and applies the update to it", async () => {
    const fakeClient = makeFakeClient({ updatedUser: { id: "user-42" } });
    mockCreateAuthClient.mockReturnValue(fakeClient);

    const { updateUserDisplayPreferences } = await import("./userPreferences");
    const result = await updateUserDisplayPreferences("at-1", "rt-1", {
      showGarageTemps: true,
      showWeather: false,
      weatherCityId: "123",
      useCelsius: false,
      theme: "dark",
    });

    expect(mockCreateAuthClient).toHaveBeenCalledTimes(1);
    expect(fakeClient.auth.setSession).toHaveBeenCalledWith({
      access_token: "at-1",
      refresh_token: "rt-1",
    });
    expect(fakeClient.auth.updateUser).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ user: { id: "user-42" }, error: null });
    expect(sharedSingletonSetSession).not.toHaveBeenCalled();
  });

  it("creates a distinct client on every call", async () => {
    const clientA = makeFakeClient({ updatedUser: { id: "user-a" } });
    const clientB = makeFakeClient({ updatedUser: { id: "user-b" } });
    mockCreateAuthClient.mockReturnValueOnce(clientA).mockReturnValueOnce(clientB);

    const { updateUserDisplayPreferences } = await import("./userPreferences");
    const prefs = {
      showGarageTemps: true,
      showWeather: true,
      weatherCityId: null,
      useCelsius: false,
      theme: "dark" as const,
    };

    const resultA = await updateUserDisplayPreferences("at-a", "rt-a", prefs);
    const resultB = await updateUserDisplayPreferences("at-b", "rt-b", prefs);

    expect(mockCreateAuthClient).toHaveBeenCalledTimes(2);
    expect(resultA.user).toEqual({ id: "user-a" });
    expect(resultB.user).toEqual({ id: "user-b" });
  });

  it("returns an error without touching updateUser when the session is invalid", async () => {
    const fakeClient = makeFakeClient({ sessionOk: false });
    mockCreateAuthClient.mockReturnValue(fakeClient);

    const { updateUserDisplayPreferences } = await import("./userPreferences");
    const result = await updateUserDisplayPreferences("at-1", "rt-1", {
      showGarageTemps: true,
      showWeather: true,
      weatherCityId: null,
      useCelsius: false,
      theme: "dark",
    });

    expect(result.user).toBeNull();
    expect(result.error).toBeTruthy();
    expect(fakeClient.auth.updateUser).not.toHaveBeenCalled();
  });
});
