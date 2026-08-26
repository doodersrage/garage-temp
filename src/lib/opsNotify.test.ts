import { describe, expect, it } from "vitest";
import { formatJobFailureBody } from "./opsNotify";

describe("formatJobFailureBody", () => {
  it("includes job name, message, and truncated errors", () => {
    const body = formatJobFailureBody("collect-history", {
      message: "boom",
      errors: ["user-1: fail", "user-2: fail"],
      householdsProcessed: 1,
    });

    expect(body).toContain("Job: collect-history");
    expect(body).toContain("Message: boom");
    expect(body).toContain("- user-1: fail");
    expect(body).toContain("Details:");
  });
});
