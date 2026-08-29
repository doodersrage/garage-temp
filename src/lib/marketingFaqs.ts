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
        "Yes. Set a freeze threshold and enable channels such as email, Discord, Telegram, Slack, or (on Pro) SMS, WhatsApp, and browser push. Forecast and NWS-backed cold-risk alerts are also available.",
    },
    {
      question: "Is ThermalTrace free?",
      answer:
        "Yes—there is a free plan with live curves and basic alerts. Member adds CSV history export and more devices; Pro adds SMS, push, share links, webhooks, and a trial.",
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
        "Live probe curves, basic freeze and humidity alerts on email and chat-style channels, a limited number of devices, and household sharing so family can watch the same sensors.",
    },
    {
      question: "When should I upgrade to Member or Pro?",
      answer:
        "Choose Member for CSV history export and more devices. Choose Pro for SMS/WhatsApp, browser push, public share links, inbound/outbound webhooks, Prometheus metrics, and a 14-day trial.",
    },
    {
      question: "Can I cancel or change plans anytime?",
      answer:
        "Paid plans bill through Stripe. You can manage or cancel from the customer portal; missing payment may return the account to Free limits.",
    },
  ],
  compare: [
    {
      question: "How is ThermalTrace different from a DIY script?",
      answer:
        "ThermalTrace hosts ingest, history, households, and multi-channel freeze alerts for you. A DIY cron script requires you to run servers, databases, Twilio wiring, and uptime yourself.",
    },
    {
      question: "Is ThermalTrace better than a generic IoT app for freeze risk?",
      answer:
        "It is purpose-built for probe temperature curves and freeze workflows—ESP/Arduino ingest, thresholds, forecast/NWS context, and CSV history—rather than a general device dashboard.",
    },
    {
      question: "Do I need a public IP for my Arduino?",
      answer:
        "No for push ingest: the device POSTs outbound to ThermalTrace. Pull feeds need a reachable HTTPS JSON URL if you use that path instead.",
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
