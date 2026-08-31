import { describe, expect, it, vi } from "vitest";
import type { AstroCookies } from "astro";
import {
  clearOAuthPkceCookie,
  createOAuthAuthClient,
  createOAuthPkceStorage,
  OAUTH_PKCE_COOKIE,
  OAUTH_STORAGE_KEY,
} from "./oauthAuthClient";

function makeMockCookies() {
  const store = new Map<string, string>();
  const cookies = {
    get: (name: string) =>
      store.has(name) ? { value: store.get(name)! } : undefined,
    set: vi.fn((name: string, value: string) => {
      store.set(name, value);
    }),
    delete: vi.fn((name: string) => {
      store.delete(name);
    }),
    _store: store,
  };
  return cookies as unknown as AstroCookies & { _store: Map<string, string> };
}

describe("createOAuthPkceStorage", () => {
  it("persists the PKCE verifier under the oauth cookie", () => {
    const cookies = makeMockCookies();
    const storage = createOAuthPkceStorage(cookies);
    const key = `${OAUTH_STORAGE_KEY}-code-verifier`;

    storage.setItem(key, "verifier-abc");
    expect(cookies.set).toHaveBeenCalledWith(
      OAUTH_PKCE_COOKIE,
      "verifier-abc",
      expect.objectContaining({ httpOnly: true, sameSite: "lax" }),
    );
    expect(storage.getItem(key)).toBe("verifier-abc");

    storage.removeItem(key);
    expect(cookies.delete).toHaveBeenCalledWith(OAUTH_PKCE_COOKIE, { path: "/" });
    expect(storage.getItem(key)).toBeNull();
  });

  it("ignores unrelated storage keys", () => {
    const cookies = makeMockCookies();
    const storage = createOAuthPkceStorage(cookies);

    storage.setItem("other-key", "x");
    expect(cookies.set).not.toHaveBeenCalled();
    expect(storage.getItem("other-key")).toBeNull();
  });
});

describe("createOAuthAuthClient", () => {
  it("creates a PKCE client with cookie-backed storage", () => {
    vi.stubEnv("SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("SUPABASE_ANON_KEY", "anon-key");

    const cookies = makeMockCookies();
    const client = createOAuthAuthClient(cookies);
    expect(client).toBeTruthy();
  });

  it("stores the PKCE verifier in a cookie during signInWithOAuth", async () => {
    vi.stubEnv("SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("SUPABASE_ANON_KEY", "anon-key");

    const cookies = makeMockCookies();
    const client = createOAuthAuthClient(cookies);
    const { data, error } = await client.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: "https://example.com/api/auth/callback" },
    });

    expect(error).toBeNull();
    expect(data.url).toContain("code_challenge=");
    expect(cookies.set).toHaveBeenCalledWith(
      OAUTH_PKCE_COOKIE,
      expect.any(String),
      expect.objectContaining({ httpOnly: true, sameSite: "lax" }),
    );
  });
});

describe("clearOAuthPkceCookie", () => {
  it("deletes the oauth pkce cookie", () => {
    const cookies = makeMockCookies();
    clearOAuthPkceCookie(cookies);
    expect(cookies.delete).toHaveBeenCalledWith(OAUTH_PKCE_COOKIE, { path: "/" });
  });
});
