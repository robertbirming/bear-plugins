/**
 * Bear Blog Archive Toolkit (Month grouping + Year filter + Search + Pagination)
 * Designed for /blog/ (body.blog) and scoped to <main> to avoid interfering elsewhere.
 */
(function () {
  "use strict";

  const POSTS_PER_PAGE = 20;

  function onReady(fn) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", fn, { once: true });
    } else {
      fn();
    }
  }

  function qs(scope, sel) {
    return scope.querySelector(sel);
  }

  function qsa(scope, sel) {
    return Array.from(scope.querySelectorAll(sel));
  }

  function isBlogIndex() {
    return document.body.classList.contains("blog");
  }

  function findMainPostsList(main) {
    return qs(main, "ul.embedded.blog-posts") || qs(main, "ul.blog-posts");
  }

  function parsePostDate(li) {
    const t = li.querySelector("time[datetime]");
    if (!t) return null;
    const dt = t.getAttribute("datetime");
    if (!dt) return null;
    const d = new Date(dt);
    if (Number.isNaN(d.getTime())) return null;
    return { date: d, iso: dt };
  }

  function monthKey(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    return `${y}-${m}`;
  }

  function monthLabel(d) {
    return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  }

  function buildArchiveHeader(wrapper, totalPosts, lastUpdated) {
    let header = qs(wrapper, "h2.archive");
    if (!header) {
      header = document.createElement("h2");
      header.className = "archive";
      wrapper.prepend(header);
    }

    const formatted = lastUpdated.date.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });

    const span = document.createElement("span");
    span.id = "last-updated";
    span.setAttribute("data-date", lastUpdated.iso);
    span.textContent = formatted;

    header.textContent = `${totalPosts} entries. Last updated on `;
    header.appendChild(span);
    header.appendChild(document.createTextNode("."));
  }

  function groupPostsByMonthIntoWrapper(wrapper, postsList) {
    const items = qsa(postsList, "li");
    if (!items.length) return { monthLists: [], monthHeaders: [], allItems: [] };

    let lastUpdated = null;

    const groups = new Map();
    const monthSortDate = new Map();

    for (const li of items) {
      const info = parsePostDate(li);
      if (!info) continue;

      if (!lastUpdated || info.date > lastUpdated.date) lastUpdated = info;

      const key = monthKey(info.date);

      if (!groups.has(key)) {
        groups.set(key, { label: monthLabel(info.date), items: [] });
        monthSortDate.set(key, info.date);
      }

      groups.get(key).items.push(li);

      const cur = monthSortDate.get(key);
      if (!cur || info.date > cur) monthSortDate.set(key, info.date);
    }

    const sortedKeys = Array.from(groups.keys()).sort((a, b) => {
      const da = monthSortDate.get(a) || new Date(0);
      const db = monthSortDate.get(b) || new Date(0);
      return db - da;
    });

    if (lastUpdated) buildArchiveHeader(wrapper, items.length, lastUpdated);

    postsList.innerHTML = "";

    const monthHeaders = [];
    const monthLists = [];
    const allItems = [];

    for (const key of sortedKeys) {
      const group = groups.get(key);

      const h3 = document.createElement("h3");
      h3.className = "archive-h3";
      h3.textContent = group.label;

      const ul = document.createElement("ul");
      ul.className = "blog-posts";
      ul.setAttribute("data-archive-month", key);

      for (const li of group.items) {
        const info = parsePostDate(li);
        if (info) {
          li.dataset.archiveYear = String(info.date.getFullYear());
          li.dataset.archiveMonth = monthKey(info.date);
        }
        ul.appendChild(li);
        allItems.push(li);
      }

      wrapper.appendChild(h3);
      wrapper.appendChild(ul);

      monthHeaders.push(h3);
      monthLists.push(ul);
    }

    postsList.remove();

    return { monthLists, monthHeaders, allItems };
  }

  function buildControls(wrapper, years) {
    const controls = document.createElement("div");
    controls.className = "archive-controls";

    const yearSelect = document.createElement("select");
    yearSelect.id = "archiveYear";
    yearSelect.setAttribute("aria-label", "Filter by year");

    const optAll = document.createElement("option");
    optAll.value = "";
    optAll.textContent = "All years";
    yearSelect.appendChild(optAll);

    years.forEach((y) => {
      const opt = document.createElement("option");
      opt.value = y;
      opt.textContent = y;
      yearSelect.appendChild(opt);
    });

    const searchInput = document.createElement("input");
    searchInput.type = "search";
    searchInput.id = "archiveSearch";
    searchInput.placeholder = "Search...";
    searchInput.setAttribute("aria-label", "Search posts");

    controls.appendChild(yearSelect);
    controls.appendChild(searchInput);

    const header = qs(wrapper, "h2.archive");
    if (header && header.nextSibling) {
      header.insertAdjacentElement("afterend", controls);
    } else {
      wrapper.prepend(controls);
    }

    return { yearSelect, searchInput };
  }

  function buildPagination(wrapper) {
    const nav = document.createElement("div");
    nav.className = "pagination bearming-archive-pagination";
    nav.innerHTML =
      '<a id="archivePrev" role="button">Previous</a>' +
      '<span id="archivePageInfo"></span>' +
      '<a id="archiveNext" role="button">Next</a>';

    wrapper.appendChild(nav);

    const prev = qs(nav, "#archivePrev");
    const next = qs(nav, "#archiveNext");
    const info = qs(nav, "#archivePageInfo");

    function setDisabled(a, disabled) {
      a.dataset.disabled = disabled ? "true" : "false";
    }

    return { prev, next, info, setDisabled };
  }

  function updateMonthVisibility(monthHeaders, monthLists) {
    for (let i = 0; i < monthLists.length; i++) {
      const ul = monthLists[i];
      const h3 = monthHeaders[i];
      const anyVisible = qsa(ul, "li").some((li) => li.style.display !== "none");
      h3.style.display = anyVisible ? "" : "none";
      ul.style.display = anyVisible ? "" : "none";
    }
  }

  function applyState(state) {
    const term = (state.searchInput.value || "").trim().toLowerCase();
    const year = state.yearSelect.value || "";

    const eligible = state.allItems.filter((li) => {
      const y = li.dataset.archiveYear || "";
      if (year && y !== year) return false;

      if (!term) return true;

      const a = li.querySelector("a");
      const text = (a ? a.textContent : li.textContent).toLowerCase();
      return text.includes(term);
    });

    const totalPages = Math.max(1, Math.ceil(eligible.length / POSTS_PER_PAGE));
    state.currentPage = Math.min(state.currentPage, totalPages);

    const start = (state.currentPage - 1) * POSTS_PER_PAGE;
    const end = start + POSTS_PER_PAGE;
    const pageSet = new Set(eligible.slice(start, end));

    for (const li of state.allItems) {
      li.style.display = pageSet.has(li) ? "" : "none";
    }

    updateMonthVisibility(state.monthHeaders, state.monthLists);

    state.pagination.info.textContent = `Page ${state.currentPage} of ${totalPages}`;
    state.pagination.setDisabled(state.pagination.prev, state.currentPage === 1);
    state.pagination.setDisabled(state.pagination.next, state.currentPage === totalPages);
  }

  onReady(function () {
    if (!isBlogIndex()) return;

    const main = document.querySelector("main");
    if (!main) return;

    const postsList = findMainPostsList(main);
    if (!postsList) return;

    const wrapper = document.createElement("div");
    wrapper.className = "bearming-archive";
    postsList.parentNode.insertBefore(wrapper, postsList);
    wrapper.appendChild(postsList);

    const grouped = groupPostsByMonthIntoWrapper(wrapper, postsList);
    if (!grouped.allItems.length) return;

    const years = Array.from(
      new Set(grouped.allItems.map((li) => li.dataset.archiveYear).filter(Boolean))
    ).sort((a, b) => Number(b) - Number(a));

    const { yearSelect, searchInput } = buildControls(wrapper, years);
    const pagination = buildPagination(wrapper);

    const state = {
      allItems: grouped.allItems,
      monthHeaders: grouped.monthHeaders,
      monthLists: grouped.monthLists,
      yearSelect,
      searchInput,
      pagination,
      currentPage: 1,
    };

    yearSelect.addEventListener("change", function () {
      state.currentPage = 1;
      applyState(state);
    });

    searchInput.addEventListener("input", function () {
      state.currentPage = 1;
      applyState(state);
    });

    pagination.prev.addEventListener("click", function () {
      if (state.currentPage <= 1) return;
      state.currentPage -= 1;
      applyState(state);
    });

    pagination.next.addEventListener("click", function () {
      state.currentPage += 1;
      applyState(state);
    });

    applyState(state);
  });
})();
