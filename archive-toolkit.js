(function () {
  "use strict";

  const POSTS_PER_PAGE = 20;

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

  ready(function () {
    if (!document.body.classList.contains("blog")) return;

    const main = document.querySelector("main");
    if (!main) return;

    const sourceList =
      main.querySelector("ul.embedded.blog-posts") ||
      main.querySelector("ul.blog-posts");

    if (!sourceList) return;

    const items = Array.from(sourceList.querySelectorAll("li"));
    if (!items.length) return;

    if (main.querySelector(".bearming-archive")) return;

    const wrapper = document.createElement("div");
    wrapper.className = "bearming-archive";
    wrapper.id = "bearming-archive";
    sourceList.parentNode.insertBefore(wrapper, sourceList);

    const groups = Object.create(null);
    const years = Object.create(null);

    items.forEach((li) => {
      const time = li.querySelector("time[datetime]");
      if (!time) return;

      const dt = time.getAttribute("datetime");
      if (!dt) return;

      const date = new Date(dt);
      if (Number.isNaN(date.getTime())) return;

      const year = String(date.getFullYear());
      const monthKey = `${year}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      const label = date.toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      });

      li.dataset.archiveYear = year;
      years[year] = (years[year] || 0) + 1;

      if (!groups[monthKey]) groups[monthKey] = { label, date, items: [] };
      groups[monthKey].items.push(li);
    });

    const sortedMonths = Object.keys(groups).sort(
      (a, b) => groups[b].date - groups[a].date
    );

    sourceList.remove();

    const monthLists = [];
    const monthHeaders = [];
    const allItems = [];

    sortedMonths.forEach((key) => {
      const h3 = document.createElement("h3");
      h3.className = "archive-h3";
      h3.textContent = groups[key].label;

      const ul = document.createElement("ul");
      ul.className = "blog-posts";

      groups[key].items.forEach((li) => {
        ul.appendChild(li);
        allItems.push(li);
      });

      wrapper.appendChild(h3);
      wrapper.appendChild(ul);

      monthHeaders.push(h3);
      monthLists.push(ul);
    });

    const controls = document.createElement("div");
    controls.className = "archive-controls";

    const yearSelect = document.createElement("select");
    yearSelect.setAttribute("aria-label", "Filter by year");
    yearSelect.setAttribute("aria-controls", wrapper.id);

    const totalPosts = allItems.length;
    const allOpt = document.createElement("option");
    allOpt.value = "";
    allOpt.textContent = `All posts (${totalPosts})`;
    yearSelect.appendChild(allOpt);

    Object.keys(years)
      .sort((a, b) => Number(b) - Number(a))
      .forEach((year) => {
        const opt = document.createElement("option");
        opt.value = year;
        opt.textContent = `${year} (${years[year]})`;
        yearSelect.appendChild(opt);
      });

    const searchInput = document.createElement("input");
    searchInput.type = "search";
    searchInput.placeholder = "Search…";
    searchInput.setAttribute("aria-label", "Search posts");
    searchInput.setAttribute("aria-controls", wrapper.id);

    controls.appendChild(yearSelect);
    controls.appendChild(searchInput);
    wrapper.prepend(controls);

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

    let currentPage = 1;
    let totalPages = 1;

    function setDisabled(el, disabled) {
      const val = disabled ? "true" : "false";
      el.dataset.disabled = val;
      el.setAttribute("aria-disabled", val);
      if (disabled) el.setAttribute("tabindex", "-1");
      else el.removeAttribute("tabindex");
    }

    function filterItems() {
      const year = yearSelect.value;
      const term = searchInput.value.trim().toLowerCase();

      if (!year && !term) return allItems;

      const re = term ? new RegExp(escapeRegExp(term), "i") : null;

      return allItems.filter((li) => {
        if (year && li.dataset.archiveYear !== year) return false;
        if (!re) return true;

        const a = li.querySelector("a");
        const text = (a ? a.textContent : li.textContent) || "";
        return re.test(text);
      });
    }

    function renderVisibility(visibleSet) {
      allItems.forEach((li) => {
        li.style.display = visibleSet.has(li) ? "" : "none";
      });

      monthLists.forEach((ul, i) => {
        const anyVisible = Array.from(ul.children).some(
          (li) => li.style.display !== "none"
        );
        ul.style.display = anyVisible ? "" : "none";
        monthHeaders[i].style.display = anyVisible ? "" : "none";
      });
    }

    function update() {
      const filtered = filterItems();

      totalPages = Math.max(1, Math.ceil(filtered.length / POSTS_PER_PAGE));
      currentPage = Math.min(currentPage, totalPages);

      const start = (currentPage - 1) * POSTS_PER_PAGE;
      const pageItems = filtered.slice(start, start + POSTS_PER_PAGE);
      const visibleSet = new Set(pageItems);

      renderVisibility(visibleSet);

      info.textContent = `Page ${currentPage} of ${totalPages}`;
      setDisabled(prev, currentPage === 1);
      setDisabled(next, currentPage === totalPages);
    }

    yearSelect.addEventListener("change", () => {
      currentPage = 1;
      update();
    });

    let t = null;
    searchInput.addEventListener("input", () => {
      currentPage = 1;
      if (t) window.clearTimeout(t);
      t = window.setTimeout(update, 60);
    });

    prev.addEventListener("click", (e) => {
      e.preventDefault();
      if (prev.dataset.disabled === "true") return;
      currentPage = Math.max(1, currentPage - 1);
      update();
    });

    next.addEventListener("click", (e) => {
      e.preventDefault();
      if (next.dataset.disabled === "true") return;
      currentPage = Math.min(totalPages, currentPage + 1);
      update();
    });

    update();
  });
})();
