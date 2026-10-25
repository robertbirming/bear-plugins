/*
 Plugin name: Status.lol
 Description: Shows your latest status.lol status as one quiet line. Statuses older than 14 days are hidden (change with data-max-days).
 Usage: Add <p class="status-lol" data-address="your-username" hidden></p> where the status should appear, followed by this script.
 Author: Robert Birming
 Author URI: https://robertbirming.com
*/

(function () {

  "use strict";

  const units = [
    ["year", 31536000],
    ["month", 2592000],
    ["week", 604800],
    ["day", 86400],
    ["hour", 3600],
    ["minute", 60]
  ];

  async function init() {
    const el = document.querySelector(".status-lol[data-address]");
    if (!el) return;

    try {
      const address = el.dataset.address;
      const res = await fetch("https://api.omg.lol/address/" + encodeURIComponent(address) + "/statuses/");
      if (!res.ok) return;

      const status = (await res.json()).response?.statuses?.[0];
      if (!status) return;

      // Too old? Stay hidden rather than show a stale status
      const age = Date.now() / 1000 - status.created;
      if (age > (Number(el.dataset.maxDays) || 14) * 86400) return;

      // Plain text, with Markdown links turned into real links (http and https only)
      const parts = [status.emoji + " "];
      let last = 0;
      for (const match of status.content.matchAll(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g)) {
        const link = document.createElement("a");
        link.href = match[2];
        link.textContent = match[1];
        parts.push(status.content.slice(last, match.index), link);
        last = match.index + match[0].length;
      }
      parts.push(status.content.slice(last), " · ");

      // "2 hours ago", in the blog's own language
      const time = document.createElement("time");
      time.dateTime = new Date(status.created * 1000).toISOString();
      const [unit, seconds] = units.find(([, s]) => age >= s) || [];
      time.textContent = unit
        ? new Intl.RelativeTimeFormat(document.documentElement.lang || "en", { numeric: "auto" })
            .format(-Math.floor(age / seconds), unit)
        : "just now";

      const permalink = document.createElement("a");
      permalink.href = "https://status.lol/" + address + "/" + status.id;
      permalink.append(time);

      el.append(...parts, permalink);
      el.hidden = false;
    } catch {}
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }

})();
