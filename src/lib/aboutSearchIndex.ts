import type { AboutPage } from "./aboutPages";

/** Slim index for client-side about search (avoids shipping full page metadata). */
export type AboutSearchEntry = {
  slug: string;
  title: string;
  summary: string;
  description: string;
};

export function buildAboutSearchIndex(pages: AboutPage[]): AboutSearchEntry[] {
  return pages.map(({ slug, title, summary, description }) => ({
    slug,
    title,
    summary,
    description,
  }));
}
