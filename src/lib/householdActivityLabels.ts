const ACTIVITY_LABELS: Record<string, string> = {
  ingest_key_revealed: "Ingest key revealed",
  device_transfer: "Device transferred",
  alert_settings_saved: "Alert settings saved",
  share_link_created: "Share link created",
  api_key_created: "API key created",
  checkout_started: "Checkout started",
  household_created: "Household created",
  status_page_created: "Status page created",
  status_page_revoked: "Status page revoked",
  inbound_snooze: "Alerts snoozed (inbound)",
  inbound_vacation: "Vacation mode (inbound)",
};

/** Human-readable label for household_activity.action values. */
export function formatHouseholdActivityAction(action: string): string {
  return ACTIVITY_LABELS[action] ?? action.replace(/_/g, " ");
}
