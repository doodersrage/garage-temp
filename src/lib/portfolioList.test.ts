import { describe, expect, it } from "vitest";
import type { PortfolioPropertyRow } from "./portfolioList";
import {
  applyPortfolioListQuery,
  filterPortfolioProperties,
  parsePortfolioListQuery,
  portfolioListQueryString,
  sortPortfolioProperties,
} from "./portfolioList";

function row(
  partial: Partial<PortfolioPropertyRow> & Pick<PortfolioPropertyRow, "name" | "householdId">,
): PortfolioPropertyRow {
  return {
    role: "owner",
    minTempF: 45,
    freezeThresholdF: 34,
    atRisk: false,
    floodWet: false,
    lastReadingAt: "2026-01-15T12:00:00.000Z",
    deviceCount: 1,
    health: { score: 95, label: "healthy", detail: "ok" },
    ...partial,
  };
}

describe("parsePortfolioListQuery", () => {
  it("defaults to name A–Z with no filters", () => {
    expect(parsePortfolioListQuery(new URLSearchParams())).toEqual({
      search: "",
      status: "",
      sort: "name_asc",
    });
  });

  it("accepts search, status, and sort", () => {
    const params = new URLSearchParams({
      q: "  Cabin  ",
      status: "at_risk",
      sort: "temp_asc",
    });
    expect(parsePortfolioListQuery(params)).toEqual({
      search: "Cabin",
      status: "at_risk",
      sort: "temp_asc",
    });
  });

  it("ignores unknown status and sort", () => {
    expect(
      parsePortfolioListQuery(new URLSearchParams({ status: "broken", sort: "foo" })),
    ).toEqual({
      search: "",
      status: "",
      sort: "name_asc",
    });
  });
});

describe("portfolioListQueryString", () => {
  it("omits defaults", () => {
    expect(
      portfolioListQueryString({
        page: 1,
        search: "",
        status: "",
        sort: "name_asc",
      }),
    ).toBe("");
  });

  it("keeps page, search, status, and non-default sort", () => {
    expect(
      portfolioListQueryString({
        page: 2,
        search: "cabin",
        status: "wet",
        sort: "health_asc",
      }),
    ).toBe("?page=2&q=cabin&status=wet&sort=health_asc");
  });
});

describe("filter and sort portfolio properties", () => {
  const properties = [
    row({
      householdId: "h1",
      name: "Alpha Garage",
      minTempF: 30,
      atRisk: true,
      health: { score: 25, label: "at_risk", detail: "cold" },
    }),
    row({
      householdId: "h2",
      name: "Beta Cabin",
      floodWet: true,
      atRisk: true,
      deviceCount: 3,
      health: { score: 20, label: "at_risk", detail: "wet" },
    }),
    row({
      householdId: "h3",
      name: "Charlie Shop",
      minTempF: 50,
      health: { score: 95, label: "healthy", detail: "ok" },
    }),
    row({
      householdId: "h4",
      name: "Delta Barn",
      deviceCount: 0,
      lastReadingAt: null,
      minTempF: null,
      health: { score: 20, label: "offline", detail: "no devices" },
    }),
  ];

  it("filters by name and household id", () => {
    expect(
      filterPortfolioProperties(properties, {
        search: "cabin",
        status: "",
        sort: "name_asc",
      }).map((p) => p.name),
    ).toEqual(["Beta Cabin"]);
    expect(
      filterPortfolioProperties(properties, {
        search: "h4",
        status: "",
        sort: "name_asc",
      }).map((p) => p.householdId),
    ).toEqual(["h4"]);
  });

  it("filters by status", () => {
    expect(
      filterPortfolioProperties(properties, {
        search: "",
        status: "wet",
        sort: "name_asc",
      }).map((p) => p.name),
    ).toEqual(["Beta Cabin"]);
    expect(
      filterPortfolioProperties(properties, {
        search: "",
        status: "offline",
        sort: "name_asc",
      }).map((p) => p.name),
    ).toEqual(["Delta Barn"]);
  });

  it("sorts by coldest and by name", () => {
    expect(
      sortPortfolioProperties(properties, "temp_asc").map((p) => p.name),
    ).toEqual(["Alpha Garage", "Beta Cabin", "Charlie Shop", "Delta Barn"]);
    expect(
      sortPortfolioProperties(properties, "name_asc").map((p) => p.name),
    ).toEqual(["Alpha Garage", "Beta Cabin", "Charlie Shop", "Delta Barn"]);
  });

  it("paginates after filter and sort", () => {
    const page = applyPortfolioListQuery(
      properties,
      { search: "", status: "", sort: "name_asc" },
      1,
      2,
    );
    expect(page.totalCount).toBe(4);
    expect(page.totalPages).toBe(2);
    expect(page.rows.map((p) => p.name)).toEqual(["Alpha Garage", "Beta Cabin"]);
  });
});
