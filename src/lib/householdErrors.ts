const HOUSEHOLD_ERROR_MESSAGES: Record<string, string> = {
  missing_email: "Enter an email address to send an invite.",
  "1": "Could not complete that household action. Please try again.",
  email_mismatch: "Sign in with the email this invite was sent to.",
  already_member: "You are already a member of this household.",
  expired: "This invite has expired. Ask for a new one.",
  invalid: "This invite link is invalid.",
};

export function getHouseholdErrorMessage(code: string | null): string | null {
  if (!code) {
    return null;
  }

  if (code in HOUSEHOLD_ERROR_MESSAGES) {
    return HOUSEHOLD_ERROR_MESSAGES[code];
  }

  if (code.length > 0 && code.length < 200 && !code.includes("<")) {
    return code.replace(/_/g, " ");
  }

  return HOUSEHOLD_ERROR_MESSAGES["1"];
}
