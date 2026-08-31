const HOUSEHOLD_ERROR_MESSAGES: Record<string, string> = {
  missing_email: "Enter an email address to send an invite.",
  "1": "Could not complete that household action. Please try again.",
  email_mismatch: "Sign in with the email this invite was sent to.",
  already_member: "You are already a member of this household.",
  expired: "This invite has expired. Ask for a new one.",
  invalid: "This invite link is invalid.",
  cannot_leave_owner: "Household owners cannot leave. Transfer ownership or delete the household instead.",
  manager_required:
    "Only household owners and full members can manage invites, share links, and billing integrations.",
  viewer: "View-only — you cannot change settings on this account.",
  property_limit:
    "You've reached the owned-property limit for your plan. Upgrade to unlock more households.",
  portfolio_required:
    "Property-manager invites require the Portfolio plan.",
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
