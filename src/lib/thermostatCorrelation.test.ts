import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
});

describe("fetchNestSnapshot", () => {
  it("converts celsius traits to Fahrenheit", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            devices: [
              {
                traits: {
                  "sdm.devices.traits.Temperature": { ambientTemperatureCelsius: 20 },
                  "sdm.devices.traits.ThermostatTemperatureSetpoint": { heatCelsius: 0 },
                  "sdm.devices.traits.ThermostatMode": { mode: "HEAT" },
                },
              },
            ],
          }),
          { status: 200 },
        ),
      ),
    );
    const { fetchNestSnapshot } = await import("./thermostatCorrelation");
    const snapshot = await fetchNestSnapshot("token");
    expect(snapshot?.ambientTempF).toBeCloseTo(68, 0);
    expect(snapshot?.heatSetpointF).toBe(32);
    expect(snapshot?.hvacMode).toBe("HEAT");
  });

  it("returns null on a non-ok response", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("nope", { status: 401 })));
    const { fetchNestSnapshot } = await import("./thermostatCorrelation");
    expect(await fetchNestSnapshot("token")).toBeNull();
  });
});

describe("fetchEcobeeSnapshot", () => {
  it("converts tenths-of-a-degree readings to whole Fahrenheit", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            thermostatList: [
              {
                runtime: { actualTemperature: 680, desiredHeat: 700 },
                settings: { hvacMode: "heat" },
              },
            ],
          }),
          { status: 200 },
        ),
      ),
    );
    const { fetchEcobeeSnapshot } = await import("./thermostatCorrelation");
    const snapshot = await fetchEcobeeSnapshot("token");
    expect(snapshot?.ambientTempF).toBe(68);
    expect(snapshot?.heatSetpointF).toBe(70);
    expect(snapshot?.hvacMode).toBe("heat");
  });
});

describe("fetchThermostatContext", () => {
  it("returns null without ever calling the provider when there's no access token", async () => {
    vi.doMock("./thermostatOAuth", () => ({
      resolveAccessTokenForHousehold: vi.fn().mockResolvedValue(null),
    }));
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const { fetchThermostatContext } = await import("./thermostatCorrelation");
    const result = await fetchThermostatContext("house-1", "ecobee");
    expect(result).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("buildThermostatAnnotation", () => {
  it("returns null when there's no snapshot", async () => {
    const { buildThermostatAnnotation } = await import("./thermostatCorrelation");
    expect(buildThermostatAnnotation(null)).toBeNull();
  });

  it("describes an actively-heating thermostat", async () => {
    const { buildThermostatAnnotation } = await import("./thermostatCorrelation");
    const text = buildThermostatAnnotation({
      provider: "ecobee",
      ambientTempF: 68,
      heatSetpointF: 70,
      hvacMode: "heat",
    });
    expect(text).toContain("68°F");
    expect(text).toContain("set to 70°F");
    expect(text).toContain("actively heating");
    expect(text).not.toContain("not actively heating");
  });

  it("describes a thermostat that isn't heating", async () => {
    const { buildThermostatAnnotation } = await import("./thermostatCorrelation");
    const text = buildThermostatAnnotation({
      provider: "nest",
      ambientTempF: 65,
      heatSetpointF: null,
      hvacMode: "OFF",
    });
    expect(text).toContain("not actively heating");
  });
});
