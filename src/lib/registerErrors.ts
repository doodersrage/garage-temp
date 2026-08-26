export const REGISTER_ERROR_MESSAGES = {
  missing_fields: "Please enter both your email and password.",
  verification: "Verification failed. Please try again.",
  weak_password: "Password must be at least 8 characters.",
  generic: "Something went wrong while creating your account. Please try again.",
} as const;

export type RegisterErrorCode = keyof typeof REGISTER_ERROR_MESSAGES;

export function getRegisterErrorMessage(code: string | null): string | null {
  if (!code) {
    return null;
  }

  if (code in REGISTER_ERROR_MESSAGES) {
    return REGISTER_ERROR_MESSAGES[code as RegisterErrorCode];
  }

  // Supabase may return a human-readable message as the error query value.
  if (code.length > 0 && code.length < 200 && !code.includes("<")) {
    return code;
  }

  return REGISTER_ERROR_MESSAGES.generic;
}
