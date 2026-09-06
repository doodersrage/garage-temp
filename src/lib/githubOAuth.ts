import type { Session, User } from "@supabase/supabase-js";
import { createAdminClient } from "./supabase";
import { getRuntimeEnv } from "./runtimeEnv";

export type GitHubUser = {
  id: number;
  login: string;
  name: string | null;
  email: string | null;
  avatar_url: string;
};

export type GitHubEmail = {
  email: string;
  primary: boolean;
  verified: boolean;
};

export type GitHubProfile = {
  user: GitHubUser;
  emails: GitHubEmail[];
};

const GITHUB_API_HEADERS = (token: string) => ({
  Authorization: `Bearer ${token}`,
  Accept: "application/vnd.github+json",
  "User-Agent": "ThermalTrace-OAuth/1.0",
  "X-GitHub-Api-Version": "2022-11-28",
});

export function isGitHubOAuthConfigured(): boolean {
  return Boolean(
    getRuntimeEnv("GITHUB_CLIENT_ID")?.trim() &&
      getRuntimeEnv("GITHUB_CLIENT_SECRET")?.trim(),
  );
}

export function buildGitHubAuthorizeUrl(state: string, redirectUri: string): string | null {
  const clientId = getRuntimeEnv("GITHUB_CLIENT_ID")?.trim();
  if (!clientId) return null;

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: "read:user user:email",
    state,
    response_type: "code",
  });

  return `https://github.com/login/oauth/authorize?${params.toString()}`;
}

export async function exchangeGitHubCode(
  code: string,
  redirectUri: string,
): Promise<string | null> {
  const clientId = getRuntimeEnv("GITHUB_CLIENT_ID")?.trim();
  const clientSecret = getRuntimeEnv("GITHUB_CLIENT_SECRET")?.trim();
  if (!clientId || !clientSecret) return null;

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    code,
    redirect_uri: redirectUri,
  });

  const res = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": "ThermalTrace-OAuth/1.0",
    },
    body,
    signal: AbortSignal.timeout(10_000),
  });

  if (!res.ok) return null;

  const data = (await res.json()) as { access_token?: string; error?: string };
  if (data.error || !data.access_token) return null;
  return data.access_token;
}

async function fetchGitHubUser(accessToken: string): Promise<GitHubUser | null> {
  const res = await fetch("https://api.github.com/user", {
    headers: GITHUB_API_HEADERS(accessToken),
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) return null;
  return (await res.json()) as GitHubUser;
}

async function fetchGitHubEmails(accessToken: string): Promise<GitHubEmail[]> {
  const res = await fetch("https://api.github.com/user/emails", {
    headers: GITHUB_API_HEADERS(accessToken),
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) return [];
  return (await res.json()) as GitHubEmail[];
}

export async function completeGitHubOAuth(
  code: string,
  redirectUri: string,
): Promise<GitHubProfile> {
  const accessToken = await exchangeGitHubCode(code, redirectUri);
  if (!accessToken) {
    throw new Error("GitHub token exchange failed");
  }

  const user = await fetchGitHubUser(accessToken);
  if (!user?.id || !user.login) {
    throw new Error("GitHub user profile unavailable");
  }

  const emails = await fetchGitHubEmails(accessToken);
  return { user, emails };
}

/** Pick the best verified email GitHub exposes for Supabase account creation. */
export function resolveGitHubEmail(user: GitHubUser, emails: GitHubEmail[]): string {
  const publicEmail = user.email?.trim();
  if (publicEmail) {
    const verifiedPublic = emails.find(
      (entry) => entry.verified && entry.email?.trim() === publicEmail,
    );
    if (verifiedPublic?.email) return verifiedPublic.email.trim();
  }

  const primaryVerified = emails.find((entry) => entry.primary && entry.verified);
  if (primaryVerified?.email) return primaryVerified.email;

  const anyVerified = emails.find((entry) => entry.verified);
  if (anyVerified?.email) return anyVerified.email;

  return `${user.id}+${user.login}@users.noreply.github.com`;
}

function isExistingUserError(error: { message?: string; status?: number }): boolean {
  const message = error.message?.toLowerCase() ?? "";
  return (
    error.status === 422 ||
    message.includes("already") ||
    message.includes("registered") ||
    message.includes("exists")
  );
}

/** True when an existing Supabase user is already tied to this GitHub identity. */
export function userLinkedToGitHub(
  user: Pick<User, "app_metadata" | "user_metadata">,
  githubUserId: number,
): boolean {
  const app = (user.app_metadata ?? {}) as Record<string, unknown>;
  if (app.provider === "github") return true;

  const providers = app.providers;
  if (Array.isArray(providers) && providers.includes("github")) return true;

  const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
  const githubId = meta.github_id;
  return githubId === githubUserId || githubId === String(githubUserId);
}

/** Create or sign in a Supabase user from a GitHub profile and return a session. */
export async function establishSessionForGitHubProfile(
  profile: GitHubProfile,
): Promise<{ session: Session; user: User }> {
  if (!getRuntimeEnv("SUPABASE_SERVICE_ROLE_KEY")?.trim()) {
    throw new Error("Missing Supabase service role key");
  }

  const admin = createAdminClient();
  const email = resolveGitHubEmail(profile.user, profile.emails);
  const userMetadata = {
    full_name: profile.user.name ?? profile.user.login,
    avatar_url: profile.user.avatar_url,
    preferred_username: profile.user.login,
    user_name: profile.user.login,
    github_id: profile.user.id,
  };

  const { error: createError } = await admin.auth.admin.createUser({
    email,
    email_confirm: true,
    user_metadata: userMetadata,
    app_metadata: {
      provider: "github",
      providers: ["github"],
    },
  });

  const existingUser = Boolean(createError && isExistingUserError(createError));
  if (createError && !existingUser) {
    throw createError;
  }

  const { data: link, error: linkError } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email,
  });

  const hashedToken = link?.properties?.hashed_token;
  if (linkError || !hashedToken) {
    throw linkError ?? new Error("Could not create sign-in link");
  }

  if (existingUser) {
    const linkedUser = link.user;
    if (!linkedUser || !userLinkedToGitHub(linkedUser, profile.user.id)) {
      throw new Error(
        "Refusing GitHub sign-in: that email belongs to an existing account that is not linked to GitHub",
      );
    }
  }

  const { data: auth, error: authError } = await admin.auth.verifyOtp({
    type: "email",
    token_hash: hashedToken,
  });

  if (authError || !auth.session || !auth.user) {
    throw authError ?? new Error("Could not establish session");
  }

  return { session: auth.session, user: auth.user };
}
