import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../types/supabase";

function getSupabaseUrl(): string {
  return import.meta.env.SUPABASE_URL;
}

function getAnonKey(): string {
  return import.meta.env.SUPABASE_ANON_KEY;
}

function getServerKey(): string {
  return import.meta.env.SUPABASE_SERVICE_ROLE_KEY ?? getAnonKey();
}

/**
 * Browser-only. This client persists its session and is meant to be
 * imported by client-side (island) code running in one visitor's own tab.
 *
 * NEVER import this in server-side code (Astro frontmatter, API routes,
 * actions, or any lib function that runs on the server) for anything that
 * touches auth -- setSession(), updateUser(), refreshSession(),
 * exchangeCodeForSession(), signUp(), mfa.*, etc. Cloudflare Workers can
 * and does interleave multiple concurrent requests inside one isolate's
 * shared global scope, so this module-level client's session is
 * effectively shared mutable state across unrelated users' requests:
 * whichever request most recently called a session-establishing method on
 * it "wins", and any other in-flight request that then calls a method
 * that reads the *ambient* session (updateUser/refreshSession/etc. take
 * no explicit access token) can silently act on a different user's
 * account. Server-side code that needs to act on a specific already-known
 * session must call createAuthClient() below and use a fresh client
 * scoped to that one request.
 */
export const supabase = createClient<Database>(getSupabaseUrl(), getAnonKey(), {
  auth: {
    flowType: "pkce",
  },
});

/** Server-side database access (uses service role when configured). */
export function createServerClient() {
  return createClient<Database>(getSupabaseUrl(), getServerKey(), {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

/** Admin auth lookups (requires service role key in production). */
export function createAdminClient() {
  const serviceKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    return createServerClient();
  }

  return createClient<Database>(getSupabaseUrl(), serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

/**
 * Fresh, request-scoped Supabase Auth client. Use this on the server
 * anywhere you need to call setSession(), updateUser(), refreshSession(),
 * exchangeCodeForSession(), signUp(), or auth.mfa.* against a specific
 * user's tokens -- never the shared `supabase` export above. See its
 * doc comment for why: a shared client's auth state is global mutable
 * state under Cloudflare Workers' concurrent-request model, and mixing
 * it up between requests means one user's session-mutating call can
 * silently be applied to a completely different, unrelated user.
 */
export function createAuthClient(): SupabaseClient<Database> {
  return createClient<Database>(getSupabaseUrl(), getAnonKey(), {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
      flowType: "pkce",
    },
  });
}
