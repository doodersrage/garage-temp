import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = join(import.meta.dirname, "..");

function allPageAstroFiles(): string[] {
  return listAstroFiles(join(ROOT, "pages"));
}

function dashboardAstroFiles(): string[] {
  return [
    join(ROOT, "pages/dashboard.astro"),
    ...listAstroFiles(join(ROOT, "pages/dashboard")),
  ];
}

function listAstroFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    const stat = statSync(path);
    if (stat.isDirectory()) {
      out.push(...listAstroFiles(path));
    } else if (entry.endsWith(".astro")) {
      out.push(path);
    }
  }
  return out;
}

function parseAstro(path: string): { frontmatter: string; body: string } | null {
  const text = readFileSync(path, "utf8");
  if (!text.startsWith("---")) return null;
  const end = text.indexOf("---", 3);
  if (end === -1) return null;
  return {
    frontmatter: text.slice(3, end),
    body: text.slice(end + 3),
  };
}

function importedNames(frontmatter: string): Set<string> {
  const names = new Set<string>();
  const importRe = /^import\s+(?:type\s+)?(?:\{([^}]+)\}|(\w+))\s+from/gm;
  for (const match of frontmatter.matchAll(importRe)) {
    if (match[1]) {
      for (const part of match[1].split(",")) {
        const name = part.trim().split(/\s+as\s+/)[0]?.trim();
        if (name) names.add(name);
      }
    }
    if (match[2]) names.add(match[2]);
  }
  return names;
}

function usedComponents(body: string): Set<string> {
  const withoutScripts = body.replace(/<script\b[\s\S]*?<\/script>/gi, "");
  const tags = new Set<string>();
  for (const match of withoutScripts.matchAll(/<([A-Z][A-Za-z0-9_]*)/g)) {
    tags.add(match[1]);
  }
  return tags;
}

const IGNORE_TAGS = new Set([
  "Fragment",
  "LiquidCrystal",
  "ArduinoOTA",
]);

describe("astro import guard", () => {
  const pageFiles = allPageAstroFiles();

  for (const file of pageFiles) {
    const rel = relative(join(ROOT, ".."), file);
    it(`${rel} imports every component it renders`, () => {
      const parsed = parseAstro(file);
      expect(parsed, "expected astro frontmatter").not.toBeNull();
      const imports = importedNames(parsed!.frontmatter);
      const used = [...usedComponents(parsed!.body)].filter((t) => !IGNORE_TAGS.has(t));
      const missing = used.filter((tag) => !imports.has(tag));
      expect(missing, `missing imports in ${rel}`).toEqual([]);
    });
  }
});

describe("dashboard pages import DashboardLayout", () => {
  const dashboardFiles = dashboardAstroFiles();

  for (const file of dashboardFiles) {
    const rel = relative(join(ROOT, ".."), file);
    it(rel, () => {
      const parsed = parseAstro(file);
      expect(parsed).not.toBeNull();
      expect(importedNames(parsed!.frontmatter).has("DashboardLayout")).toBe(true);
    });
  }
});
