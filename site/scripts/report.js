(async function () {
  "use strict";

  async function render() {
    const container = document.querySelector("#report-bars");
    if (!container) return;
    try {
      const response = await fetch("site/data/corpus.json");
      const payload = await response.json();
      const counts = new Map();
      payload.entries.forEach((entry) => {
        counts.set(entry.category, (counts.get(entry.category) || 0) + 1);
      });
      const strategies = [
        "direct-retention",
        "functional-equivalence",
        "explicitation",
        "compression-neutralization",
      ];
      const max = Math.max(...counts.values());
      const lang = document.documentElement.dataset.lang || "en";
      container.innerHTML = strategies
        .map((strategy) => {
          const count = counts.get(strategy) || 0;
          const label =
            window.humorI18n?.categoryLabel(strategy) || strategy;
          return `
            <div class="report-bar-row">
              <span>${label}</span>
              <span class="report-bar"><i style="width:${(count / max) * 100}%"></i></span>
              <output>${count}</output>
            </div>
          `;
        })
        .join("");
      container.dataset.lang = lang;
    } catch (error) {
      console.error(error);
      container.textContent =
        "The report chart could not be loaded. Open the site through a web server.";
    }
  }

  document.addEventListener("humorlangchange", render);
  render();
})();
