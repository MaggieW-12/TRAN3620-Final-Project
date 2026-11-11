(function () {
  "use strict";

  const STRATEGIES = [
    "direct-retention",
    "functional-equivalence",
    "explicitation",
    "compression-neutralization",
  ];
  const CUES = ["joke", "laughter", "funny", "play_signal"];
  const PAGE_SIZE = 25;
  const STRATEGY_COLORS = {
    "direct-retention": "#23766c",
    "functional-equivalence": "#355e84",
    explicitation: "#c58a18",
    "compression-neutralization": "#ef4d2f",
  };
  const CUE_COLORS = {
    joke: "#ef4d2f",
    laughter: "#e9b949",
    funny: "#355e84",
    play_signal: "#23766c",
  };

  const state = {
    q: "",
    category: "",
    cue: "",
    checked: false,
    heatMode: "count",
    networkLimit: 24,
    networkWeight: 1,
    sortKey: "sample_rank",
    sortDir: "asc",
    page: 1,
  };

  let payload;
  let entries = [];
  let filtered = [];
  let searchTimer;
  let modal = null;

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const t = (key) => window.humorI18n.t(key);
  const categoryLabel = (key) => window.humorI18n.categoryLabel(key);
  const cueLabel = (key) => window.humorI18n.cueLabel(key);

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function escapeRegex(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  function markTerm(text) {
    const safe = escapeHtml(text);
    const query = state.q.trim();
    if (!query) return safe;
    try {
      return safe.replace(
        new RegExp(`(${escapeRegex(escapeHtml(query))})`, "gi"),
        "<mark>$1</mark>"
      );
    } catch {
      return safe;
    }
  }

  function hydrateStateFromUrl() {
    const params = new URLSearchParams(window.location.search);
    state.q = params.get("q") || "";
    state.category = STRATEGIES.includes(params.get("cat"))
      ? params.get("cat")
      : "";
    state.cue = CUES.includes(params.get("cue")) ? params.get("cue") : "";
    state.checked = params.get("checked") === "1";
    state.networkLimit = Number(params.get("network")) || 24;
    state.networkWeight = Number(params.get("weight")) || 1;
    state.heatMode = params.get("mode") === "row" ? "row" : "count";

    $("#search").value = state.q;
    $("#category").value = state.category;
    $("#cue").value = state.cue;
    $("#checked-only").checked = state.checked;
    $("#network-limit").value = state.networkLimit;
    $("#network-weight").value = state.networkWeight;
    updateNetworkOutputs();
    updateHeatButtons();
  }

  function syncUrl() {
    const url = new URL(window.location.href);
    const values = {
      q: state.q,
      cat: state.category,
      cue: state.cue,
      checked: state.checked ? "1" : "",
      mode: state.heatMode === "row" ? "row" : "",
      network: state.networkLimit === 24 ? "" : String(state.networkLimit),
      weight: state.networkWeight === 1 ? "" : String(state.networkWeight),
    };
    Object.entries(values).forEach(([key, value]) => {
      if (value) url.searchParams.set(key, value);
      else url.searchParams.delete(key);
    });
    window.history.replaceState({}, "", url);
  }

  function setState(patch, options = {}) {
    const pageChanged = !("page" in patch);
    Object.assign(state, patch);
    if (pageChanged) state.page = 1;
    $("#search").value = state.q;
    $("#category").value = state.category;
    $("#cue").value = state.cue;
    $("#checked-only").checked = state.checked;
    $("#network-limit").value = state.networkLimit;
    $("#network-weight").value = state.networkWeight;
    updateNetworkOutputs();
    syncUrl();
    applyFilters(options);
  }

  function entryMatches(entry) {
    if (state.category && entry.category !== state.category) return false;
    if (state.cue && entry.humor_cue !== state.cue) return false;
    if (state.checked && entry.human_checked !== "yes") return false;
    if (!state.q) return true;
    const haystack = [
      entry.id,
      entry.source_text,
      entry.target_text,
      entry.category,
      entry.key_term,
      entry.humor_cue,
      entry.target_cue,
      categoryLabel(entry.category),
      cueLabel(entry.humor_cue),
      cueLabel(entry.target_cue),
      entry.notes,
    ]
      .join(" ")
      .toLocaleLowerCase();
    return haystack.includes(state.q.toLocaleLowerCase());
  }

  function applyFilters() {
    filtered = entries.filter(entryMatches);
    state.page = Math.min(
      Math.max(state.page, 1),
      Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
    );
    $("#result-count").textContent = filtered.length;
    renderActiveFilters();
    renderAll();
  }

  function addFilterChip(label, patch) {
    const chip = document.createElement("span");
    chip.className = "filter-chip";
    chip.innerHTML = `${escapeHtml(label)} <button type="button" aria-label="Remove filter">×</button>`;
    chip.querySelector("button").addEventListener("click", () => setState(patch));
    $("#active-filters").append(chip);
  }

  function renderActiveFilters() {
    const container = $("#active-filters");
    container.innerHTML = "";
    if (state.q) addFilterChip(`${t("filterSearch")}: ${state.q}`, { q: "" });
    if (state.category)
      addFilterChip(
        `${t("filterCategoryChip")}: ${categoryLabel(state.category)}`,
        { category: "" }
      );
    if (state.cue)
      addFilterChip(`${t("filterCueChip")}: ${cueLabel(state.cue)}`, {
        cue: "",
      });
    if (state.checked)
      addFilterChip(t("filterCheckedChip"), { checked: false });
  }

  function renderAll() {
    renderSankey();
    renderHeatmap();
    renderNetwork();
    renderTable();
  }

  function chartSize(container) {
    const rect = container.getBoundingClientRect();
    return {
      width: Math.max(rect.width, 280),
      height: Math.max(container.clientHeight || 340, 300),
    };
  }

  function renderSankey() {
    const container = $("#sankey-chart");
    container.innerHTML = "";
    if (!filtered.length) {
      container.innerHTML = `<p class="chart-empty">${t("chartEmpty")}</p>`;
      return;
    }

    const { width, height } = chartSize(container);
    const margin = { top: 16, right: 12, bottom: 12, left: 12 };
    const flowCounts = new Map();
    filtered.forEach((entry) => {
      const key = `${entry.humor_cue}|${entry.category}`;
      flowCounts.set(key, (flowCounts.get(key) || 0) + 1);
    });

    const nodes = [
      ...CUES.map((cue) => ({
        id: `cue:${cue}`,
        name: cueLabel(cue),
        raw: cue,
        type: "cue",
      })),
      ...STRATEGIES.map((strategy) => ({
        id: `strategy:${strategy}`,
        name: categoryLabel(strategy),
        raw: strategy,
        type: "strategy",
      })),
    ];
    const nodeIndex = new Map(nodes.map((node, index) => [node.id, index]));
    const links = [...flowCounts.entries()].map(([key, value]) => {
      const [cue, strategy] = key.split("|");
      return {
        source: nodeIndex.get(`cue:${cue}`),
        target: nodeIndex.get(`strategy:${strategy}`),
        value,
        cue,
        strategy,
      };
    });

    const sankey = d3
      .sankey()
      .nodeId((node) => node.id)
      .nodeWidth(11)
      .nodePadding(17)
      .extent([
        [margin.left, margin.top],
        [width - margin.right, height - margin.bottom],
      ]);
    const graph = sankey({ nodes: nodes.map((n) => ({ ...n })), links });

    const svg = d3
      .select(container)
      .append("svg")
      .attr("width", "100%")
      .attr("height", "100%")
      .attr("viewBox", `0 0 ${width} ${height}`);

    svg
      .append("g")
      .selectAll("path")
      .data(graph.links)
      .join("path")
      .attr("d", d3.sankeyLinkHorizontal())
      .attr("fill", "none")
      .attr("stroke", (d) => {
        const opacity = d.strategy === state.category ? 0.64 : 0.24;
        return d3.color(STRATEGY_COLORS[d.strategy]).copy({ opacity });
      })
      .attr("stroke-width", (d) => Math.max(2, d.width))
      .style("cursor", "pointer")
      .on("click", (_, d) =>
        setState({ category: d.strategy, cue: d.cue })
      )
      .on("mousemove", (event, d) => showTip(event, `${cueLabel(d.cue)} → ${categoryLabel(d.strategy)}: ${d.value}`))
      .on("mouseleave", hideTip)
      .append("title")
      .text((d) => `${cueLabel(d.cue)} → ${categoryLabel(d.strategy)}: ${d.value}`);

    const node = svg
      .append("g")
      .selectAll("g")
      .data(graph.nodes)
      .join("g")
      .style("cursor", "pointer")
      .on("click", (_, d) => {
        if (d.type === "cue") setState({ cue: d.raw });
        else setState({ category: d.raw });
      })
      .on("mousemove", (event, d) => {
        const value = d3.sum(d.sourceLinks, (link) => link.value);
        showTip(event, `${d.name}: ${value}`);
      })
      .on("mouseleave", hideTip);

    node
      .append("rect")
      .attr("x", (d) => d.x0)
      .attr("y", (d) => d.y0)
      .attr("height", (d) => Math.max(8, d.y1 - d.y0))
      .attr("width", (d) => d.x1 - d.x0)
      .attr("rx", 2)
      .attr("fill", (d) =>
        d.type === "cue" ? CUE_COLORS[d.raw] : STRATEGY_COLORS[d.raw]
      );

    node
      .append("text")
      .attr("x", (d) => (d.type === "cue" ? d.x1 + 10 : d.x0 - 10))
      .attr("y", (d) => (d.y0 + d.y1) / 2)
      .attr("dy", "0.35em")
      .attr("text-anchor", (d) => (d.type === "cue" ? "start" : "end"))
      .attr("font-family", "var(--mono)")
      .attr("font-size", width < 430 ? 9 : 10)
      .attr("fill", "#171512")
      .text((d) => truncate(d.name, width < 430 ? 18 : 28));
  }

  function renderHeatmap() {
    const container = $("#heatmap-chart");
    container.innerHTML = "";
    if (!filtered.length) {
      container.innerHTML = `<p class="chart-empty">${t("chartEmpty")}</p>`;
      return;
    }

    const { width } = chartSize(container);
    const margin = {
      top: 24,
      right: width < 430 ? 8 : 18,
      bottom: 72,
      left: width < 430 ? 90 : 118,
    };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = 248;
    const height = innerHeight + margin.top + margin.bottom;
    const cellWidth = innerWidth / STRATEGIES.length;
    const cellHeight = innerHeight / CUES.length;
    const counts = new Map();
    CUES.forEach((cue) =>
      STRATEGIES.forEach((strategy) =>
        counts.set(`${cue}|${strategy}`, 0)
      )
    );
    filtered.forEach((entry) => {
      const key = `${entry.humor_cue}|${entry.category}`;
      if (counts.has(key)) counts.set(key, counts.get(key) + 1);
    });
    const max = d3.max([...counts.values()]) || 1;
    const rowTotals = new Map(
      CUES.map((cue) => [
        cue,
        d3.sum(STRATEGIES, (strategy) => counts.get(`${cue}|${strategy}`)),
      ])
    );

    const svg = d3
      .select(container)
      .append("svg")
      .attr("width", "100%")
      .attr("height", "100%")
      .attr("viewBox", `0 0 ${width} ${height}`);
    const g = svg
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    CUES.forEach((cue, row) => {
      STRATEGIES.forEach((strategy, col) => {
        const value = counts.get(`${cue}|${strategy}`);
        const rowValue = rowTotals.get(cue) || 1;
        const shown =
          state.heatMode === "row"
            ? `${Math.round((value / rowValue) * 100)}%`
            : value;
        const ratio =
          state.heatMode === "row" ? value / rowValue : value / max;
        const selected =
          (!state.cue || state.cue === cue) &&
          (!state.category || state.category === strategy);
        const cell = g
          .append("g")
          .style("cursor", "pointer")
          .style("opacity", selected ? 1 : 0.38)
          .on("click", () => setState({ cue, category: strategy }))
          .on("mousemove", (event) =>
            showTip(
              event,
              `${cueLabel(cue)} × ${categoryLabel(strategy)}: ${value}`
            )
          )
          .on("mouseleave", hideTip);

        cell
          .append("rect")
          .attr("x", col * cellWidth + 2)
          .attr("y", row * cellHeight + 2)
          .attr("width", cellWidth - 4)
          .attr("height", cellHeight - 4)
          .attr("rx", 2)
          .attr(
            "fill",
            d3
              .scaleLinear()
              .domain([0, 1])
              .range(["#f4ead8", "#d83c21"])
              .clamp(true)(ratio)
          );

        cell
          .append("text")
          .attr("x", col * cellWidth + cellWidth / 2)
          .attr("y", row * cellHeight + cellHeight / 2)
          .attr("text-anchor", "middle")
          .attr("dominant-baseline", "middle")
          .attr("font-family", "var(--mono)")
          .attr("font-size", 12)
          .attr("font-weight", 500)
          .attr("fill", ratio > 0.58 ? "#fffaf0" : "#171512")
          .text(shown);
      });

      g
        .append("text")
        .attr("x", -12)
        .attr("y", row * cellHeight + cellHeight / 2)
        .attr("text-anchor", "end")
        .attr("dominant-baseline", "middle")
        .attr("font-family", "var(--mono)")
        .attr("font-size", 9)
        .attr("fill", "#555046")
        .style("cursor", "pointer")
        .on("click", () => setState({ cue }))
        .text(truncate(cueLabel(cue), width < 430 ? 10 : 16));
    });

    STRATEGIES.forEach((strategy, col) => {
      g
        .append("text")
        .attr(
          "transform",
          `translate(${col * cellWidth + cellWidth / 2},${innerHeight + 13}) rotate(-42)`
        )
        .attr("text-anchor", "end")
        .attr("font-family", "var(--mono)")
        .attr("font-size", 8)
        .attr("fill", "#555046")
        .style("cursor", "pointer")
        .on("click", () => setState({ category: strategy }))
        .text(truncate(categoryLabel(strategy), 22));
    });
  }

  function networkData() {
    const pairCounts = new Map();
    filtered.forEach((entry) => {
      if (!entry.target_cue || entry.target_cue === "none") return;
      const key = `${entry.humor_cue}|${entry.target_cue}`;
      pairCounts.set(key, (pairCounts.get(key) || 0) + 1);
    });
    const links = [...pairCounts.entries()]
      .map(([key, value]) => {
        const [sourceCue, targetCue] = key.split("|");
        return { sourceCue, targetCue, value };
      })
      .filter((link) => link.value >= state.networkWeight)
      .sort((a, b) => b.value - a.value)
      .slice(0, state.networkLimit);

    const nodeMap = new Map();
    links.forEach((link) => {
      const source = `en:${link.sourceCue}`;
      const target = `zh:${link.targetCue}`;
      if (!nodeMap.has(source))
        nodeMap.set(source, {
          id: source,
          type: "en",
          raw: link.sourceCue,
          name: cueLabel(link.sourceCue),
        });
      if (!nodeMap.has(target))
        nodeMap.set(target, {
          id: target,
          type: "zh",
          raw: link.targetCue,
          name: cueLabel(link.targetCue),
        });
      link.source = source;
      link.target = target;
    });
    return { nodes: [...nodeMap.values()], links };
  }

  function renderNetwork() {
    const container = $("#network-chart");
    container.innerHTML = "";
    const { nodes, links } = networkData();
    if (!nodes.length) {
      container.innerHTML = `<p class="chart-empty">${t("chartEmpty")}</p>`;
      return;
    }

    const width = Math.max(container.getBoundingClientRect().width, 280);
    const height = Math.max(container.clientHeight || 480, 400);
    const maxWeight = d3.max(links, (link) => link.value) || 1;
    const svg = d3
      .select(container)
      .append("svg")
      .attr("width", "100%")
      .attr("height", "100%")
      .attr("viewBox", `0 0 ${width} ${height}`);
    const viewport = svg.append("g");

    svg.call(
      d3
        .zoom()
        .scaleExtent([0.45, 3])
        .on("zoom", (event) => viewport.attr("transform", event.transform))
    );

    const link = viewport
      .append("g")
      .attr("stroke", "#e9b949")
      .attr("stroke-opacity", 0.28)
      .selectAll("line")
      .data(links)
      .join("line")
      .attr("stroke-width", (d) => 0.7 + (d.value / maxWeight) * 5)
      .on("mousemove", (event, d) =>
        showTip(
          event,
          `${cueLabel(d.sourceCue)} → ${cueLabel(d.targetCue)}: ${d.value}`
        )
      )
      .on("mouseleave", hideTip);

    link
      .append("title")
      .text(
        (d) =>
          `${cueLabel(d.sourceCue)} → ${cueLabel(d.targetCue)}: ${d.value}`
      );

    const node = viewport
      .append("g")
      .selectAll("g")
      .data(nodes)
      .join("g")
      .style("cursor", "pointer")
      .on("click", (event, d) => {
        event.stopPropagation();
        setState({ q: d.name });
      })
      .on("mousemove", (event, d) => showTip(event, d.name))
      .on("mouseleave", hideTip);

    node
      .append("circle")
      .attr("r", (d) => (d.type === "en" ? 10 : 8))
      .attr("fill", (d) =>
        d.type === "en" ? "#ef4d2f" : CUE_COLORS[d.raw] || "#e9b949"
      )
      .attr("stroke", "#fffaf0")
      .attr("stroke-width", 1.5);

    node
      .append("text")
      .attr("x", (d) => (d.type === "en" ? 15 : -13))
      .attr("y", 1)
      .attr("dy", "0.35em")
      .attr("text-anchor", (d) => (d.type === "en" ? "start" : "end"))
      .attr("font-family", "var(--mono)")
      .attr("font-size", 10)
      .attr("fill", "#fffaf0")
      .text((d) => d.name);

    const simulation = d3
      .forceSimulation(nodes)
      .force(
        "link",
        d3
          .forceLink(links)
          .id((d) => d.id)
          .distance((d) => 120 - d.value * 1.5)
          .strength(0.45)
      )
      .force("charge", d3.forceManyBody().strength(-220))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collision", d3.forceCollide().radius(40))
      .on("tick", () => {
        link
          .attr("x1", (d) => d.source.x)
          .attr("y1", (d) => d.source.y)
          .attr("x2", (d) => d.target.x)
          .attr("y2", (d) => d.target.y);
        node.attr("transform", (d) => `translate(${d.x},${d.y})`);
      });

    node.call(
      d3
        .drag()
        .on("start", (event, d) => {
          if (!event.active) simulation.alphaTarget(0.25).restart();
          d.fx = d.x;
          d.fy = d.y;
        })
        .on("drag", (event, d) => {
          d.fx = event.x;
          d.fy = event.y;
        })
        .on("end", (event, d) => {
          if (!event.active) simulation.alphaTarget(0);
          d.fx = null;
          d.fy = null;
        })
    );
  }

  function sortedEntries() {
    const sorted = [...filtered];
    const direction = state.sortDir === "asc" ? 1 : -1;
    sorted.sort((a, b) =>
      String(a[state.sortKey] ?? "").localeCompare(
        String(b[state.sortKey] ?? ""),
        undefined,
        { numeric: true }
      ) * direction
    );
    return sorted;
  }

  function renderTable() {
    const body = $("#corpus-body");
    const sorted = sortedEntries();
    const pages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
    state.page = Math.min(state.page, pages);
    const start = (state.page - 1) * PAGE_SIZE;
    const pageRows = sorted.slice(start, start + PAGE_SIZE);
    body.innerHTML = "";

    pageRows.forEach((entry) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>
          <span class="source-line">${markTerm(entry.source_text)}</span>
          <button class="term-chip" type="button" data-term="${escapeHtml(entry.key_term)}">${escapeHtml(cueLabel(entry.humor_cue))}</button>
          <span class="entry-id">${escapeHtml(entry.id)}</span>
        </td>
        <td>
          <span class="target-line">${markTerm(entry.target_text)}</span>
          ${
            entry.target_cue !== "none"
              ? `<button class="term-chip" type="button" data-term="${escapeHtml(entry.target_cue)}">${escapeHtml(cueLabel(entry.target_cue))}</button>`
              : ""
          }
        </td>
        <td>
          <span class="category-badge" data-category="${escapeHtml(entry.category)}">${escapeHtml(categoryLabel(entry.category))}</span>
        </td>
        <td>
          <span class="check-badge ${entry.human_checked === "yes" ? "is-checked" : ""}">
            ${entry.human_checked === "yes" ? t("checkedYes") : t("checkedNo")}
          </span>
        </td>
        <td>
          <a class="trace-link" href="${escapeHtml(payload.metadata.source_url)}" target="_blank" rel="noreferrer" title="${escapeHtml(entry.source)}">
            ${t("traceLine")} ${escapeHtml(entry.line_no)}
            <span aria-hidden="true">↗</span>
          </a>
        </td>
      `;
      body.append(tr);
    });

    $$(".term-chip", body).forEach((button) => {
      button.addEventListener("click", () =>
        setState({ q: cueLabel(button.dataset.term) })
      );
    });

    $("#empty-state").hidden = sorted.length > 0;
    $(".table-scroll").hidden = sorted.length === 0;
    $("#page-status").textContent = `${state.page} / ${pages}`;
    $("#prev-page").disabled = state.page <= 1;
    $("#next-page").disabled = state.page >= pages;
    $$(".sort-mark").forEach((mark) => {
      mark.textContent = "";
    });
    const sortButton = $(`[data-sort="${state.sortKey}"]`);
    if (sortButton) {
      $(".sort-mark", sortButton).textContent =
        state.sortDir === "asc" ? "↑" : "↓";
      sortButton.setAttribute(
        "aria-label",
        state.sortDir === "asc" ? t("sortAscending") : t("sortDescending")
      );
    }
  }

  function truncate(value, length) {
    return value.length > length ? `${value.slice(0, length - 1)}…` : value;
  }

  function showTip(event, text) {
    if (!modal) {
      modal = document.createElement("div");
      modal.className = "chart-tooltip";
      document.body.append(modal);
    }
    modal.textContent = text;
    modal.style.display = "block";
    modal.style.left = `${Math.min(window.innerWidth - 180, event.clientX + 14)}px`;
    modal.style.top = `${Math.max(12, event.clientY - 34)}px`;
  }

  function hideTip() {
    if (modal) modal.style.display = "none";
  }

  function updateNetworkOutputs() {
    $("#network-limit-value").textContent = state.networkLimit;
    $("#network-weight-value").textContent = state.networkWeight;
  }

  function updateHeatButtons() {
    $$("[data-heat-mode]").forEach((button) => {
      button.classList.toggle(
        "is-active",
        button.dataset.heatMode === state.heatMode
      );
    });
  }

  function updateDatasetNumbers() {
    $("[data-dataset-total]").textContent = payload.metadata.selected;
    $("[data-dataset-checked]").textContent = payload.metadata.checked;
  }

  function downloadCsv() {
    const fields = [
      "id",
      "source_text",
      "target_text",
      "source",
      "category",
      "human_checked",
      "unit",
      "key_term",
      "humor_cue",
      "target_cue",
      "genre",
      "year",
      "translator",
      "region",
      "notes",
      "line_no",
      "sample_rank",
    ];
    const csvEscape = (value) =>
      `"${String(value ?? "").replaceAll('"', '""')}"`;
    const lines = [
      fields.join(","),
      ...filtered.map((entry) =>
        fields.map((field) => csvEscape(entry[field])).join(",")
      ),
    ];
    const blob = new Blob(["\ufeff", lines.join("\n")], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "after-the-punchline-filtered.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  function bindEvents() {
    $("#search").addEventListener("input", (event) => {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(
        () => setState({ q: event.target.value.trim() }),
        180
      );
    });
    $("#category").addEventListener("change", (event) =>
      setState({ category: event.target.value })
    );
    $("#cue").addEventListener("change", (event) =>
      setState({ cue: event.target.value })
    );
    $("#checked-only").addEventListener("change", (event) =>
      setState({ checked: event.target.checked })
    );
    $("#reset-filters").addEventListener("click", resetFilters);
    $("#empty-reset").addEventListener("click", resetFilters);
    $("#export-csv").addEventListener("click", downloadCsv);
    $("#prev-page").addEventListener("click", () =>
      setState({ page: Math.max(1, state.page - 1) })
    );
    $("#next-page").addEventListener("click", () =>
      setState({ page: state.page + 1 })
    );
    $$("[data-sort]").forEach((button) => {
      button.addEventListener("click", () => {
        const key = button.dataset.sort;
        const direction =
          state.sortKey === key && state.sortDir === "asc" ? "desc" : "asc";
        setState({ sortKey: key, sortDir: direction });
      });
    });
    $$("[data-heat-mode]").forEach((button) => {
      button.addEventListener("click", () => {
        setState({ heatMode: button.dataset.heatMode });
        updateHeatButtons();
      });
    });
    $("#network-limit").addEventListener("input", (event) => {
      setState({ networkLimit: Number(event.target.value) });
    });
    $("#network-weight").addEventListener("input", (event) => {
      setState({ networkWeight: Number(event.target.value) });
    });
    $("#network-reheat").addEventListener("click", renderNetwork);
    document.addEventListener("keydown", (event) => {
      if (
        event.key === "/" &&
        !["INPUT", "SELECT", "TEXTAREA"].includes(document.activeElement.tagName)
      ) {
        event.preventDefault();
        $("#search").focus();
      }
    });
    document.addEventListener("humorlangchange", () => {
      renderAll();
      renderActiveFilters();
    });
    let resizeTimer;
    window.addEventListener("resize", () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(renderAll, 180);
    });
  }

  function resetFilters() {
    setState({ q: "", category: "", cue: "", checked: false, page: 1 });
  }

  async function init() {
    hydrateStateFromUrl();
    bindEvents();
    try {
      const response = await fetch("site/data/corpus.json");
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      payload = await response.json();
      entries = payload.entries;
      updateDatasetNumbers();
      applyFilters();
    } catch (error) {
      console.error(error);
      $("#result-count").textContent = "0";
      $("#corpus-body").innerHTML = `<tr><td colspan="5">Corpus data could not be loaded. Serve this folder through GitHub Pages or a local web server.</td></tr>`;
    }
  }

  init();
})();
