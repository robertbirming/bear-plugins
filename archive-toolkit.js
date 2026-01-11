(function () {
  "use strict";

  // Archive tweaks: month grouping + year filter + search + pagination + shareable URL params.
  // URL params:
  //   y = year (e.g. ?y=2024)
  //   s = search term (e.g. ?s=bear)
  //   p = page number (e.g. ?p=2)

  const PARAM_YEAR = "y";
  const PARAM_SEARCH = "s";
  const PARAM_PAGE = "p";
  const POSTS_PER_PAGE = 25;
  const SEARCH_DEBOUNCE_MS = 60;

  function ready(fn) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", fn, { once: true });
    } else {
      fn();
    }
  }

  function escapeRegExp(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  function readParams() {
    return new URLSearchParams(location.search);
  }

  function writeParams(p) {
    const url = new URL(location.href);
    url.search = p.toString();
    history.replaceState(null, "", url.toString());
  }

  ready(function () {
    // Only run on the /blog page.
    if (!document.body.classList.contains("blog")) return;

    const main = document.querySelector("main");
    if (!main) return;

    // Support both normal and embedded lists.
    const sourceList =
      main.querySelector("ul.embedded.blog-posts") ||
      main.querySelector("ul.blog-posts");

    if (!sourceList) return;

    // Avoid double-running if footer directive injected twice.
    if (main.querySelector(".bearming-archive")) return;

    const items = Array.from(sourceList.querySelectorAll("li"));
    if (!items.length) return;

    // Build month groups + year counts
    const groups = Object.create(null);
    const years = Object.create(null);

    items.forEach(function (li) {
      const time = li.querySelector("time[datetime]");
      if (!time) return;

      const dt = time.getAttribute("datetime");
      if (!dt) return;

      const date = new Date(dt);
      if (Number.isNaN(date.getTime())) return;

      const year = String(date.getFullYear());
      const monthKey = year + "-" + String(date.getMonth() + 1).padStart(2, "0");
      const label = date.toLocaleDateString("en-US", { month: "long", year: "numeric" });

      li.dataset.archiveYear = year;
      years[year] = (years[year] || 0) + 1;

      if (!groups[monthKey]) groups[monthKey] = { label: label, date: date, items: [] };
      groups[monthKey].items.push(li);
    });

    const sortedMonths = Object.keys(groups).sort(function (a, b) {
      return groups[b].date - groups[a].date;
    });

    // Replace the original list with grouped months
    sourceList.remove();

    const wrapper = document.createElement("div");
    wrapper.className = "bearming-archive";
    wrapper.id = "bearming-archive";
    main.appendChild(wrapper);

    const monthLists = [];
    const monthHeaders = [];
    const allItems = [];

    sortedMonths.forEach(function (key) {
      const h3 = document.createElement("h3");
      h3.className = "archive-h3";
      h3.textContent = groups[key].label;

      const ul = document.createElement("ul");
      ul.className = "blog-posts";

      groups[key].items.forEach(function (li) {
        ul.appendChild(li);
        allItems.push(li);
      });

      wrapper.appendChild(h3);
      wrapper.appendChild(ul);

      monthHeaders.push(h3);
      monthLists.push(ul);
    });

    // Controls
    const controls = document.createElement("div");
    controls.className = "archive-controls";

    const yearSelect = document.createElement("select");
    yearSelect.setAttribute("aria-label", "Filter posts by year");
    yearSelect.setAttribute("aria-controls", wrapper.id);

    const totalPosts = allItems.length;
    const optAll = document.createElement("option");
    optAll.value = "";
    optAll.textContent = "All posts (" + totalPosts + ")";
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
    wrapper.prepend(controls);

    // Pagination
    const pagination = document.createElement("div");
    pagination.className = "pagination bearming-archive-pagination";
    pagination.innerHTML =
      '<a id="prevPage" role="button" aria-disabled="false" data-disabled="false">Previous</a>' +
      '<span id="pageInfo"></span>' +
      '<a id="nextPage" role="button" aria-disabled="false" data-disabled="false">Next</a>';
    wrapper.appendChild(pagination);

    const prev = pagination.querySelector("#prevPage");
    const next = pagination.querySelector("#nextPage");
    const info = pagination.querySelector("#pageInfo");
    if (!prev || !next || !info) return;

    prev.setAttribute("aria-controls", wrapper.id);
    next.setAttribute("aria-controls", wrapper.id);

    function setDisabled(el, disabled) {
      const val = disabled ? "true" : "false";
      el.dataset.disabled = val;
      el.setAttribute("aria-disabled", val);
      if (disabled) el.setAttribute("tabindex", "-1");
      else el.removeAttribute("tabindex");
    }

    // State (synced with URL)
    let currentPage = 1;

    function getFiltered() {
      const year = yearSelect.value;
      const term = searchInput.value.trim();
      const hasYear = !!year;
      const hasTerm = term.length > 0;

      if (!hasYear && !hasTerm) return allItems;

      const re = hasTerm ? new RegExp(escapeRegExp(term), "i") : null;

      return allItems.filter(function (li) {
        if (hasYear && li.dataset.archiveYear !== year) return false;
        if (!re) return true;

        const a = li.querySelector("a");
        const text = (a ? a.textContent : li.textContent) || "";
        return re.test(text);
      });
    }

    function renderVisibility(visibleSet) {
      allItems.forEach(function (li) {
        li.style.display = visibleSet.has(li) ? "" : "none";
      });

      monthLists.forEach(function (ul, i) {
        const anyVisible = Array.from(ul.children).some(function (li) {
          return li.style.display !== "none";
        });
        ul.style.display = anyVisible ? "" : "none";
        monthHeaders[i].style.display = anyVisible ? "" : "none";
      });
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
      currentPage = Math.min(Math.max(1, currentPage), totalPages);

      const start = (currentPage - 1) * POSTS_PER_PAGE;
      const pageItems = filtered.slice(start, start + POSTS_PER_PAGE);
      renderVisibility(new Set(pageItems));

      info.textContent = "Page " + currentPage + " of " + totalPages;
      setDisabled(prev, currentPage === 1);
      setDisabled(next, currentPage === totalPages);

      pagination.style.display = filtered.length > POSTS_PER_PAGE ? "" : "none";

      syncUrl();
    }

    // Init from URL
    const p0 = readParams();
    yearSelect.value = p0.get(PARAM_YEAR) || "";
    searchInput.value = p0.get(PARAM_SEARCH) || "";

    const page0 = parseInt(p0.get(PARAM_PAGE) || "1", 10);
    currentPage = Number.isFinite(page0) && page0 > 0 ? page0 : 1;

    // Events
    yearSelect.addEventListener("change", function () {
      currentPage = 1;
      update();
    });

    let t = null;
    searchInput.addEventListener("input", function () {
      currentPage = 1;
      if (t) window.clearTimeout(t);
      t = window.setTimeout(update, SEARCH_DEBOUNCE_MS);
    });

    prev.addEventListener("click", function (e) {
      e.preventDefault();
      if (prev.dataset.disabled === "true") return;
      currentPage = Math.max(1, currentPage - 1);
      update();
    });

    next.addEventListener("click", function (e) {
      e.preventDefault();
      if (next.dataset.disabled === "true") return;
      currentPage = currentPage + 1;
      update();
    });

    update();
  });
})();
