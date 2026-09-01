import { getAboutPage } from "./aboutPages";

export type GuideHubLink = {
  href: string;
  label: string;
  summary: string;
};

export type GuideHubCategory = {
  id: string;
  title: string;
  description: string;
  links: GuideHubLink[];
};

type GuideHubLinkDef = {
  href: string;
  slug?: string;
  label?: string;
  summary?: string;
};

type GuideHubCategoryDef = {
  id: string;
  title: string;
  description: string;
  links: GuideHubLinkDef[];
};

const GUIDE_HUB_DEFS: GuideHubCategoryDef[] = [
  {
    id: "hardware",
    title: "Hardware setup",
    description: "Sensors, wiring, and firmware for ESP32, Arduino, and HTTPS JSON probes.",
    links: [
      { href: "/about/adding-devices", slug: "adding-devices" },
      { href: "/about/dht22-sensor-overview", slug: "dht22-sensor-overview" },
      { href: "/about/arduino-circuit-wiring", slug: "arduino-circuit-wiring" },
      { href: "/about/arduino-sketches", slug: "arduino-sketches" },
      { href: "/about/esp32-ota-firmware", slug: "esp32-ota-firmware" },
      { href: "/about/probe-demo", slug: "probe-demo" },
    ],
  },
  {
    id: "alerts",
    title: "Alerts",
    description: "Freeze thresholds, leak alerts, cold-snap playbooks, and notification channels.",
    links: [
      { href: "/about/freeze-protection-thresholds", slug: "freeze-protection-thresholds" },
      { href: "/about/cold-snap-playbook", slug: "cold-snap-playbook" },
      { href: "/about/alert-channel-cookbook", slug: "alert-channel-cookbook" },
      { href: "/stories/garage-freeze-alert", label: "Garage freeze case study", summary: "How a probe curve caught a cold night before pipes froze." },
    ],
  },
  {
    id: "sharing",
    title: "Sharing",
    description: "Household access, the phone app you can install today, and public status pages.",
    links: [
      { href: "/about/household-sharing-walkthrough", slug: "household-sharing-walkthrough" },
      { href: "/about/accounts-and-dashboard", slug: "accounts-and-dashboard" },
      { href: "/about/install-pwa", slug: "install-pwa" },
      { href: "/android", label: "Android app (early access)", summary: "GitHub build/sideload while Play review finishes; PWA works today." },
    ],
  },
  {
    id: "api",
    title: "API",
    description: "Ingest payloads, dashboard HTTP API, and automation recipes.",
    links: [
      { href: "/about/adding-devices", slug: "adding-devices" },
      { href: "/about/ingest-and-webhooks", slug: "ingest-and-webhooks" },
      { href: "/docs/api", label: "HTTP API documentation", summary: "Ingest, metrics, webhooks, and the OpenAPI spec." },
      { href: "/about/zapier-make-recipes", slug: "zapier-make-recipes" },
    ],
  },
];

function resolveLink(def: GuideHubLinkDef): GuideHubLink {
  if (def.slug) {
    const page = getAboutPage(def.slug);
    return {
      href: def.href,
      label: def.label ?? page?.title ?? def.slug,
      summary: def.summary ?? page?.summary ?? "",
    };
  }
  return {
    href: def.href,
    label: def.label ?? def.href,
    summary: def.summary ?? "",
  };
}

export function getGuideHubCategories(): GuideHubCategory[] {
  return GUIDE_HUB_DEFS.map((category) => ({
    id: category.id,
    title: category.title,
    description: category.description,
    links: category.links.map(resolveLink),
  }));
}
