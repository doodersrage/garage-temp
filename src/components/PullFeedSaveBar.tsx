import { useEffect, useState } from "preact/hooks";

interface Props {
  hasFeeds: boolean;
}

export default function PullFeedSaveBar({ hasFeeds }: Props) {
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    const onError = (event: Event) => {
      const detail = (event as CustomEvent<string>).detail;
      setStatus(detail ?? "Save failed.");
    };
    window.addEventListener("pull-setup:save-error", onError);
    return () => window.removeEventListener("pull-setup:save-error", onError);
  }, []);

  function savePullSetup() {
    setStatus(null);
    const root = document.getElementById("pull-feeds-form");
    const urlInput = root?.querySelector<HTMLInputElement>('input[name^="feed_"][name$="_url"]');
    if (!urlInput?.value.trim()) {
      setStatus("Enter a feed URL first.");
      return;
    }
    window.dispatchEvent(new CustomEvent("pull-setup:save"));
    setStatus("Saving…");
  }

  return (
    <div class="sticky-save-bar rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-muted)] p-3 flex flex-wrap items-center gap-3">
      <button type="button" class="btn-primary" onClick={savePullSetup}>
        Save pull setup
      </button>
      <span class="text-sm text-[var(--color-text-muted)]">
        {hasFeeds
          ? "Feed URL or probe label changes are not saved until you click Save pull setup."
          : "Add a feed URL, then save to auto-import probe keys."}
      </span>
      {status ? <span class="text-sm text-[var(--color-text-muted)]">{status}</span> : null}
    </div>
  );
}
