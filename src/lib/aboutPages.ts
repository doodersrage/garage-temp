import { expandedAboutPageMeta } from "./aboutExpandedPages";

export type AboutPage = {
  slug: string;
  title: string;
  description: string;
  summary: string;
  parentSlug?: string;
};

export const coreAboutPages: AboutPage[] = [
  {
    slug: "temperature-probes",
    title: "Temperature probes and their uses",
    description:
      "How garage temperature probes work, where they are placed, and why multiple sensors improve reliability.",
    summary:
      "Probe types, placement strategies, and why averaging multiple sensors matters in garages and workshops.",
  },
  {
    slug: "temperature-changes",
    title: "Temperature changes and what causes them",
    description:
      "Understand daily swings, seasonal shifts, and sudden garage temperature changes driven by weather and building physics.",
    summary:
      "Sun load, infiltration, doors, HVAC, and stored heat explain most garage temperature movement.",
  },
  {
    slug: "historical-data",
    title: "Historical temperature data usage",
    description:
      "Why saved readings matter for trend analysis, freeze protection, equipment checks, and CSV export workflows.",
    summary:
      "Turn snapshots into charts, alerts, and long-term records for maintenance and seasonal planning.",
  },
  {
    slug: "arduino-sketches",
    title: "Arduino and Arduino sketches",
    description:
      "Firmware architecture for network-connected temperature probes using Arduino boards and humidity sensors.",
    summary:
      "Sketches read probes, format JSON, and publish readings over HTTPS from the garage to the web.",
  },
  {
    slug: "arduino-circuit-wiring",
    title: "Arduino circuit wiring overview",
    description:
      "High-level wiring for an Arduino Uno with Ethernet shield, breadboard power rails, LCD contrast, and two DHT22 sensors.",
    summary:
      "How USB power, the breadboard, contrast pot, LCD, sensors, and Ethernet shield fit together.",
  },
  {
    slug: "arduino-pin-wiring",
    title: "Arduino pin-level wiring",
    description:
      "Exact GPIO assignments for the 16×2 LCD, DHT22 data lines, backlight transistor, and reserved SPI pins.",
    summary:
      "Pin-by-pin map matching the LiquidCrystal constructor and sensor data lines in firmware.",
  },
  {
    slug: "arduino-dht22-lcd",
    title: "DHT22 sensors and LCD display",
    description:
      "Dual DHT22 polling, local LCD readouts, backlight control, and how the Ethernet shield shares the header.",
    summary:
      "Why two probes show separate readings on the LCD while JSON feeds expose both to the website.",
  },
  {
    slug: "python-feeds",
    title: "Python scripts and JSON feeds",
    description:
      "FastAPI relay services, Redis caching, and Python tooling that sit between probes and the dashboard.",
    summary:
      "Backend scripts normalize probe JSON, cache responses, and expose stable HTTPS endpoints.",
  },
  {
    slug: "astro-applications",
    title: "Astro applications in this project",
    description:
      "How Astro server rendering, islands, and Cloudflare deployment power the Garage Temperature Monitor site.",
    summary:
      "This site uses Astro for fast pages, authenticated dashboards, and API routes at the edge.",
  },
  {
    slug: "nextjs-node-applications",
    title: "Next.js and Node applications",
    description:
      "Compare Node-based dashboards with this stack and when Next.js fits similar monitoring projects.",
    summary:
      "Node runtimes excel at APIs and SSR; this project achieves the same goals with Astro on Cloudflare.",
  },
  {
    slug: "data-flow",
    title: "End-to-end monitoring data flow",
    description:
      "Follow a reading from the probe wire through JSON feeds, storage, and the signed-in history dashboard.",
    summary:
      "Hardware, relay, website fetch, Supabase storage, and CSV export in one pipeline.",
  },
  {
    slug: "accounts-and-dashboard",
    title: "Accounts, subscriptions, and dashboard tools",
    description:
      "Signed-in setup checklist, devices and sensors, alerts, households, share links, Stripe plans, and admin tools.",
    summary:
      "Create an account, connect hardware, configure alerts, invite household members, and upgrade when you need Pro channels.",
  },
  {
    slug: "ingest-and-webhooks",
    title: "Ingest API and alert webhooks",
    description:
      "Push sensor readings into Garage Temp with the ingest API, and send alerts to Discord, IFTTT, or Home Assistant.",
    summary:
      "Device API keys, typed sensor payloads, outbound HMAC webhooks, and Pro alert channels.",
  },
  {
    slug: "install-pwa",
    title: "Install as an app (PWA)",
    description:
      "Add Garage Temperature Monitor to your home screen for faster access and optional push alerts.",
    summary:
      "Desktop, Android, and iOS install steps, plus Web Push limits on Apple devices.",
  },
];

function buildAboutPages(): AboutPage[] {
  const expandedByParent = new Map<string, AboutPage[]>();

  for (const page of expandedAboutPageMeta) {
    const parent = page.parentSlug;
    if (!parent) continue;
    const group = expandedByParent.get(parent) ?? [];
    group.push(page);
    expandedByParent.set(parent, group);
  }

  const pages: AboutPage[] = [];

  for (const core of coreAboutPages) {
    pages.push(core);
    const children = expandedByParent.get(core.slug);
    if (children) {
      pages.push(...children);
    }
  }

  return pages;
}

export const aboutPages: AboutPage[] = buildAboutPages();

export function getAboutPage(slug: string): AboutPage | undefined {
  return aboutPages.find((page) => page.slug === slug);
}

export function getAboutParent(slug: string): AboutPage | undefined {
  const page = getAboutPage(slug);
  if (!page?.parentSlug) return undefined;
  return getAboutPage(page.parentSlug);
}
