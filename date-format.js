(() => {
  "use strict";

  /*
   * Bearming date formatter
   * Version 1.0.0 | 2026-01-23
   * robertbirming.com
   *
   * - Formats <time datetime="..."> consistently
   * - On /blog with the Bearming archive toolkit present, shows day-only in the archive list
   */

  const formatDefault = "d M Y";
  const pad2 = (n) => String(n).padStart(2, "0");

  function safeDate(dateStr) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr);
    if (m) return new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
    const d = new Date(dateStr);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  function formatDate(dateStr, formatStr) {
    const date = safeDate(dateStr);
    if (!date) return "";

    const day = date.getUTCDate();
    const month = date.getUTCMonth();
    const year = date.getUTCFullYear();
    const weekday = date.getUTCDay();
    const hours = date.getUTCHours();
    const minutes = date.getUTCMinutes();

    const monthsFull = ["January","February","March","April","May","June","July","August","September","October","November","December"];
    const monthsShort = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    const daysFull = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
    const daysShort = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

    function getOrdinal(n) {
      const s = ["th", "st", "nd", "rd"];
      const v = n % 100;
      return s[(v - 20) % 10] || s[v] || s[0];
    }

    const map = {
      d: () => pad2(day),
      m: () => pad2(month + 1),
      Y: () => String(year),
      y: () => String(year).slice(-2),
      F: () => monthsFull[month],
      j: () => String(day),
      D: () => daysShort[weekday],
      l: () => daysFull[weekday],
      S: () => getOrdinal(day),
      M: () => monthsShort[month],
      H: () => pad2(hours),
      h: () => {
        let h = hours % 12;
        h = h === 0 ? 12 : h;
        return pad2(h);
      },
      g: () => {
        const h = hours % 12;
        return h === 0 ? "12" : String(h);
      },
      i: () => pad2(minutes),
      a: () => (hours < 12 ? "am" : "pm"),
      A: () => (hours < 12 ? "AM" : "PM"),
    };

    let result = "";
    for (const ch of formatStr) result += map[ch] ? map[ch]() : ch;
    return result;
  }

  function applyFormatting() {
    const times = document.querySelectorAll("time[datetime]");
    const isBlog = document.body.classList.contains("blog");
    const hasArchive = !!document.querySelector(".bearming-archive");

    times.forEach((time) => {
      const dt = time.getAttribute("datetime");
      if (!dt) return;

      if (isBlog && hasArchive && time.closest(".bearming-archive ul.blog-posts")) {
        const d = safeDate(dt);
        if (!d) return;
        time.textContent = pad2(d.getUTCDate());
        return;
      }

      time.textContent = formatDate(dt, formatDefault);
    });
  }

  function waitForArchiveAndApply() {
    applyFormatting();

    if (!document.body.classList.contains("blog")) return;

    const start = performance.now();
    (function tick() {
      if (document.querySelector(".bearming-archive")) {
        applyFormatting();
        return;
      }
      if (performance.now() - start > 1500) return;
      requestAnimationFrame(tick);
    })();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", waitForArchiveAndApply, { once: true });
  } else {
    waitForArchiveAndApply();
  }
})();
