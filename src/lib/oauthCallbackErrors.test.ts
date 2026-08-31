import { describe, expect, it } from "vitest";
import {
  mapOAuthCallbackError,
  sanitizeOAuthErrorDetail,
} from "./oauthCallbackErrors";

describe("mapOAuthCallbackError", () => {
  it("maps access_denied to oauth_denied", () => {
    expect(mapOAuthCallbackError("access_denied")).toBe("oauth_denied");
  });

  it("maps external code exchange failures to oauth_secret_mismatch", () => {
    expect(
      mapOAuthCallbackError("server_error", "Unable to exchange external code: wzkO"),
    ).toBe("oauth_secret_mismatch");
  });

  it("maps GitHub profile failures to oauth_github_profile", () => {
    expect(
      mapOAuthCallbackError(
        "server_error",
        "Error getting user profile from external provider",
      ),
    ).toBe("oauth_github_profile");
  });

  it("maps provider server errors to oauth_provider_failed", () => {
    expect(mapOAuthCallbackError("server_error", "Provider unavailable")).toBe(
      "oauth_provider_failed",
    );
  });
});

describe("sanitizeOAuthErrorDetail", () => {
  it("trims and collapses whitespace", () => {
    expect(sanitizeOAuthErrorDetail("  Unable   to exchange  code  ")).toBe(
      "Unable to exchange code",
    );
  });

  it("returns null for empty input", () => {
    expect(sanitizeOAuthErrorDetail("   ")).toBeNull();
  });
});
