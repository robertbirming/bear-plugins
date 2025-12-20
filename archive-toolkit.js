// Bearming Archive Toolkit
// Runs on pages using `class_name: blog` or when the Blog path is set to `blog`.

(function () {
  "use strict";

  const POSTS_PER_PAGE = 20;

  function ready(fn) {
    document.readyState === "loading"
      ? document.addEventListener("DOMContentLoaded", fn, { once: true })
      : fn();
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

    const wrapper = document.createElement("div");
    wrapper.className = "bearming-archive";
    sourceList.parentNode.insertBefore(wrapper, sourceList);

    const groups = {};
    const years = {};

    items.forEach((li) => {
      const time = li.querySelector("time[datetime]");
      if (!time) return;

      const dt = time.getAttribute("datetime");
      if (!dt) return;

      const date = new Date(dt);
      if (isNaN(date.getTime())) return;

      const year = String(date.getFullYear());
      const monthKey = `${year}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      const label = date.toLocaleDateString("en-US", { month: "long", year: "numeric" });

      li.dataset.archiveYear = year;

      years[year] = (years[year] || 0) + 1;

      if (!groups[monthKey]) groups[monthKey] = { label, date, items: [] };
      groups[monthKey].items.push(li);
    });

    const sortedMonths = Object.keys(groups).sort((a, b) => groups[b].date - groups[a].date);

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
    controls.style.display = "flex";
    controls.style.gap = "0.75rem";
    controls.style.marginBlock = "1rem 1.25rem";

    const yearSelect = document.createElement("select");
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
    searchInput.style.flex = "1";

    controls.appendChild(yearSelect);
    controls.appendChild(searchInput);
    wrapper.prepend(controls);

    const pagination = document.createElement("div");
    pagination.className = "pagination";
    pagination.innerHTML =
      '<a id="prev" role="button">Previous</a><span id="info"></span><a id="next" role="button">Next</a>';

    wrapper.appendChild(pagination);

    const prev = pagination.querySelector("#prev");
    const next = pagination.querySelector("#next");
    const info = pagination.querySelector("#info");

    let currentPage = 1;
    let totalPages = 1;

    function setDisabled(el, disabled) {
      el.style.opacity = disabled ? "0.5" : "1";
      el.style.pointerEvents = disabled ? "none" : "";
    }

    function update() {
      const year = yearSelect.value;
      const term = searchInput.value.trim().toLowerCase();

      const filtered = allItems.filter((li) => {
        if (year && li.dataset.archiveYear !== year) return false;
        if (!term) return true;

        const a = li.querySelector("a");
        const text = (a ? a.textContent : li.textContent).toLowerCase();
        return text.includes(term);
      });

      totalPages = Math.max(1, Math.ceil(filtered.length / POSTS_PER_PAGE));
      currentPage = Math.min(currentPage, totalPages);

      const start = (currentPage - 1) * POSTS_PER_PAGE;
      const pageSet = new Set(filtered.slice(start, start + POSTS_PER_PAGE));

      allItems.forEach((li) => {
        li.style.display = pageSet.has(li) ? "" : "none";
      });

      monthLists.forEach((ul, i) => {
        const visible = Array.from(ul.children).some((li) => li.style.display !== "none");
        ul.style.display = visible ? "" : "none";
        monthHeaders[i].style.display = visible ? "" : "none";
      });

      info.textContent = `Page ${currentPage} of ${totalPages}`;
      setDisabled(prev, currentPage === 1);
      setDisabled(next, currentPage === totalPages);
    }

    yearSelect.addEventListener("change", () => {
      currentPage = 1;
      update();
    });

    searchInput.addEventListener("input", () => {
      currentPage = 1;
      update();
    });

    prev.addEventListener("click", () => {
      if (currentPage > 1) {
        currentPage -= 1;
        update();
      }
    });

    next.addEventListener("click", () => {
      if (currentPage < totalPages) {
        currentPage += 1;
        update();
      }
    });

    update();
  });
})();
