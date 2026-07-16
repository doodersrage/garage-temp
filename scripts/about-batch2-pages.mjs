const link = (slug, text) =>
  `<a class="text-link" href="/about/${slug}">${text}</a>`;

/** Build a page with intro paragraph, figure, and remaining blocks. */
function page(slug, parentSlug, title, description, summary, intro, figAlt, figCaption, rest) {
  return {
    slug,
    parentSlug,
    title,
    description,
    summary,
    blocks: [
      { type: "p", html: intro },
      { type: "figure", illustration: `${slug}.svg`, alt: figAlt, caption: figCaption },
      ...rest,
    ],
  };
}

/** @type {{ slug: string; parentSlug: string; title: string; description: string; summary: string; blocks: object[] }[]} */
export const batch2Pages = [
  // ── temperature-probes (2) ──
  page(
    "humidity-condensation-basics",
    "temperature-probes",
    "Humidity and condensation basics",
    "How relative humidity, dew point, and cold surfaces interact in unheated garages—and what DHT22 probes can and cannot tell you.",
    "Dew point math in plain language and why air temperature alone misses condensation risk.",
    `Garage monitoring pairs temperature with relative humidity because both drive comfort, corrosion, and mold risk. Condensation appears when humid air contacts a surface colder than the dew point—not when a humidity percentage alone crosses an arbitrary line. Probes measure the air pocket around the sensor; they do not directly detect water on a concrete floor unless that surface heats or cools the nearby air measurably.`,
    "Diagram showing warm humid air meeting a cold garage floor and releasing condensation",
    "Condensation forms when air cools to its dew point against a colder surface such as an uninsulated slab.",
    [
      { type: "h2", text: "Relative humidity versus dew point" },
      {
        type: "p",
        html: `A DHT22 reports **relative humidity (%RH)** at the current air temperature. The same moisture content feels “wetter” when air is cold because %RH rises as temperature drops. For freeze-season storage, track both temp and humidity together—${link("dht22-sensor-overview", "DHT22 overview")} explains accuracy limits.`,
      },
      {
        type: "p",
        html: `After ${link("garage-door-temperature-swings", "door openings")} on humid summer days, expect a humidity spike as outdoor air mixes in. If the slab stays cold from ${link("thermal-mass-concrete-slab", "thermal mass")}, condensation can form even when the probe reads moderate %RH at chest height.`,
      },
      { type: "h2", text: "What probes miss" },
      {
        type: "ul",
        items: [
          "**Surface temperature** of tools, cars, and pipes—often colder than air at night.",
          `**Microclimates** behind shelving where air stagnates—use ${link("multi-zone-garage-layout", "multi-zone layout")}.`,
          "**Short spikes** during door events that averages smooth away in history.",
        ],
      },
      { type: "h2", text: "Practical monitoring habits" },
      {
        type: "p",
        html: `Compare door-adjacent and interior zones via ${link("probe-mapping-labels", "probe labels")}. Review overnight minimums in ${link("history-dashboard-browsing", "history charts")} during shoulder seasons when slab and air temps diverge most.`,
      },
    ],
  ),
  page(
    "probe-cable-length-limits",
    "temperature-probes",
    "Probe cable length limits",
    "How unshielded DHT22 cable runs affect read reliability, timing errors, and when to shorten or reroute sensor wiring.",
    "Keep data lines short, twisted, and away from motor noise for stable JSON feeds.",
    `The DHT22 uses a slow single-wire protocol sensitive to capacitance and electrical noise. Bench setups with six-inch jumpers behave differently than ten-foot runs draped along garage door tracks. This guide translates physics into practical length and routing rules for remote probe heads while the Arduino stays near the Ethernet jack.`,
    "Side view of short versus long sensor cables with noise symbols on the long run",
    "Long unshielded runs increase capacitance and pick up interference from door openers and fluorescent ballasts.",
    [
      { type: "h2", text: "Recommended run lengths" },
      {
        type: "p",
        html: `Many installers treat **three to five meters** as a soft ceiling for unshielded three-wire cable (5 V, data, GND) with a proper pull-up at the MCU end. Beyond that, expect more checksum failures handled by ${link("dht22-read-errors-retries", "retry logic")}.`,
      },
      {
        type: "ul",
        items: [
          "**Twist data with ground** for the full run; leave power paired separately if convenient.",
          "**Avoid parallel routing** with AC lines, door-opener high-voltage leads, and switching power supplies.",
          "**One pull-up** near the Arduino—do not duplicate at the far end unless you know the bus requirements.",
        ],
      },
      { type: "h2", text: "Symptoms of an overlong run" },
      {
        type: "p",
        html: `Intermittent timeouts in serial logs, one probe key dropping from JSON while the other stays healthy, and humidity stuck at last good value often trace to cable issues—not bad sensors. Confirm wiring with ${link("dht22-data-line-wiring", "data line wiring")} before swapping hardware.`,
      },
      { type: "h2", text: "Alternatives when distance is fixed" },
      {
        type: "p",
        html: `Relocate the MCU closer to probes inside a ${link("enclosure-ventilation", "ventilated enclosure")}, use ${link("jumper-wire-standards", "quality jumpers")} on the bench segment, and validate reads after ${link("sensor-warm-up-time", "sensor warm-up")} before trusting long-term history.`,
      },
    ],
  ),

  // ── temperature-changes (3) ──
  page(
    "thermal-mass-concrete-slab",
    "temperature-changes",
    "Thermal mass and concrete slabs",
    "Why garage floor slabs lag outdoor swings, store heat, and make probes near the ground read differently from chest-height sensors.",
    "Concrete buffers day-night cycles—expect delayed peaks and cold floors after warm afternoons.",
    `Unheated garages often sit on a thick concrete slab tied to the earth. That mass absorbs and releases heat slowly compared with lightweight wall air. Probes mounted low or near the floor track slab influence; probes at shoulder height respond faster to door and HVAC events. Understanding mass helps explain otherwise confusing dual-probe gaps.`,
    "Cross-section of garage showing slab heat storage and delayed air warming",
    "Slab thermal mass stores daytime heat and releases it overnight, lagging behind air temperature swings.",
    [
      { type: "h2", text: "Day-night lag" },
      {
        type: "p",
        html: `On sunny afternoons, ${link("sun-load-garage-walls", "sun load")} may warm the bay while the slab still feels cool to the touch. After sunset, the slab can **radiate stored heat** for hours—interior air cools more slowly than forecast models predict. ${link("seasonal-garage-patterns", "Seasonal history")} reveals your site-specific lag.`,
      },
      { type: "h2", text: "Probe placement interaction" },
      {
        type: "ul",
        items: [
          "**Low-mounted probes** track floor-adjacent air influenced by slab temperature.",
          "**Chest-height probes** better represent where people breathe and tools sit on benches.",
          `**Average JSON key** blends both—dangerous for freeze checks; see ${link("dual-probe-averaging", "dual-probe averaging")}.`,
        ],
      },
      { type: "h2", text: "Condensation link" },
      {
        type: "p",
        html: `Warm humid air over a cold slab drives surface moisture—pair with ${link("humidity-condensation-basics", "humidity basics")}. Insulation and door sealing reduce but do not eliminate mass effects; ${link("infiltration-wind-drafts", "infiltration")} still moves air across the floor plane.`,
      },
    ],
  ),
  page(
    "hvac-duct-influence",
    "temperature-changes",
    "HVAC duct influence on garage probes",
    "When furnace or AC ducts pass through or near a garage, how stray airflow and leakage shift probe readings.",
    "Duct leaks and register proximity create localized heat that outdoor weather cannot explain.",
    `Some garages share a wall, ceiling, or chase with conditioned house ductwork. Even sealed runs radiate heat in winter; poorly sealed taps leak warm air into an otherwise cold bay. Probes near registers or flex duct can swing several degrees independently of the door or outdoor temperature—patterns that look like sensor faults until you map the HVAC path.`,
    "Garage ceiling cutaway with HVAC duct leaking warm air toward a wall-mounted probe",
    "Duct leakage and radiant heat from nearby runs create probe zones decoupled from outdoor weather.",
    [
      { type: "h2", text: "Signatures in data" },
      {
        type: "p",
        html: `Sudden rises when the house furnace cycles—especially at night with the garage door closed—suggest duct influence. Compare against ${link("garage-door-temperature-swings", "door-driven swings")}, which align with human activity instead of 15-minute HVAC periods.`,
      },
      { type: "h2", text: "Mapping zones" },
      {
        type: "ol",
        items: [
          "Place one probe **away from known duct chases** as a reference.",
          `Note **cycle times** in a spreadsheet alongside ${link("charting-with-spreadsheets", "exported history")}.`,
          `Relabel mappings in ${link("probe-mapping-labels", "dashboard labels")} after moves so history stays interpretable.`,
        ],
      },
      { type: "h2", text: "Mitigation and monitoring" },
      {
        type: "p",
        html: `Sealing duct joints is a building fix; monitoring is still valuable to confirm improvement. Use ${link("multi-zone-garage-layout", "multi-zone layout")} and ${link("freeze-protection-thresholds", "freeze thresholds")} on the coldest zone, not the duct-warmed corner.`,
      },
    ],
  ),
  page(
    "stored-vehicle-heat",
    "temperature-changes",
    "Stored vehicle heat in the garage",
    "How recently driven cars radiate heat, elevate humidity, and temporarily bias nearby temperature probes.",
    "Hot engines and exhaust surfaces create short-lived microclimates near parked vehicles.",
    `Parking a warm car in a closed garage after a drive dumps sensible heat into the air volume and warms nearby surfaces. Probes mounted on the same wall as the vehicle or above the hood can read high for one to three hours while the rest of the bay returns toward outdoor-influenced temps. This is real physics, not miscalibration.`,
    "Top-down garage view with heat plume rising from a recently parked car near a probe",
    "A warm vehicle acts as a localized heat source that elevates nearby probe readings for hours.",
    [
      { type: "h2", text: "Typical timeline" },
      {
        type: "ul",
        items: [
          "**First 30 minutes:** Largest air-temperature bump near the vehicle.",
          "**1–3 hours:** Gradual decay; metal hood still radiates after air mixes.",
          `**Overnight:** Vehicle equilibrates; probes should match ${link("seasonal-garage-patterns", "seasonal baselines")}.`,
        ],
      },
      { type: "h2", text: "Separating from other drivers" },
      {
        type: "p",
        html: `Door openings cause **sharp simultaneous** zone moves; vehicle heat is **localized**—only nearby probes spike. ${link("sun-load-garage-walls", "Sun load")} peaks in afternoon without tying to arrival times. Log arrival times when using ${link("csv-export-spreadsheet-analysis", "CSV export")} for forensic charts.`,
      },
      { type: "h2", text: "Placement guidance" },
      {
        type: "p",
        html: `Mount a reference probe on the opposite wall from habitual parking via ${link("probe-mounting-enclosures", "probe mounting")}. Avoid hanging sensors directly above engine bays if you need stable overnight freeze metrics.`,
      },
    ],
  ),

  // ── historical-data (2) ──
  page(
    "spotting-data-gaps",
    "historical-data",
    "Spotting data gaps in history",
    "Recognize missing inserts, feed outages, and reboot gaps in dashboard charts before they skew freeze audits.",
    "Flat lines, stair-steps, and empty ranges usually mean collection stopped—not stable garage weather.",
    `Saved history is only as complete as the polling pipeline. Power loss at the Arduino, relay downtime, auth misconfiguration, or Supabase insert failures all leave gaps. Learning to distinguish **missing data** from **flat temperature** prevents false confidence during cold snaps and billing disputes over CSV completeness.`,
    "Chart with a visible gap versus a flat line segment labeled differently",
    "True gaps show missing timestamps; flat segments may be valid stable readings—learn the visual difference.",
    [
      { type: "h2", text: "Common gap causes" },
      {
        type: "ol",
        items: [
          `**Feed unreachable** — relay down or IP change; start with ${link("debugging-stale-readings", "stale reading debug")}.`,
          `**MCU reboot** — short blank period after ${link("firmware-watchdog-recovery", "watchdog reset")}.`,
          `**Insert skipped** — upstream fetch failed per ${link("supabase-history-inserts", "history insert rules")}.`,
          `**Account/session** — signed-out loads do not save; see ${link("cookie-session-lifecycle", "session lifecycle")}.`,
        ],
      },
      { type: "h2", text: "Visual patterns" },
      {
        type: "ul",
        items: [
          "**Vertical whitespace** in charts when time axis jumps forward.",
          `**Repeated identical values** can mean stuck cache—check ${link("caching-feed-responses", "feed caching")}.`,
          "**Single-zone flat while others move** suggests mapping or sensor fault.",
        ],
      },
      { type: "h2", text: "Workflow" },
      {
        type: "p",
        html: `Cross-check live JSON with curl, then browse ${link("history-dashboard-browsing", "history dashboard")}. Export via ${link("stripe-csv-subscription", "CSV subscription")} and filter timestamp column for discontinuities—techniques in ${link("charting-with-spreadsheets", "spreadsheet charting")}.`,
      },
    ],
  ),
  page(
    "charting-with-spreadsheets",
    "historical-data",
    "Charting history with spreadsheets",
    "Build pivot charts, rolling minimums, and dual-axis humidity plots from exported garage CSV files.",
    "Turn raw timestamp rows into freeze audits and seasonal comparisons outside the website UI.",
    `The built-in dashboard charts answer everyday questions. Spreadsheet charting answers audit questions: “How many hours below 35 °F last January?” or “Did humidity correlate with door events?” Exported CSV from ${link("csv-export-spreadsheet-analysis", "CSV export")} is the starting point; good column hygiene makes charts fast to rebuild when new data arrives.`,
    "Spreadsheet with timestamp column and line chart of two probe series",
    "Pivot tables and line charts turn exported CSV rows into custom freeze and humidity analyses.",
    [
      { type: "h2", text: "Import hygiene" },
      {
        type: "ul",
        items: [
          "Parse timestamps as **datetime**, not text—sort ascending before charting.",
          "Split **probe_key** into separate series rather than one blended line.",
          "Keep Fahrenheit and Celsius columns consistent; pick one axis unit.",
        ],
      },
      { type: "h2", text: "Useful chart types" },
      {
        type: "ol",
        items: [
          `**Rolling 24h minimum** temp per zone for ${link("freeze-protection-thresholds", "freeze planning")}.`,
          `**Dual-axis** temp and humidity to spot ${link("humidity-condensation-basics", "condensation risk")} windows.`,
          "**Week-over-week** overlays after insulation upgrades.",
        ],
      },
      { type: "h2", text: "Correlate external data" },
      {
        type: "p",
        html: `Merge weather API CSV on aligned timestamps—see ${link("weather-api-parallel-path", "weather API parallel path")}. Mark manual events (door open, car parked) in a helper column to explain spikes from ${link("garage-door-temperature-swings", "door swings")} or ${link("stored-vehicle-heat", "vehicle heat")}.`,
      },
    ],
  ),

  // ── arduino-sketches (3) ──
  page(
    "serial-debugging-tips",
    "arduino-sketches",
    "Serial debugging tips",
    "Use the Arduino serial monitor effectively for DHT22 timing, Ethernet status, and HTTP trace logs during bench bring-up.",
    "Structured serial output accelerates firmware debug before the board moves to the garage.",
    `USB serial is the fastest feedback loop while the Uno still sits on the bench. Thoughtful logging—without flooding the monitor—shows whether failed reads, DHCP delays, or JSON formatting happen before you blame the website. These habits complement ${link("arduino-ide-setup", "IDE setup")} and reduce ladder trips after deployment.`,
    "Laptop connected to Arduino with serial monitor showing timestamped log lines",
    "Serial monitor at matching baud rate reveals sensor errors and network state during development.",
    [
      { type: "h2", text: "What to log" },
      {
        type: "ul",
        items: [
          "**DHT22 errors** with probe index and retry count.",
          "**Ethernet link** up/down and assigned IP after DHCP.",
          "**HTTP client** connect/disconnect—not full JSON every second.",
          "**Watchdog pets** only in debug builds to verify loop health.",
        ],
      },
      { type: "h2", text: "Timing and baud" },
      {
        type: "p",
        html: `Match monitor baud to <code>Serial.begin</code> in firmware—often 9600. Remember ${link("sketch-polling-main-loop", "main loop")} timing: verbose prints slow loops and can themselves cause DHT22 timeouts. Disable chatty logs in production builds.`,
      },
      { type: "h2", text: "After deployment" },
      {
        type: "p",
        html: `Serial is unavailable on the pole unless you USB again—switch to ${link("json-probe-output-schema", "JSON curl checks")} and ${link("debugging-stale-readings", "site-side stale debug")}. For network issues compare ${link("static-ip-vs-dhcp", "static IP versus DHCP")} logs from boot.`,
      },
    ],
  ),
  page(
    "library-dependencies",
    "arduino-sketches",
    "Library dependencies for the sketch",
    "Which Arduino libraries the garage firmware expects, version pitfalls, and how to reproduce a known-good build.",
    "Pin compatible DHT, LiquidCrystal, and Ethernet stacks prevent compile surprises on fresh laptops.",
    `The garage sketch is not self-contained—it pulls in Adafruit or community DHT drivers, the stock LiquidCrystal library, and the legacy Ethernet stack for W5100 shields. Library major-version jumps have broken constructors and enum names in past bring-ups. Documenting dependencies makes rebuilds in five years possible when the original laptop is gone.`,
    "Dependency boxes linking DHT, LiquidCrystal, and Ethernet libraries to the main sketch",
    "Core third-party libraries supply sensor protocol, LCD driving, and W5100 network I/O.",
    [
      { type: "h2", text: "Core libraries" },
      {
        type: "ul",
        items: [
          "**DHT sensor library** — single-wire reads with timing guards.",
          "**LiquidCrystal** — parallel 4-bit LCD mode used locally.",
          "**Ethernet** — W5100-compatible stack for HTTP serving.",
        ],
      },
      { type: "h2", text: "Install workflow" },
      {
        type: "ol",
        items: [
          "Use **Library Manager** or vendor ZIP with pinned version notes in your repo README.",
          "Compile a **known example** for each library before merging into the garage sketch.",
          `After updates, re-verify ${link("lcd-local-display-format", "LCD layout")} and ${link("json-probe-output-schema", "JSON schema")}.`,
        ],
      },
      { type: "h2", text: "PlatformIO alternative" },
      {
        type: "p",
        html: `PlatformIO locks versions in <code>platformio.ini</code>—excellent for reproducibility. Either path starts from ${link("arduino-ide-setup", "Arduino IDE setup")}. Sensor behavior details: ${link("dht22-sensor-overview", "DHT22 overview")}.`,
      },
    ],
  ),
  page(
    "static-ip-vs-dhcp",
    "arduino-sketches",
    "Static IP versus DHCP on the Arduino",
    "Choose between DHCP convenience and reserved static IPs for reliable garage JSON endpoints and firewall rules.",
    "Stable addressing simplifies relay configuration, port forwarding, and mental models for curl tests.",
    `The Ethernet shield can request DHCP from the garage router or use a fixed LAN address. DHCP is easier on first boot; static or DHCP reservation prevents the Arduino from jumping addresses after power outages—breaking hard-coded upstream URLs in ${link("fastapi-relay-setup", "FastAPI relays")} until someone notices stale home page readings.`,
    "Router diagram comparing DHCP lease churn versus reserved static IP for the Arduino",
    "Reserved DHCP or static IP keeps the probe URL stable for relays and firewall rules.",
    [
      { type: "h2", text: "DHCP with reservation" },
      {
        type: "p",
        html: `Many routers map **MAC address → fixed IP** while still using DHCP under the hood. This gives plug-and-play first install plus stability—preferred for most garage builds. Note the Uno MAC from serial boot logs during ${link("serial-debugging-tips", "serial debug")}.`,
      },
      { type: "h2", text: "True static in firmware" },
      {
        type: "ul",
        items: [
          "Hard-code IP, gateway, subnet, and DNS in the sketch.",
          "Document values on the enclosure lid—future you will forget.",
          "Conflict risk if another device claims the same IP.",
        ],
      },
      { type: "h2", text: "Downstream impact" },
      {
        type: "p",
        html: `Relays and ${link("docker-relay-deployment", "Docker deployments")} often store upstream LAN URLs. Pair stable IPs with ${link("health-check-endpoints", "health checks")} and ${link("firmware-watchdog-recovery", "watchdog recovery")} so brief reboots do not require config edits.`,
      },
    ],
  ),

  // ── arduino-circuit-wiring (2) ──
  page(
    "ground-loop-avoidance",
    "arduino-circuit-wiring",
    "Ground loop avoidance",
    "Prevent duplicate ground paths and noisy references when USB bench power meets barrel supply and long sensor cables.",
    "One intentional ground star point beats mysterious DHT22 timeouts from loop currents.",
    `Ground is not “just connect all blacks together.” When USB programming ground, barrel jack return, Ethernet shield chassis, and remote probe grounds meet at multiple points, small circulating currents add noise to the DHT22 one-wire reference. A deliberate **single-star ground** at the Uno keeps digital reads stable and LCD contrast predictable.`,
    "Wiring diagram showing star ground at Arduino versus problematic ground loops",
    "Route all returns to one ground star at the MCU instead of chaining grounds through multiple paths.",
    [
      { type: "h2", text: "Bench versus installed power" },
      {
        type: "p",
        html: `USB bench power shares ground with your laptop; adding a barrel supply without common planning can create loops. Before mount, verify ${link("breadboard-power-rails", "power rails")} at one potential reference. After mount, disconnect USB when on barrel power if your enclosure design allows.`,
      },
      { type: "h2", text: "Remote probe grounds" },
      {
        type: "ul",
        items: [
          "Run **GND alongside data** from each probe—do not ground probes locally to building steel alone.",
          "Avoid **grounding shields** at both ends of long runs unless using proper shielded cable practice.",
          `See ${link("probe-cable-length-limits", "cable length limits")} for run geometry.`,
        ],
      },
      { type: "h2", text: "Diagnosis" },
      {
        type: "p",
        html: `If errors vanish when touching a wire, suspect reference issues. Cross-check ${link("circuit-wiring-troubleshooting", "circuit troubleshooting")} and ${link("dht22-read-errors-retries", "DHT22 retries")} after fixing grounds before replacing sensors.`,
      },
    ],
  ),
  page(
    "enclosure-ventilation",
    "arduino-circuit-wiring",
    "Enclosure ventilation for electronics",
    "Ventilate project boxes so the LCD, Ethernet shield, and regulators stay cool without cooking remote probe air samples.",
    "MCU enclosures need airflow; probe boxes need breathable vents—do not treat them the same.",
    `Sealing the Arduino in a NEMA box protects from dust but traps heat from the linear regulator and W5100 chip. Probes in a separate ventilated housing need holes for ambient air while keeping rain off. Confusing the two enclosure types causes overheated Ethernet resets and sluggish humidity readings—different problems with similar “boxed up” appearance.`,
    "Two enclosures side by side: ventilated probe box and louvered MCU box with fan arrow",
    "Probe housings breathe ambient air; MCU enclosures exhaust heat while keeping dust out.",
    [
      { type: "h2", text: "MCU box guidelines" },
      {
        type: "ul",
        items: [
          "**Louvers or slots** on opposing sides for cross-flow.",
          "Keep **barrel jack and RJ45** accessible for service.",
          "Do not seal **Ethernet shield** against a hot south wall without shade.",
        ],
      },
      { type: "h2", text: "Probe box guidelines" },
      {
        type: "p",
        html: `Match ${link("probe-mounting-enclosures", "probe mounting")}: vents sized for air exchange, cable gland pointing down, sensor not in direct sun patch. Interior MCU heat must not share an unvented cavity with a DHT22—see ${link("multi-zone-garage-layout", "zone layout")}.`,
      },
      { type: "h2", text: "Thermal interaction" },
      {
        type: "p",
        html: `Warm electronics raise nearby air if co-mounted—mount probes on exterior wall, MCU near the router run. ${link("ground-loop-avoidance", "Ground planning")} still applies inside the box.`,
      },
    ],
  ),

  // ── arduino-pin-wiring (2) ──
  page(
    "backlight-pwm-options",
    "arduino-pin-wiring",
    "LCD backlight PWM options",
    "Dim the 16×2 LCD backlight with a transistor, PWM pin, or timed shutdown to reduce glare and power draw overnight.",
    "Backlight control is separate from LiquidCrystal data pins—wire it deliberately.",
    `The parallel LCD interface uses RS, E, and D4–D7 for text—documented in ${link("liquid-crystal-gpio-map", "LCD GPIO map")}. The LED backlight is a power circuit, often switched through a transistor because Arduino pins cannot supply backlight current directly. PWM or timed dimming keeps the garage readable at night without a always-on glow heating the enclosure.`,
    "Circuit sketch of NPN transistor switching LCD backlight with optional PWM pin",
    "A GPIO drives a transistor to PWM or gate the backlight LED circuit independently of data lines.",
    [
      { type: "h2", text: "Wiring patterns" },
      {
        type: "ol",
        items: [
          "**Direct digital pin** — on/off only; simplest for bench tests.",
          "**PWM pin** — smooth dimming via <code>analogWrite</code> on supported pins.",
          "**Timer-based off** — firmware turns backlight off after idle minutes.",
        ],
      },
      { type: "h2", text: "Firmware interaction" },
      {
        type: "p",
        html: `Backlight changes do not require re-init of LiquidCrystal. Coordinate with ${link("lcd-local-display-format", "display format")} refresh so dimming does not coincide with unreadable contrast—Vo pot still sets character visibility via ${link("breadboard-power-rails", "power rails")}.`,
      },
      { type: "h2", text: "Power budget" },
      {
        type: "p",
        html: `Overnight off saves modest current but reduces heat in ${link("enclosure-ventilation", "sealed enclosures")}. Ensure ${link("spi-pins-ethernet-reserved", "SPI pins")} stay free if choosing PWM on timer-overlap pins—verify pinout chart for your board.`,
      },
    ],
  ),
  page(
    "jumper-wire-standards",
    "arduino-pin-wiring",
    "Jumper wire standards for breadboards",
    "Pick solid versus stranded jumpers, color conventions, and mechanical strain relief for vibration-prone garage mounts.",
    "Consistent wire colors and firm seating prevent intermittent probes after the door shakes the wall.",
    `Breadboard jumpers look interchangeable but garage vibration from door openers and compressors loosens cheap connections. Solid-core dupont wires suit bench work; finalized installs benefit from restrained routing, labeled colors, and occasional ferrules where wires leave the breadboard for remote probes.`,
    "Color-coded jumper set with solid versus stranded ends labeled",
    "Standard color codes and mechanically secure terminations reduce intermittent connections.",
    [
      { type: "h2", text: "Color conventions" },
      {
        type: "ul",
        items: [
          "**Red** — 5 V distribution.",
          "**Black or green** — ground.",
          `**Yellow/blue/green** — data lines per probe—document in ${link("dht22-data-line-wiring", "DHT22 wiring")}.`,
          "**Contrast pot** — separate pair; do not share with sensor data colors.",
        ],
      },
      { type: "h2", text: "Mechanical reliability" },
      {
        type: "p",
        html: `Strain-relief tie points before cables exit the board; avoid tension on DHT22 sockets. Long runs transition to twisted pair per ${link("probe-cable-length-limits", "cable length guide")}. Re-seat connections after transport to the garage.`,
      },
      { type: "h2", text: "When to stop using breadboards" },
      {
        type: "p",
        html: `Permanently mounted installs eventually deserve a protoboard or PCB—see ${link("arduino-circuit-wiring", "circuit wiring overview")}. Until then, ${link("circuit-wiring-troubleshooting", "systematic troubleshooting")} beats random jumper swaps.`,
      },
    ],
  ),

  // ── arduino-dht22-lcd (2) ──
  page(
    "sensor-warm-up-time",
    "arduino-dht22-lcd",
    "DHT22 sensor warm-up time",
    "Allow stabilization after power-on before trusting humidity readings for condensation or mold decisions.",
    "First reads after boot can lag; warm-up minutes matter for humidity more than temperature.",
    `DHT22 humidity sensors equilibrate with surrounding air after power application. Temperature responds faster; humidity may drift toward true values over several minutes—especially if the sensor was stored in a cold truck before install. Firmware and installers should ignore or flag early samples so JSON and LCD do not alarm on transient RH.`,
    "Timeline graph showing humidity settling after power-on versus faster temperature response",
    "Humidity readings stabilize over minutes after cold storage or rapid temperature change.",
    [
      { type: "h2", text: "Boot behavior" },
      {
        type: "p",
        html: `Skip publishing humidity for the first **one to three minutes** after reset, or mark reads as warming in serial logs via ${link("serial-debugging-tips", "serial debug")}. Align with ${link("sketch-polling-main-loop", "main loop")} timer so HTTP still serves temperature if needed.`,
      },
      { type: "h2", text: "Environmental triggers" },
      {
        type: "ul",
        items: [
          "**Cold snap** after warm storage—humidity lags real air.",
          "**Door event** mixing humid outdoor air—wait one poll cycle before alerts.",
          `**Vehicle heat** nearby—see ${link("stored-vehicle-heat", "stored vehicle heat")}.`,
        ],
      },
      { type: "h2", text: "User-facing impact" },
      {
        type: "p",
        html: `Dashboard history inherits warm-up blips if inserts run immediately—pair with ${link("dht22-read-errors-retries", "retry policy")} and ${link("humidity-condensation-basics", "condensation basics")} for interpretation, not panic.`,
      },
    ],
  ),
  page(
    "lcd-i2c-alternative",
    "arduino-dht22-lcd",
    "I²C LCD alternative",
    "Free GPIO pins by moving from parallel LiquidCrystal to an I²C backpack module when the Ethernet shield consumes the pin budget.",
    "Two-wire I²C LCDs trade pin savings for different library code and address planning.",
    `Parallel mode uses six GPIO lines plus backlight drive—tight on an Uno stacked with W5100. I²C backpacks (typically PCF8574) need SDA/SCL only, freeing pins for extra probes or ${link("backlight-pwm-options", "backlight PWM")}. The tradeoff is another library, address jumpers, and shared bus timing with any future I²C sensors.`,
    "Parallel LCD versus I²C backpack pin count comparison on Arduino Uno",
    "I²C backpacks reduce GPIO use to two data lines plus power—helpful when SPI pins are reserved.",
    [
      { type: "h2", text: "Pin budget math" },
      {
        type: "p",
        html: `Review ${link("spi-pins-ethernet-reserved", "reserved SPI pins")} and ${link("liquid-crystal-gpio-map", "parallel map")}: two DHT22 lines plus six LCD lines leaves little headroom. I²C reclaims four to six pins depending on wiring.`,
      },
      { type: "h2", text: "Migration notes" },
      {
        type: "ol",
        items: [
          "Install **LiquidCrystal I²C** library and set backpack address (often 0x27).",
          "Rewire **SDA/SCL**—Uno A4/A5 on classic boards.",
          `Update display strings in ${link("lcd-local-display-format", "LCD format")}—character width unchanged.`,
        ],
      },
      { type: "h2", text: "When to stay parallel" },
      {
        type: "p",
        html: `If your shield stack already works and pins suffice, parallel mode remains simpler—${link("arduino-dht22-lcd", "DHT22 and LCD overview")}. Consider I²C when adding a third probe or ${link("backlight-pwm-options", "PWM backlight")} on a crowded pin map.`,
      },
    ],
  ),

  // ── python-feeds (3) ──
  page(
    "docker-relay-deployment",
    "python-feeds",
    "Docker deployment for the Python relay",
    "Run FastAPI relay and Redis in containers for reproducible upgrades on a home server or small VPS.",
    "Container images pin Python dependencies and simplify restart after power blips.",
    `Bare-metal systemd works, but Docker Compose bundles the ${link("fastapi-relay-setup", "FastAPI relay")}, ${link("redis-cache-for-feeds", "Redis cache")}, and reverse-proxy sidecars with one <code>docker compose up</code>. Images rebuild from locked requirements; volumes preserve Redis data across restarts—useful when the garage router reboots and upstream Arduino needs a minute to return.`,
    "Docker Compose stack with relay, Redis, and reverse proxy containers",
    "Compose services for FastAPI, Redis, and TLS proxy deploy as one reproducible stack.",
    [
      { type: "h2", text: "Typical compose services" },
      {
        type: "ul",
        items: [
          "**relay** — uvicorn app polling LAN JSON.",
          "**redis** — cache with persistent volume optional.",
          `**caddy/nginx** — TLS termination per ${link("relay-security-and-access", "relay security")}.`,
        ],
      },
      { type: "h2", text: "Configuration" },
      {
        type: "p",
        html: `Mount env files read-only—details in ${link("environment-variables-relay", "environment variables")}. Set upstream Arduino URL after ${link("static-ip-vs-dhcp", "IP planning")}. Expose ${link("health-check-endpoints", "health endpoints")} for uptime monitors.`,
      },
      { type: "h2", text: "Operations" },
      {
        type: "ol",
        items: [
          "Pin image tags; avoid `:latest` on production home servers.",
          "Log rotation on the host disk—JSON polls are chatty at DEBUG.",
          `After schema changes, verify ${link("json-probe-output-schema", "JSON schema")} before redeploy.`,
        ],
      },
    ],
  ),
  page(
    "environment-variables-relay",
    "python-feeds",
    "Environment variables for the relay",
    "Configure upstream URLs, Redis DSN, TTL seconds, and log levels without editing Python source on the server.",
    "Twelve-factor style config keeps secrets out of git and simplifies Docker restarts.",
    `Relays read configuration from the environment at startup: where the Arduino lives, how long to cache JSON, which Redis DB index to use, and how verbose logging should be. Hard-coding LAN IPs in source leads to git leaks and rebuilds for trivial changes—environment variables align with ${link("docker-relay-deployment", "Docker deployment")} and production hygiene.`,
    "Env file keys flowing into relay process configuration blocks",
    "Environment variables supply upstream URL, Redis DSN, TTL, and log level at container start.",
    [
      { type: "h2", text: "Common variables" },
      {
        type: "pre",
        code: `UPSTREAM_URL=http://192.168.1.50/
REDIS_URL=redis://redis:6379/0
CACHE_TTL_SECONDS=60
LOG_LEVEL=info`,
      },
      { type: "h2", text: "Secrets handling" },
      {
        type: "p",
        html: `Optional API keys for public relay auth belong in env—not committed files. Mirror patterns from ${link("env-secrets-cloudflare", "Cloudflare secrets")} on the Astro side. Never store Supabase service keys in the relay unless it writes history directly.`,
      },
      { type: "h2", text: "Validation on boot" },
      {
        type: "p",
        html: `Fail fast when <code>UPSTREAM_URL</code> is missing; log resolved values once at INFO. Pair with ${link("health-check-endpoints", "health checks")} so orchestrators restart unhealthy containers instead of serving blank JSON.`,
      },
    ],
  ),
  page(
    "health-check-endpoints",
    "python-feeds",
    "Health check endpoints for relays",
    "Expose liveness and readiness routes so Docker, uptime robots, and you know when cache or upstream probes fail.",
    "/health should mean more than 'Python process running'—verify Redis and last good upstream fetch.",
    `A relay can hang with a 200 OK on stale JSON. Good health endpoints distinguish **process up**, **Redis reachable**, and **recent successful upstream poll**. Home-lab monitors and ${link("docker-relay-deployment", "Compose")} restart policies depend on meaningful HTTP status codes—not just TCP open on port 443.`,
    "Health check flow from monitor to relay to Redis and upstream Arduino",
    "Liveness confirms the app runs; readiness verifies cache connectivity and fresh upstream data.",
    [
      { type: "h2", text: "Suggested routes" },
      {
        type: "ul",
        items: [
          "<code>GET /health/live</code> — returns 200 if event loop responsive.",
          "<code>GET /health/ready</code> — checks Redis ping and upstream fetch within TTL.",
          "<code>GET /health/metrics</code> — optional Prometheus text for advanced users.",
        ],
      },
      { type: "h2", text: "Status code policy" },
      {
        type: "p",
        html: `Return **503** when last good upstream sample is older than two TTL windows—site logic in ${link("debugging-stale-readings", "stale reading debug")} aligns. Log upstream errors separately from client traffic per ${link("relay-security-and-access", "relay security")}.`,
      },
      { type: "h2", text: "Website integration" },
      {
        type: "p",
        html: `The Astro fetch layer may still show cached values briefly—see ${link("caching-feed-responses", "caching feed responses")}. Health endpoints help operators, not end users; configure monitors outside the public home page.`,
      },
    ],
  ),

  // ── astro-applications (3) ──
  page(
    "middleware-auth-patterns",
    "astro-applications",
    "Middleware auth patterns in Astro",
    "Guard dashboard and API routes with session checks on Cloudflare before rendering protected HTML or mutations.",
    "Server middleware validates Supabase sessions once per request for protected paths.",
    `Authenticated dashboard pages must not rely on hidden UI alone. Astro middleware on Cloudflare can inspect cookies, validate JWT or session against Supabase, and redirect anonymous visitors to sign-in before expensive fetches run. The same layer protects API routes that mutate feed settings or trigger ${link("supabase-history-inserts", "history inserts")}.`,
    "Request path through Astro middleware to auth check then dashboard render",
    "Middleware intercepts protected routes, validates session, then allows SSR or redirects to sign-in.",
    [
      { type: "h2", text: "What to protect" },
      {
        type: "ul",
        items: [
          "**/dashboard/** — settings, history, billing.",
          "**POST API routes** — feed updates, contact submissions.",
          "Leave **public about and home** unauthenticated unless A/B testing.",
        ],
      },
      { type: "h2", text: "Session sources" },
      {
        type: "p",
        html: `Read HttpOnly cookies set during ${link("supabase-auth-flow", "Supabase auth")}. Refresh tokens before SSR if your adapter supports it—details overlap ${link("cookie-session-lifecycle", "cookie session lifecycle")}.`,
      },
      { type: "h2", text: "Edge considerations" },
      {
        type: "p",
        html: `Middleware runs at the edge—keep calls fast; cache public keys. Admin routes need role checks via ${link("group-membership-model", "group membership")}. Broader SSR context: ${link("astro-server-side-rendering", "Astro SSR")}.`,
      },
    ],
  ),
  page(
    "env-secrets-cloudflare",
    "astro-applications",
    "Environment secrets on Cloudflare",
    "Store Supabase keys, Stripe secrets, and feed defaults in Cloudflare dashboard vars—not in the git tree.",
    "Wrangler secrets and encrypted vars keep production keys off laptops and out of logs.",
    `Edge-deployed Astro reads configuration from Cloudflare Workers environment at runtime. Service role keys and Stripe webhook secrets must never appear in client bundles or public GitHub repos. Separating **public** anon keys from **server-only** secrets mirrors relay hygiene in ${link("environment-variables-relay", "relay env vars")}.`,
    "Cloudflare dashboard secrets flowing to Worker runtime without appearing in client JS",
    "Server-only secrets inject at deploy time; public anon keys may ship to the browser bundle.",
    [
      { type: "h2", text: "Variable classes" },
      {
        type: "ul",
        items: [
          "**PUBLIC_** prefix — safe for client islands if truly public.",
          "**Server secrets** — Supabase service role, Stripe secret, webhook signing.",
          "**Per-environment** — preview vs production values in separate namespaces.",
        ],
      },
      { type: "h2", text: "Local development" },
      {
        type: "p",
        html: `Use <code>.dev.vars</code> gitignored locally; never commit. Rotate after laptop loss. Pair with ${link("middleware-auth-patterns", "middleware auth")} so mis-set keys fail closed on dashboard routes.`,
      },
      { type: "h2", text: "Deployment pipeline" },
      {
        type: "p",
        html: `CI sets secrets via wrangler or dashboard UI—document names in README without values. Related: ${link("cloudflare-workers-deployment", "Workers deployment")} and ${link("tailwind-v4-setup", "Tailwind v4 setup")} build env for CSS only.`,
      },
    ],
  ),
  page(
    "tailwind-v4-setup",
    "astro-applications",
    "Tailwind CSS v4 setup in Astro",
    "How utility-first styling integrates with this Astro build, theme tokens, and component classes like text-link.",
    "Tailwind v4 CSS-first config keeps about prose and dashboard cards consistent.",
    `This site uses Tailwind utility classes across cards, buttons, and about prose—including the <code>text-link</code> class referenced throughout expanded guides. Tailwind v4 shifts much configuration into CSS <code>@theme</code> blocks instead of JavaScript config files, which affects how custom colors align with brand plum and terracotta accents in diagrams and UI chrome.`,
    "Astro page components importing Tailwind v4 CSS with theme token blocks",
    "Tailwind v4 integrates via CSS imports and @theme tokens shared across Astro layouts.",
    [
      { type: "h2", text: "Project integration" },
      {
        type: "p",
        html: `Global styles load from the layout entry CSS; components use utilities directly in Astro HTML. Islands hydrate with the same tokens when they mount—see ${link("astro-islands-and-hydration", "Astro islands")}.`,
      },
      { type: "h2", text: "About prose conventions" },
      {
        type: "ul",
        items: [
          "**card** — section containers on about pages.",
          "**text-link** — internal /about/ links in generated HTML blocks.",
          `**about-figure** — illustration wrappers in ${link("astro-applications", "Astro applications")} expanded pages.`,
        ],
      },
      { type: "h2", text: "Build pipeline" },
      {
        type: "p",
        html: `Production builds run through the same Vite pipeline deployed via ${link("cloudflare-workers-deployment", "Cloudflare Workers")}. Env-specific asset hashing does not affect Tailwind class names—safe for static expanded content generation.`,
      },
    ],
  ),

  // ── nextjs-node-applications (2) ──
  page(
    "websocket-live-updates",
    "nextjs-node-applications",
    "WebSocket live updates in monitoring UIs",
    "When push-based probe updates beat SSR polling for dashboard freshness—and what this Astro site does instead.",
    "WebSockets shine for sub-minute live tiles; HTTP caching fits public home page scale.",
    `Next.js and Node servers often pair monitoring dashboards with WebSockets or SSE for live tiles without full page reload. Garage probes change slowly—30–120 second cadence—so aggressive push channels rarely justify complexity here. Understanding the pattern helps compare this stack with ${link("nextjs-monitoring-dashboards", "Next.js dashboards")} you might build elsewhere.`,
    "Browser dashboard receiving WebSocket push updates from Node server",
    "WebSocket channels push probe JSON to browsers as soon as the server polls upstream hardware.",
    [
      { type: "h2", text: "Architecture sketch" },
      {
        type: "ol",
        items: [
          "Node **polls Arduino** on an interval.",
          "Server **broadcasts** JSON to connected WebSocket clients.",
          "Browser **updates charts** without navigation.",
        ],
      },
      { type: "h2", text: "Tradeoffs" },
      {
        type: "ul",
        items: [
          "**Pros:** Instant feel for ops desks; multi-user fan-out.",
          `**Cons:** Stateful servers, reconnect logic, harder edge deploy than ${link("home-page-probe-fetch", "SSR fetch")}.`,
          "**Garage reality:** DHT22 limits poll rate—push faster than reads is pointless.",
        ],
      },
      { type: "h2", text: "Hybrid alternative" },
      {
        type: "p",
        html: `This project uses SSR plus optional client refresh islands—${link("astro-islands-and-hydration", "Astro islands")}. For LAN-only live views, see ${link("websocket-live-updates", "local Node patterns")} in ${link("node-express-api-patterns", "Express API patterns")}.`,
      },
    ],
  ),
  page(
    "hosting-cost-comparison",
    "nextjs-node-applications",
    "Hosting cost comparison for monitoring stacks",
    "Rough monthly costs for Cloudflare edge Astro, Vercel Next.js, VPS Node, and home relay power draw.",
    "Edge static-first hosting plus a tiny home relay often beats always-on VPS for hobby monitoring.",
    `Total cost of ownership includes domain, hosting, Stripe fees, Supabase tier, electricity for the Arduino stack, and optional VPS for Python relays. Comparing ${link("comparing-full-stack-options", "full-stack options")} without dollars hides why this repo chose Astro on Cloudflare with residential upstream JSON.`,
    "Bar chart comparing monthly costs of edge, VPS, and home relay hosting options",
    "Hobby monitoring costs split across edge hosting, database tier, and home relay power.",
    [
      { type: "h2", text: "Cloudflare + Supabase path" },
      {
        type: "ul",
        items: [
          "**Workers/Pages** — often free tier for modest traffic.",
          "**Supabase** — free tier for small history; watch row growth.",
          "**Home relay** — existing PC or Pi power only.",
        ],
      },
      { type: "h2", text: "VPS Node/Next path" },
      {
        type: "p",
        html: `$5–20/month VPS running ${link("node-express-api-patterns", "Express")} or ${link("nextjs-monitoring-dashboards", "Next")} with cron polling—predictable bill, you maintain OS patches. ${link("docker-relay-deployment", "Docker")} on same VPS consolidates services.`,
      },
      { type: "h2", text: "Hidden costs" },
      {
        type: "p",
        html: `Developer time for ${link("relay-security-and-access", "TLS and security")}, ${link("stripe-csv-subscription", "billing webhooks")}, and ladder trips to reboot firmware. Edge ${link("cloudflare-workers-deployment", "deployment")} reduces ops time; hardware stays the same either way.`,
      },
    ],
  ),

  // ── data-flow (3) ──
  page(
    "weather-api-parallel-path",
    "data-flow",
    "Weather API parallel data path",
    "Fetch outdoor forecast and conditions alongside probe JSON for context on the home page or CSV merges.",
    "External weather data explains garage swings driven by outdoor humidity and wind—not just door events.",
    `Garage probes tell you what happened inside. A parallel weather API path tells you what the atmosphere delivered—useful for correlating ${link("infiltration-wind-drafts", "wind infiltration")}, expected lows, and spreadsheet joins in ${link("charting-with-spreadsheets", "charting with spreadsheets")}. This path must not block probe SSR if the weather vendor is slow.`,
    "Parallel fetch arrows from server to probe JSON and weather API merging in SSR",
    "Server fetches probe feeds and weather API concurrently so slow forecasts do not block live temps.",
    [
      { type: "h2", text: "Fetch strategy" },
      {
        type: "p",
        html: `Use <code>Promise.allSettled</code> or equivalent: probe fetch failure should still 200 the page with an error card; weather failure omits the sidebar forecast. Timeouts align with ${link("home-page-probe-fetch", "home page probe fetch")} patterns.`,
      },
      { type: "h2", text: "Data use" },
      {
        type: "ul",
        items: [
          "**Display only** — outdoor temp/humidity context on dashboard.",
          "**CSV enrichment** — join on hour buckets during export analysis.",
          "**Not for control** — do not drive freeze alerts from forecast alone.",
        ],
      },
      { type: "h2", text: "Secrets and caching" },
      {
        type: "p",
        html: `Weather API keys live in ${link("env-secrets-cloudflare", "Cloudflare secrets")}. Cache responses longer than probe TTL—${link("caching-feed-responses", "feed caching")} doc contrasts freshness needs.`,
      },
    ],
  ),
  page(
    "cookie-session-lifecycle",
    "data-flow",
    "Cookie and session lifecycle",
    "How Supabase auth cookies are set, refreshed, and cleared—and why signed-out home loads skip history inserts.",
    "Session cookies tie browser identity to Supabase rows for feeds and saved history.",
    `Authentication is not only the sign-in form—it is the HttpOnly cookie chain that lets server routes know which feed mappings and history rows belong to you. Expired sessions explain sudden “default demo feeds” on the home page and missing ${link("supabase-history-inserts", "history inserts")} even when probes are healthy.`,
    "Sequence diagram from sign-in through cookie set, SSR fetch, and history insert",
    "Sign-in establishes session cookies consumed by SSR routes and history insert logic.",
    [
      { type: "h2", text: "Lifecycle stages" },
      {
        type: "ol",
        items: [
          "**Sign-in** — Supabase returns session; server sets scoped cookies.",
          "**SSR requests** — middleware validates before dashboard render.",
          "**Refresh** — silent token rotation before expiry when configured.",
          "**Sign-out** — cookies cleared; subsequent loads are anonymous.",
        ],
      },
      { type: "h2", text: "Impact on data pipeline" },
      {
        type: "p",
        html: `History saves on authenticated home loads—see ${link("data-flow", "data flow overview")}. Guest visitors read public demo feeds via ${link("home-page-probe-fetch", "probe fetch")} without writing rows. Session bugs resemble ${link("spotting-data-gaps", "data gaps")} in charts.`,
      },
      { type: "h2", text: "Security pairing" },
      {
        type: "p",
        html: `Combine with ${link("middleware-auth-patterns", "middleware auth")} and ${link("supabase-auth-flow", "Supabase auth flow")}. Admin routes additionally check ${link("group-membership-model", "group membership")}.`,
      },
    ],
  ),
  page(
    "caching-feed-responses",
    "data-flow",
    "Caching feed responses end to end",
    "Where Redis, CDN, and in-memory caches sit between Arduino JSON and the browser—and TTL tuning per layer.",
    "Multiple cache layers prevent hammering home uplink while keeping readings fresh enough.",
    `A single home page view could otherwise trigger a LAN fetch from Cloudflare to your residential relay on every request. Caching at the Python relay (Redis), optional edge cache headers, and short in-process memoization in Astro each reduce load. Mis-tuned TTL causes ${link("debugging-stale-readings", "stale readings")} that look like hardware faults.`,
    "Cache layers from browser to edge to relay Redis to Arduino",
    "TTL settings at relay Redis and edge fetch boundaries balance freshness versus uplink load.",
    [
      { type: "h2", text: "Layer guide" },
      {
        type: "ul",
        items: [
          `**Redis** — ${link("redis-cache-for-feeds", "primary TTL")} 30–120s at relay.`,
          "**Astro fetch** — optional short memo during single SSR request.",
          "**CDN** — avoid caching authenticated HTML; public home may cache briefly.",
        ],
      },
      { type: "h2", text: "Stale-while-revalidate" },
      {
        type: "p",
        html: `Serve last good JSON while async refresh runs if Arduino is slow—documented in ${link("health-check-endpoints", "health checks")}. Do not cache error bodies. Probe insert logic should skip failed fetches per ${link("supabase-history-inserts", "history inserts")}.`,
      },
      { type: "h2", text: "Tuning workflow" },
      {
        type: "ol",
        items: [
          "Measure **curl latency** from edge to relay.",
          "Set TTL ≥ Arduino poll interval.",
          `Verify LCD vs web after changes—${link("lcd-local-display-format", "LCD is often fresher")}.`,
        ],
      },
    ],
  ),

  // ── accounts-and-dashboard (3) ──
  page(
    "group-membership-model",
    "accounts-and-dashboard",
    "Group membership model",
    "How default, member, and admin groups gate CSV export, admin tools, and feature flags in Supabase.",
    "Groups encode subscription and operator roles without hard-coding emails in source.",
    `Users belong to one or more groups stored in Supabase—typically default registered users, paying members with CSV access, and admins who review contact submissions. Server routes check group membership before unlocking ${link("stripe-csv-subscription", "CSV export")} or ${link("admin-dashboard-features", "admin dashboard")} tools rather than scattering email allowlists in code.`,
    "User account linked to member and admin group nodes with feature flags",
    "Supabase group rows determine CSV export, billing features, and admin route access.",
    [
      { type: "h2", text: "Common groups" },
      {
        type: "ul",
        items: [
          "**default** — signed-in feeds and history browsing.",
          "**member** — active Stripe subscription for CSV.",
          `**admin** — user lookup and ${link("contact-form-admin-review", "contact review")}.`,
        ],
      },
      { type: "h2", text: "Enforcement points" },
      {
        type: "p",
        html: `Check groups in Astro middleware and API handlers—${link("middleware-auth-patterns", "middleware patterns")}. Webhooks add member group on successful checkout; cancellations remove it. Never trust client-side group claims.`,
      },
      { type: "h2", text: "Auth foundation" },
      {
        type: "p",
        html: `Registration flow in ${link("supabase-auth-flow", "Supabase auth")} assigns default group. Session cookies carry JWT claims read during ${link("cookie-session-lifecycle", "session lifecycle")}.`,
      },
    ],
  ),
  page(
    "contact-form-admin-review",
    "accounts-and-dashboard",
    "Contact form admin review",
    "How admin users triage contact submissions, mark handled states, and avoid spam in the operator inbox.",
    "Contact submissions land in a review queue gated by admin group membership.",
    `Public visitors submit questions through a hydrated contact island. Rows persist in Supabase for admins to review—separate from temperature telemetry. This workflow keeps support out of personal email folders and aligns permissions with ${link("group-membership-model", "group membership")} instead of sharing one password.`,
    "Admin dashboard table listing contact submissions with status filters",
    "Admins filter contact submissions by date and handled status from the dashboard queue.",
    [
      { type: "h2", text: "Submission path" },
      {
        type: "ol",
        items: [
          "Visitor completes **contact form** island.",
          "API route validates and **inserts row** with timestamp.",
          "Admin views queue under **dashboard admin** section.",
        ],
      },
      { type: "h2", text: "Review habits" },
      {
        type: "ul",
        items: [
          "Mark **handled** to avoid duplicate replies.",
          `Cross-link users to ${link("configuring-temperature-feeds", "feed configuration")} docs when relevant.`,
          `Escalate billing issues to ${link("stripe-csv-subscription", "Stripe subscription")} records.`,
        ],
      },
      { type: "h2", text: "Security" },
      {
        type: "p",
        html: `Rate-limit public POST endpoints at the edge. Admin list routes require admin group—see ${link("admin-dashboard-features", "admin features")} and ${link("env-secrets-cloudflare", "secrets hygiene")}.`,
      },
    ],
  ),
  page(
    "display-preferences-deep-dive",
    "accounts-and-dashboard",
    "Display preferences deep dive",
    "Choose Fahrenheit or Celsius defaults, stat card ordering, and per-feed visibility on the signed-in home experience.",
    "Display prefs persist per account so shared JSON feeds render in your preferred units.",
    `Beyond mapping probe keys to labels, display preferences control which units appear on stat cards, whether humidity shows prominently, and how multiple feeds order on the home page. Preferences live server-side with your account so browsers and devices stay consistent after sign-in.`,
    "Dashboard settings panel toggling units and probe card order",
    "Per-account toggles control temperature units, humidity visibility, and card ordering.",
    [
      { type: "h2", text: "Preference categories" },
      {
        type: "ul",
        items: [
          "**Temperature unit** — °F vs °C default on cards (JSON still carries both).",
          "**Feed ordering** — primary garage first when multiple URLs configured.",
          "**Probe visibility** — hide unused keys from home while keeping history.",
        ],
      },
      { type: "h2", text: "Interaction with mappings" },
      {
        type: "p",
        html: `Labels come from ${link("probe-mapping-labels", "probe mapping")}; prefs control presentation only. Misconfigured keys still hide data—debug with ${link("debugging-stale-readings", "stale reading checklist")}.`,
      },
      { type: "h2", text: "Implementation notes" },
      {
        type: "p",
        html: `SSR reads prefs when rendering ${link("home-page-probe-fetch", "home page fetch")} for signed-in users. Guests see site defaults. Auth required: ${link("configuring-temperature-feeds", "temperature feed settings")} and ${link("accounts-and-dashboard", "accounts overview")}.`,
      },
    ],
  ),
];

if (batch2Pages.length !== 30) {
  throw new Error(`Expected 30 batch2 pages, got ${batch2Pages.length}`);
}

const slugs = new Set(batch2Pages.map((p) => p.slug));
if (slugs.size !== 30) {
  throw new Error("Duplicate batch2 slugs detected");
}
