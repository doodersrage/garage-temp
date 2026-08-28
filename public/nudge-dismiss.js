/** Shared dismissible nudge cards (localStorage). Loaded once per page. */
(() => {
  document.querySelectorAll("[data-nudge-key]").forEach((el) => {
    const key = el.getAttribute("data-nudge-key");
    if (key && localStorage.getItem(key) === "1") {
      el.remove();
    }
  });

  document.querySelectorAll("[data-dismiss]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const key = btn.getAttribute("data-dismiss");
      const card = btn.closest("[data-nudge-key]");
      if (key) localStorage.setItem(key, "1");
      card?.remove();
    });
  });
})();
