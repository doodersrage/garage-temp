import { useMemo, useState } from "preact/hooks";
import type { AboutPage } from "../lib/aboutPages";

interface Props {
  pages: AboutPage[];
}

export default function AboutSearch({ pages }: Props) {
  const [query, setQuery] = useState("");

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];

    return pages
      .filter(
        (page) =>
          page.title.toLowerCase().includes(q) ||
          page.description.toLowerCase().includes(q) ||
          page.summary.toLowerCase().includes(q),
      )
      .slice(0, 12);
  }, [pages, query]);

  return (
    <div class="about-search">
      <label class="form-label" for="about-search-input">
        Search guides
      </label>
      <input
        id="about-search-input"
        class="form-input"
        type="search"
        placeholder="Probe wiring, history, Astro, alerts…"
        value={query}
        onInput={(e) => setQuery((e.target as HTMLInputElement).value)}
      />
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
