import { describe, expect, it } from "vitest";
import {
  houseContextToMobilePayload,
  regionalBenchmarkToMobilePayload,
} from "./mobileHouseContext";
import type { HouseContext } from "./houseContext";

describe("mobileHouseContext", () => {
  it("maps house context to mobile payload", () => {
    const context: HouseContext = {
      source: "thermostat",
      ambientTempF: 72,
      metricValue: "72°F",
      metricDetail: "Set to 70°F · Heat",
      referenceLabel: null,
      thermostatSnapshot: {
        provider: "nest",
        ambientTempF: 72,
        heatSetpointF: 70,
        hvacMode: "HEAT",
      },
    };

    expect(houseContextToMobilePayload(context)).toEqual({
      source: "thermostat",
      ambient_temp_f: 72,
      heat_setpoint_f: 70,
      hvac_mode: "HEAT",
      detail: "Set to 70°F · Heat",
      reference_label: null,
    });
  });

  it("maps regional benchmark to mobile payload", () => {
    expect(
      regionalBenchmarkToMobilePayload({
        cityLabel: "Austin",
        yourTempF: 28,
        cityAvgTempF: 32,
        deltaF: -4,
        message: "Your coldest probe is 4°F below the regional average.",
      }),
    ).toEqual({
      city_label: "Austin",
      your_temp_f: 28,
      city_avg_temp_f: 32,
      delta_f: -4,
      message: "Your coldest probe is 4°F below the regional average.",
    });
  });
});
