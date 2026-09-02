import { describe, expect, it } from "vitest";
import {
  buildDemoFeedJson,
  buildDemoIngestPayload,
  buildDemoSpaceStatus,
  coldestProbeTempF,
  computeDemoProbes,
  defaultDemoControls,
  DEMO_PRESETS,
} from "./probeDemo";

describe("probeDemo", () => {
  it("labels probes for the selected space", () => {
    const garage = computeDemoProbes({ ...defaultDemoControls, space: "garage" });
    expect(garage.map((p) => p.label)).toEqual(["North wall", "Door zone", "Workbench"]);

    const crawl = computeDemoProbes({ ...defaultDemoControls, space: "crawlspace" });
    expect(crawl.map((p) => p.ingestKey)).toEqual(["foundation", "access", "pipe_run"]);
  });

  it("cools the door zone when the door is open", () => {
    const closed = computeDemoProbes({
      ...defaultDemoControls,
      outdoorF: 20,
      doorOpen: false,
    });
    const open = computeDemoProbes({
      ...defaultDemoControls,
      outdoorF: 20,
      doorOpen: true,
    });
    const closedDoor = closed.find((p) => p.key === "1")!.reading.f;
    const openDoor = open.find((p) => p.key === "1")!.reading.f;
    expect(openDoor).toBeLessThan(closedDoor);
  });

  it("builds pull and push JSON shapes", () => {
    const probes = computeDemoProbes(defaultDemoControls);
    const avg = {
      f: 40,
      c: 4.4,
      h: 50,
    };
    const pull = JSON.parse(buildDemoFeedJson(probes, avg));
    expect(pull.temp.avg.f).toBe(40);
    expect(pull.temp["0"]).toBeTruthy();

    const push = buildDemoIngestPayload(probes, avg);
    expect(push.avg).toBe(40);
    expect(typeof push.north_wall).toBe("number");
    expect(typeof push.north_wall_h).toBe("number");
  });

  it("flags freeze risk via space status", () => {
    const controls = {
      ...defaultDemoControls,
      ...DEMO_PRESETS.coldSnap.controls,
    };
    const probes = computeDemoProbes(controls);
    const coldest = coldestProbeTempF(probes);
    expect(coldest).not.toBeNull();
    expect(coldest!).toBeLessThanOrEqual(controls.freezeThresholdF);

    const status = buildDemoSpaceStatus(probes, controls);
    expect(status.level).toBe("risk");
  });
});
