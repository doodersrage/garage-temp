import { coreAboutPages, aboutPages, getAboutPage, type AboutPage } from "./aboutPages";

export type AboutTopicSection = {
  core: AboutPage;
  guides: AboutPage[];
};

export type AboutMegaGroup = {
  id: string;
  title: string;
  description: string;
  coreSlugs: string[];
};

/** Featured entry points on the about hub. */
export const featuredAboutSlugs = [
  "cold-snap-playbook",
  "temperature-probe-case-study",
  "probe-demo",
  "ingest-and-webhooks",
  "alert-channel-cookbook",
  "household-sharing-walkthrough",
] as const;

/** Five learning paths on the about hub (every core topic appears once). */
export const aboutMegaGroups: AboutMegaGroup[] = [
  {
    id: "environment",
    title: "Probe environments",
    description: "Probes, placement, and the physics that move readings.",
    coreSlugs: ["temperature-probes", "temperature-changes"],
  },
  {
    id: "history",
    title: "Data & history",
    description: "Saved snapshots, exports, and how readings reach storage.",
    coreSlugs: ["historical-data", "data-flow"],
  },
  {
    id: "hardware",
    title: "Hardware & firmware",
    description: "Arduino sketches, wiring, sensors, and the local LCD.",
    coreSlugs: [
      "arduino-sketches",
      "arduino-circuit-wiring",
      "arduino-pin-wiring",
      "arduino-dht22-lcd",
    ],
  },
  {
    id: "software",
    title: "Backend & website",
    description: "Python relays, Astro on Cloudflare, and stack comparisons.",
    coreSlugs: ["python-feeds", "astro-applications", "nextjs-node-applications"],
  },
  {
    id: "product",
    title: "Dashboard & integrations",
    description: "Accounts, ingest API, alerts, PWA install, and automation.",
    coreSlugs: [
      "accounts-and-dashboard",
      "adding-devices",
      "ingest-and-webhooks",
      "thermostat-oauth",
      "install-pwa",
    ],
  },
];

export function getAboutTopicSections(): AboutTopicSection[] {
  const guidesByParent = new Map<string, AboutPage[]>();

  for (const page of aboutPages) {
    if (!page.parentSlug) continue;
    const list = guidesByParent.get(page.parentSlug) ?? [];
    list.push(page);
    guidesByParent.set(page.parentSlug, list);
  }

  return coreAboutPages.map((core) => ({
    core,
    guides: guidesByParent.get(core.slug) ?? [],
  }));
}

export function getAboutMegaGroupSections(): {
  group: AboutMegaGroup;
  sections: AboutTopicSection[];
  coreCount: number;
  guideCount: number;
}[] {
  const sectionBySlug = new Map(
    getAboutTopicSections().map((section) => [section.core.slug, section]),
  );

  return aboutMegaGroups.map((group) => {
    const sections = group.coreSlugs
      .map((slug) => sectionBySlug.get(slug))
      .filter((section): section is AboutTopicSection => !!section);

    return {
      group,
      sections,
      coreCount: sections.length,
      guideCount: sections.reduce((total, section) => total + section.guides.length, 0),
    };
  });
}

export function getFeaturedAboutPages(): AboutPage[] {
  return featuredAboutSlugs
    .map((slug) => getAboutPage(slug))
    .filter((page): page is AboutPage => !!page);
}

export function getTopicContext(slug: string): {
  core: AboutPage;
  guides: AboutPage[];
  current: AboutPage;
} | null {
  const current = getAboutPage(slug);
  if (!current) return null;

  const coreSlug = current.parentSlug ?? current.slug;
  const core = getAboutPage(coreSlug);
  if (!core) return null;

  const section = getAboutTopicSections().find((s) => s.core.slug === coreSlug);
  if (!section) return null;

  return { core, guides: section.guides, current };
}

export { coreAboutPages };
