import {
  HA_DEV_DOCS_INTEGRATIONS,
  HA_INTEGRATION_PAGE,
  HACS_REPO_URL,
} from "./homeAssistantIntegration";

export type IntegrationCard = {
  id: string;
  title: string;
  summary: string;
  href: string;
  external?: boolean;
  tier?: string;
  cta?: string;
};

export const INTEGRATIONS_HUB_PATH = "/integrations";

export const INTEGRATION_CARDS: IntegrationCard[] = [
  {
    id: "home-assistant",
    title: "Home Assistant (HACS)",
    summary:
      "Official custom integration — share-link sensors, snooze/vacation services, optional push ingest. Dual-run with MQTT on your LAN.",
    href: HA_INTEGRATION_PAGE,
    tier: "Pro share link + optional inbound webhook",
    cta: "Install guide",
  },
  {
    id: "mqtt-bridge",
    title: "MQTT bridge",
    summary:
      "Keep Mosquitto local; mirror readings over HTTPS JSON push or pull feeds for household freeze alerts and history.",
    href: "https://doodersrage.github.io/thermaltrace/integrations/mqtt-bridge",
    external: true,
    cta: "Developer recipe",
  },
  {
    id: "webhooks",
    title: "Alert & reading webhooks",
    summary:
      "Outbound alert POSTs with optional HMAC, high-volume reading webhooks, and inbound snooze/status endpoints for HA or Zapier.",
    href: "https://doodersrage.github.io/thermaltrace/integrations/webhooks",
    external: true,
    tier: "Pro",
    cta: "Webhook payloads",
  },
  {
    id: "grafana",
    title: "Grafana & Prometheus",
    summary:
      "Scrape /api/v1/metrics with a dashboard API key; download bundled Grafana dashboard JSON from Dashboard → Share.",
    href: "https://doodersrage.github.io/thermaltrace/integrations/grafana",
    external: true,
    tier: "Pro API key",
    cta: "Metrics guide",
  },
  {
    id: "thermostat",
    title: "Nest & Ecobee",
    summary:
      "Optional thermostat OAuth on Pro — indoor setpoint context next to garage and crawlspace probes on the dashboard.",
    href: "/about/thermostat-oauth",
    tier: "Pro (when enabled)",
    cta: "Operator setup",
  },
  {
    id: "zapier",
    title: "Zapier & Make",
    summary:
      "Catch outbound alert hooks or POST inbound snooze actions from no-code automations.",
    href: "/about/zapier-make-recipes",
    cta: "Recipes",
  },
];

export const HACS_BADGE_CUSTOM =
  "https://img.shields.io/badge/HACS-Custom-orange.svg?style=for-the-badge";

export const HACS_BADGE_DEFAULT =
  "https://img.shields.io/badge/HACS-Default-41BDF5.svg?style=for-the-badge";

/** Use Default badge after hacs/default PR merges; Custom until then. */
export const HACS_BADGE_URL = HACS_BADGE_CUSTOM;

export const HACS_DOCS_URL = HA_DEV_DOCS_INTEGRATIONS;
