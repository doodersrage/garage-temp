/** Map Supabase/GitHub/Google OAuth callback query params to sign-in error codes. */
export function mapOAuthCallbackError(
  error: string,
  errorDescription?: string | null,
):
  | "oauth_denied"
  | "oauth_secret_mismatch"
  | "oauth_github_profile"
  | "oauth_provider_failed" {
  if (error === "access_denied") {
    return "oauth_denied";
  }

  const detail = (errorDescription ?? "").toLowerCase();
  if (detail.includes("access_denied") || detail.includes("user denied")) {
    return "oauth_denied";
  }

  if (detail.includes("unable to exchange external code")) {
    return "oauth_secret_mismatch";
  }

  if (detail.includes("getting user profile from external provider")) {
    return "oauth_github_profile";
  }

  return "oauth_provider_failed";
}

/** Safe, short provider error text for logs and optional UI hints. */
export function sanitizeOAuthErrorDetail(detail: string | null | undefined): string | null {
  if (!detail) return null;
  const trimmed = detail.trim().replace(/\s+/g, " ");
  if (!trimmed) return null;
  // Drop anything that looks like a URL or token fragment.
  if (/https?:\/\//i.test(trimmed) || trimmed.length > 240) {
    return trimmed.slice(0, 240);
  }
  return trimmed;
}
