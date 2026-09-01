export const SIGNIN_ERROR_MESSAGES = {
  missing_fields: "Please enter both your email and password.",
  invalid_credentials:
    "We couldn't sign you in. Check your email and password and try again.",
  email_not_confirmed:
    "Please confirm your email address before signing in. Check your inbox for the confirmation link.",
  oauth_failed:
    "We couldn't start social sign-in. Please try again or sign in with email.",
  oauth_denied: "Social sign-in was cancelled. Try again when you're ready.",
  oauth_provider_failed:
    "Social sign-in failed at the provider. Try again or sign in with email.",
  oauth_secret_mismatch:
    "Social sign-in credentials are out of date. Regenerate the client secret in the provider app (Discord, GitHub, or Google) and paste the new value into Supabase → Authentication → Providers.",
  oauth_github_profile:
    "GitHub would not grant email access. Confirm Supabase → GitHub uses Client ID Iv23liHaziDDyWmsvtlv (ThermalTrace app), revoke both old and new apps under GitHub → Authorized OAuth Apps, then sign in again — the GitHub screen must say ThermalTrace and request email access.",
  oauth_exchange_failed:
    "Something went wrong while completing social sign-in. Please try again.",
  turnstile_failed:
    "Please complete the human verification checkbox, then try again.",
  rate_limited:
    "Too many sign-in attempts for this account. Please wait a few minutes and try again.",
  generic:
    "Something went wrong while signing in. Please try again.",
} as const;

export type SignInErrorCode = keyof typeof SIGNIN_ERROR_MESSAGES;

export function getSignInErrorMessage(
  code: string | null,
): string | null {
  if (!code) {
    return null;
  }

  if (code in SIGNIN_ERROR_MESSAGES) {
    return SIGNIN_ERROR_MESSAGES[code as SignInErrorCode];
  }

  return SIGNIN_ERROR_MESSAGES.generic;
}

export function mapSignInError(error: { message: string }): SignInErrorCode {
  const message = error.message.toLowerCase();

  if (message.includes("invalid login credentials")) {
    return "invalid_credentials";
  }

  if (message.includes("email not confirmed")) {
    return "email_not_confirmed";
  }

  return "generic";
}

export function buildSignInRedirectUrl(
  errorCode: SignInErrorCode,
  email?: string,
  oauthDetail?: string | null,
): string {
  const params = new URLSearchParams({ error: errorCode });

  if (email) {
    params.set("email", email);
  }

  if (oauthDetail) {
    params.set("oauth_detail", oauthDetail);
  }

  return `/signin?${params.toString()}`;
}
