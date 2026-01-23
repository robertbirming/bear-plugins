(function () {
  "use strict";

  /*
   * Bearming archive toolkit
   * Version 1.0.0 | 2026-01-23
   * robertbirming.com
   *
   * Features:
   * - Groups posts by month
   * - Year filter + search
   * - Pagination
   * - URL state: ?y=2024&s=bear&p=2
   * - Moves tag filter block (#tags) to the bottom when present
   */

  const PARAM_YEAR = "y";
  const PARAM_SEARCH = "s";
  const PARAM_PAGE = "p";

  const POSTS_PER_PAGE = 25;
  const SEARCH_DEBOUNCE_MS = 140;

  function onReady(fn) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", fn, { once: true });
    } else {
      fn();
    }
  }

  function escapeRegExp(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  // Safari-safe parsing for YYYY-MM-DD (avoid timezone drift)
  function parseDatetime(dt) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dt);
    if (m) return new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
    return new Date(dt);
  }

  function readParams() {
    return new URLSearchParams(location.search);
  }

  function writeParams(p) {
    const url = new URL(location.href);
    url.search = p.toString();
    history.replaceState(null, "", url.toString());
  }

  function clamp(n, min, max) {
    return Math.min(max, Math.max(min, n));
  }

  onReady(function () {
    if (!document.body.classList.contains("blog")) return;

    const main = document.querySelector("main");
    if (!main) return;

    const sourceList =
      main.querySelector("ul.embedded.blog-posts") ||
      main.querySelector("ul.blog-posts");

    if (!sourceList) return;

    // Prevent double injection
    if (main.querySelector(".bearming-archive")) return;

    const items = Array.from(sourceList.querySelectorAll("li"));
    if (!items.length) return;

    // Capture tag filter block (only exists on /blog/?q=...)
    const tagsEl = main.querySelector("#tags");
    const tagsBlock = tagsEl ? tagsEl.closest("small") : null;

    const groups = Object.create(null);
    const years = Object.create(null);
    const allItems = [];

    for (let i = 0; i < items.length; i++) {
      const li = items[i];
      const time = li.querySelector("time[datetime]");
      if (!time) continue;

      const dt = time.getAttribute("datetime");
      if (!dt) continue;

      const date = parseDatetime(dt);
      if (Number.isNaN(date.getTime())) continue;

      const year = String(date.getUTCFullYear ? date.getUTCFullYear() : date.getFullYear());
      const month = String((date.getUTCMonth ? date.getUTCMonth() : date.getMonth()) + 1).padStart(2, "0");
      const monthKey = year + "-" + month;

      const label = date.toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
        timeZone: "UTC",
      });

      li.dataset.archiveYear = year;
      years[year] = (years[year] || 0) + 1;

      if (!groups[monthKey]) {
        groups[monthKey] = { label: label, date: date, items: [] };
      }
      groups[monthKey].items.push(li);
    }

    const sortedMonths = Object.keys(groups).sort(function (a, b) {
      return groups[b].date - groups[a].date;
    });

    // Remove original list
    sourceList.remove();

    const wrapper = document.createElement("div");
    wrapper.className = "bearming-archive";
    wrapper.id = "bearming-archive";
    main.appendChild(wrapper);

    // Controls
    const controls = document.createElement("div");
    controls.className = "bearming-archive-controls";

    const yearSelect = document.createElement("select");
    yearSelect.setAttribute("aria-label", "Filter posts by year");
    yearSelect.setAttribute("aria-controls", wrapper.id);

    const optAll = document.createElement("option");
    optAll.value = "";
    optAll.textContent = "All posts (" + items.length + ")";
    yearSelect.appendChild(optAll);

    Object.keys(years)
      .sort(function (a, b) { return Number(b) - Number(a); })
      .forEach(function (year) {
        const opt = document.createElement("option");
        opt.value = year;
        opt.textContent = year + " (" + years[year] + ")";
        yearSelect.appendChild(opt);
      });

    const searchInput = document.createElement("input");
    searchInput.type = "search";
    searchInput.placeholder = "Search…";
    searchInput.autocomplete = "off";
    searchInput.spellcheck = false;
    searchInput.setAttribute("aria-label", "Search posts");
    searchInput.setAttribute("aria-controls", wrapper.id);

    controls.appendChild(yearSelect);
    controls.appendChild(searchInput);
    wrapper.appendChild(controls);

    // Grouped months
    const monthHeaders = [];
    const monthLists = [];

    for (let i = 0; i < sortedMonths.length; i++) {
      const key = sortedMonths[i];
      const g = groups[key];

      const h3 = document.createElement("h3");
      h3.className = "bearming-archive-h3";
      h3.textContent = g.label;

      const ul = document.createElement("ul");
      ul.className = "blog-posts";

      for (let j = 0; j < g.items.length; j++) {
        const li = g.items[j];
        ul.appendChild(li);
        allItems.push(li);
      }

      wrapper.appendChild(h3);
      wrapper.appendChild(ul);

      monthHeaders.push(h3);
      monthLists.push(ul);
    }

    // Pagination
    const pagination = document.createElement("div");
    pagination.className = "pagination bearming-archive-pagination";

    const prevBtn = document.createElement("button");
    prevBtn.type = "button";
    prevBtn.id = "prevPage";
    prevBtn.textContent = "Previous";
    prevBtn.setAttribute("aria-controls", wrapper.id);

    const info = document.createElement("span");
    info.id = "pageInfo";

    const nextBtn = document.createElement("button");
    nextBtn.type = "button";
    nextBtn.id = "nextPage";
    nextBtn.textContent = "Next";
    nextBtn.setAttribute("aria-controls", wrapper.id);

    pagination.appendChild(prevBtn);
    pagination.appendChild(info);
    pagination.appendChild(nextBtn);
    wrapper.appendChild(pagination);

    // Move tags block to the bottom (only when it exists)
    if (tagsBlock) {
      wrapper.appendChild(tagsBlock);
    }

    function setDisabled(btn, disabled) {
      btn.disabled = !!disabled;
      btn.setAttribute("aria-disabled", disabled ? "true" : "false");
    }

    let currentPage = 1;
    let debounceId = 0;

    function getFiltered() {
      const year = yearSelect.value;
      const term = searchInput.value.trim();

      const hasYear = year !== "";
      const hasTerm = term.length > 0;
      if (!hasYear && !hasTerm) return allItems;

      const re = hasTerm ? new RegExp(escapeRegExp(term), "i") : null;

      const out = [];
      for (let i = 0; i < allItems.length; i++) {
        const li = allItems[i];

        if (hasYear && li.dataset.archiveYear !== year) continue;

        if (re) {
          const a = li.querySelector("a");
          const text = (a ? a.textContent : li.textContent) || "";
          if (!re.test(text)) continue;
        }

        out.push(li);
      }
      return out;
    }

    function renderPageItems(pageItems) {
      // Hide everything first
      for (let i = 0; i < allItems.length; i++) {
        allItems[i].hidden = true;
      }

      // Show current page items
      for (let i = 0; i < pageItems.length; i++) {
        pageItems[i].hidden = false;
      }

      // Hide empty months
      for (let i = 0; i < monthLists.length; i++) {
        const ul = monthLists[i];
        let anyVisible = false;

        for (let j = 0; j < ul.children.length; j++) {
          if (!ul.children[j].hidden) {
            anyVisible = true;
            break;
          }
        }

        ul.hidden = !anyVisible;
        monthHeaders[i].hidden = !anyVisible;
      }
    }

    function syncUrl() {
      const year = yearSelect.value;
      const term = searchInput.value.trim();

      const p = readParams();

      year ? p.set(PARAM_YEAR, year) : p.delete(PARAM_YEAR);
      term ? p.set(PARAM_SEARCH, term) : p.delete(PARAM_SEARCH);

      if (currentPage > 1) p.set(PARAM_PAGE, String(currentPage));
      else p.delete(PARAM_PAGE);

      writeParams(p);
    }

    function update() {
      const filtered = getFiltered();

      const totalPages = Math.max(1, Math.ceil(filtered.length / POSTS_PER_PAGE));
      currentPage = clamp(currentPage, 1, totalPages);

      const start = (currentPage - 1) * POSTS_PER_PAGE;
      const pageItems = filtered.slice(start, start + POSTS_PER_PAGE);

      renderPageItems(pageItems);

      info.textContent = "Page " + currentPage + " of " + totalPages;

      setDisabled(prevBtn, currentPage === 1);
      setDisabled(nextBtn, currentPage === totalPages);

      pagination.hidden = filtered.length <= POSTS_PER_PAGE;

      syncUrl();
    }

    // Init from URL
    const p0 = readParams();
    yearSelect.value = p0.get(PARAM_YEAR) || "";
    searchInput.value = p0.get(PARAM_SEARCH) || "";

    const page0 = parseInt(p0.get(PARAM_PAGE) || "1", 10);
    currentPage = Number.isFinite(page0) && page0 > 0 ? page0 : 1;

    yearSelect.addEventListener("change", function () {
      currentPage = 1;
      update();
    });

    searchInput.addEventListener("input", function () {
      currentPage = 1;
      if (debounceId) window.clearTimeout(debounceId);
      debounceId = window.setTimeout(update, SEARCH_DEBOUNCE_MS);
    });

    prevBtn.addEventListener("click", function () {
      if (prevBtn.disabled) return;
      currentPage -= 1;
      update();
    });

    nextBtn.addEventListener("click", function () {
      if (nextBtn.disabled) return;
      currentPage += 1;
      update();
    });

    update();
  });
})();
