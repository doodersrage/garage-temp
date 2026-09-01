import { describe, expect, it } from "vitest";
import { resolveGitHubEmail, type GitHubEmail, type GitHubUser } from "./githubOAuth";

const baseUser: GitHubUser = {
  id: 42,
  login: "octocat",
  name: "The Octocat",
  email: null,
  avatar_url: "https://github.com/images/error/octocat_happy.gif",
};

describe("resolveGitHubEmail", () => {
  it("prefers the public email on the user object", () => {
    expect(
      resolveGitHubEmail({ ...baseUser, email: " public@example.com " }, []),
    ).toBe("public@example.com");
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

  it("uses GitHub noreply address when no email is available", () => {
    expect(resolveGitHubEmail(baseUser, [])).toBe("42+octocat@users.noreply.github.com");
  });
});
