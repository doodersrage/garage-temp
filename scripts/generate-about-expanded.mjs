/**
 * Generates src/lib/aboutExpandedContent.ts with 40 expanded about pages.
 * Run: node scripts/generate-about-expanded.mjs
 */
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

const link = (slug, text) =>
  `<a class="text-link" href="/about/${slug}">${text}</a>`;

/** @type {{ slug: string; parentSlug: string; blocks: object[] }[]} */
const pages = [
  // ── temperature-probes (4) ──
  {
    slug: "dht22-sensor-overview",
    parentSlug: "temperature-probes",
    blocks: [
      {
        type: "p",
        html: `The DHT22 (also sold as AM2302) is the digital sensor at the heart of this garage build. It reports relative humidity and air temperature over a single data line, which keeps wiring simple when you need multiple zones. Understanding its behavior helps you interpret noisy readings and set realistic expectations compared with lab-grade equipment.`,
      },
      { type: "h2", text: "What the DHT22 measures" },
      {
        type: "p",
        html: `Each read returns humidity (0–100 %RH) and temperature (typically −40 to 80 °C spec range). The firmware converts values to Fahrenheit for JSON consumers while the LCD may show either scale. Readings represent the air pocket around the sensor body—not surface temperature of a pipe or concrete slab unless you mount the probe against that surface intentionally.`,
      },
      {
        type: "p",
        html: `Datasheet accuracy is roughly ±0.5 °C and ±2–5 %RH under stable conditions. In drafty garages, rapid door openings can produce short spikes that are real air movement, not sensor failure. Compare with ${link("probe-mounting-enclosures", "probe placement guidance")} before replacing hardware.`,
      },
      { type: "h2", text: "Timing and bus behavior" },
      {
        type: "p",
        html: `DHT22 sensors enforce a minimum interval between reads—often two seconds. The sketch polls on a timer and skips overlapping requests. Violating the interval returns stale or error values, which is why firmware includes retry logic described in ${link("dht22-read-errors-retries", "DHT22 read errors and retries")}.`,
      },
      {
        type: "ul",
        items: [
          "**Power:** 3.3–5 V DC; share ground with the Arduino.",
          "**Data:** One GPIO per sensor with a pull-up resistor on the line.",
          "**Cable length:** Keep runs modest; long unshielded wires pick up noise.",
          "**Enclosure:** Ventilated housing avoids sun-heated stale air—see the mounting guide.",
        ],
      },
      { type: "h2", text: "Where it fits in the stack" },
      {
        type: "p",
        html: `Probes feed the ${link("arduino-sketches", "Arduino sketch")}, which publishes JSON consumed by the website. Follow the ${link("data-flow", "end-to-end data flow")} when debugging mismatches between LCD and web values. Pin-level wiring is documented in ${link("dht22-data-line-wiring", "DHT22 data line wiring")}.`,
      },
    ],
  },
  {
    slug: "probe-mounting-enclosures",
    parentSlug: "temperature-probes",
    blocks: [
      {
        type: "p",
        html: `A perfect sensor in the wrong location lies. Garage probes should sample the air volume where stored goods and people actually experience conditions—not the hottest sun patch on the floor or the coldest air seeping under a door.`,
      },
      { type: "h2", text: "Height and location" },
      {
        type: "p",
        html: `Mount at roughly four to five feet on an interior wall, away from the garage door plane and direct sunlight through windows. North and west walls often track outdoor swings more slowly, which can be useful for freeze-risk monitoring. See ${link("multi-zone-garage-layout", "multi-zone layout")} when placing more than one probe.`,
      },
      { type: "h2", text: "Enclosures and airflow" },
      {
        type: "ul",
        items: [
          "Use **ventilated project boxes** so the sensor breathes ambient air.",
          "Avoid sealing probes inside waterproof cases without vents—humidity lags reality.",
          "Route cables down from the box so condensation does not drip into electronics.",
          "Label each cable at both ends before climbing a ladder twice.",
        ],
      },
      { type: "h2", text: "Common mistakes" },
      {
        type: "p",
        html: `Probes zip-tied to metal door tracks, sitting on freezers, or dangling in front of exhaust fans produce dramatic but misleading graphs. The ${link("probe-demo", "interactive probe demo")} shows how door and sun inputs move zones differently—use it when validating placement. For seasonal context, read ${link("seasonal-garage-patterns", "seasonal garage patterns")}.`,
      },
    ],
  },
  {
    slug: "multi-zone-garage-layout",
    parentSlug: "temperature-probes",
    blocks: [
      {
        type: "p",
        html: `Large garages behave like several microclimates. A single average hides the coldest corner where pipes run and the warmest bay under a sunny roof. Multiple probes turn one vague number into actionable zone data.`,
      },
      { type: "h2", text: "Example zone map" },
      {
        type: "ol",
        items: [
          "**Zone 0 — Door-adjacent:** Captures infiltration when the door opens; expect wide swings.",
          "**Zone 1 — Interior workbench:** Represents where you stand and where tools live.",
          "**Optional third — Ceiling or attic knee wall:** Spots hot air stratification in summer.",
        ],
      },
      { type: "h2", text: "Firmware and dashboard alignment" },
      {
        type: "p",
        html: `JSON keys <code>0</code>, <code>1</code>, and <code>avg</code> map to dashboard labels you configure after sign-in—see ${link("probe-mapping-labels", "probe mapping and labels")}. The average is a convenience snapshot for history, not a substitute for checking each zone during cold snaps.`,
      },
      {
        type: "p",
        html: `Dual-probe wiring and LCD layout are covered in ${link("arduino-dht22-lcd", "DHT22 sensors and LCD display")} and ${link("dual-probe-averaging", "dual-probe averaging logic")}.`,
      },
      { type: "h2", text: "When to add another probe" },
      {
        type: "ul",
        items: [
          "**Split-level garage:** Floor and loft can differ by 10 °F on calm winter nights.",
          "**Shared wall with house:** Interior partition may stay warmer than the exterior bay.",
          "**Workshop corner with heat gun use:** Isolate occasional spikes from whole-garage trends.",
        ],
      },
    ],
  },
  {
    slug: "probe-mapping-labels",
    parentSlug: "temperature-probes",
    blocks: [
      {
        type: "p",
        html: `Raw JSON exposes probes as numeric keys. The dashboard translates those keys into labels such as “North wall” or “Door bay” so visitors understand what they are reading without memorizing firmware indices.`,
      },
      { type: "h2", text: "Configuring mappings" },
      {
        type: "p",
        html: `Signed-in users add HTTPS feed URLs under dashboard temperature feed settings—detailed in ${link("configuring-temperature-feeds", "configuring temperature feeds")}. Each enabled probe key gets a display name. Typos in keys silently hide readings even when the feed is healthy, so verify against curl output or ${link("json-probe-output-schema", "JSON probe output schema")}.`,
      },
      { type: "h2", text: "Naming conventions" },
      {
        type: "ul",
        items: [
          "Include **location and height** if zones are similar (“East wall, high”).",
          "Keep names short for mobile stat cards.",
          "Document GPIO-to-key mapping on the bench for future you.",
          "Use the average key only for summary history, not as a zone label.",
        ],
      },
      { type: "h2", text: "Related guides" },
      {
        type: "p",
        html: `Start with ${link("temperature-probes", "temperature probes and their uses")}, then follow ${link("home-page-probe-fetch", "home page probe fetch")} for how mappings reach the public home page.`,
      },
    ],
  },

  // ── temperature-changes (4) ──
  {
    slug: "garage-door-temperature-swings",
    parentSlug: "temperature-changes",
    blocks: [
      {
        type: "p",
        html: `The garage door is the dominant hole in the thermal envelope. Opening it exchanges a large slab of indoor air with outdoor conditions in seconds—often faster than the rest of the structure responds. Probes near the door record this clearly; probes farther away may barely notice a single short opening.`,
      },
      { type: "h2", text: "What probes show" },
      {
        type: "p",
        html: `Expect sudden drops in winter or jumps in summer humidity when cold or humid outdoor air rolls in. Short spikes during brief errands are normal. Prolonged door-open work sessions can drive the entire bay toward outdoor dew point—watch for condensation on metal tools afterward.`,
      },
      { type: "h2", text: "Separating signal from placement error" },
      {
        type: "p",
        html: `If every daily spike aligns with commute times, your door-adjacent probe is doing its job. If the interior probe mirrors the same amplitude, consider relocating it—see ${link("probe-mounting-enclosures", "probe mounting")}. Compare patterns with ${link("temperature-changes", "temperature changes overview")} and the ${link("probe-demo", "probe demo")} door toggle.`,
      },
      { type: "h2", text: "Mitigation without new hardware" },
      {
        type: "ul",
        items: [
          "**Weather stripping** on the door reduces idle infiltration between openings.",
          "**Interior probe** on the opposite wall gives context for how far the wave travels.",
          `**History charts** help distinguish one-off events from chronic heat loss—see ${link("history-dashboard-browsing", "history dashboard browsing")}.`,
        ],
      },
    ],
  },
  {
    slug: "sun-load-garage-walls",
    parentSlug: "temperature-changes",
    blocks: [
      {
        type: "p",
        html: `Sun load heats opaque walls even when outdoor air temperature is moderate. Dark siding, uninsulated sheathing, and metal doors store heat that bleeds inward for hours after peak outdoor temps. Probes on sun-facing walls often peak later than the weather app suggests.`,
      },
      { type: "h2", text: "Seasonal patterns" },
      {
        type: "ul",
        items: [
          "**Summer:** Interior garage temps can exceed outdoor highs in late afternoon.",
          "**Winter:** Low sun angle may still warm south walls on clear days.",
          "**Shoulder seasons:** Large diurnal swing with delayed interior maximum.",
        ],
      },
      { type: "h2", text: "Monitoring implications" },
      {
        type: "p",
        html: `Pair wall-adjacent probes with a more sheltered interior zone to separate sun-driven drift from whole-garage trends. ${link("seasonal-garage-patterns", "Seasonal patterns")} explains how to read multi-month history without overreacting to a single hot afternoon.`,
      },
      { type: "h2", text: "Probe placement tips" },
      {
        type: "p",
        html: `Avoid mounting directly on sun-baked drywall facing south or west. A few inches of standoff inside a ventilated box still tracks wall influence without baking the sensor. ${link("multi-zone-garage-layout", "Multi-zone layout")} helps assign one probe to the sunny wall and another to a shaded reference.`,
      },
    ],
  },
  {
    slug: "infiltration-wind-drafts",
    parentSlug: "temperature-changes",
    blocks: [
      {
        type: "p",
        html: `Air leaks and wind-driven pressure differences move garage air even when the big door stays shut. Gaps around the door, soffit vents, and poorly sealed service entries let outdoor air slip in along the floor and behind stored shelving.`,
      },
      { type: "h2", text: "Wind versus door events" },
      {
        type: "p",
        html: `Door openings produce sharp, short spikes tied to human activity. Steady wind on a cold night creates a slower drift—especially on probes near the door bottom or exterior wall. Compare with ${link("garage-door-temperature-swings", "garage door swings")} to tell which driver dominates.`,
      },
      { type: "h2", text: "What to watch in data" },
      {
        type: "ul",
        items: [
          "**Overnight plateaus** colder than forecast often mean chronic infiltration.",
          "**Humidity rises** when warm moist outdoor air replaces dry winter indoor air.",
          "**Zone mismatch** between door and interior probes flags draft paths.",
        ],
      },
      { type: "h2", text: "Next steps" },
      {
        type: "p",
        html: `Use ${link("historical-data", "historical data")} to correlate windy weeks with minimum temps. Freeze planning belongs in ${link("freeze-protection-thresholds", "freeze protection thresholds")} once you know your typical leak-driven floor.`,
      },
    ],
  },
  {
    slug: "seasonal-garage-patterns",
    parentSlug: "temperature-changes",
    blocks: [
      {
        type: "p",
        html: `Garages follow the seasons with lag and damping. Unconditioned bays track outdoor extremes more closely in winter and lag behind peak summer heat when insulation and thermal mass buffer swings. Long history makes those rhythms obvious.`,
      },
      { type: "h2", text: "Winter freeze risk" },
      {
        type: "p",
        html: `Pipes and chemicals care about sustained lows, not a single cold hour. Review weekly minimums in the dashboard history rather than glancing at noon readings. Pair with ${link("freeze-protection-thresholds", "freeze protection thresholds")} for actionable cutoffs.`,
      },
      { type: "h2", text: "Summer heat storage" },
      {
        type: "ul",
        items: [
          `**Afternoon peaks** often arrive after outdoor highs when ${link("sun-load-garage-walls", "sun load")} dominates.`,
          "**Overnight cooling** may stall if the bay never fully purges hot air.",
          "**Humidity** can climb when warm air holds more moisture near stored goods.",
        ],
      },
      { type: "h2", text: "Using history well" },
      {
        type: "p",
        html: `Export CSV for year-over-year comparison—see ${link("csv-export-spreadsheet-analysis", "CSV export and spreadsheet analysis")}. Seasonal planning beats reacting to every daily wiggle on the home page.`,
      },
    ],
  },

  // ── historical-data (3) ──
  {
    slug: "history-dashboard-browsing",
    parentSlug: "historical-data",
    blocks: [
      {
        type: "p",
        html: `Live readings answer “what is it now?” History answers “how bad was last week?” The signed-in dashboard charts stored Supabase rows so you can zoom from recent hours to multi-month trends without re-querying the probe on every page load.`,
      },
      { type: "h2", text: "What gets stored" },
      {
        type: "p",
        html: `Each snapshot captures probe keys, temperature, humidity, and timestamps when the site polls your configured feeds. Inserts are described in ${link("supabase-history-inserts", "Supabase history inserts")}. Not every page view hits your garage—polling runs on a schedule server-side.`,
      },
      { type: "h2", text: "Reading the charts" },
      {
        type: "ul",
        items: [
          "**Compare zones** to see whether one corner always runs coldest.",
          "**Look at nights** for freeze risk rather than daytime peaks.",
          `**Spot gaps** that may indicate feed outages—see ${link("debugging-stale-readings", "debugging stale readings")}.`,
        ],
      },
      { type: "h2", text: "Export for deeper analysis" },
      {
        type: "p",
        html: `Subscribers unlock CSV export for spreadsheet pivot tables and custom graphs. Details: ${link("stripe-csv-subscription", "Stripe CSV subscription")} and ${link("csv-export-spreadsheet-analysis", "CSV export analysis")}.`,
      },
    ],
  },
  {
    slug: "csv-export-spreadsheet-analysis",
    parentSlug: "historical-data",
    blocks: [
      {
        type: "p",
        html: `Charts in the browser are convenient; CSV export is for questions the built-in UI does not answer. Spreadsheet tools let you compute degree-hours, correlate with weather files, and share trimmed datasets with contractors or insurers.`,
      },
      { type: "h2", text: "Typical export columns" },
      {
        type: "p",
        html: `Exports include timestamps, probe identifiers, Fahrenheit and Celsius values, and humidity where available. Join on time buckets when merging with external weather CSVs. Subscription access is managed through ${link("stripe-csv-subscription", "Stripe billing")}.`,
      },
      { type: "h2", text: "Analysis ideas" },
      {
        type: "ol",
        items: [
          "**Weekly minimum temperature** by zone for freeze planning.",
          "**Door-event detection** by pairing sharp drops with your own activity log.",
          "**Before/after insulation** comparison using the same date range year over year.",
        ],
      },
      { type: "h2", text: "Workflow tips" },
      {
        type: "ul",
        items: [
          "Import into **LibreOffice Calc** or Excel; freeze panes on the timestamp column.",
          "Use pivot tables to aggregate by **hour of day** and find chronic cold windows.",
          "Keep raw exports archived—re-derive charts when questions change.",
        ],
      },
    ],
  },
  {
    slug: "freeze-protection-thresholds",
    parentSlug: "historical-data",
    blocks: [
      {
        type: "p",
        html: `Freeze damage happens when air or pipe-adjacent zones stay below 32 °F long enough for water to expand. Garage probes measure air, which is usually a few degrees warmer than fluid in an exterior wall cavity—so build margin into any alert threshold.`,
      },
      { type: "h2", text: "Choosing thresholds" },
      {
        type: "p",
        html: `Many owners watch for sustained air temps below 35–38 °F rather than reacting to a single 31 °F blip during a door opening. Review ${link("history-dashboard-browsing", "history browsing")} for overnight plateaus, not spikes.`,
      },
      { type: "h2", text: "Zone-specific rules" },
      {
        type: "ul",
        items: [
          "**Door-adjacent probe:** Expect brief dips; do not treat every spike as emergency.",
          "**Interior / pipe-wall probe:** Tighter threshold; this zone best represents risk.",
          "**Average key:** Useful summary but can hide a cold corner—check individual zones.",
        ],
      },
      { type: "h2", text: "Related monitoring" },
      {
        type: "p",
        html: `Understand drivers with ${link("seasonal-garage-patterns", "seasonal patterns")} and ${link("infiltration-wind-drafts", "infiltration")}. Hardware reliability matters too—${link("dht22-read-errors-retries", "DHT22 retries")} prevent false alarms from bad reads.`,
      },
    ],
  },

  // ── arduino-sketches (4) ──
  {
    slug: "arduino-ide-setup",
    parentSlug: "arduino-sketches",
    blocks: [
      {
        type: "p",
        html: `Firmware development starts on the bench with USB power and serial logging. The Arduino IDE (or PlatformIO) compiles C++ sketches, flashes the Uno, and opens a serial monitor for the first sanity checks before the board moves to the garage.`,
      },
      { type: "h2", text: "Board and libraries" },
      {
        type: "ul",
        items: [
          "**Board:** Arduino Uno (or compatible) with sufficient flash for Ethernet + LCD stacks.",
          "**Libraries:** DHT sensor library, LiquidCrystal, Ethernet/W5100 stack as used in the repo sketch.",
          "**Port:** Select the correct USB serial port after plugging in the programming cable.",
        ],
      },
      { type: "h2", text: "First flash checklist" },
      {
        type: "ol",
        items: [
          "Verify compile with **no errors** before disconnecting bench wiring.",
          "Open serial monitor at **9600 baud** (or sketch default) and confirm boot messages.",
          `Confirm LCD shows live values—see ${link("lcd-local-display-format", "LCD display format")}.`,
          `curl the JSON endpoint before mounting—schema in ${link("json-probe-output-schema", "JSON probe output schema")}.`,
        ],
      },
      { type: "h2", text: "Source and wiring context" },
      {
        type: "p",
        html: `Reference firmware lives in the project GitHub repo linked from ${link("arduino-sketches", "Arduino sketches overview")}. Wire the breadboard first using ${link("arduino-circuit-wiring", "circuit wiring")} and ${link("arduino-pin-wiring", "pin wiring")} guides.`,
      },
    ],
  },
  {
    slug: "sketch-polling-main-loop",
    parentSlug: "arduino-sketches",
    blocks: [
      {
        type: "p",
        html: `The main loop balances sensor polling, LCD refresh, and HTTP service without blocking any one task for too long. DHT22 reads take hundreds of milliseconds; Ethernet handling must remain responsive enough that dashboard fetches do not time out.`,
      },
      { type: "h2", text: "Typical loop structure" },
      {
        type: "ol",
        items: [
          "**Check timer:** If the poll interval elapsed, read each DHT22 with retries.",
          "**Update LCD:** Refresh lines for probe 0, probe 1, and optional average.",
          "**Serve HTTP:** Parse incoming client requests and return cached JSON.",
          "**Watchdog / reconnect:** Reset or re-init Ethernet if the link dropped.",
        ],
      },
      { type: "h2", text: "Timing constraints" },
      {
        type: "p",
        html: `Respect the two-second minimum between DHT22 reads per sensor. Stagger probes if needed. Averaging logic is documented in ${link("dual-probe-averaging", "dual-probe averaging")}. When reads fail, skip updating that key rather than publishing NaN.`,
      },
      { type: "h2", text: "Debugging on serial" },
      {
        type: "p",
        html: `Log read failures and Ethernet state during development. After deployment, rely on ${link("debugging-stale-readings", "stale reading diagnostics")} on the website side. Recovery paths: ${link("firmware-watchdog-recovery", "firmware watchdog recovery")}.`,
      },
    ],
  },
  {
    slug: "json-probe-output-schema",
    parentSlug: "arduino-sketches",
    blocks: [
      {
        type: "p",
        html: `Downstream systems—Python relays, Astro fetch routes, and dashboard mappings—all assume a stable JSON shape. Changing keys without updating consumers breaks probe labels and history inserts silently.`,
      },
      { type: "h2", text: "Canonical document" },
      {
        type: "pre",
        code: `{
  "temp": {
    "0": { "f": 38.2, "c": 3.4, "h": 41.0 },
    "1": { "f": 36.8, "c": 2.7, "h": 43.5 },
    "avg": { "f": 37.5, "c": 3.1, "h": 42.2 }
  }
}`,
      },
      { type: "h2", text: "Field meanings" },
      {
        type: "ul",
        items: [
          "**Numeric keys** match firmware probe indices and dashboard mapping entries.",
          "**f / c:** Fahrenheit and Celsius for the same sample.",
          "**h:** Relative humidity percent for that probe.",
          "**avg:** Mean across healthy probes only; omit or freeze if one sensor is offline.",
        ],
      },
      { type: "h2", text: "Consumers" },
      {
        type: "p",
        html: `The ${link("home-page-probe-fetch", "home page fetch")} reads this structure for public cards. ${link("python-feeds", "Python feeds")} may cache the same payload. Map labels via ${link("probe-mapping-labels", "probe mapping")}.`,
      },
    ],
  },
  {
    slug: "firmware-watchdog-recovery",
    parentSlug: "arduino-sketches",
    blocks: [
      {
        type: "p",
        html: `Garage hardware runs unattended for months. Rare hangs—Ethernet driver stalls, memory fragmentation, or sensor bus lockups—are cheaper to recover with a watchdog reset than with a ladder trip. A timed reset reboots the MCU and reinitializes shields and sensors.`,
      },
      { type: "h2", text: "When watchdog helps" },
      {
        type: "ul",
        items: [
          "**Network stack freeze** after router power blips.",
          "**Infinite retry loop** on a disconnected DHT22 data line.",
          "**HTTP client backlog** on the W5100 after sustained polling from the cloud.",
        ],
      },
      { type: "h2", text: "Implementation notes" },
      {
        type: "p",
        html: `Pet the watchdog only when the main loop completes a full cycle—sensor read, LCD update, and HTTP housekeeping. Too-aggressive petting masks real deadlocks. Pair with DHCP renew and JSON serving logic in ${link("sketch-polling-main-loop", "sketch polling main loop")}.`,
      },
      { type: "h2", text: "Operational expectations" },
      {
        type: "p",
        html: `Expect a brief JSON outage during reboot—seconds, not minutes. ${link("debugging-stale-readings", "Stale reading debug")} distinguishes reboot gaps from feed misconfiguration. Ethernet stacking notes: ${link("ethernet-shield-stacking", "Ethernet shield stacking")}.`,
      },
    ],
  },

  // ── arduino-circuit-wiring (3) ──
  {
    slug: "breadboard-power-rails",
    parentSlug: "arduino-circuit-wiring",
    blocks: [
      {
        type: "p",
        html: `The solderless breadboard distributes 5 V and ground from the Arduino to the LCD, DHT22 pull-ups, contrast pot, and Ethernet shield support components. Clean power rails reduce mysterious LCD garbage and sensor timeouts.`,
      },
      { type: "h2", text: "Rail layout" },
      {
        type: "ul",
        items: [
          "**Red rail:** 5 V from Arduino 5V pin (USB or barrel power when installed).",
          "**Blue rail:** Common ground tied to Arduino GND.",
          "**Jumpers:** Short, same-length wires where possible; one ground star point at the board.",
        ],
      },
      { type: "h2", text: "LCD and sensor power" },
      {
        type: "p",
        html: `The 16×2 LCD draws modest current; DHT22 peaks during conversion. If cables run long to remote probes, consider a dedicated 5 V supply with common ground rather than starving the Uno regulator. Contrast pot wiring shares ground—see ${link("liquid-crystal-gpio-map", "LCD GPIO map")}.`,
      },
      { type: "h2", text: "Bench verification" },
      {
        type: "p",
        html: `Measure rail voltage under load before sealing an enclosure. Troubleshooting steps live in ${link("circuit-wiring-troubleshooting", "circuit wiring troubleshooting")}. Full overview: ${link("arduino-circuit-wiring", "Arduino circuit wiring")}.`,
      },
    ],
  },
  {
    slug: "ethernet-shield-stacking",
    parentSlug: "arduino-circuit-wiring",
    blocks: [
      {
        type: "p",
        html: `The W5100-based Ethernet shield stacks on the Uno and consumes SPI pins plus a chip select line. Mechanical stacking is simple; electrically you must reserve those pins and route DHT22 and LCD wires around the tall assembly.`,
      },
      { type: "h2", text: "Stack order and headers" },
      {
        type: "ol",
        items: [
          "Seat the **Ethernet shield** fully on Uno headers—no bent pins behind the RJ45 jack.",
          "Route jumper wires from the top of the stack or use a **protoboard wing** for LCD pins.",
          "Keep Ethernet cable strain relief so RJ45 flex does not lift the shield off headers.",
        ],
      },
      { type: "h2", text: "SPI sharing" },
      {
        type: "p",
        html: `Only one SPI device should drive the bus at a time; the W5100 owns SPI during network I/O. GPIO for DHT22 and parallel LCD are separate—details in ${link("spi-pins-ethernet-reserved", "SPI pins and reserved lines")}.`,
      },
      { type: "h2", text: "Network path" },
      {
        type: "p",
        html: `DHCP on a garage router assigns the board an IP; JSON is served over HTTP on the LAN. For HTTPS at the edge, terminate TLS on ${link("fastapi-relay-setup", "FastAPI relay")} instead of the MCU.`,
      },
    ],
  },
  {
    slug: "circuit-wiring-troubleshooting",
    parentSlug: "arduino-circuit-wiring",
    blocks: [
      {
        type: "p",
        html: `Intermittent readings usually trace to power, ground, or loose jumpers—not bad luck. Work methodically from rails to sensors before swapping the Arduino.`,
      },
      { type: "h2", text: "Symptom → likely cause" },
      {
        type: "ul",
        items: [
          "**Blank LCD:** Contrast pot, missing Vo, or wrong RS/E/D pins.",
          "**DHT22 timeout:** Missing pull-up, swapped data/ground, or read interval too fast.",
          "**Ethernet dead:** Shield not seated, bad cable, or SPI pin conflict with LCD wiring.",
          "**Garbled LCD:** Floating data line or 3.3 V LCD on 5 V logic without level consideration.",
        ],
      },
      { type: "h2", text: "Tools" },
      {
        type: "p",
        html: `Serial logging from ${link("arduino-ide-setup", "Arduino IDE setup")} confirms firmware is alive. Multimeter checks on ${link("breadboard-power-rails", "power rails")} confirm 5 V under load. Pin-by-pin review: ${link("arduino-pin-wiring", "pin wiring")}.`,
      },
      { type: "h2", text: "Sensor-specific help" },
      {
        type: "p",
        html: `Persistent DHT22 failures after wiring checks: ${link("dht22-read-errors-retries", "DHT22 read errors and retries")} and ${link("dht22-data-line-wiring", "data line wiring")}.`,
      },
    ],
  },

  // ── arduino-pin-wiring (3) ──
  {
    slug: "liquid-crystal-gpio-map",
    parentSlug: "arduino-pin-wiring",
    blocks: [
      {
        type: "p",
        html: `The 16×2 LCD uses parallel mode in 4-bit wiring: RS, E, and four data lines map to specific Uno GPIOs matching the LiquidCrystal constructor in firmware. Backlight may be on a transistor switch for dimming or power saving.`,
      },
      { type: "h2", text: "Typical assignments" },
      {
        type: "p",
        html: `Exact pins follow the repo sketch—document your build on paper. RS and E control command versus data mode; D4–D7 carry nibbles. Contrast on Vo uses a 10k pot between 5 V and ground.`,
      },
      {
        type: "ul",
        items: [
          "**RS:** Register select—commands vs character data.",
          "**E:** Enable strobe for each nibble transfer.",
          "**D4–D7:** Upper four bits of the 8-bit interface in 4-bit mode.",
          "**Backlight:** Often transistor-switched LED+ pin, not a GPIO data line.",
        ],
      },
      { type: "h2", text: "Avoiding conflicts" },
      {
        type: "p",
        html: `Do not assign LCD lines to ${link("spi-pins-ethernet-reserved", "SPI reserved pins")} used by the Ethernet shield. DHT22 data pins must also stay clear—see ${link("dht22-data-line-wiring", "DHT22 data wiring")}.`,
      },
      { type: "h2", text: "Display content" },
      {
        type: "p",
        html: `What appears on each row is firmware-defined in ${link("lcd-local-display-format", "LCD local display format")}.`,
      },
    ],
  },
  {
    slug: "dht22-data-line-wiring",
    parentSlug: "arduino-pin-wiring",
    blocks: [
      {
        type: "p",
        html: `Each DHT22 uses one digital GPIO for its single-wire protocol. Power and ground come from the breadboard rails; a 4.7k–10k pull-up from data to 5 V keeps the line idle high between reads.`,
      },
      { type: "h2", text: "Per-sensor connections" },
      {
        type: "ol",
        items: [
          "**VCC** to 5 V rail (some modules include onboard regulator for 3.3 V parts—check yours).",
          "**DATA** to a unique GPIO with pull-up resistor.",
          "**GND** to common ground at the Arduino.",
        ],
      },
      { type: "h2", text: "Cable runs to remote probes" },
      {
        type: "p",
        html: `Short twisted or paired wire reduces noise. Avoid running data parallel to AC power. If reads degrade at distance, retry logic in ${link("dht22-read-errors-retries", "DHT22 read errors")} helps but physics still wins—relocate or shorten runs.`,
      },
      { type: "h2", text: "Firmware mapping" },
      {
        type: "p",
        html: `GPIO order defines JSON keys <code>0</code> and <code>1</code>. Document the mapping for ${link("probe-mapping-labels", "dashboard labels")}. Sensor basics: ${link("dht22-sensor-overview", "DHT22 overview")}.`,
      },
    ],
  },
  {
    slug: "spi-pins-ethernet-reserved",
    parentSlug: "arduino-pin-wiring",
    blocks: [
      {
        type: "p",
        html: `The W5100 Ethernet shield uses hardware SPI on the Uno: MOSI, MISO, SCK, plus chip select on pin 10. Pins 10–13 and SPI lines must not be repurposed for LCD or sensors in standard layouts.`,
      },
      { type: "h2", text: "Reserved lines" },
      {
        type: "ul",
        items: [
          "**D10:** W5100 chip select (SS).",
          "**D11–D13:** SPI MOSI, MISO, SCK on Uno.",
          "**Interrupt pin:** Shield-specific; follow vendor silkscreen.",
        ],
      },
      { type: "h2", text: "Planning GPIO budget" },
      {
        type: "p",
        html: `LCD 4-bit mode consumes six GPIOs; two DHT22 lines consume two more—plan before adding features. Stacking details: ${link("ethernet-shield-stacking", "Ethernet shield stacking")}.`,
      },
      { type: "h2", text: "Alternative stacks" },
      {
        type: "p",
        html: `If pins run out, consider I²C LCD modules or offloading HTTPS to ${link("python-feeds", "Python feeds")} while keeping JSON on HTTP locally.`,
      },
    ],
  },

  // ── arduino-dht22-lcd (3) ──
  {
    slug: "dht22-read-errors-retries",
    parentSlug: "arduino-dht22-lcd",
    blocks: [
      {
        type: "p",
        html: `DHT22 reads fail occasionally—timing violations, electrical noise, or a momentary bus contention. Firmware should retry a few times with backoff before marking a probe unhealthy rather than publishing garbage values to JSON.`,
      },
      { type: "h2", text: "Retry strategy" },
      {
        type: "ol",
        items: [
          "On **checksum or timeout error**, wait at least two seconds and retry.",
          "Cap retries at **three to five** attempts per poll cycle.",
          "If all fail, **omit or hold last good value**—document your choice in schema notes.",
        ],
      },
      { type: "h2", text: "Hardware fixes first" },
      {
        type: "p",
        html: `Verify pull-ups and grounding in ${link("dht22-data-line-wiring", "data line wiring")}. Long cables and motor noise from garage door openers aggravate errors. ${link("circuit-wiring-troubleshooting", "Circuit troubleshooting")} covers bench checks.`,
      },
      { type: "h2", text: "Downstream impact" },
      {
        type: "p",
        html: `Bad reads affect ${link("dual-probe-averaging", "averaging")} and dashboard history. ${link("debugging-stale-readings", "Debugging stale readings")} on the site helps tell sensor faults from network issues.`,
      },
    ],
  },
  {
    slug: "lcd-local-display-format",
    parentSlug: "arduino-dht22-lcd",
    blocks: [
      {
        type: "p",
        html: `The 16×2 LCD gives installers immediate feedback without Wi-Fi or a laptop. Two rows are tight—firmware usually rotates or splits probe 0, probe 1, and average across lines or timed pages.`,
      },
      { type: "h2", text: "Typical layout" },
      {
        type: "ul",
        items: [
          "**Row 0:** Probe 0 temp and humidity abbreviated (e.g. <code>P0 38F 41%</code>).",
          "**Row 1:** Probe 1 or rolling average depending on sketch version.",
          "**Backlight:** On during reads; optional timeout to reduce glare at night.",
        ],
      },
      { type: "h2", text: "Units and refresh" },
      {
        type: "p",
        html: `Match units to what you expect on the website or label the LCD. Refresh only when new valid reads arrive—avoid flicker from partial updates. GPIO wiring: ${link("liquid-crystal-gpio-map", "LCD GPIO map")}.`,
      },
      { type: "h2", text: "When LCD disagrees with web" },
      {
        type: "p",
        html: `Compare against live JSON via curl—${link("json-probe-output-schema", "JSON schema")}. Stale cache on ${link("redis-cache-for-feeds", "Redis relay")} can lag the LCD; local display is often fresher.`,
      },
    ],
  },
  {
    slug: "dual-probe-averaging",
    parentSlug: "arduino-dht22-lcd",
    blocks: [
      {
        type: "p",
        html: `The <code>avg</code> key summarizes healthy probes for quick glances and compact history rows. Averaging should ignore failed reads and optionally weight only probes marked active in firmware.`,
      },
      { type: "h2", text: "Algorithm sketch" },
      {
        type: "ol",
        items: [
          "Collect **valid** temperature and humidity pairs for each probe index.",
          "Compute **arithmetic mean** separately for °F, °C, and humidity.",
          "If only one probe is healthy, **avg may equal that probe** or be omitted—pick one policy.",
        ],
      },
      { type: "h2", text: "When not to trust avg" },
      {
        type: "p",
        html: `Door-adjacent and interior zones can differ by ten degrees—blind averaging hides freeze risk in the cold corner. Use avg for trend lines; use per-zone keys for decisions. Layout: ${link("multi-zone-garage-layout", "multi-zone layout")}.`,
      },
      { type: "h2", text: "Related topics" },
      {
        type: "p",
        html: `Polling cadence: ${link("sketch-polling-main-loop", "sketch main loop")}. Output shape: ${link("json-probe-output-schema", "JSON schema")}.`,
      },
    ],
  },

  // ── python-feeds (3) ──
  {
    slug: "fastapi-relay-setup",
    parentSlug: "python-feeds",
    blocks: [
      {
        type: "p",
        html: `A small FastAPI service on a home server or VPS can poll the Arduino over HTTP on the LAN, then expose a stable HTTPS URL to the internet. That keeps TLS and authentication off the microcontroller while preserving the JSON your dashboard already understands.`,
      },
      { type: "h2", text: "Minimal architecture" },
      {
        type: "ol",
        items: [
          "**Scheduler or on-demand fetch** hits <code>http://arduino.local/...</code> on the LAN.",
          "**FastAPI route** returns the latest cached body with correct <code>Content-Type</code>.",
          "**Reverse proxy** (Caddy, nginx) terminates TLS on a public hostname.",
        ],
      },
      { type: "h2", text: "Configuration tips" },
      {
        type: "ul",
        items: [
          "Set **reasonable timeouts**—garage uplink is slower than datacenter RTT.",
          "Log **upstream errors** separately from client 404s.",
          `Version the relay when ${link("json-probe-output-schema", "JSON schema")} changes.`,
        ],
      },
      { type: "h2", text: "Caching layer" },
      {
        type: "p",
        html: `Add ${link("redis-cache-for-feeds", "Redis cache")} so Cloudflare Workers and the Astro site do not hammer your home IP on every page view. Security: ${link("relay-security-and-access", "relay security")}.`,
      },
    ],
  },
  {
    slug: "redis-cache-for-feeds",
    parentSlug: "python-feeds",
    blocks: [
      {
        type: "p",
        html: `Redis stores the last good JSON payload with a TTL so burst traffic to your public HTTPS endpoint reads memory instead of opening a new LAN fetch every time. That protects both the Arduino and your residential router.`,
      },
      { type: "h2", text: "Cache policy" },
      {
        type: "ul",
        items: [
          "**TTL 30–120 seconds** matches how “live” the home page needs to feel.",
          "**Stale-while-revalidate:** Serve old JSON while async refresh runs if upstream is slow.",
          "**Key per feed URL** when multiple garages or benches exist.",
        ],
      },
      { type: "h2", text: "Failure modes" },
      {
        type: "p",
        html: `If Redis is empty and Arduino is down, return 503 with a clear log line—better than inventing zeros. Site-side handling: ${link("debugging-stale-readings", "debugging stale readings")}. Relay setup: ${link("fastapi-relay-setup", "FastAPI relay setup")}.`,
      },
      { type: "h2", text: "Data flow placement" },
      {
        type: "p",
        html: `See step 2 in ${link("data-flow", "end-to-end data flow")}. History still lands in Supabase via ${link("supabase-history-inserts", "history inserts")} on the website schedule.`,
      },
    ],
  },
  {
    slug: "relay-security-and-access",
    parentSlug: "python-feeds",
    blocks: [
      {
        type: "p",
        html: `Publishing garage telemetry to the internet invites scanning. Lock down who can read feeds, rate-limit public endpoints, and never expose the Arduino JSON port directly without understanding the risk.`,
      },
      { type: "h2", text: "Hardening checklist" },
      {
        type: "ul",
        items: [
          "**HTTPS only** on public URLs; HSTS at the reverse proxy.",
          "**Optional API keys** or signed tokens for non-browser clients.",
          "**Firewall** the Arduino to LAN-only; only the relay reaches it.",
          "**No secrets** in firmware source committed to public repos.",
        ],
      },
      { type: "h2", text: "Dashboard integration" },
      {
        type: "p",
        html: `Users paste HTTPS feed URLs in ${link("configuring-temperature-feeds", "temperature feed settings")}. The site stores URLs per account—pair with ${link("supabase-auth-flow", "Supabase auth")} so feeds are not world-editable.`,
      },
      { type: "h2", text: "Compare stacks" },
      {
        type: "p",
        html: `Node and Next patterns for APIs: ${link("node-express-api-patterns", "Node Express API patterns")}. This project uses Astro fetch routes—${link("astro-server-side-rendering", "Astro SSR")}.`,
      },
    ],
  },

  // ── astro-applications (3) ──
  {
    slug: "astro-server-side-rendering",
    parentSlug: "astro-applications",
    blocks: [
      {
        type: "p",
        html: `Astro renders most pages on the server at request time or build time, shipping HTML with minimal client JavaScript. For a monitoring site, that means fast first paint for public probe cards and SEO-friendly about documentation without a heavy SPA bundle.`,
      },
      { type: "h2", text: "SSR in this project" },
      {
        type: "p",
        html: `The home page fetches live JSON during SSR via ${link("home-page-probe-fetch", "server-side probe fetch")}. About articles are static content with optional expanded blocks from generated TypeScript. API routes handle auth and history writes.`,
      },
      { type: "h2", text: "Benefits for monitoring" },
      {
        type: "ul",
        items: [
          "**Secrets stay server-side**—feed URLs and Supabase keys never ship to the browser wholesale.",
          `**Edge deployment** on Cloudflare reduces latency—see ${link("cloudflare-workers-deployment", "Cloudflare Workers deployment")}.`,
          "**Progressive enhancement** for dashboard features that need client state.",
        ],
      },
      { type: "h2", text: "Related reading" },
      {
        type: "p",
        html: `Interactive widgets use ${link("astro-islands-and-hydration", "Astro islands")}. Compare with ${link("nextjs-monitoring-dashboards", "Next.js monitoring dashboards")}.`,
      },
    ],
  },
  {
    slug: "astro-islands-and-hydration",
    parentSlug: "astro-applications",
    blocks: [
      {
        type: "p",
        html: `Islands are interactive UI fragments hydrated with client-side JavaScript while the surrounding page stays static. Charts, auth forms, and feed editors hydrate; long-form about text does not.`,
      },
      { type: "h2", text: "Where hydration helps" },
      {
        type: "ul",
        items: [
          "**History charts** needing client-side zoom or tooltips.",
          `**Dashboard forms** for ${link("configuring-temperature-feeds", "configuring feeds")}.`,
          `**Probe demo** toggles on the ${link("probe-demo", "interactive demo")} page.`,
        ],
      },
      { type: "h2", text: "Performance habit" },
      {
        type: "p",
        html: `Default to zero JS; add <code>client:load</code> or <code>client:visible</code> only where necessary. Public visitors mostly read static SSR output from ${link("astro-server-side-rendering", "Astro SSR")}.`,
      },
      { type: "h2", text: "Stack context" },
      {
        type: "p",
        html: `Full pipeline: ${link("data-flow", "data flow")}. Admin tools: ${link("admin-dashboard-features", "admin dashboard features")}.`,
      },
    ],
  },
  {
    slug: "cloudflare-workers-deployment",
    parentSlug: "astro-applications",
    blocks: [
      {
        type: "p",
        html: `This site targets Cloudflare Workers/Pages via the Astro adapter so HTML and API routes run at the edge close to visitors. Probe fetch latency improves versus a single-region VPS for a globally readable demo.`,
      },
      { type: "h2", text: "Deployment considerations" },
      {
        type: "ol",
        items: [
          "**Environment variables** for Supabase and Stripe live in Cloudflare dashboard secrets.",
          "**Fetch timeouts** to residential feed URLs must tolerate slow home uplinks.",
          `**Cron or scheduled triggers** may drive ${link("supabase-history-inserts", "history inserts")}.`,
        ],
      },
      { type: "h2", text: "Caching interaction" },
      {
        type: "p",
        html: `Do not cache authenticated dashboard HTML at the CDN edge. Public home page caching should respect how fresh probes need to be—often aligned with ${link("redis-cache-for-feeds", "Redis TTL")} upstream.`,
      },
      { type: "h2", text: "Alternatives" },
      {
        type: "p",
        html: `${link("comparing-full-stack-options", "Comparing full-stack options")} covers Node hosting versus edge Astro.`,
      },
    ],
  },

  // ── nextjs-node-applications (3) ──
  {
    slug: "nextjs-monitoring-dashboards",
    parentSlug: "nextjs-node-applications",
    blocks: [
      {
        type: "p",
        html: `Next.js excels at authenticated dashboards with React Server Components, API routes, and a vast component ecosystem. A garage monitor could be built entirely in Next—fetching probes in server components and charting in client charts.`,
      },
      { type: "h2", text: "Typical Next layout" },
      {
        type: "ul",
        items: [
          "**app/dashboard/page.tsx** server-fetches JSON feeds with cached revalidation.",
          `**Route handlers** proxy probes to hide LAN URLs—similar to ${link("fastapi-relay-setup", "FastAPI relay")}.`,
          `**Middleware** guards signed-in pages using ${link("supabase-auth-flow", "Supabase auth")} patterns.`,
        ],
      },
      { type: "h2", text: "Why this project uses Astro" },
      {
        type: "p",
        html: `Documentation-heavy about pages and minimal JS for public visitors fit Astro’s content-first model. Edge deployment on Cloudflare is first-class—${link("cloudflare-workers-deployment", "Workers deployment")}.`,
      },
      { type: "h2", text: "Further comparison" },
      {
        type: "p",
        html: `See ${link("comparing-full-stack-options", "comparing full-stack options")} and ${link("node-express-api-patterns", "Express API patterns")}.`,
      },
    ],
  },
  {
    slug: "node-express-api-patterns",
    parentSlug: "nextjs-node-applications",
    blocks: [
      {
        type: "p",
        html: `Express (or Fastify) on Node remains a straightforward choice for JSON APIs, webhooks, and cron jobs. A monitoring stack might use Express to poll probes, write Supabase rows, and serve CSV export links.`,
      },
      { type: "h2", text: "Common routes" },
      {
        type: "ol",
        items: [
          "<code>GET /api/feeds/:id</code> — cached probe JSON for dashboards.",
          `<code>POST /webhooks/stripe</code> — unlock ${link("stripe-csv-subscription", "CSV subscription")} features.`,
          "<code>GET /export/history.csv</code> — authenticated download.",
        ],
      },
      { type: "h2", text: "Operational notes" },
      {
        type: "ul",
        items: [
          "Run behind **HTTPS reverse proxy** with rate limits.",
          "Use **connection pooling** for Supabase Postgres if querying directly.",
          "Prefer **idempotent webhooks** for Stripe events.",
        ],
      },
      { type: "h2", text: "Parallel in Astro" },
      {
        type: "p",
        html: `This repo implements similar endpoints as Astro server routes—${link("supabase-history-inserts", "history inserts")} and ${link("home-page-probe-fetch", "probe fetch")}.`,
      },
    ],
  },
  {
    slug: "comparing-full-stack-options",
    parentSlug: "nextjs-node-applications",
    blocks: [
      {
        type: "p",
        html: `Garage monitoring needs three things: periodic probe ingestion, authenticated storage, and a readable public face. Astro, Next.js, and plain Node each cover the triangle with different tradeoffs in JS payload, hosting, and developer ergonomics.`,
      },
      { type: "h2", text: "Decision matrix" },
      {
        type: "ul",
        items: [
          `**Astro + edge:** Best here for content, light public JS, Cloudflare deploy—${link("astro-applications", "Astro applications")}.`,
          `**Next.js:** Rich client dashboards, Vercel-native workflows—${link("nextjs-monitoring-dashboards", "Next dashboards")}.`,
          `**Node + Express:** Maximum control, long-running cron on a VPS—${link("node-express-api-patterns", "Express patterns")}.`,
          `**Python relay:** TLS and cache at home—${link("python-feeds", "Python feeds")}.`,
        ],
      },
      { type: "h2", text: "Shared backend" },
      {
        type: "p",
        html: `Supabase auth and Postgres history are stack-agnostic—${link("accounts-and-dashboard", "accounts and dashboard")}. Data pipeline: ${link("data-flow", "data flow")}.`,
      },
    ],
  },

  // ── data-flow (3) ──
  {
    slug: "home-page-probe-fetch",
    parentSlug: "data-flow",
    blocks: [
      {
        type: "p",
        html: `The public home page shows live probe cards by server-fetching configured HTTPS JSON feeds during Astro SSR. The browser receives HTML with numbers already resolved—no client-side CORS dance to residential IPs.`,
      },
      { type: "h2", text: "Fetch sequence" },
      {
        type: "ol",
        items: [
          "Load **enabled feed URLs** and probe mappings for the site owner or demo account.",
          "Server **HTTP GET** each feed with timeout and error handling.",
          `Parse **temp object** per ${link("json-probe-output-schema", "JSON schema")} and apply labels.`,
          "Render **stat cards** in HTML returned to the visitor.",
        ],
      },
      { type: "h2", text: "Failure display" },
      {
        type: "p",
        html: `Missing keys or timeout should degrade gracefully—show last error state or omit a card rather than 500 the whole page. Diagnosis: ${link("debugging-stale-readings", "debugging stale readings")}.`,
      },
      { type: "h2", text: "Configuration source" },
      {
        type: "p",
        html: `Mappings come from ${link("configuring-temperature-feeds", "dashboard feed settings")}. Upstream cache: ${link("redis-cache-for-feeds", "Redis cache")}. Broader pipeline: ${link("data-flow", "data flow overview")}.`,
      },
    ],
  },
  {
    slug: "supabase-history-inserts",
    parentSlug: "data-flow",
    blocks: [
      {
        type: "p",
        html: `Historical charts depend on periodic inserts into Supabase Postgres—not on the browser remembering prior values. A scheduled job or edge function polls feeds and writes normalized rows keyed by user and probe.`,
      },
      { type: "h2", text: "Insert model" },
      {
        type: "ul",
        items: [
          "**Timestamp + user_id + probe_key** uniquely identify a sample.",
          "Store **temp, humidity, units** as typed columns for fast chart queries.",
          "Skip insert if **upstream fetch failed** to avoid flatlines at zero.",
        ],
      },
      { type: "h2", text: "Auth boundary" },
      {
        type: "p",
        html: `Row-level security ties history to signed-in users—${link("supabase-auth-flow", "Supabase auth flow")}. Only the service role or trusted server route should insert on schedule.`,
      },
      { type: "h2", text: "Consumption" },
      {
        type: "p",
        html: `Dashboard reads via ${link("history-dashboard-browsing", "history browsing")}; export via ${link("csv-export-spreadsheet-analysis", "CSV export")}. Live path: ${link("home-page-probe-fetch", "home page fetch")}.`,
      },
    ],
  },
  {
    slug: "debugging-stale-readings",
    parentSlug: "data-flow",
    blocks: [
      {
        type: "p",
        html: `Stale readings mean the website shows an old temperature while the garage has moved on—or shows nothing while the LCD still updates. Work from the sensor outward: hardware, JSON, cache, SSR fetch, then history.`,
      },
      { type: "h2", text: "Checklist" },
      {
        type: "ol",
        items: [
          "**curl the feed URL** from outside your LAN—is JSON fresh?",
          `Compare **LCD vs JSON**—if LCD wins, fix relay or ${link("redis-cache-for-feeds", "Redis TTL")}.`,
          `Verify **probe keys** in dashboard match schema—${link("probe-mapping-labels", "probe mapping")}.`,
          "Inspect **Cloudflare / SSR logs** for timeout patterns.",
        ],
      },
      { type: "h2", text: "Hardware-side causes" },
      {
        type: "p",
        html: `${link("firmware-watchdog-recovery", "Watchdog reboots")} cause short gaps. ${link("dht22-read-errors-retries", "DHT22 errors")} drop keys from JSON. Ethernet: ${link("circuit-wiring-troubleshooting", "wiring troubleshooting")}.`,
      },
      { type: "h2", text: "History vs live" },
      {
        type: "p",
        html: `Charts can lag if inserts stop but home page still looks live—check ${link("supabase-history-inserts", "history inserts")} separately from ${link("home-page-probe-fetch", "home page fetch")}.`,
      },
    ],
  },

  // ── accounts-and-dashboard (4) ──
  {
    slug: "supabase-auth-flow",
    parentSlug: "accounts-and-dashboard",
    blocks: [
      {
        type: "p",
        html: `User accounts use Supabase Auth for email or OAuth sign-in, session cookies, and row-level security on history and feed configuration. The Astro site validates sessions on protected routes before rendering dashboard HTML or API mutations.`,
      },
      { type: "h2", text: "Session lifecycle" },
      {
        type: "ol",
        items: [
          "User signs in via **Supabase client** or server exchange.",
          "Session **cookie** scoped to site domain; HttpOnly where configured.",
          "Server routes read session and **query Postgres** with user context.",
        ],
      },
      { type: "h2", text: "What auth protects" },
      {
        type: "ul",
        items: [
          `**Feed URLs and probe labels**—${link("configuring-temperature-feeds", "temperature feeds")}.`,
          `**History rows**—${link("history-dashboard-browsing", "history browsing")}.`,
          `**CSV export**—${link("stripe-csv-subscription", "subscription gating")}.`,
          `**Admin tools**—${link("admin-dashboard-features", "admin features")}.`,
        ],
      },
      { type: "h2", text: "Security notes" },
      {
        type: "p",
        html: `Never expose service role keys to the browser. Relay security for public JSON: ${link("relay-security-and-access", "relay security")}.`,
      },
    ],
  },
  {
    slug: "stripe-csv-subscription",
    parentSlug: "accounts-and-dashboard",
    blocks: [
      {
        type: "p",
        html: `CSV export of temperature history is a subscription feature billed through Stripe. Checkout creates a customer portal link; webhooks flip a flag in Supabase so export buttons unlock without manual admin work.`,
      },
      { type: "h2", text: "User flow" },
      {
        type: "ol",
        items: [
          "Signed-in user opens **billing** from the dashboard.",
          "Stripe **Checkout** completes payment method capture.",
          "Webhook marks **subscription active**; user downloads CSV from history.",
        ],
      },
      { type: "h2", text: "Export contents" },
      {
        type: "p",
        html: `Files mirror stored history columns—see ${link("csv-export-spreadsheet-analysis", "CSV analysis guide")}. Live data path remains separate: ${link("data-flow", "data flow")}.`,
      },
      { type: "h2", text: "Implementation peers" },
      {
        type: "p",
        html: `Webhook handling patterns overlap with ${link("node-express-api-patterns", "Express webhooks")}. Auth prerequisite: ${link("supabase-auth-flow", "Supabase auth")}.`,
      },
    ],
  },
  {
    slug: "configuring-temperature-feeds",
    parentSlug: "accounts-and-dashboard",
    blocks: [
      {
        type: "p",
        html: `After sign-in, users paste HTTPS URLs pointing at probe JSON—often a FastAPI relay with Redis—and map each numeric key to a human-readable label. Those settings drive both the public home page and history sampling.`,
      },
      { type: "h2", text: "Setup steps" },
      {
        type: "ol",
        items: [
          `Verify feed with **curl** against ${link("json-probe-output-schema", "expected schema")}.`,
          "Add URL in **dashboard feed settings**; enable desired probe keys.",
          `Assign **labels** per ${link("probe-mapping-labels", "probe mapping guide")}.`,
          "Wait one **poll cycle** and confirm home page cards update.",
        ],
      },
      { type: "h2", text: "Multiple feeds" },
      {
        type: "p",
        html: `Advanced setups may separate demo and production relays—document which URL is public. Security: ${link("relay-security-and-access", "relay security")}. Fetch implementation: ${link("home-page-probe-fetch", "home page probe fetch")}.`,
      },
      { type: "h2", text: "Troubleshooting" },
      {
        type: "p",
        html: `${link("debugging-stale-readings", "Debugging stale readings")} when labels look right but numbers do not move.`,
      },
    ],
  },
  {
    slug: "admin-dashboard-features",
    parentSlug: "accounts-and-dashboard",
    blocks: [
      {
        type: "p",
        html: `Admin-only dashboard areas support operators who manage demo content, review user issues, or inspect system health. Role checks run server-side alongside standard ${link("supabase-auth-flow", "Supabase auth")}—never gate solely with hidden client buttons.`,
      },
      { type: "h2", text: "Typical admin capabilities" },
      {
        type: "ul",
        items: [
          "**User lookup** for feed misconfiguration support tickets.",
          "**Feature flags** for beta chart types or export limits.",
          `**Audit logs** of webhook and insert failures tied to ${link("supabase-history-inserts", "history inserts")}.`,
        ],
      },
      { type: "h2", text: "Deployment" },
      {
        type: "p",
        html: `Admin routes deploy with the same ${link("cloudflare-workers-deployment", "Cloudflare Workers")} bundle as public pages—protect with role claims in JWT or a separate allowlist table.`,
      },
      { type: "h2", text: "Related product docs" },
      {
        type: "p",
        html: `End users see ${link("accounts-and-dashboard", "accounts and dashboard overview")}, ${link("history-dashboard-browsing", "history")}, and ${link("stripe-csv-subscription", "Stripe subscription")} flows.`,
      },
    ],
  },
];

if (pages.length !== 40) {
  throw new Error(`Expected 40 pages, got ${pages.length}`);
}

const slugs = new Set(pages.map((p) => p.slug));
if (slugs.size !== 40) {
  throw new Error("Duplicate slugs detected");
}

function blockToTs(block, indent = "      ") {
  switch (block.type) {
    case "p":
      return `${indent}{ type: "p", html: ${JSON.stringify(block.html)} }`;
    case "h2":
      return `${indent}{ type: "h2", text: ${JSON.stringify(block.text)} }`;
    case "ul":
    case "ol":
      return `${indent}{ type: "${block.type}", items: ${JSON.stringify(block.items)} }`;
    case "pre":
      return `${indent}{ type: "pre", code: ${JSON.stringify(block.code)} }`;
    default:
      throw new Error(`Unknown block type: ${block.type}`);
  }
}

function generateTs(pageList) {
  const entries = pageList
    .map((page) => {
      const blocks = page.blocks.map((b) => blockToTs(b)).join(",\n");
      return `  ${JSON.stringify(page.slug)}: [\n${blocks}\n  ]`;
    })
    .join(",\n\n");

  const slugList = pageList.map((p) => `  ${JSON.stringify(p.slug)}`).join(",\n");

  return `/** Auto-generated by scripts/generate-about-expanded.mjs — do not edit by hand. */
export type AboutContentBlock =
  | { type: "p"; html: string }
  | { type: "h2"; text: string }
  | { type: "ul"; items: string[] }
  | { type: "ol"; items: string[] }
  | { type: "pre"; code: string };

export const expandedAboutContent: Record<string, AboutContentBlock[]> = {
${entries}
};

export const EXPANDED_ABOUT_SLUGS: readonly string[] = [
${slugList}
] as const;

export const expandedAboutSlugs: Set<string> = new Set(EXPANDED_ABOUT_SLUGS);

export function getExpandedAboutContent(
  slug: string,
): AboutContentBlock[] | undefined {
  return expandedAboutContent[slug];
}
`;
}

const outPath = join(root, "src/lib/aboutExpandedContent.ts");
writeFileSync(outPath, generateTs(pages), "utf8");
console.log(`Wrote ${outPath} with ${pages.length} expanded about pages.`);
