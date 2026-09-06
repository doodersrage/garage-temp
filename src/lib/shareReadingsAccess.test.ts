import { describe, expect, it } from "vitest";
import { resolveShareReadingsFormat } from "./shareReadingsAccess";

describe("resolveShareReadingsFormat", () => {
  it("defaults live/history scopes to json", () => {
    expect(resolveShareReadingsFormat("live", null)).toEqual({
      ok: true,
      format: "json",
    });
    expect(resolveShareReadingsFormat("history", null)).toEqual({
      ok: true,
      format: "json",
    });
  });

  it("defaults metrics scope to prometheus", () => {
    expect(resolveShareReadingsFormat("metrics", null)).toEqual({
      ok: true,
      format: "prometheus",
    });
  });

  it("denies prometheus/grafana for non-metrics scopes", () => {
    expect(resolveShareReadingsFormat("live", "prometheus")).toEqual({
      ok: false,
      status: 403,
      error: "This share link does not allow metrics formats",
    });
    expect(resolveShareReadingsFormat("history", "grafana")).toEqual({
      ok: false,
      status: 403,
      error: "This share link does not allow metrics formats",
    });
  });

  it("allows prometheus/grafana when scope is metrics", () => {
    expect(resolveShareReadingsFormat("metrics", "prometheus")).toEqual({
      ok: true,
      format: "prometheus",
    });
    expect(resolveShareReadingsFormat("metrics", "grafana")).toEqual({
      ok: true,
      format: "grafana",
    });
  });
});
