import type { Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

export function getE2ECredentials(): { email: string; password: string } | null {
  const email = process.env.E2E_TEST_EMAIL?.trim();
  const password = process.env.E2E_TEST_PASSWORD;
  if (!email || !password) return null;
  return { email, password };
}

function getSupabaseConfig(): { url: string; anonKey: string } | null {
  const url = process.env.SUPABASE_URL?.trim();
  const anonKey = process.env.SUPABASE_ANON_KEY?.trim();
  if (!url || !anonKey) return null;
  return { url, anonKey };
}

/** Cookie domain for PLAYWRIGHT_BASE_URL (defaults to localhost). */
function cookieDomainFromBaseUrl(baseURL: string | undefined): string {
  if (!baseURL) return "127.0.0.1";
  try {
    return new URL(baseURL).hostname;
  } catch {
    return "127.0.0.1";
  }
}

/**
 * Sign in via Supabase Auth API and set session cookies.
 * Avoids Turnstile on the HTML form (required in production).
 */
export async function signIn(page: Page, next = "/dashboard/alerts"): Promise<void> {
  const creds = getE2ECredentials();
  if (!creds) {
    throw new Error("E2E_TEST_EMAIL and E2E_TEST_PASSWORD are required");
  }

  const supabaseConfig = getSupabaseConfig();
  if (!supabaseConfig) {
    throw new Error("SUPABASE_URL and SUPABASE_ANON_KEY are required for E2E sign-in");
  }

  const supabase = createClient(supabaseConfig.url, supabaseConfig.anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await supabase.auth.signInWithPassword({
    email: creds.email,
    password: creds.password,
  });

  if (error || !data.session) {
    throw new Error(
      error?.message ||
        "Supabase sign-in failed — check E2E_TEST_EMAIL / E2E_TEST_PASSWORD",
    );
  }

  const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:4321";
  const domain = cookieDomainFromBaseUrl(baseURL);
  const secure = baseURL.startsWith("https://");

  await page.context().addCookies([
    {
      name: "sb-access-token",
      value: data.session.access_token,
      domain,
      path: "/",
      httpOnly: true,
      secure,
      sameSite: "Lax",
    },
    {
      name: "sb-refresh-token",
      value: data.session.refresh_token,
      domain,
      path: "/",
      httpOnly: true,
      secure,
      sameSite: "Lax",
    },
  ]);

  await page.goto(next, { waitUntil: "domcontentloaded" });
  // Allow auth middleware redirects (e.g. MFA step-up) before asserting destination.
  await page.waitForURL(
    (url) => {
      const path = url.pathname;
      return path === next || path.startsWith(`${next}/`) || path.startsWith("/signin");
    },
    { timeout: 20_000 },
  );
}
