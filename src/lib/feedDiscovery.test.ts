import { describe, expect, it } from "vitest";
import {
  discoverFeedProbes,
  mergeDiscoveredProbes,
} from "./feedDiscovery";

describe("discoverFeedProbes", () => {
  it("discovers native temp object probes with default labels", () => {
    const result = discoverFeedProbes({
      temp: {
        "0": { f: 65.3, c: 18.5, h: 42 },
        "1": { f: 66.2, c: 19, h: 40 },
        avg: { f: 65.75, c: 18.75, h: 41 },
      },
    });

    expect(result.format).toBe("native");
    expect(result.probes.map((probe) => probe.key)).toEqual(["0", "1", "avg"]);
    expect(result.probes[0]?.suggestedLabel).toBe("Probe 0");
    expect(result.probes[2]?.visible).toBe(false);
    expect(result.probes[0]?.tempF).toBe(65.3);
  });

  it("uses Home Assistant friendly_name when present", () => {
    const result = discoverFeedProbes({
      state: "65.3",
      attributes: {
        unit_of_measurement: "°F",
        friendly_name: "Garage north wall",
      },
    });

    expect(result.format).toBe("homeassistant");
    expect(result.probes[0]?.key).toBe("state");
    expect(result.probes[0]?.suggestedLabel).toBe("Garage north wall");
  });

  it("discovers SenML probe keys", () => {
    const result = discoverFeedProbes([
      { n: "0", u: "Cel", v: 18.5 },
      { n: "0", u: "%RH", v: 42 },
      { n: "1", u: "Cel", v: 19 },
    ]);

    expect(result.format).toBe("senml");
    expect(result.probes.map((probe) => probe.key)).toContain("0");
    expect(result.probes.map((probe) => probe.key)).toContain("1");
  });
});

describe("mergeDiscoveredProbes", () => {
  it("preserves existing labels when re-discovering the same keys", () => {
    const merged = mergeDiscoveredProbes(
      [
        {
          id: "garage-0",
          feedId: "garage",
          key: "0",
          label: "North wall",
          visible: true,
        },
      ],
      "garage",
      [
        {
          key: "0",
          suggestedLabel: "Probe 0",
          tempF: 65,
          humidity: 40,
          visible: true,
          source: "native",
        },
        {
          key: "1",
          suggestedLabel: "Probe 1",
          tempF: 66,
          humidity: 41,
          visible: true,
          source: "native",
        },
      ],
    );

    expect(merged.find((probe) => probe.key === "0")?.label).toBe("North wall");
    expect(merged.find((probe) => probe.key === "1")?.label).toBe("Probe 1");
  });
});
