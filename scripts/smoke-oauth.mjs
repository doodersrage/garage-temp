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
  const location = res.headers.get("location") ?? "";

  return {
    provider,
    status: res.status,
    hasPkce,
    hasChallenge: location.includes("code_challenge="),
    locationHost: location ? new URL(location).host : "",
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
    const ok = result.status === 302 && result.hasPkce && result.hasChallenge;
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

  console.log("\nProvider console checklist (redirect/callback must be Supabase, NOT thermaltrace.dev):");
  console.log(`  Supabase callback URL: ${supabaseCallback}`);
  console.log("  Google Cloud → Authorized redirect URIs: (above)");
  console.log("  GitHub OAuth app → Authorization callback URL: (above)");
  console.log("  Discord app → OAuth2 Redirects: (above)");
  console.log("  Supabase → Authentication → Providers: Client ID + Secret must match each app");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
