import { describe, expect, it } from "vitest";
import { isBlockedFetchHost, isSafeHttpsUrl } from "./ssrfGuard";

describe("isBlockedFetchHost", () => {
  it("blocks loopback and localhost", () => {
    expect(isBlockedFetchHost("127.0.0.1")).toBe(true);
    expect(isBlockedFetchHost("127.255.255.255")).toBe(true);
    expect(isBlockedFetchHost("localhost")).toBe(true);
    expect(isBlockedFetchHost("foo.localhost")).toBe(true);
    expect(isBlockedFetchHost("::1")).toBe(true);
  });

  it("blocks RFC1918 private ranges", () => {
    expect(isBlockedFetchHost("10.0.0.1")).toBe(true);
    expect(isBlockedFetchHost("172.16.0.1")).toBe(true);
    expect(isBlockedFetchHost("172.31.255.255")).toBe(true);
    expect(isBlockedFetchHost("192.168.1.50")).toBe(true);
  });

  it("blocks link-local and the cloud metadata address", () => {
    expect(isBlockedFetchHost("169.254.169.254")).toBe(true);
    expect(isBlockedFetchHost("169.254.1.1")).toBe(true);
    expect(isBlockedFetchHost("fe80::1")).toBe(true);
  });

  it("blocks IPv6 unique-local and IPv4-mapped loopback", () => {
    expect(isBlockedFetchHost("fc00::1")).toBe(true);
    expect(isBlockedFetchHost("fd12:3456::1")).toBe(true);
    expect(isBlockedFetchHost("::ffff:127.0.0.1")).toBe(true);
  });

  it("does not block a range that merely starts with 172 outside 16-31", () => {
    expect(isBlockedFetchHost("172.15.0.1")).toBe(false);
    expect(isBlockedFetchHost("172.32.0.1")).toBe(false);
  });

  it("allows ordinary public hosts", () => {
    expect(isBlockedFetchHost("api.example.com")).toBe(false);
    expect(isBlockedFetchHost("8.8.8.8")).toBe(false);
    expect(isBlockedFetchHost("thermaltrace.dev")).toBe(false);
  });
});

describe("isSafeHttpsUrl", () => {
  it("accepts a plain public https URL", () => {
    expect(isSafeHttpsUrl("https://api.example.com/feed")).toBe(true);
  });

  it("rejects non-https protocols", () => {
    expect(isSafeHttpsUrl("http://api.example.com/feed")).toBe(false);
    expect(isSafeHttpsUrl("ftp://api.example.com/feed")).toBe(false);
  });

  it("rejects a private-network target even over https", () => {
    expect(isSafeHttpsUrl("https://192.168.1.50/feed")).toBe(false);
    expect(isSafeHttpsUrl("https://169.254.169.254/latest/meta-data")).toBe(false);
    expect(isSafeHttpsUrl("https://localhost/feed")).toBe(false);
  });

  it("rejects unparseable input without throwing", () => {
    expect(isSafeHttpsUrl("not a url")).toBe(false);
    expect(isSafeHttpsUrl("")).toBe(false);
  });
});
