import { describe, expect, it } from "vitest";
import { resolveWebAuthnRp } from "./webauthnRp";

describe("resolveWebAuthnRp", () => {
  it("uses the configured site hostname as rpId", () => {
    const request = new Request("https://thermaltrace.dev/signin/mfa");
    expect(resolveWebAuthnRp(request)).toEqual({
      rpId: "thermaltrace.dev",
      rpOrigins: ["https://thermaltrace.dev"],
    });
  });

  it("supports localhost during local development", () => {
    const request = new Request("http://localhost:4321/signin/mfa");
    expect(resolveWebAuthnRp(request)).toEqual({
      rpId: "localhost",
      rpOrigins: ["http://localhost:4321"],
    });
  });
});
