import { describe, expect, it } from "vitest";
import {
  managedUserListQueryString,
  parseManagedUserListQuery,
} from "./userManager";

describe("parseManagedUserListQuery", () => {
  it("defaults to newest-first with no filters", () => {
    expect(parseManagedUserListQuery(new URLSearchParams())).toEqual({
      search: "",
      group: "",
      sort: "created_desc",
    });
  });

  it("accepts search, group, and sort", () => {
    const params = new URLSearchParams({
      q: "  ada@example.com  ",
      group: "pro",
      sort: "email_asc",
    });
    expect(parseManagedUserListQuery(params)).toEqual({
      search: "ada@example.com",
      group: "pro",
      sort: "email_asc",
    });
  });

  it("ignores unknown group and sort values", () => {
    const params = new URLSearchParams({
      group: "superuser",
      sort: "last_seen",
    });
    expect(parseManagedUserListQuery(params)).toEqual({
      search: "",
      group: "",
      sort: "created_desc",
    });
  });
});

describe("managedUserListQueryString", () => {
  it("omits default newest-first sort and page 1", () => {
    expect(
      managedUserListQueryString({
        page: 1,
        search: "",
        group: "",
        sort: "created_desc",
      }),
    ).toBe("");
  });

  it("keeps page, search, group, and non-default sort", () => {
    expect(
      managedUserListQueryString({
        page: 3,
        search: "ada",
        group: "admin",
        sort: "email_desc",
      }),
    ).toBe("?page=3&q=ada&group=admin&sort=email_desc");
  });
});
