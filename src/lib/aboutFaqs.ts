import type { AboutContentBlock } from "./aboutExpandedContent";

export type AboutFaqItem = {
  question: string;
  answer: string;
};

/** FAQ copy for high-intent guides (FAQPage JSON-LD + optional on-page list). */
export const aboutFaqsBySlug: Record<string, AboutFaqItem[]> = {
  "dht22-sensor-overview": [
    {
      question: "How accurate is a DHT22 in a garage?",
      answer:
        "Roughly ±0.5 °C and a few percent RH in stable air. Drafts and door openings create real spikes—not always sensor error. Compare zones before replacing hardware.",
    },
    {
      question: "How often should firmware poll the DHT22?",
      answer:
        "Respect at least a two-second gap between reads. Overlapping requests return stale or error values; sketches use timers and retries for that reason.",
    },
    {
      question: "Can one DHT22 cover a whole garage?",
      answer:
        "One sensor hides gradients. Door bays, north walls, and workbenches often differ by several degrees—use multiple probes when freeze risk or tools matter.",
    },
  ],
  "freeze-protection-thresholds": [
    {
      question: "What freeze threshold should I start with?",
      answer:
        "Many garages start near 35–38 °F so you get warning before pipes are at hard freeze. Tune after you see overnight lows in your coldest zone.",
    },
    {
      question: "Should I alert on outdoor forecast or indoor probes?",
      answer:
        "Use both when you can: probes catch your space; forecast and NWS alerts catch regional cold snaps before indoor air has dropped.",
    },
  ],
  "cold-snap-playbook": [
    {
      question: "What should I do when a freeze alert fires?",
      answer:
        "Acknowledge it, check the coldest zone and door state, open quiet-hour bypass if needed, and escalate channels if nobody responds within your playbook window.",
    },
    {
      question: "How do quiet hours interact with freeze alerts?",
      answer:
        "You can suppress routine noise overnight while still delivering freeze and forecast alerts—keep bypass enabled for critical kinds.",
    },
  ],
  "alert-channel-cookbook": [
    {
      question: "Which channels work on the free plan?",
      answer:
        "Email plus chat-style destinations (Discord, Telegram, Slack, Teams, ntfy, Pushover). SMS, WhatsApp, browser push, and outbound webhooks need Pro.",
    },
    {
      question: "Why did a channel get skipped?",
      answer:
        "A checked channel without a destination (phone, webhook URL, chat id) is skipped at send time. Fill destinations, save, then send a test alert.",
    },
  ],
  "household-sharing-walkthrough": [
    {
      question: "Can household members change alert settings?",
      answer:
        "Editors and owners can; view-only members see live data without changing devices, alerts, or sharing.",
    },
    {
      question: "Do invites require a paid plan?",
      answer:
        "Household sharing is available on free accounts so family can watch the same probes and alerts together.",
    },
  ],
  "ingest-and-webhooks": [
    {
      question: "Do I need a public IP on the Arduino?",
      answer:
        "No. Push ingest posts outbound to ThermalTrace with a device key. Pull feeds need a reachable HTTPS JSON URL if you use that path instead.",
    },
    {
      question: "What belongs in an ingest payload?",
      answer:
        "Temperature (and humidity) keyed by probe index, plus optional door/power fields, battery, and RSSI. Keep keys stable so dashboard mappings stay valid.",
    },
  ],
};

export function getAboutFaqs(slug: string): AboutFaqItem[] {
  return aboutFaqsBySlug[slug] ?? [];
}

/** Convert FAQ items into AboutContentBlock list for article footers. */
export function aboutFaqsToBlocks(faqs: AboutFaqItem[]): AboutContentBlock[] {
  if (faqs.length === 0) return [];
  return [
    { type: "h2", text: "FAQ" },
    ...faqs.flatMap((faq) => [
      {
        type: "p" as const,
        html: `<strong>${faq.question}</strong><br />${faq.answer}`,
      },
    ]),
  ];
}
