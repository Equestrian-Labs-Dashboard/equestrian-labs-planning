
/* =========================================================
   Sponsorship Tracker — Safe Responsive Table Wrapper
   Load this file AFTER the app scripts.
   It does NOT change data, formulas, filters or table rows.
   ========================================================= */

(() => {
  "use strict";

  function wrapTables() {
    document.querySelectorAll("table").forEach((table) => {
      if (
        table.closest(".table-responsive, .table-wrap, .table-wrapper, .table-container, .data-table-wrap")
      ) return;

      const wrapper = document.createElement("div");
      wrapper.className = "table-responsive";
      table.parentNode.insertBefore(wrapper, table);
      wrapper.appendChild(table);
    });
  }

  function normalizeMainWidth() {
    const main =
      document.querySelector(".main-content") ||
      document.querySelector(".page-content") ||
      document.querySelector(".dashboard-content") ||
      document.querySelector("main");

    if (!main) return;

    if (
      !main.querySelector(":scope > .responsive-content-inner") &&
      main.children.length
    ) {
      const inner = document.createElement("div");
      inner.className = "responsive-content-inner";

      while (main.firstChild) {
        inner.appendChild(main.firstChild);
      }
      main.appendChild(inner);
    }
  }

  function addSafeStyles() {
    if (document.getElementById("responsive-runtime-fix")) return;

    const style = document.createElement("style");
    style.id = "responsive-runtime-fix";
    style.textContent = `
      .responsive-content-inner {
        width: min(100%, 1480px);
        margin-inline: auto;
        padding-inline: clamp(16px, 2vw, 32px);
      }

      @media (max-width: 640px) {
        .responsive-content-inner {
          padding-inline: 12px;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function run() {
    addSafeStyles();
    wrapTables();
    normalizeMainWidth();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", run, { once: true });
  } else {
    run();
  }

  /* Re-wrap tables that are rendered dynamically after filters/navigation. */
  const observer = new MutationObserver(() => wrapTables());
  observer.observe(document.documentElement, { childList: true, subtree: true });
})();
