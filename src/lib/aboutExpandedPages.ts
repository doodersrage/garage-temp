export type ExpandedAboutPageMeta = {
  slug: string;
  parentSlug: string;
  title: string;
  description: string;
  summary: string;
};

/** Metadata for 40 expanded about guides (content lives in aboutExpandedContent.ts). */
export const expandedAboutPageMeta: ExpandedAboutPageMeta[] = [
  {
    slug: "dht22-sensor-overview",
    parentSlug: "temperature-probes",
    title: "DHT22 sensor overview",
    description:
      "How the DHT22 humidity–temperature sensor works, its accuracy limits, and why it fits garage monitoring.",
    summary: "Single-wire digital sensor, typical accuracy, and minimum read intervals.",
  },
  {
    slug: "probe-mounting-enclosures",
    parentSlug: "temperature-probes",
    title: "Probe mounting and enclosures",
    description:
      "Mount probes for stable garage readings: height, shielding from sun and drafts, and ventilated enclosures.",
    summary: "Shoulder-height placement away from doors and heat sources in breathable housings.",
  },
  {
    slug: "multi-zone-garage-layout",
    parentSlug: "temperature-probes",
    title: "Multi-zone garage layout",
    description:
      "Plan multiple probe zones to capture floor-to-ceiling gradients, door-adjacent swings, and workbench areas.",
    summary: "Split the garage into meaningful zones instead of averaging away the signal you need.",
  },
  {
    slug: "probe-mapping-labels",
    parentSlug: "temperature-probes",
    title: "Probe mapping and dashboard labels",
    description:
      "Map JSON probe keys to human-readable names in the dashboard so home page cards match physical locations.",
    summary: "Stable JSON keys, friendly labels, and feed-level organization for multi-probe setups.",
  },
  {
    slug: "garage-door-temperature-swings",
    parentSlug: "temperature-changes",
    title: "Garage door temperature swings",
    description:
      "Why opening the garage door causes rapid temperature and humidity changes and how to interpret probe spikes.",
    summary: "Infiltration and thermal stratification when the largest wall opening moves.",
  },
  {
    slug: "sun-load-garage-walls",
    parentSlug: "temperature-changes",
    title: "Sun load on garage walls",
    description:
      "How solar gain on south- and west-facing garage walls creates afternoon heat lag and probe drift.",
    summary: "Opaque wall heating, delayed interior peaks, and why outdoor weather alone misleads.",
  },
  {
    slug: "infiltration-wind-drafts",
    parentSlug: "temperature-changes",
    title: "Infiltration, wind, and drafts",
    description:
      "How air leaks and wind pressure move garage air even when the main door stays shut.",
    summary: "Chronic leaks versus door events, and what probes reveal about draft paths.",
  },
  {
    slug: "seasonal-garage-patterns",
    parentSlug: "temperature-changes",
    title: "Seasonal garage patterns",
    description:
      "Read multi-month probe history for winter floors, summer peaks, and shoulder-season transitions.",
    summary: "Long-horizon context so single-day spikes do not drive bad decisions.",
  },
  {
    slug: "history-dashboard-browsing",
    parentSlug: "historical-data",
    title: "History dashboard browsing",
    description:
      "Navigate paginated probe history, interpret feed and probe columns, and spot gaps in saved data.",
    summary: "Turn stored snapshots into a readable timeline inside the signed-in dashboard.",
  },
  {
    slug: "csv-export-spreadsheet-analysis",
    parentSlug: "historical-data",
    title: "CSV export and spreadsheet analysis",
    description:
      "Export full history for charts, pivot tables, freeze audits, and seasonal comparisons in Excel or Sheets.",
    summary: "Subscriber and admin CSV workflows for analysis outside the website.",
  },
  {
    slug: "freeze-protection-thresholds",
    parentSlug: "historical-data",
    title: "Freeze protection thresholds",
    description:
      "Use overnight minimums and zone comparisons to protect plumbing and stored goods before damage occurs.",
    summary: "Define risk temperatures from history instead of guessing from outdoor forecasts.",
  },
  {
    slug: "arduino-ide-setup",
    parentSlug: "arduino-sketches",
    title: "Arduino IDE setup and flashing",
    description:
      "Install the Arduino IDE, select board and port, install libraries, and flash the garage probe sketch.",
    summary: "Bench setup before mounting hardware in the garage.",
  },
  {
    slug: "sketch-polling-main-loop",
    parentSlug: "arduino-sketches",
    title: "Sketch polling and main loop",
    description:
      "How the firmware timer reads DHT22 probes, serves HTTP, and updates the LCD without blocking.",
    summary: "Non-blocking loop design for sensors, network, and local display.",
  },
  {
    slug: "json-probe-output-schema",
    parentSlug: "arduino-sketches",
    title: "JSON probe output schema",
    description:
      "Stable JSON keys, temperature units, humidity fields, and average computation for dashboard consumers.",
    summary: "Contract between firmware and every downstream client including this website.",
  },
  {
    slug: "firmware-watchdog-recovery",
    parentSlug: "arduino-sketches",
    title: "Firmware watchdog and recovery",
    description:
      "Recover from rare network hangs and sensor bus errors without climbing a ladder to power-cycle the board.",
    summary: "Watchdog timers, retries, and reboot strategies for unattended garage installs.",
  },
  {
    slug: "breadboard-power-rails",
    parentSlug: "arduino-circuit-wiring",
    title: "Breadboard power rails",
    description:
      "Distribute USB or barrel power across the breadboard for sensors, LCD, and pull-ups with a shared ground.",
    summary: "Clean power rails reduce noise that shows up as bogus humidity spikes.",
  },
  {
    slug: "ethernet-shield-stacking",
    parentSlug: "arduino-circuit-wiring",
    title: "Ethernet shield stacking",
    description:
      "Mechanically stack the W5100 shield on the Uno, preserve ICSP clearance, and route cables away from heat.",
    summary: "Physical assembly details before locking the board in a garage enclosure.",
  },
  {
    slug: "circuit-wiring-troubleshooting",
    parentSlug: "arduino-circuit-wiring",
    title: "Circuit wiring troubleshooting",
    description:
      "Diagnose blank LCDs, missing probes, and intermittent reads with a multimeter and serial logging.",
    summary: "Systematic checks from power to data lines before replacing parts.",
  },
  {
    slug: "liquid-crystal-gpio-map",
    parentSlug: "arduino-pin-wiring",
    title: "LiquidCrystal GPIO map",
    description:
      "Pin assignments for RS, E, and data lines D4–D7 matching the LiquidCrystal constructor in firmware.",
    summary: "LCD pins must match the sketch exactly or the display stays blank.",
  },
  {
    slug: "dht22-data-line-wiring",
    parentSlug: "arduino-pin-wiring",
    title: "DHT22 data line wiring",
    description:
      "GPIO per sensor, 10 kΩ pull-ups, shared ground, and cable routing away from motor noise.",
    summary: "One data pin per probe with proper pull-up and length limits.",
  },
  {
    slug: "spi-pins-ethernet-reserved",
    parentSlug: "arduino-pin-wiring",
    title: "SPI pins reserved for Ethernet",
    description:
      "Which Arduino pins the W5100 shield uses and which GPIO remain available for LCD and DHT22 lines.",
    summary: "Avoid pin conflicts between the Ethernet stack and local peripherals.",
  },
  {
    slug: "dht22-read-errors-retries",
    parentSlug: "arduino-dht22-lcd",
    title: "DHT22 read errors and retries",
    description:
      "Handle checksum failures and timing violations with backoff so one bad read does not blank the feed.",
    summary: "Retry logic and minimum intervals keep JSON stable in drafty installs.",
  },
  {
    slug: "lcd-local-display-format",
    parentSlug: "arduino-dht22-lcd",
    title: "LCD local display format",
    description:
      "Format on-site temperature and humidity lines so technicians can validate probes without a laptop.",
    summary: "Two-line layout conventions for dual-probe garage controllers.",
  },
  {
    slug: "dual-probe-averaging",
    parentSlug: "arduino-dht22-lcd",
    title: "Dual-probe averaging logic",
    description:
      "Compute the JSON average across healthy probes while keeping per-zone values on the LCD and in feeds.",
    summary: "When to average, when to exclude a failed read, and how history uses avg.",
  },
  {
    slug: "fastapi-relay-setup",
    parentSlug: "python-feeds",
    title: "FastAPI relay setup",
    description:
      "Run the Python relay that polls upstream Arduino JSON and exposes a stable HTTPS endpoint.",
    summary: "Install, configure upstream URL, and verify cached responses with curl.",
  },
  {
    slug: "redis-cache-for-feeds",
    parentSlug: "python-feeds",
    title: "Redis cache for feeds",
    description:
      "Cache probe JSON in Redis so the public internet never hammers your home uplink on every page view.",
    summary: "TTL tuning, stale-while-revalidate behavior, and restart recovery.",
  },
  {
    slug: "relay-security-and-access",
    parentSlug: "python-feeds",
    title: "Relay security and access",
    description:
      "TLS termination, firewall rules, and access control for a residential JSON relay exposed to the web.",
    summary: "Harden the relay without complicating the Arduino firmware.",
  },
  {
    slug: "astro-server-side-rendering",
    parentSlug: "astro-applications",
    title: "Astro server-side rendering",
    description:
      "How Astro renders HTML on the server for fast first paint on home, about, and dashboard pages.",
    summary: "SSR pages versus static prerender in this Cloudflare deployment.",
  },
  {
    slug: "astro-islands-and-hydration",
    parentSlug: "astro-applications",
    title: "Astro islands and hydration",
    description:
      "Client islands for interactive pieces like the contact form and probe demo without shipping a full SPA.",
    summary: "Selective JavaScript where interactivity actually matters.",
  },
  {
    slug: "cloudflare-workers-deployment",
    parentSlug: "astro-applications",
    title: "Cloudflare Workers deployment",
    description:
      "Build and deploy this site to Cloudflare Workers with the Astro adapter and wrangler configuration.",
    summary: "Edge hosting for pages, API routes, and assets in one pipeline.",
  },
  {
    slug: "nextjs-monitoring-dashboards",
    parentSlug: "nextjs-node-applications",
    title: "Next.js for monitoring dashboards",
    description:
      "When Next.js App Router and React Server Components fit environmental monitoring UIs.",
    summary: "Strengths of Next for auth-heavy dashboards versus this Astro stack.",
  },
  {
    slug: "node-express-api-patterns",
    parentSlug: "nextjs-node-applications",
    title: "Node and Express API patterns",
    description:
      "Compare long-running Node APIs with FastAPI relays and Astro API routes for probe data.",
    summary: "Where Express still wins and where Python or edge routes are simpler.",
  },
  {
    slug: "comparing-full-stack-options",
    parentSlug: "nextjs-node-applications",
    title: "Comparing full-stack options",
    description:
      "Choose among Astro, Next.js, and standalone Node services for a garage monitoring project.",
    summary: "Trade-offs for SSR, auth, billing, and hardware integration.",
  },
  {
    slug: "home-page-probe-fetch",
    parentSlug: "data-flow",
    title: "Home page probe fetch",
    description:
      "Server code loads configured feed URLs, parses JSON, and renders stat cards on each home page request.",
    summary: "Guest defaults versus signed-in feed mappings from Supabase.",
  },
  {
    slug: "supabase-history-inserts",
    parentSlug: "data-flow",
    title: "Supabase history inserts",
    description:
      "When authenticated home page loads persist probe rows with timestamps, labels, and humidity.",
    summary: "What triggers a save, what is stored per probe, and guest behavior.",
  },
  {
    slug: "debugging-stale-readings",
    parentSlug: "data-flow",
    title: "Debugging stale readings",
    description:
      "Trace stale or missing home page values from probe to relay to dashboard mapping.",
    summary: "Checklist for curl, cache, auth, and key typos in order.",
  },
  {
    slug: "supabase-auth-flow",
    parentSlug: "accounts-and-dashboard",
    title: "Supabase auth flow",
    description:
      "Email registration, sign-in cookies, default user group membership, and session handling on Cloudflare.",
    summary: "How accounts are created and authenticated end to end.",
  },
  {
    slug: "stripe-csv-subscription",
    parentSlug: "accounts-and-dashboard",
    title: "Stripe CSV subscription",
    description:
      "Subscribe for CSV export access via Stripe Checkout, webhooks, and the member group.",
    summary: "Billing flow from checkout to unlocked history download.",
  },
  {
    slug: "configuring-temperature-feeds",
    parentSlug: "accounts-and-dashboard",
    title: "Configuring temperature feeds",
    description:
      "Add HTTPS JSON feeds, enable probes, and map keys to labels in the dashboard settings form.",
    summary: "Personalize the home page with your own probe endpoints.",
  },
  {
    slug: "admin-dashboard-features",
    parentSlug: "accounts-and-dashboard",
    title: "Admin dashboard features",
    description:
      "Admin-only user management, contact submission review, and CSV export without a subscription.",
    summary: "Tools gated by the admin group for site operators.",
  },
];
