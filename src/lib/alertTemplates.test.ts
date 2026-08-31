import { describe, expect, it } from "vitest";
import { applyAlertTemplates, interpolateTemplate } from "./alertTemplates";

describe("alert templates", () => {
  it("interpolates variables", () => {
    expect(interpolateTemplate("Hello {{kind}}", { kind: "threshold" })).toBe(
      "Hello threshold",
    );
  });

  it("applies kind-specific templates", () => {
    const result = applyAlertTemplates(
      { title: "Alert", body: "Cold", kind: "threshold" },
      { threshold: { title: "{{kind}}: urgent", body: "{{body}}!" } },
    );
    expect(result.title).toContain("threshold");
    expect(result.body).toBe("Cold!");
  });

  it("applies battery kind template", () => {
    const result = applyAlertTemplates(
      { title: "Battery", body: "Low", kind: "battery" },
      { battery: { title: "{{kind}} alert", body: "{{body}}!" } },
    );
    expect(result.title).toBe("battery alert");
    expect(result.body).toBe("Low!");
  });
});
