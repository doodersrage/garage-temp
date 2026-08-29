import { describe, expect, it } from "vitest";
import { isStaleFcmError } from "./fcm";

describe("isStaleFcmError", () => {
  it("treats NOT_FOUND and UNREGISTERED as stale", () => {
    expect(isStaleFcmError(404)).toBe(true);
    expect(isStaleFcmError(400, "UNREGISTERED")).toBe(true);
    expect(isStaleFcmError(400, "NOT_FOUND")).toBe(true);
  });

  it("keeps other errors", () => {
    expect(isStaleFcmError(500)).toBe(false);
    expect(isStaleFcmError(403, "PERMISSION_DENIED")).toBe(false);
  });
});
