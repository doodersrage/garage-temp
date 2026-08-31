import { describe, expect, it } from "vitest";
import { flagIngestAbuse } from "./ingestAbuse";

describe("ingest abuse", () => {
  it("flags high error rates", () => {
    const flagged = flagIngestAbuse([
      {
        device_id: "d1",
        day: "2026-01-01",
        success_count: 2,
        error_count: 8,
        device_name: "ESP",
      },
    ]);
    expect(flagged).toHaveLength(1);
    expect(flagged[0]?.errorRate).toBe(0.8);
  });
});
