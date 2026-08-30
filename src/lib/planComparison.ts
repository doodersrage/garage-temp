import type { PlanTier } from "./entitlements";
import {
  FREE_HISTORY_DAYS,
  FREE_MAX_DEVICES,
  MEMBER_HISTORY_DAYS,
  MEMBER_MAX_DEVICES,
  PRO_HISTORY_DAYS,
  PRO_MAX_DEVICES,
  formatHistoryRetention,
} from "./entitlements";

export type ComparisonTier = "free" | "member" | "pro";

export type NudgeFeatureId =
  | "csv_export"
  | "history_charts"
  | "sms_alerts"
  | "push_alerts"
  | "webhooks"
  | "share_links"
  | "api_keys"
  | "embed_widget"
  | "status_pages"
  | "device_limit"
  | "data_retention"
  | "cold_risk"
  | "prometheus"
  | "multi_property"
  | "claims_pack";

export type PlanFeatureRow = {
  id: string;
  category: string;
  label: string;
  free: string;
  member: string;
  pro: string;
  anchor?: string;
  emphasis?: boolean;
  cellBadge?: Partial<Record<ComparisonTier, string>>;
};

export const PLAN_FEATURE_ROWS: PlanFeatureRow[] = [
  {
    id: "push_devices",
    category: "Limits",
    label: "Push ingest devices",
    free: `${FREE_MAX_DEVICES} devices`,
    member: `${MEMBER_MAX_DEVICES} devices`,
    pro: `${PRO_MAX_DEVICES} devices`,
    anchor: "push_devices",
    emphasis: true,
  },
  {
    id: "data_retention",
    category: "Limits",
    label: "Data retention",
    free: formatHistoryRetention(FREE_HISTORY_DAYS),
    member: formatHistoryRetention(MEMBER_HISTORY_DAYS),
    pro: `${formatHistoryRetention(PRO_HISTORY_DAYS)}+`,
    anchor: "data-retention",
    emphasis: true,
  },
  {
    id: "pull_feeds",
    category: "Limits",
    label: "Pull JSON feeds",
    free: "Unlimited",
    member: "Unlimited",
    pro: "Unlimited",
  },
  {
    id: "sensor_kinds",
    category: "Limits",
    label: "Sensor types",
    free: "Temp, humidity, CO₂, air quality, doors, leaks, energy, motion",
    member: "Temp, humidity, CO₂, air quality, doors, leaks, energy, motion",
    pro: "Temp, humidity, CO₂, air quality, doors, leaks, energy, motion",
  },
  {
    id: "alerts_basic",
    category: "Alerts",
    label: "Email, Discord, Telegram, Slack",
    free: "Yes",
    member: "Yes",
    pro: "Yes",
  },
  {
    id: "cold_risk",
    category: "Alerts",
    label: "Cold-risk alerts",
    free: "Threshold only",
    member: "Forecast-based cold-risk",
    pro: "Forecast + official NWS",
    anchor: "cold-risk",
    emphasis: true,
  },
  {
    id: "sms_alerts",
    category: "Alerts",
    label: "SMS alerts (Twilio)",
    free: "—",
    member: "—",
    pro: "Yes",
    anchor: "sms-alerts",
  },
  {
    id: "push_alerts",
    category: "Alerts",
    label: "Browser push notifications",
    free: "—",
    member: "—",
    pro: "Yes",
    anchor: "push-alerts",
  },
  {
    id: "webhooks",
    category: "Alerts",
    label: "Outbound + reading webhooks",
    free: "—",
    member: "—",
    pro: "Yes",
    anchor: "webhooks",
  },
  {
    id: "inbound_webhooks",
    category: "Integrations",
    label: "Inbound snooze / status webhooks",
    free: "—",
    member: "—",
    pro: "Yes",
    anchor: "webhooks",
  },
  {
    id: "history_charts",
    category: "History",
    label: "Charts, YoY overlay, anomaly hints",
    free: "Yes",
    member: "Yes",
    pro: "Yes",
  },
  {
    id: "csv_export",
    category: "History",
    label: "CSV export",
    free: "—",
    member: "Yes",
    pro: "Yes",
    anchor: "csv-export",
  },
  {
    id: "claims_pack",
    category: "History",
    label: "Claims / insurance evidence pack",
    free: "—",
    member: "—",
    pro: "Printable HTML + CSVs",
    anchor: "claims-pack",
    emphasis: true,
  },
  {
    id: "share_links",
    category: "Sharing",
    label: "Public share links (live, history, embed)",
    free: "—",
    member: "—",
    pro: "Yes",
    anchor: "share-links",
  },
  {
    id: "api_keys",
    category: "Sharing",
    label: "Dashboard API keys",
    free: "—",
    member: "—",
    pro: "Yes",
    anchor: "api-keys",
  },
  {
    id: "embed_widget",
    category: "Sharing",
    label: "Embeddable live widget",
    free: "—",
    member: "—",
    pro: "Yes",
    anchor: "embed-widget",
  },
  {
    id: "status_pages",
    category: "Sharing",
    label: "Public status pages + iCal feed",
    free: "—",
    member: "—",
    pro: "Yes",
    anchor: "status-pages",
  },
  {
    id: "prometheus",
    category: "Integrations",
    label: "Prometheus metrics + Grafana JSON",
    free: "—",
    member: "—",
    pro: "Yes",
    anchor: "prometheus",
  },
  {
    id: "multi_property",
    category: "Households",
    label: "Multiple properties / households",
    free: "1",
    member: "1",
    pro: "Multiple",
    anchor: "multi-property",
  },
  {
    id: "annual_billing",
    category: "Billing",
    label: "Annual billing discount",
    free: "—",
    member: "Save ~20%",
    pro: "Save ~20%",
    anchor: "annual-billing",
  },
  {
    id: "pro_trial",
    category: "Billing",
    label: "Pro free trial",
    free: "—",
    member: "—",
    pro: "14 days (+7 with referral)",
  },
];

const TIER_RANK: Record<PlanTier, number> = {
  free: 0,
  member: 1,
  pro: 2,
  admin: 3,
};

const NUDGE_CONFIG: Record<
  NudgeFeatureId,
  { targetTier: ComparisonTier; title: string; body: string; anchor: string }
> = {
  csv_export: {
    targetTier: "member",
    title: "Export history as CSV",
    body: "Member unlocks CSV download of your retained readings — handy for insurance docs and HVAC tuning.",
    anchor: "csv-export",
  },
  history_charts: {
    targetTier: "member",
    title: "Keep more history at your fingertips",
    body: "Member includes CSV export and full chart tooling. Free accounts still see live data and recent charts.",
    anchor: "csv-export",
  },
  sms_alerts: {
    targetTier: "pro",
    title: "Get freeze alerts by SMS",
    body: "Pro adds Twilio SMS — critical when email isn't fast enough during cold snaps.",
    anchor: "sms-alerts",
  },
  push_alerts: {
    targetTier: "pro",
    title: "Browser push on this device",
    body: "Pro enables browser push so alerts reach you even when the dashboard isn't open.",
    anchor: "push-alerts",
  },
  webhooks: {
    targetTier: "pro",
    title: "Wire alerts into Home Assistant or Zapier",
    body: "Pro adds outbound alert webhooks, reading webhooks on ingest, and inbound snooze/status endpoints.",
    anchor: "webhooks",
  },
  share_links: {
    targetTier: "pro",
    title: "Share a live view with family",
    body: "Pro creates read-only share links — live tiles, 7-day history, embed widgets, or metrics scopes.",
    anchor: "share-links",
  },
  api_keys: {
    targetTier: "pro",
    title: "API keys for Grafana and scripts",
    body: "Pro includes dashboard API keys and a downloadable Grafana dashboard JSON.",
    anchor: "api-keys",
  },
  embed_widget: {
    targetTier: "pro",
    title: "Embed live temps on your site",
    body: "Pro share links can power an embeddable widget for a family portal or workshop page.",
    anchor: "embed-widget",
  },
  status_pages: {
    targetTier: "pro",
    title: "Public status page",
    body: "Pro households can publish a tokenized status page and iCal freeze outlook feed.",
    anchor: "status-pages",
  },
  device_limit: {
    targetTier: "pro",
    title: "Need more push devices?",
    body: `Free allows ${FREE_MAX_DEVICES} push devices, Member ${MEMBER_MAX_DEVICES}, Pro ${PRO_MAX_DEVICES} — upgrade when you outgrow the limit.`,
    anchor: "push_devices",
  },
  data_retention: {
    targetTier: "member",
    title: "Keep a longer history window",
    body: `Free keeps ${formatHistoryRetention(FREE_HISTORY_DAYS)} of readings. Member extends that to ${formatHistoryRetention(MEMBER_HISTORY_DAYS)}; Pro keeps ${formatHistoryRetention(PRO_HISTORY_DAYS)}+ for seasonal and year-over-year compare.`,
    anchor: "data-retention",
  },
  cold_risk: {
    targetTier: "member",
    title: "Get ahead of freeze nights",
    body: "Member adds predictive forecast freeze warnings. Pro adds official NWS freeze and cold alerts for the spaces you are protecting.",
    anchor: "cold-risk",
  },
  prometheus: {
    targetTier: "pro",
    title: "Scrape metrics into Grafana",
    body: "Pro unlocks Prometheus-format metrics and API keys for your observability stack.",
    anchor: "prometheus",
  },
  multi_property: {
    targetTier: "pro",
    title: "Monitoring a second property?",
    body: "Pro supports multiple households — vacation home, rental unit, or workshop.",
    anchor: "multi-property",
  },
  claims_pack: {
    targetTier: "pro",
    title: "Export a claims evidence pack",
    body: "Pro builds a printable freeze/leak summary with matching readings and alert-event CSVs for a date range you choose.",
    anchor: "claims-pack",
  },
};

export function tierRank(tier: PlanTier): number {
  return TIER_RANK[tier] ?? 0;
}

export function normalizeComparisonTier(tier: PlanTier): ComparisonTier {
  if (tier === "admin" || tier === "pro") return "pro";
  if (tier === "member") return "member";
  return "free";
}

export function getNudgeContent(
  tier: PlanTier,
  feature: NudgeFeatureId,
): {
  targetTier: ComparisonTier;
  title: string;
  body: string;
  compareHref: string;
  dismissKey: string;
} | null {
  if (tier === "admin") return null;

  const config = NUDGE_CONFIG[feature];
  if (!config) return null;

  const current = normalizeComparisonTier(tier);
  const targetRank = TIER_RANK[config.targetTier];
  const currentRank = TIER_RANK[current];
  if (currentRank >= targetRank) return null;

  return {
    ...config,
    compareHref: `/pricing#${config.anchor}`,
    dismissKey: `nudge-${feature}`,
  };
}

export function nextUpgradeTier(tier: PlanTier): ComparisonTier | null {
  if (tier === "admin" || tier === "pro") return null;
  if (tier === "member") return "pro";
  return "member";
}
