import type { AboutFaqItem } from "./aboutFaqs";
import { BRAND_DESCRIPTION, BRAND_SPACES } from "./brand";
import { getFaqPageSchema } from "./schemaMarkup";

export type MarketingFaqItem = AboutFaqItem;

/** High-intent FAQs for marketing pages (FAQPage JSON-LD + on-page AEO). */
export const marketingFaqs = {
  home: [
    {
      question: "What is ThermalTrace?",
      answer: BRAND_DESCRIPTION,
    },
    {
      question: "How do I connect ESP32 or Arduino sensors?",
      answer:
        "Create a push device under Dashboard → Devices, copy the one-time ingest key, map sensor keys (or a temp + humidity pair), and POST JSON to /api/ingest/<key>. Step-by-step: thermaltrace.dev/about/adding-devices. Sample Arduino and MicroPython sketches ship in the GitHub repo.",
    },
    {
      question: "Does ThermalTrace send freeze alerts?",
      answer:
        "Yes. Set a freeze threshold and enable channels such as email, Discord, Telegram, Slack, or (on Pro) SMS, WhatsApp, and browser push. Predictive forecast freeze alerts are on Member; official NWS freeze and cold alerts are on Pro. Leak / flood sensors also notify automatically when wet; door, motion, power, and air quality use custom rules. With a Telegram bot webhook, you can reply /status, /snooze, or /vacation from chat.",
    },
    {
      question: "Is ThermalTrace free?",
      answer:
        "Yes—there is a free plan with live curves, 7-day history, and threshold freeze and leak alerts. Member adds 90-day history, CSV export, more devices, and forecast freeze warnings; Pro adds 1-year+ history, NWS cold-risk alerts, SMS, push, share links (including guest expiry), a printable claims evidence pack, webhooks, and a trial. Annual Member and Pro billing is discounted versus monthly.",
    },
    {
      question: "Why do I need an account?",
      answer:
        "An account links your ingest keys, history, and alerts to your household—it is how we keep your probes private. Registration is free with no credit card. You can watch the live demo on the home page or /demo without signing up; create an account when you are ready to connect your own hardware.",
    },
    {
      question: "Is there a ThermalTrace Android app?",
      answer:
        "A native Android app is available in early access on GitHub while Google Play review finishes. You can also use the full web dashboard or install the Progressive Web App. The phone does not sense temperature — it connects to your ThermalTrace account.",
    },
  ],
  pricing: [
    {
      question: "What is included on the Free plan?",
      answer:
        "Live readings for temperature, humidity, air quality, doors, leaks, energy, and motion; 7 days of history; threshold freeze and leak alerts on email and chat-style channels; a limited number of devices; and household sharing so family can watch the same sensors.",
    },
    {
      question: "When should I upgrade to Member or Pro?",
      answer:
        "Choose Member for 90-day history, CSV export, more devices, and predictive forecast freeze (cold-risk) alerts. Choose Pro for 1-year+ history, official NWS freeze/cold alerts, SMS/WhatsApp, browser push, public share links with guest expiry, a printable claims / insurance evidence pack, inbound/outbound webhooks, Prometheus metrics, and a 14-day trial. Annual billing is discounted versus paying monthly.",
    },
    {
      question: "What is the claims / insurance evidence pack?",
      answer:
        "On Pro, History can export a PDF claims summary for a date range you choose—freeze exposure, devices, and alert timeline—with matching readings and alert-event CSVs. It is monitoring evidence for your own use, not a legal or insurance determination. An HTML version is also available if you need to edit or re-print.",
    },
    {
      question: "Can I cancel or change plans anytime?",
      answer:
        "Paid plans bill through Stripe. You can manage or cancel from the customer portal; missing payment may return the account to Free limits. Charts and CSV immediately follow the current plan window (7 days on Free). Older readings are not wiped on downgrade — they stay stored on the usual retention schedule and become visible again if you re-upgrade before they expire.",
    },
    {
      question: "What is the refund policy for the Pro trial?",
      answer:
        "The Pro trial is free. Cancel before it ends and you are not charged. After a trial converts to a paid plan, the current billing period is generally non-refundable. Contact us if a charge looks wrong and we will review it.",
    },
  ],
  compare: [
    {
      question: "How is ThermalTrace different from a DIY script?",
      answer:
        "ThermalTrace hosts ingest, history, households, and multi-channel freeze alerts for you. A DIY cron script requires you to run servers, databases, Twilio wiring, and uptime yourself.",
    },
    {
      question: "How does ThermalTrace compare to Govee or SmartThings?",
      answer:
        `Govee and SmartThings are general consumer/smart-home apps. ThermalTrace is purpose-built for ${BRAND_SPACES}—ESP/Arduino or JSON ingest, freeze workflows, air quality, doors, leaks, energy, and CSV history—rather than a catch-all device dashboard.`,
    },
    {
      question: "Do I need a public IP for my Arduino?",
      answer:
        "No for push ingest: the device POSTs outbound to ThermalTrace. Pull feeds need a reachable HTTPS JSON URL if you use that path instead.",
    },
    {
      question: "Can I keep Home Assistant or MQTT and still use ThermalTrace?",
      answer:
        "Yes. Install the official HACS integration (github.com/doodersrage/thermaltrace-home-assistant) for automatic entities from a share link, or keep MQTT on your LAN and mirror with POST /api/ingest/mqtt. Many people dual-run: HA locally, ThermalTrace for household freeze SMS and history. See thermaltrace.dev/integrations/home-assistant.",
    },
    {
      question: "Why does ThermalTrace require an account?",
      answer:
        "ThermalTrace is hosted so you do not run databases or SMS wiring yourself. A free account (no credit card) attaches your ingest key to your household. You can still dual-run with Home Assistant or MQTT on the LAN—ThermalTrace is the off-site alerts and history layer.",
    },
    {
      question: "I already have Govee or a Tempest—do I still need this?",
      answer:
        `Govee is a consumer room sensor; Tempest is outdoor weather. ThermalTrace watches probe curves in ${BRAND_SPACES} on hardware you control. They can coexist—see the Govee and Tempest comparison pages for when each tool is the better fit.`,
    },
  ],
  "freeze-map": [
    {
      question: "What is the ThermalTrace freeze map?",
      answer:
        "An opt-in, city-level aggregate of anonymized probe temperature samples from contributing households—useful for seeing regional freeze risk, not a personal live feed.",
    },
    {
      question: "Is freeze-map data personally identifiable?",
      answer:
        "No. Contributions are aggregated at city level for public display. Your account dashboard remains private to your household.",
    },
  ],
  contact: [
    {
      question: "What should I ask about before contacting support?",
      answer:
        "Probe wiring, ingest payloads, freeze alerts, and dashboard setup are covered in the guides hub and About library. Use this form for account, billing, Android launch notes, or questions the docs do not answer.",
    },
    {
      question: "Should I use the form or GitHub?",
      answer:
        "Account, billing, and household questions belong on this form. Bugs, firmware patches, and feature ideas belong in GitHub issues so other builders can follow along.",
    },
    {
      question: "How soon will I get a reply?",
      answer:
        "We usually reply within 1–2 business days. The form is protected by Cloudflare Turnstile; we do not publish a support inbox so that mailbox stays off spam lists.",
    },
  ],
  docsApi: [
    {
      question: "Where is the ThermalTrace OpenAPI spec?",
      answer:
        "Download openapi.yaml from /openapi.yaml on thermaltrace.dev, or from the GitHub Pages developer docs. The in-app page at /docs/api summarizes ingest, metrics, and webhooks.",
    },
    {
      question: "How do I authenticate to the HTTP API?",
      answer:
        "Device firmware uses a per-device ingest key in the URL. Pro integrations use a Bearer API key from Dashboard → Share. The browser dashboard uses session cookies.",
    },
  ],
  homeAssistant: [
    {
      question: "Is there an official Home Assistant integration?",
      answer:
        "Yes — a HACS custom integration at github.com/doodersrage/thermaltrace-home-assistant. It polls your Pro share link and creates sensors/binary sensors automatically. Install guide: thermaltrace.dev/integrations/home-assistant.",
    },
    {
      question: "Do I need Pro for the HACS integration?",
      answer:
        "You need a Pro share link with readings scope to poll sensor data into Home Assistant. Inbound webhook services (snooze, vacation, status) also require a Pro inbound token from Dashboard → Share. Push via thermaltrace.push uses any push device ingest key.",
    },
    {
      question: "Can I use ThermalTrace with MQTT and Home Assistant together?",
      answer:
        "Yes — the usual pattern keeps Mosquitto/ESPHome on your LAN and mirrors selected topics to ThermalTrace over HTTPS (POST /api/ingest/mqtt). ThermalTrace handles off-site freeze SMS/email and history; HA keeps local automations. Recipe: thermaltrace.dev/about/adding-devices#mqtt-bridge.",
    },
    {
      question: "How do freeze alerts reach Home Assistant?",
      answer:
        "Configure a Pro outbound webhook in ThermalTrace pointing at your HA webhook URL, or import the garage_temp_webhook.yaml blueprint from thermaltrace.dev/ha/garage_temp_webhook.yaml. Verify X-Signature when you set a webhook secret.",
    },
  ],
  android: [
    {
      question: "Does the Android app measure probe temperature?",
      answer:
        "No. The phone is a companion client. ESP/Arduino sensors (or HTTPS JSON feeds) push readings to ThermalTrace; the app signs in and displays that account data.",
    },
    {
      question: "When will ThermalTrace be on Google Play?",
      answer:
        "Google Play listing is in review. Build or sideload from github.com/doodersrage/thermaltrace-android, or use the web dashboard / PWA from Chrome on Android until the store link goes live.",
    },
    {
      question: "Will my web account work in the Android app?",
      answer:
        "Yes. The same ThermalTrace login, households, devices, and alert settings apply. Pro push on Android uses Firebase Cloud Messaging in addition to browser Web Push.",
    },
    {
      question: "How do I get notified when the app launches?",
      answer:
        "Use the Contact form with topic=android (linked from /android) and ask for a launch note. We also announce updates on the site and GitHub repos.",
    },
  ],
} as const satisfies Record<string, MarketingFaqItem[]>;

export type MarketingFaqKey = keyof typeof marketingFaqs;

export function getMarketingFaqs(key: MarketingFaqKey): MarketingFaqItem[] {
  return [...marketingFaqs[key]];
}

export function getMarketingFaqSchema(pageUrl: string, key: MarketingFaqKey) {
  return getFaqPageSchema(pageUrl, getMarketingFaqs(key));
}
