import { describe, expect, it } from "vitest";
import {
  buildBayBuddyOAuthCustomUrl,
  buildDesktopOAuthCustomUrl,
  buildLoopbackOAuthUrl,
  isSafeCompanionLoopback,
  parseCompanionClient,
} from "./companionAuth";

describe("companionAuth", () => {
  it("accepts only http loopback oauth callbacks", () => {
    expect(isSafeCompanionLoopback("http://127.0.0.1:47821/oauth")).toBe(true);
    expect(isSafeCompanionLoopback("http://localhost:47821/oauth")).toBe(true);
    expect(isSafeCompanionLoopback("https://127.0.0.1:47821/oauth")).toBe(false);
    expect(isSafeCompanionLoopback("http://evil.com:47821/oauth")).toBe(false);
    expect(isSafeCompanionLoopback("http://127.0.0.1:80/oauth")).toBe(false);
    expect(isSafeCompanionLoopback("http://127.0.0.1:47821/admin")).toBe(false);
  });

  it("builds Bay Buddy custom scheme and loopback URLs", () => {
    expect(buildBayBuddyOAuthCustomUrl("tok.sig")).toBe(
      "com.thermaltrace.baybuddy://oauth?exchange=tok.sig",
    );
    expect(buildLoopbackOAuthUrl("http://127.0.0.1:9/oauth", "tok.sig")).toBe(
      "http://127.0.0.1:9/oauth?exchange=tok.sig",
    );
  });

  it("builds Desktop custom scheme URLs", () => {
    expect(buildDesktopOAuthCustomUrl("tok.sig")).toBe(
      "com.thermaltrace.desktop://oauth?exchange=tok.sig",
    );
  });

  it("parses companion client ids", () => {
    expect(parseCompanionClient("desktop")).toBe("desktop");
    expect(parseCompanionClient("android")).toBe("android");
    expect(parseCompanionClient("baybuddy")).toBe("baybuddy");
    expect(parseCompanionClient(null)).toBe("baybuddy");
  });
});
