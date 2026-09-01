export type Story = {
  slug: string;
  path: string;
  headline: string;
  title: string;
  description: string;
  quote: string;
  location: string;
  datePublished: string;
  ogImage: string;
  setup: string[];
  timeline: Array<{ time: string; detail: string }>;
  outcome: string;
  faqs: Array<{ question: string; answer: string }>;
};

export const stories: Story[] = [
  {
    slug: "garage-freeze-alert",
    path: "/stories/garage-freeze-alert",
    headline: "Garage freeze alert case study",
    title: "We got the text before the pipes froze",
    description:
      "How a Minneapolis homeowner avoided pipe damage with ThermalTrace freeze alerts, ESP32 ingest, and Pro SMS when a space heater failed overnight.",
    quote: "We got the text before the pipes froze",
    location: "Minneapolis, MN",
    datePublished: "2025-11-01",
    ogImage: "/og-story-freeze.jpg",
    setup: [
      "ESP32 + DHT22 pushing every 5 minutes to ThermalTrace ingest",
      "Freeze threshold at 34°F with Pro SMS + Telegram routing",
      "Weekly digest for the household; share link for a neighbor who watches the house",
    ],
    timeline: [
      { time: "2:14 a.m.", detail: "Garage crossed 33°F; SMS to both owners + Telegram family channel." },
      { time: "2:22 a.m.", detail: "Owner restarted the space heater remotely via a smart plug." },
      { time: "3:05 a.m.", detail: "Temperature recovering; no pipe damage, no emergency plumber." },
    ],
    outcome:
      "One failed heater overnight would have meant a burst pipe. The alert paid for a year of Pro in a single night.",
    faqs: [
      {
        question: "What alert channels caught the freeze?",
        answer:
          "Pro SMS to both owners plus Telegram to a family channel when the garage crossed 33°F at 2:14 a.m.",
      },
      {
        question: "What hardware was used?",
        answer:
          "An ESP32 with a DHT22 pushing every five minutes to ThermalTrace ingest, with a 34°F freeze threshold.",
      },
    ],
  },
  {
    slug: "cabin-winter-watch",
    path: "/stories/cabin-winter-watch",
    headline: "Cabin winter watch case study",
    title: "Weekend cabin, weekday peace of mind",
    description:
      "How a Vermont cabin owner used ThermalTrace email and push alerts to catch a furnace outage mid-week before pipes froze in an empty house.",
    quote: "The cabin texted us from three hours away",
    location: "Stowe, VT",
    datePublished: "2025-12-12",
    ogImage: "/og-story-freeze.jpg",
    setup: [
      "Wi-Fi ESP8266 near the mechanical room, two probes (indoor + crawlspace)",
      "Member plan with email + PWA push; freeze threshold 36°F",
      "Household invite for a local friend as backup responder",
    ],
    timeline: [
      { time: "Tue 11:40 a.m.", detail: "Crawlspace dropped below threshold after a power blip reset the furnace." },
      { time: "Tue 11:41 a.m.", detail: "Push + email fired; owner called the local friend." },
      { time: "Tue 1:10 p.m.", detail: "Friend reset the furnace; temps climbing before evening cold set in." },
    ],
    outcome:
      "Empty cabins fail silently. A mid-week alert beat a Friday arrival to frozen pipes and a flooded crawlspace.",
    faqs: [
      {
        question: "Do you need SMS for a cabin?",
        answer:
          "Email and push were enough here because someone could respond within two hours. SMS helps when you’re offline hiking.",
      },
      {
        question: "How many probes?",
        answer:
          "Two: living space for comfort context, crawlspace for the freeze risk that actually matters.",
      },
    ],
  },
  {
    slug: "server-closet-heat",
    path: "/stories/server-closet-heat",
    headline: "Server closet heat case study",
    title: "Homelab heat spike before the weekend",
    description:
      "A Denver homelabber caught a stuck garage-door-adjacent server closet fan with ThermalTrace high-temp alerts and webhook → Home Assistant.",
    quote: "The closet was cooking and we were out of town",
    location: "Denver, CO",
    datePublished: "2026-01-18",
    ogImage: "/og-dashboard.jpg",
    setup: [
      "Existing ESP32 already on ThermalTrace for the garage; second probe in the closet",
      "High-temp threshold 95°F plus freeze watch on the garage side",
      "Pro webhook into Home Assistant to cut a smart plug if temps stayed high (today: use the HACS integration or outbound webhook blueprint)",
    ],
    timeline: [
      { time: "Fri 6:05 p.m.", detail: "Closet hit 96°F after a fan failed; webhook tripped HA automation." },
      { time: "Fri 6:06 p.m.", detail: "Non-critical gear powered down; SMS confirmed the cutover." },
      { time: "Sat a.m.", detail: "Owner replaced the fan; no cooked NAS, no melt smell." },
    ],
    outcome:
      "Same stack that watches freeze risk also watches heat. One ingest path, two failure modes covered.",
    faqs: [
      {
        question: "Is ThermalTrace only for cold?",
        answer:
          "No — thresholds work both ways. Freeze is the headline risk for garages; heat matters for closets and workshops.",
      },
      {
        question: "How did Home Assistant fit?",
        answer:
          "Pro outbound webhooks POST alert JSON into Home Assistant. An automation switched a smart plug when closet temp stayed elevated. Today you can also use the official HACS integration for share-link sensors and snooze services — see thermaltrace.dev/integrations/home-assistant.",
      },
    ],
  },
  {
    slug: "pipe-near-miss",
    path: "/stories/pipe-near-miss",
    headline: "Attached garage pipe near-miss",
    title: "Thirty-four degrees and a near miss",
    description:
      "An Ohio attached-garage household used ThermalTrace history and a 34°F alert to catch a drafty door seal before supply lines iced.",
    quote: "History showed the cold corner every clear night",
    location: "Columbus, OH",
    datePublished: "2026-02-04",
    ogImage: "/og-story-freeze.jpg",
    setup: [
      "Arduino + DHT22 on a shelf above the water heater in the attached garage",
      "Free plan email alerts at 34°F while evaluating; upgraded to Member for CSV",
      "Compared indoor garage vs outdoor weather on the dashboard",
    ],
    timeline: [
      { time: "Week 1", detail: "Alerts fired on clear nights; owner assumed ‘just cold air.’" },
      { time: "Week 2", detail: "CSV export showed the same corner dipping first every time." },
      { time: "Week 3", detail: "Weatherstripped the door; nights stayed above threshold." },
    ],
    outcome:
      "The alert was the tip; history was the proof. Fixing the seal cost less than one thawed-pipe deductible.",
    faqs: [
      {
        question: "Was Free enough?",
        answer:
          "Free caught the problem with email. Member CSV made the cold-corner pattern obvious enough to fix the door.",
      },
      {
        question: "Attached garages still freeze?",
        answer:
          "Yes — especially against exterior walls and leaky doors. ‘Attached’ is not the same as ‘conditioned.’",
      },
    ],
  },
];

export function getStory(slug: string): Story | undefined {
  return stories.find((s) => s.slug === slug);
}
