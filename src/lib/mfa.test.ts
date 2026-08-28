import { describe, expect, it } from "vitest";
import {
  buildMfaChallengeUrl,
  decodeAccessTokenPayload,
  getAalClaim,
  needsMfaStepUp,
} from "./mfa";

function fakeJwt(payload: Record<string, unknown>): string {
  const header = btoa(JSON.stringify({ alg: "none", typ: "JWT" }));
  const body = btoa(JSON.stringify(payload));
  return `${header}.${body}.sig`;
}

describe("mfa helpers", () => {
  it("decodes aal claims from access tokens", () => {
    const token = fakeJwt({ aal: "aal1", sub: "user-1" });
    expect(getAalClaim(token)).toBe("aal1");
    expect(decodeAccessTokenPayload(token)?.sub).toBe("user-1");
    expect(getAalClaim(fakeJwt({ aal: "aal2" }))).toBe("aal2");
    expect(getAalClaim("not-a-jwt")).toBeNull();
  });

  it("detects MFA step-up when current aal1 and next aal2", () => {
    expect(needsMfaStepUp({ currentLevel: "aal1", nextLevel: "aal2" })).toBe(true);
    expect(needsMfaStepUp({ currentLevel: "aal2", nextLevel: "aal2" })).toBe(false);
    expect(needsMfaStepUp({ currentLevel: "aal1", nextLevel: "aal1" })).toBe(false);
    expect(needsMfaStepUp(null)).toBe(false);
  });

  it("builds MFA challenge URLs with safe next paths", () => {
    expect(buildMfaChallengeUrl(null)).toBe("/signin/mfa");
    expect(buildMfaChallengeUrl("/dashboard")).toBe("/signin/mfa");
    expect(buildMfaChallengeUrl("/dashboard/alerts")).toBe(
      "/signin/mfa?next=%2Fdashboard%2Falerts",
    );
    expect(buildMfaChallengeUrl("https://evil.example")).toBe("/signin/mfa");
  });
});
