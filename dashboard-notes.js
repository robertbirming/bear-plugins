/**
 * Dashboard notes | Version 1.0.0 | 2026-01-07
 * Robert Birming | robertbirming.com
 */
(function () {
  "use strict";

  if (window.__bbNotesSingleLoaded) return;
  window.__bbNotesSingleLoaded = true;

  const STORAGE_KEY = "dashboard_note_single_v1";
  const AUTOSAVE_DELAY = 800;

  const AUTOSAVE_STATUS_RESET_DELAY = 700;
  const STATUS_RESET_DELAY = 900;

  const IDS = {
    style: "bb-notes-modal-style",
    overlay: "bb-notes-overlay",
    title: "bb-notes-title"
  };

  let autosaveTimer = null;
  let lastFocusEl = null;

  window.bbNotes = window.bbNotes || {};
  const api = window.bbNotes;

  function safeGetRaw() {
    try {
      return localStorage.getItem(STORAGE_KEY) || "";
    } catch (e) {
      return "";
    }
  }

  function safeSetRaw(value) {
    try {
      localStorage.setItem(STORAGE_KEY, value);
      return true;
    } catch (e) {
      return false;
    }
  }

  function getNoteObject() {
    const raw = safeGetRaw();
    if (!raw) return { content: "", modified: null };

    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object" && "content" in parsed) {
        return {
          content: typeof parsed.content === "string" ? parsed.content : String(parsed.content || ""),
          modified: parsed.modified || null
        };
      }
      return { content: String(raw), modified: null };
    } catch (e) {
      return { content: String(raw), modified: null };
    }
  }

  function setNoteObject(obj) {
    return safeSetRaw(JSON.stringify(obj));
  }

  function isValidDate(d) {
    return d instanceof Date && !Number.isNaN(d.getTime());
  }

  function formatDate(isoString) {
    if (!isoString) return "";
    const date = new Date(isoString);
    if (!isValidDate(date)) return "";

    const now = new Date();
    const diff = now - date;

    if (Number.isNaN(diff) || diff < 0) return date.toLocaleDateString();

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      const hours = Math.floor(diff / (1000 * 60 * 60));
      if (hours === 0) {
        const minutes = Math.floor(diff / (1000 * 60));
        return minutes <= 1 ? "Just now" : `${minutes} minutes ago`;
      }
      return hours === 1 ? "1 hour ago" : `${hours} hours ago`;
    }

    if (days === 1) return "Yesterday";
    if (days < 7) return `${days} days ago`;
    return date.toLocaleDateString();
  }

  function ensureStyles() {
    if (document.getElementById(IDS.style)) return;

    const style = document.createElement("style");
    style.id = IDS.style;

    style.textContent = `
      #${IDS.overlay}.bb-notes-overlay{
        position: fixed;
        inset: 0;
        background: rgba(0,0,0,0.18);
        z-index: 9999;
        display: none;
        align-items: center;
        justify-content: center;
        padding: 16px;
      }

      .bb-notes-modal{
        width: min(720px, 100%);
        max-height: 90vh;
        overflow: auto;
        background: var(--background-color);
        color: var(--text-color);
        border-radius: 6px;
        border: 1px solid color-mix(in srgb, var(--text-color) 14%, transparent);
        box-shadow: 0 12px 34px rgba(0,0,0,0.14);
      }

      .bb-notes-head{
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
        padding: 10px 12px;
        border-bottom: 1px solid color-mix(in srgb, var(--text-color) 12%, transparent);
      }

      .bb-notes-title{
        font-weight: 700;
        color: var(--heading-color);
      }

      .bb-notes-body{
        padding: 12px;
      }

      .bb-notes-meta{
        display:flex;
        justify-content: space-between;
        gap: 12px;
        font-size: 0.9rem;
        color: color-mix(in srgb, var(--text-color) 65%, transparent);
        margin-bottom: 10px;
      }

      .bb-notes-text{
        width: 100%;
        min-height: 220px;
        box-sizing: border-box;
        resize: vertical;
        font: inherit;
      }

      .bb-notes-actions{
        display:flex;
        gap: 6px; /* tighter spacing between Copy/Clear */
        flex-wrap: wrap;
        align-items: center;
        margin-top: 12px;
      }

      .bb-notes-hint{
        margin-left: auto;
        font-size: 0.85rem;
        color: color-mix(in srgb, var(--text-color) 60%, transparent);
      }

      .bb-notes-actions button{
        margin: 0;
      }

      .bb-notes-open--after-new{
        margin-left: 0.35rem;
      }

      @media (prefers-color-scheme: dark){
        #${IDS.overlay}.bb-notes-overlay{
          background: rgba(0,0,0,0.45);
        }
        .bb-notes-modal{
          box-shadow: 0 18px 50px rgba(0,0,0,0.55);
        }
      }
    `;

    document.head.appendChild(style);
  }

  function qs(sel, root) {
    return (root || document).querySelector(sel);
  }

  function getOverlay() {
    return document.getElementById(IDS.overlay);
  }

  function isOpen() {
    const overlay = getOverlay();
    return !!overlay && overlay.style.display === "flex";
  }

  function setStatus(msg) {
    const overlay = getOverlay();
    if (!overlay) return;
    const s = qs(".bb-notes-status", overlay);
    if (s) s.textContent = msg;
  }

  function statusThenReset(msg, delay) {
    setStatus(msg);
    window.setTimeout(() => setStatus("Ready."), delay || STATUS_RESET_DELAY);
  }

  function focusFirstField(overlay) {
    const ta = qs(".bb-notes-text", overlay);
    if (ta) ta.focus();
  }

  function getFocusable(overlay) {
    const nodes = overlay.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    return Array.from(nodes).filter((el) => !el.disabled && el.offsetParent !== null);
  }

  function trapFocus(e) {
    if (e.key !== "Tab") return;

    const overlay = getOverlay();
    if (!overlay || !isOpen()) return;

    const focusables = getFocusable(overlay);
    if (!focusables.length) return;

    const first = focusables[0];
    const last = focusables[focusables.length - 1];

    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
      return;
    }

    if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  function renderModal() {
    const overlay = getOverlay();
    if (!overlay) return;

    const ta = qs(".bb-notes-text", overlay);
    const mod = qs(".bb-notes-modified", overlay);

    const obj = getNoteObject();
    if (ta) ta.value = obj.content || "";
    if (mod) mod.textContent = obj.modified ? `Modified ${formatDate(obj.modified)}` : "";

    setStatus("Ready.");
  }

  function buildModalIfNeeded() {
    let overlay = getOverlay();
    if (overlay) return overlay;

    ensureStyles();

    overlay = document.createElement("div");
    overlay.id = IDS.overlay;
    overlay.className = "bb-notes-overlay";

    overlay.innerHTML = `
      <div class="bb-notes-modal" role="dialog" aria-modal="true" aria-labelledby="${IDS.title}">
        <div class="bb-notes-head">
          <div class="bb-notes-title" id="${IDS.title}">Notes</div>
          <button type="button" class="bb-notes-close" aria-label="Close notes" title="Close">Close</button>
        </div>
        <div class="bb-notes-body">
          <div class="bb-notes-meta">
            <span class="bb-notes-status">Ready.</span>
            <span class="bb-notes-modified"></span>
          </div>
          <textarea class="bb-notes-text" placeholder="Small reminders, ideas, stuff you don’t want to forget…" aria-label="Notes text"></textarea>
          <div class="bb-notes-actions">
            <button type="button" class="bb-notes-copy" aria-label="Copy notes" title="Copy">Copy</button>
            <button type="button" class="bb-notes-clear" aria-label="Clear notes" title="Clear">Clear</button>
            <div class="bb-notes-hint">Autosaves while typing.</div>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    overlay.addEventListener("click", function (e) {
      if (e.target === overlay) api.close();
    });

    qs(".bb-notes-close", overlay).addEventListener("click", api.close);
    qs(".bb-notes-copy", overlay).addEventListener("click", api.copy);
    qs(".bb-notes-clear", overlay).addEventListener("click", api.clear);

    const ta = qs(".bb-notes-text", overlay);
    ta.addEventListener("input", function () {
      setStatus("Typing…");
      window.clearTimeout(autosaveTimer);
      autosaveTimer = window.setTimeout(() => api.save({ quiet: true }), AUTOSAVE_DELAY);
    });

    document.addEventListener("keydown", function (e) {
      if (isOpen()) trapFocus(e);

      if (e.key === "Escape" && isOpen()) {
        e.preventDefault();
        api.close();
        return;
      }

      if ((e.ctrlKey || e.metaKey) && (e.key === "s" || e.key === "S") && isOpen()) {
        e.preventDefault();
        api.save();
        return;
      }

      if ((e.ctrlKey || e.metaKey) && (e.key === "k" || e.key === "K")) {
        const path = window.location.pathname || "";
        if (!path.includes("/dashboard/")) return;
        if (isOpen()) return;

        e.preventDefault();
        api.open();
      }
    });

    return overlay;
  }

  async function copyTextWithFallback(text, textareaEl) {
    if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
      try {
        await navigator.clipboard.writeText(text);
        return true;
      } catch (e) {
        // fall through
      }
    }

    try {
      textareaEl.focus();
      textareaEl.select();
      const ok = document.execCommand("copy");
      return !!ok;
    } catch (e) {
      return false;
    } finally {
      try {
        textareaEl.setSelectionRange(text.length, text.length);
      } catch (e) {}
    }
  }

  api.open = function () {
    const overlay = buildModalIfNeeded();
    lastFocusEl = document.activeElement;

    renderModal();
    overlay.style.display = "flex";
    window.setTimeout(() => focusFirstField(overlay), 0);
  };

  api.close = function () {
    const overlay = getOverlay();
    if (!overlay) return;

    api.save({ quiet: true });
    overlay.style.display = "none";

    if (lastFocusEl && typeof lastFocusEl.focus === "function") {
      lastFocusEl.focus();
    }
    lastFocusEl = null;
  };

  api.save = function (opts) {
    const overlay = getOverlay();
    if (!overlay) return;

    const ta = qs(".bb-notes-text", overlay);
    const mod = qs(".bb-notes-modified", overlay);

    const obj = getNoteObject();
    obj.content = (ta && ta.value) ? ta.value : "";
    obj.modified = new Date().toISOString();

    const ok = setNoteObject(obj);
    if (!ok) {
      setStatus("Could not save (storage blocked).");
      return;
    }

    if (mod) mod.textContent = `Modified ${formatDate(obj.modified)}`;

    if (opts && opts.quiet) {
      setStatus("Autosaved.");
      window.setTimeout(() => setStatus("Ready."), AUTOSAVE_STATUS_RESET_DELAY);
      return;
    }

    statusThenReset("Saved.");
  };

  api.copy = async function () {
    const overlay = getOverlay();
    if (!overlay) return;

    const ta = qs(".bb-notes-text", overlay);
    const text = (ta && ta.value) ? ta.value : "";

    const ok = await copyTextWithFallback(text, ta);
    statusThenReset(ok ? "Copied." : "Could not copy.");
  };

  api.clear = function () {
    if (!confirm("Clear the note?")) return;

    const obj = getNoteObject();
    obj.content = "";
    obj.modified = new Date().toISOString();

    const ok = setNoteObject(obj);
    if (!ok) {
      setStatus("Could not clear (storage blocked).");
      return;
    }

    renderModal();
    statusThenReset("Cleared.");
  };

  function addNotesButtonToControls() {
    const controls = qs(".sticky-controls");
    if (!controls) return;
    if (qs(".bb-notes-open", controls)) return;

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "bb-notes-open";
    btn.textContent = "Notes";
    btn.setAttribute("aria-label", "Open notes");
    btn.title = "Open notes";
    btn.addEventListener("click", function (e) {
      e.preventDefault();
      api.open();
    });

    controls.appendChild(btn);
  }

  function addNotesButtonNextToNew() {
    const newBtn = qs('main a[href*="/new/"]');
    if (!newBtn || !newBtn.parentNode) return;
    if (qs(".bb-notes-open", newBtn.parentNode)) return;

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "bb-notes-open bb-notes-open--after-new";
    btn.textContent = "Notes";
    btn.setAttribute("aria-label", "Open notes");
    btn.title = "Open notes";
    btn.addEventListener("click", function (e) {
      e.preventDefault();
      api.open();
    });

    newBtn.parentNode.insertBefore(btn, newBtn.nextSibling);
  }

  function init() {
    const path = window.location.pathname || "";
    if (!path.includes("/dashboard/")) return;

    addNotesButtonToControls();
    addNotesButtonNextToNew();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
