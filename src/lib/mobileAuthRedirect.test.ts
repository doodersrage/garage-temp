import { describe, expect, it } from "vitest";
import {
  buildMobileOAuthCustomUrl,
  buildMobileOAuthHttpsUrl,
  buildMobileOAuthIntentUrl,
} from "./mobileAuthRedirect";

describe("mobile OAuth return URLs", () => {
  const token = "payload.sig";

  it("uses host oauth (not a path) so Android intent-filters match", () => {
    expect(buildMobileOAuthCustomUrl(token)).toBe(
      "dev.thermaltrace.android://oauth?exchange=payload.sig",
    );
  });

  it("sends Chrome to an HTTPS App Link instead of a custom-scheme 302", () => {
    expect(buildMobileOAuthHttpsUrl(token, "https://thermaltrace.dev")).toBe(
      "https://thermaltrace.dev/app/oauth?exchange=payload.sig",
    );
  });

  it("builds an Android intent:// URL Chrome will hand off after WebAuthn", () => {
    expect(buildMobileOAuthIntentUrl(token)).toBe(
      "intent://oauth?exchange=payload.sig#Intent;scheme=dev.thermaltrace.android;package=dev.thermaltrace.android;end",
    );
  });
});
