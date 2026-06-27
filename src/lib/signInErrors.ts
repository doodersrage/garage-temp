export const SIGNIN_ERROR_MESSAGES = {
  missing_fields: "Please enter both your email and password.",
  invalid_credentials:
    "We couldn't sign you in. Check your email and password and try again.",
  email_not_confirmed:
    "Please confirm your email address before signing in. Check your inbox for the confirmation link.",
  oauth_failed:
    "We couldn't start social sign-in. Please try again or sign in with email.",
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
): string {
  const params = new URLSearchParams({ error: errorCode });

  if (email) {
    params.set("email", email);
  }

  return `/signin?${params.toString()}`;
}
