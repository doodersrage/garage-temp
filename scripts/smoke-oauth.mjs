#!/usr/bin/env node
/**
 * Smoke-check OAuth sign-in hops on production (or SMOKE_BASE_URL).
 * Verifies PKCE cookie is set and Supabase providers are enabled.
 */
const base = (process.argv[2] ?? process.env.SMOKE_BASE_URL ?? "https://thermaltrace.dev").replace(
  /\/+$/,
  "",
);

const supabaseUrl = process.env.SUPABASE_URL?.replace(/\/+$/, "");
const anonKey = process.env.SUPABASE_ANON_KEY;

async function checkProvider(provider) {
  const res = await fetch(`${base}/api/auth/signin`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `provider=${provider}`,
    redirect: "manual",
  });

  const setCookies = res.headers.getSetCookie?.() ?? [];
  const hasPkce = setCookies.some((c) => c.startsWith("sb-oauth-pkce="));
  const hasGitHubState = setCookies.some((c) => c.startsWith("github_oauth_state="));
  const location = res.headers.get("location") ?? "";

  return {
    provider,
    status: res.status,
    hasPkce,
    hasGitHubState,
    hasChallenge: location.includes("code_challenge="),
    locationHost: location ? new URL(location).host : "",
    isDirectGitHub: provider === "github" && location.includes("github.com/login/oauth/authorize"),
  };
}

async function checkSupabaseProviders() {
  if (!supabaseUrl || !anonKey) {
    return { skipped: true, reason: "SUPABASE_URL / SUPABASE_ANON_KEY not set" };
  }

  const res = await fetch(`${supabaseUrl}/auth/v1/settings`, {
    headers: { apikey: anonKey },
  });
  if (!res.ok) {
    return { skipped: true, reason: `settings HTTP ${res.status}` };
  }

  const json = await res.json();
  return { external: json.external ?? {} };
}

async function main() {
  console.log(`OAuth smoke: ${base}`);

  for (const provider of ["google", "github", "discord"]) {
    const result = await checkProvider(provider);
    const ok =
      result.status === 302 &&
      (provider === "github"
        ? result.isDirectGitHub && result.hasGitHubState
        : result.hasPkce && result.hasChallenge);
    console.log(
      ok ? "✓" : "✗",
      provider,
      JSON.stringify(result),
    );
  }

  const providers = await checkSupabaseProviders();
  console.log("Supabase providers:", JSON.stringify(providers));

  const supabaseCallback = supabaseUrl
    ? `${supabaseUrl}/auth/v1/callback`
    : "https://pjulkiuwwomgyzknytfg.supabase.co/auth/v1/callback";

  console.log("\nProvider console checklist:");
  console.log(`  Supabase callback (Google/Discord): ${supabaseCallback}`);
  console.log(`  GitHub OAuth app callback (direct): ${base}/api/auth/github/callback`);
  console.log("  Google Cloud → Authorized redirect URIs: Supabase callback above");
  console.log("  Discord app → OAuth2 Redirects: Supabase callback above");
  console.log("  GitHub ThermalTrace app → Authorization callback URL: direct GitHub callback above");
  console.log("  Supabase → Authentication → Providers: Google + Discord Client ID + Secret");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
