import { describe, expect, it } from "vitest";
import {
  resolveGitHubEmail,
  userLinkedToGitHub,
  type GitHubEmail,
  type GitHubUser,
} from "./githubOAuth";

const baseUser: GitHubUser = {
  id: 42,
  login: "octocat",
  name: "The Octocat",
  email: null,
  avatar_url: "https://github.com/images/error/octocat_happy.gif",
};

describe("resolveGitHubEmail", () => {
  it("uses user.email only when it appears as verified in the emails list", () => {
    const emails: GitHubEmail[] = [
      { email: "public@example.com", primary: true, verified: true },
    ];
    expect(
      resolveGitHubEmail({ ...baseUser, email: " public@example.com " }, emails),
    ).toBe("public@example.com");
  });

  it("ignores unverified user.email and falls back to primary verified", () => {
    const emails: GitHubEmail[] = [
      { email: "public@example.com", primary: false, verified: false },
      { email: "primary@example.com", primary: true, verified: true },
    ];
    expect(
      resolveGitHubEmail({ ...baseUser, email: "public@example.com" }, emails),
    ).toBe("primary@example.com");
  });

  it("falls back to primary verified email", () => {
    const emails: GitHubEmail[] = [
      { email: "other@example.com", primary: false, verified: true },
      { email: "primary@example.com", primary: true, verified: true },
    ];
    expect(resolveGitHubEmail(baseUser, emails)).toBe("primary@example.com");
  });

  it("uses any verified email when none is primary", () => {
    const emails: GitHubEmail[] = [
      { email: "verified@example.com", primary: false, verified: true },
    ];
    expect(resolveGitHubEmail(baseUser, emails)).toBe("verified@example.com");
  });

  it("does not use unverified emails", () => {
    const emails: GitHubEmail[] = [
      { email: "unverified@example.com", primary: true, verified: false },
    ];
    expect(resolveGitHubEmail(baseUser, emails)).toBe(
      "42+octocat@users.noreply.github.com",
    );
  });

  it("uses GitHub noreply address when no verified email is available", () => {
    expect(resolveGitHubEmail(baseUser, [])).toBe("42+octocat@users.noreply.github.com");
  });
});

describe("userLinkedToGitHub", () => {
  it("accepts app_metadata.provider github", () => {
    expect(
      userLinkedToGitHub({ app_metadata: { provider: "github" }, user_metadata: {} }, 42),
    ).toBe(true);
  });

  it("accepts providers array containing github", () => {
    expect(
      userLinkedToGitHub(
        { app_metadata: { providers: ["email", "github"] }, user_metadata: {} },
        42,
      ),
    ).toBe(true);
  });

  it("accepts matching user_metadata.github_id", () => {
    expect(
      userLinkedToGitHub({ app_metadata: {}, user_metadata: { github_id: 42 } }, 42),
    ).toBe(true);
  });

  it("rejects unrelated accounts", () => {
    expect(
      userLinkedToGitHub(
        { app_metadata: { provider: "email", providers: ["email"] }, user_metadata: {} },
        42,
      ),
    ).toBe(false);
  });
});
