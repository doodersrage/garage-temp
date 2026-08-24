import { createClient } from "@supabase/supabase-js";

function getSupabaseUrl(): string {
  return import.meta.env.SUPABASE_URL;
}

function getAnonKey(): string {
  return import.meta.env.SUPABASE_ANON_KEY;
}

function getServerKey(): string {
  return import.meta.env.SUPABASE_SERVICE_ROLE_KEY ?? getAnonKey();
}

/** Browser-facing auth flows (sign-in, register, user session updates). */
export const supabase = createClient(getSupabaseUrl(), getAnonKey(), {
  auth: {
    flowType: "pkce",
  },
});

/** Server-side database access (uses service role when configured). */
export function createServerClient() {
  return createClient(getSupabaseUrl(), getServerKey(), {
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

  return createClient(getSupabaseUrl(), serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
