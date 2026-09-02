import { describe, expect, it } from "vitest";
import { parseIngestPayload } from "./ingestPayload";
import {
  buildHomeAssistantStatePayload,
  buildSenMLPack,
  isHomeAssistantStatePayload,
  isSenMLPayload,
  parseHomeAssistantPayload,
  parseSenMLPayload,
  parseStandardFeedPayload,
  senmlNameToProbeKey,
} from "./feedFormats";
import { parseTempFeedPayload } from "./tempFeedConfig";

describe("feedFormats SenML", () => {
  it("detects SenML array payloads", () => {
    expect(
      isSenMLPayload([
        { n: "0", u: "Cel", v: 18.5 },
        { n: "0", u: "%RH", v: 42 },
      ]),
    ).toBe(true);
  });

  it("maps SenML temp and humidity to probe keys", () => {
    const { tempProbes, format } = parseSenMLPayload([
      { bn: "thermaltrace/example/", n: "0", u: "Cel", v: 18.5 },
      { n: "0/rh", u: "%RH", v: 42 },
      { n: "door", vb: true },
    ]);
    expect(format).toBe("senml");
    expect(tempProbes["0"]?.c).toBe(18.5);
    expect(tempProbes["0"]?.f).toBeCloseTo(65.3, 1);
    expect(tempProbes["0"]?.h).toBe(42);
  });

  it("extracts probe keys from SenML names", () => {
    expect(senmlNameToProbeKey("probe/0/temp")).toBe("0");
    expect(senmlNameToProbeKey("garage/humidity")).toBe("garage");
  });

  it("builds SenML pack from probes", () => {
    const pack = buildSenMLPack({
      "0": { c: 10, f: 50, h: 40 },
      avg: { c: 10, f: 50, h: 40 },
    });
    expect(pack[0]?.bn).toBe("thermaltrace/example/");
    expect(pack.some((row) => row.u === "%RH")).toBe(true);
  });
});

describe("feedFormats Home Assistant", () => {
  it("detects single REST sensor shape", () => {
    expect(
      isHomeAssistantStatePayload({
        state: "72.5",
        attributes: { unit_of_measurement: "°F" },
      }),
    ).toBe(true);
  });

  it("parses HA state object to temp probe", () => {
    const { tempProbes, format } = parseHomeAssistantPayload({
      state: "72.5",
      attributes: { unit_of_measurement: "°F", friendly_name: "Garage" },
    });
    expect(format).toBe("homeassistant");
    expect(tempProbes.state?.f).toBe(72.5);
  });

  it("parses multi-entity HA object", () => {
    const { tempProbes } = parseHomeAssistantPayload({
      "sensor.garage_temp": {
        state: "65.3",
        attributes: { unit_of_measurement: "°F" },
      },
      "binary_sensor.garage_door": {
        state: "open",
        attributes: {},
      },
    });
    expect(tempProbes.garage_temp?.f).toBe(65.3);
  });

  it("builds HA REST sample from probes", () => {
    const payload = buildHomeAssistantStatePayload({
      "0": { c: 18.5, f: 65.3, h: 42 },
    });
    expect(payload.state).toBe(65.3);
  });
});

describe("ingest + pull integration", () => {
  it("parseIngestPayload falls back to SenML", () => {
    const { tempProbes } = parseIngestPayload([
      { n: "0", u: "Cel", v: 20 },
      { n: "0", u: "%RH", v: 35 },
    ]);
    expect(tempProbes["0"]?.c).toBe(20);
    expect(tempProbes["0"]?.h).toBe(35);
  });

  it("parseIngestPayload keeps native temp when present", () => {
    const { tempProbes } = parseIngestPayload({
      temp: { "0": { c: 10, f: 50, h: 40 } },
    });
    expect(tempProbes["0"]?.f).toBe(50);
  });

  it("parseTempFeedPayload accepts SenML pull feeds", () => {
    const probes = parseTempFeedPayload([
      { n: "0", u: "Cel", v: 18.5 },
      { n: "1", u: "Cel", v: 19 },
      { n: "0", u: "%RH", v: 42 },
      { n: "1", u: "%RH", v: 40 },
    ]);
    expect(probes["0"]?.c).toBe(18.5);
    expect(probes.avg?.c).toBeCloseTo(18.75, 2);
  });

  it("parseTempFeedPayload accepts HA REST pull feeds", () => {
    const probes = parseTempFeedPayload({
      state: "65.3",
      attributes: { unit_of_measurement: "°F" },
    });
    expect(probes.state?.f).toBe(65.3);
  });

  it("parseStandardFeedPayload returns null format for unknown JSON", () => {
    expect(parseStandardFeedPayload({ foo: "bar" }).format).toBeNull();
  });
});
