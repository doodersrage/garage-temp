import { describe, expect, it } from "vitest";
import { canManageHousehold } from "./households";

describe("household roles", () => {
  it("allows owners and members to manage billing/invites/API keys", () => {
    expect(canManageHousehold("owner")).toBe(true);
    expect(canManageHousehold("member")).toBe(true);
    expect(canManageHousehold("viewer")).toBe(false);
  });
});
