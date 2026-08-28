import { useMemo, useState } from "preact/hooks";
import type { AboutSearchEntry } from "../lib/aboutSearchIndex";

interface Props {
  pages: AboutSearchEntry[];
  featured?: AboutSearchEntry[];
}

function matchPage(page: AboutSearchEntry, query: string): boolean {
  const q = query.toLowerCase();
  return (
    page.title.toLowerCase().includes(q) ||
    page.description.toLowerCase().includes(q) ||
    page.summary.toLowerCase().includes(q)
  );
}

export default function AboutSearch({ pages, featured = [] }: Props) {
  const [query, setQuery] = useState("");

  const results = useMemo(() => {
    const q = query.trim();
    if (!q) return [];

    return pages.filter((page) => matchPage(page, q)).slice(0, 15);
  }, [pages, query]);

  const showFeatured = !query.trim() && featured.length > 0;

  return (
    <div class="about-search">
      <label class="form-label" for="about-search-input">
        Search guides
      </label>
      <input
        id="about-search-input"
        class="form-input"
        type="search"
        placeholder="Probe wiring, CSV export, ingest API, alerts…"
        value={query}
        onInput={(e) => setQuery((e.target as HTMLInputElement).value)}
      />

      {showFeatured && (
        <div class="about-search-featured">
          <p class="about-search-featured-label">Popular starting points</p>
          <ul class="about-search-results">
            {featured.map((page) => (
              <li key={page.slug}>
                <a class="about-search-result" href={`/about/${page.slug}`}>
                  <strong>{page.title}</strong>
                  <span>{page.summary}</span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}

      {query.trim() && (
        <ul class="about-search-results">
          {results.length === 0 ? (
            <li class="about-search-empty">No guides matched “{query}”.</li>
          ) : (
            results.map((page) => (
              <li key={page.slug}>
                <a class="about-search-result" href={`/about/${page.slug}`}>
                  <strong>{page.title}</strong>
                  <span>{page.summary}</span>
                </a>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
