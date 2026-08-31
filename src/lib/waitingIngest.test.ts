import { describe, expect, it } from "vitest";
import {
  buildWaitingIngestCurl,
  buildWaitingIngestPayload,
} from "./waitingIngest";

describe("waitingIngest", () => {
  it("builds a sample payload from mapped sensor keys", () => {
    expect(
      buildWaitingIngestPayload([
        { key: "temp1", kind: "temperature" },
        { key: "0", kind: "humidity" },
        { key: "door1", kind: "door" },
      ]),
    ).toEqual({
      temp1: 42.5,
      "0": 38,
      door1: true,
    });
  });

  it("builds a curl example with placeholder key", () => {
    const curl = buildWaitingIngestCurl("https://thermaltrace.dev", [
      { key: "temp1", kind: "temperature" },
    ]);
    expect(curl).toContain("/api/ingest/YOUR_KEY");
    expect(curl).toContain('"temp1":42.5');
  });
});
