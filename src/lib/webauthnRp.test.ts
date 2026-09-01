import { afterEach, describe, expect, it, vi } from "vitest";
import { resolveWebAuthnRp } from "./webauthnRp";

describe("resolveWebAuthnRp", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("prefers SITE_URL over the request host for rpId", () => {
    vi.stubEnv("SITE_URL", "https://thermaltrace.dev");
    const request = new Request("http://localhost:4321/signin/mfa");
    expect(resolveWebAuthnRp(request)).toEqual({
      rpId: "thermaltrace.dev",
      rpOrigins: ["https://thermaltrace.dev"],
    });
  });

  it("falls back to the request host when SITE_URL is unset", () => {
    vi.stubEnv("SITE_URL", "");
    vi.stubEnv("ORIGIN", "");
    const request = new Request("http://localhost:4321/signin/mfa");
    expect(resolveWebAuthnRp(request)).toEqual({
      rpId: "localhost",
      rpOrigins: ["http://localhost:4321"],
    });
  });
});
