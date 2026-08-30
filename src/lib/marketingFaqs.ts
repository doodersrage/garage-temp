import type { AboutFaqItem } from "./aboutFaqs";
import { getFaqPageSchema } from "./schemaMarkup";

export type MarketingFaqItem = AboutFaqItem;

/** High-intent FAQs for marketing pages (FAQPage JSON-LD + on-page AEO). */
export const marketingFaqs = {
  home: [
    {
      question: "What is ThermalTrace?",
      answer:
        "ThermalTrace is an open-source web dashboard that tracks, logs, and analyzes temperature (and humidity) probe curves for garages, workshops, and other spaces—with live readings, freeze-aware alerts, and exportable history.",
    },
    {
      question: "How do I connect ESP32 or Arduino sensors?",
      answer:
        "Create a push device under Dashboard → Devices, copy the one-time ingest key, and POST JSON to /api/ingest/<key>. Sample Arduino and MicroPython sketches ship in the GitHub repo.",
    },
    {
      question: "Does ThermalTrace send freeze alerts?",
      answer:
        "Yes. Set a freeze threshold and enable channels such as email, Discord, Telegram, Slack, or (on Pro) SMS, WhatsApp, and browser push. Predictive forecast freeze alerts are on Member; official NWS freeze and cold alerts are on Pro.",
    },
    {
      question: "Is ThermalTrace free?",
      answer:
        "Yes—there is a free plan with live curves, 7-day history, and threshold freeze alerts. Member adds 90-day history, CSV export, more devices, and forecast freeze warnings; Pro adds 1-year+ history, NWS cold-risk alerts, SMS, push, share links, webhooks, and a trial. Annual Member and Pro billing is discounted versus monthly.",
    },
    {
      question: "Is there a ThermalTrace Android app?",
      answer:
        "A native Android app is coming soon on Google Play. Until then you can use the full web dashboard or install the Progressive Web App. The phone does not sense temperature — it connects to your ThermalTrace account.",
    },
  ],
  pricing: [
    {
      question: "What is included on the Free plan?",
      answer:
        "Live probe curves, 7 days of history, threshold freeze and humidity alerts on email and chat-style channels, a limited number of devices, and household sharing so family can watch the same sensors.",
    },
    {
      question: "When should I upgrade to Member or Pro?",
      answer:
        "Choose Member for 90-day history, CSV export, more devices, and predictive forecast freeze (cold-risk) alerts. Choose Pro for 1-year+ history, official NWS freeze/cold alerts, SMS/WhatsApp, browser push, public share links, inbound/outbound webhooks, Prometheus metrics, and a 14-day trial. Annual billing is discounted versus paying monthly.",
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
        "Govee and SmartThings are general consumer/smart-home apps. ThermalTrace is purpose-built for probe temperature curves and freeze workflows—ESP/Arduino ingest, thresholds, forecast/NWS context, and CSV history—rather than a catch-all device dashboard.",
    },
    {
      question: "Do I need a public IP for my Arduino?",
      answer:
        "No for push ingest: the device POSTs outbound to ThermalTrace. Pull feeds need a reachable HTTPS JSON URL if you use that path instead.",
    },
    {
      question: "Can I keep Home Assistant or MQTT and still use ThermalTrace?",
      answer:
        "Yes. Push ingest is just HTTPS from the ESP. Many people dual-run: Home Assistant on the LAN, ThermalTrace for household freeze SMS and history they do not have to back up. Pro webhooks can also fire into HA.",
    },
    {
      question: "I already have Govee or a Tempest—do I still need this?",
      answer:
        "Govee is a consumer room sensor; Tempest is outdoor weather. ThermalTrace watches garage and workshop probe curves on hardware you control. They can coexist—see the Govee and Tempest comparison pages for when each tool is the better fit.",
    },
  ],
  "freeze-map": [
    {
      question: "What is the ThermalTrace freeze map?",
      answer:
        "An opt-in, city-level aggregate of anonymized garage temperature samples from contributing households—useful for seeing regional freeze risk, not a personal live feed.",
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
        "Probe wiring, ingest payloads, freeze alerts, and dashboard setup are covered in the About guides. Use Contact for account, billing, Android launch notes, or bugs the docs do not answer.",
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
  android: [
    {
      question: "Does the Android app measure garage temperature?",
      answer:
        "No. The phone is a companion client. ESP/Arduino sensors (or HTTPS JSON feeds) push readings to ThermalTrace; the app signs in and displays that account data.",
    },
    {
      question: "When will ThermalTrace be on Google Play?",
      answer:
        "The Play listing is in review. Until it is live, use the web dashboard or install the Progressive Web App from Chrome on Android.",
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
