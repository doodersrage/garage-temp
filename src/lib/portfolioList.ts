import type { PropertySnapshot } from "./crossProperty";
import type { PropertyHealth } from "./portfolioHealth";

export type PortfolioPropertyRow = PropertySnapshot & { health: PropertyHealth };

export const PORTFOLIO_LIST_PAGE_SIZE = 50;

export const PORTFOLIO_STATUS_FILTERS = [
  "at_risk",
  "wet",
  "watch",
  "healthy",
  "offline",
] as const;

export type PortfolioStatusFilter = (typeof PORTFOLIO_STATUS_FILTERS)[number];

export const PORTFOLIO_SORTS = {
  name_asc: "Name A–Z",
  name_desc: "Name Z–A",
  health_asc: "Health (worst first)",
  health_desc: "Health (best first)",
  temp_asc: "Coldest first",
  temp_desc: "Warmest first",
  devices_desc: "Most devices",
  last_reading_desc: "Newest reading",
} as const;

export type PortfolioSortKey = keyof typeof PORTFOLIO_SORTS;

export type PortfolioListQuery = {
  search: string;
  status: PortfolioStatusFilter | "";
  sort: PortfolioSortKey;
};

export function parsePortfolioListQuery(
  searchParams: URLSearchParams,
): PortfolioListQuery {
  const search = searchParams.get("q")?.trim() ?? "";
  const statusRaw = searchParams.get("status")?.trim() ?? "";
  const status = (PORTFOLIO_STATUS_FILTERS as readonly string[]).includes(statusRaw)
    ? (statusRaw as PortfolioStatusFilter)
    : "";
  const sortRaw = searchParams.get("sort")?.trim() ?? "name_asc";
  const sort = Object.prototype.hasOwnProperty.call(PORTFOLIO_SORTS, sortRaw)
    ? (sortRaw as PortfolioSortKey)
    : "name_asc";
  return { search, status, sort };
}

export function portfolioListQueryString(opts: {
  page?: number;
  search?: string;
  status?: string;
  sort?: string;
}): string {
  const params = new URLSearchParams();
  if (opts.page && opts.page > 1) params.set("page", String(opts.page));
  if (opts.search?.trim()) params.set("q", opts.search.trim());
  if (opts.status?.trim()) params.set("status", opts.status.trim());
  if (opts.sort && opts.sort !== "name_asc") params.set("sort", opts.sort);
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

function matchesStatus(
  property: PortfolioPropertyRow,
  status: PortfolioStatusFilter,
): boolean {
  if (status === "wet") return property.floodWet;
  if (status === "at_risk") return property.atRisk;
  return property.health.label === status;
}

export function filterPortfolioProperties(
  properties: PortfolioPropertyRow[],
  query: PortfolioListQuery,
): PortfolioPropertyRow[] {
  const needle = query.search.trim().toLowerCase();
  return properties.filter((property) => {
    if (query.status && !matchesStatus(property, query.status)) return false;
    if (!needle) return true;
    return (
      property.name.toLowerCase().includes(needle) ||
      property.householdId.toLowerCase().includes(needle)
    );
  });
}

function compareNullableNumber(
  a: number | null,
  b: number | null,
  ascending: boolean,
): number {
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  return ascending ? a - b : b - a;
}

export function sortPortfolioProperties(
  properties: PortfolioPropertyRow[],
  sort: PortfolioSortKey,
): PortfolioPropertyRow[] {
  const rows = [...properties];
  rows.sort((a, b) => {
    switch (sort) {
      case "name_desc":
        return b.name.localeCompare(a.name, undefined, { sensitivity: "base" });
      case "health_asc":
        return a.health.score - b.health.score || a.name.localeCompare(b.name);
      case "health_desc":
        return b.health.score - a.health.score || a.name.localeCompare(b.name);
      case "temp_asc":
        return (
          compareNullableNumber(a.minTempF, b.minTempF, true) ||
          a.name.localeCompare(b.name)
        );
      case "temp_desc":
        return (
          compareNullableNumber(a.minTempF, b.minTempF, false) ||
          a.name.localeCompare(b.name)
        );
      case "devices_desc":
        return b.deviceCount - a.deviceCount || a.name.localeCompare(b.name);
      case "last_reading_desc": {
        const aTs = a.lastReadingAt ? Date.parse(a.lastReadingAt) : 0;
        const bTs = b.lastReadingAt ? Date.parse(b.lastReadingAt) : 0;
        return bTs - aTs || a.name.localeCompare(b.name);
      }
      case "name_asc":
      default:
        return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
    }
  });
  return rows;
}

export type PaginatedPortfolioProperties = {
  rows: PortfolioPropertyRow[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
};

export function paginatePortfolioProperties(
  properties: PortfolioPropertyRow[],
  page = 1,
  pageSize = PORTFOLIO_LIST_PAGE_SIZE,
): PaginatedPortfolioProperties {
  const safePage = Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
  const totalCount = properties.length;
  const totalPages = totalCount === 0 ? 0 : Math.ceil(totalCount / pageSize);
  const clampedPage =
    totalPages > 0 ? Math.min(safePage, totalPages) : 1;
  const start = (clampedPage - 1) * pageSize;
  return {
    rows: properties.slice(start, start + pageSize),
    page: clampedPage,
    pageSize,
    totalCount,
    totalPages,
  };
}

export function applyPortfolioListQuery(
  properties: PortfolioPropertyRow[],
  query: PortfolioListQuery,
  page = 1,
  pageSize = PORTFOLIO_LIST_PAGE_SIZE,
): PaginatedPortfolioProperties {
  const filtered = filterPortfolioProperties(properties, query);
  const sorted = sortPortfolioProperties(filtered, query.sort);
  return paginatePortfolioProperties(sorted, page, pageSize);
}
