#!/usr/bin/env node
/**
 * Restore production Supabase Auth URL settings after a bad config push.
 *
 * Usage:
 *   SUPABASE_ACCESS_TOKEN=sbp_... node scripts/fix-supabase-auth-config.mjs
 *
 * Token: https://supabase.com/dashboard/account/tokens
 */
const projectRef = process.env.SUPABASE_PROJECT_REF ?? "pjulkiuwwomgyzknytfg";
const token = process.env.SUPABASE_ACCESS_TOKEN?.trim();

if (!token) {
  console.error(
    "Set SUPABASE_ACCESS_TOKEN (https://supabase.com/dashboard/account/tokens)",
  );
  process.exit(1);
}

const body = {
  site_url: "https://thermaltrace.dev",
  uri_allow_list: "https://thermaltrace.dev/api/auth/callback",
  external_github_enabled: true,
  external_github_email_optional: true,
  external_github_client_id: "Iv23liHaziDDyWmsvtlv",
};

const res = await fetch(
  `https://api.supabase.com/v1/projects/${projectRef}/config/auth`,
  {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  },
);

const text = await res.text();
console.log("HTTP", res.status);
console.log(text);

if (!res.ok) {
  process.exit(1);
}
