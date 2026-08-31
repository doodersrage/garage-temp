import { describe, expect, it } from "vitest";
import { canEditHousehold, canManageHousehold } from "./households";

describe("household roles", () => {
  it("allows owners and members to manage billing/invites/API keys", () => {
    expect(canManageHousehold("owner")).toBe(true);
    expect(canManageHousehold("member")).toBe(true);
    expect(canManageHousehold("viewer")).toBe(false);
    expect(canManageHousehold("property_manager")).toBe(false);
  });

  it("lets property managers edit devices/alerts but not billing", () => {
    expect(canEditHousehold("property_manager")).toBe(true);
    expect(canManageHousehold("property_manager")).toBe(false);
  });
});
