(function () {
  "use strict";

  function ready(fn) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", fn, { once: true });
    } else {
      fn();
    }
  }

  function getCodeText(pre) {
    return (pre.textContent || "").replace(/\n$/, "");
  }

  async function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return;
    }

    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.top = "-9999px";
    ta.style.left = "-9999px";
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    document.body.removeChild(ta);
  }

  ready(function () {
    if (window.__bearmingCopyButtons) return;
    window.__bearmingCopyButtons = true;

    const pres = Array.from(document.querySelectorAll(".highlight pre, pre"));

    pres.forEach(function (pre) {
      if (pre.dataset.copyReady === "true") return;

      const text = getCodeText(pre);
      if (text.trim().length < 20) return;

      pre.dataset.copyReady = "true";

      const host = pre.closest(".highlight") || pre;

      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "bearming-copy-btn";
      btn.textContent = "Copy";
      btn.setAttribute("aria-label", "Copy code to clipboard");

      let resetTimer = null;

      btn.addEventListener("click", async function () {
        try {
          await copyText(getCodeText(pre));
          btn.textContent = "Copied";
          btn.dataset.copied = "true";

          if (resetTimer) window.clearTimeout(resetTimer);
          resetTimer = window.setTimeout(function () {
            btn.textContent = "Copy";
            btn.dataset.copied = "false";
          }, 1200);
        } catch (e) {
          btn.textContent = "Nope";
          if (resetTimer) window.clearTimeout(resetTimer);
          resetTimer = window.setTimeout(function () {
            btn.textContent = "Copy";
          }, 1200);
        }
      });

      host.appendChild(btn);
    });
  });
})();
