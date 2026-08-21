
/* =========================================================
   Strategic Operating Model — Section 4/5 visual decorator
   Visual only: does not mutate values, calculations or inputs.
   ========================================================= */

(() => {
  "use strict";

  const norm = (text) =>
    String(text || "")
      .toLowerCase()
      .replace(/\s+/g, " ")
      .trim();

  function findHeadingByText(needle) {
    return [...document.querySelectorAll("h1,h2,h3,h4,h5,.section-title,.section-header,strong")]
      .find((el) => norm(el.textContent).includes(norm(needle)));
  }

  function closestSectionContainer(heading) {
    if (!heading) return null;

    return (
      heading.closest("section") ||
      heading.closest(".section") ||
      heading.closest(".card-section") ||
      heading.closest(".tab-panel") ||
      heading.parentElement?.parentElement ||
      heading.parentElement
    );
  }

  function decorateMainTable(section) {
    if (!section) return;

    const table = section.querySelector("table");
    if (!table) return;

    let wrap = table.parentElement;
    if (!wrap.classList.contains("som-main-table-wrap")) {
      if (wrap.children.length === 1 && wrap.firstElementChild === table) {
        wrap.classList.add("som-main-table-wrap");
      } else {
        const newWrap = document.createElement("div");
        newWrap.className = "som-main-table-wrap";
        table.parentNode.insertBefore(newWrap, table);
        newWrap.appendChild(table);
      }
    }

    table.querySelectorAll("tbody td").forEach((cell) => {
      const value = norm(cell.textContent);

      if (
        value === "data unavailable" ||
        value === "unavailable" ||
        value === "n/a"
      ) {
        cell.classList.add("som-unavailable");
      }
    });

    // Visually distinguish the 2026/current column if present.
    const headers = [...table.querySelectorAll("thead th")];
    const currentIndex = headers.findIndex((th) => norm(th.textContent) === "2026");

    if (currentIndex >= 0) {
      table.querySelectorAll("tbody tr").forEach((row) => {
        const cell = row.children[currentIndex];
        if (cell) cell.classList.add("som-current-actual");
      });
    }
  }

  function decorateHeading(section, heading) {
    if (!section || !heading) return;
    heading.classList.add("som-section-title");
  }

  function decoratePurchasingSubcards(section) {
    if (!section) return;

    const candidates = [...section.querySelectorAll("div,article")].filter((el) => {
      const text = norm(el.textContent);
      return (
        text.startsWith("vendor payment mix") ||
        text.startsWith("capital efficiency")
      );
    });

    if (!candidates.length) return;

    const unique = candidates.filter((el) =>
      !candidates.some((other) => other !== el && other.contains(el))
    );

    const cards = unique.slice(0, 2);
    cards.forEach((card) => card.classList.add("som-purchasing-subcard"));

    if (cards.length === 2) {
      const parent = cards[0].parentElement;
      if (parent && cards[1].parentElement === parent) {
        parent.classList.add("som-purchasing-subgrid");
      }
    }

    // Turn plain payment mix text into readable chips when possible.
    const vendorCard = cards.find((card) =>
      norm(card.textContent).includes("vendor payment mix")
    );

    if (vendorCard && !vendorCard.querySelector(".som-payment-pills")) {
      const textNode = [...vendorCard.childNodes].find(
        (node) =>
          node.nodeType === Node.TEXT_NODE &&
          /prepaid|15 days|30.?45 days/i.test(node.textContent || "")
      );

      const paragraph =
        vendorCard.querySelector("p") ||
        [...vendorCard.children].find((el) =>
          /prepaid|15 days|30.?45 days/i.test(el.textContent || "")
        );

      const sourceText = paragraph?.textContent || textNode?.textContent || "";
      const matches = sourceText
        .split(/[·•|]/)
        .map((x) => x.trim())
        .filter(Boolean);

      if (matches.length >= 2) {
        const pills = document.createElement("div");
        pills.className = "som-payment-pills";
        matches.forEach((item) => {
          const pill = document.createElement("span");
          pill.className = "som-payment-pill";
          pill.textContent = item;
          pills.appendChild(pill);
        });

        if (paragraph) {
          paragraph.replaceWith(pills);
        } else if (textNode) {
          textNode.replaceWith(pills);
        }
      }
    }
  }

  function decorateMethodNote(section) {
    if (!section) return;

    [...section.querySelectorAll("p,small,em,div")].forEach((el) => {
      const text = norm(el.textContent);
      if (
        text.startsWith("markup =") ||
        text.includes("it is not gross margin")
      ) {
        el.classList.add("som-method-note");
      }
    });
  }

  function apply() {
    const purchasingHeading = findHeadingByText("SECTION 4");
    const purchasing = closestSectionContainer(purchasingHeading);

    if (purchasing) {
      purchasing.classList.add("som-purchasing-section");
      decorateHeading(purchasing, purchasingHeading);
      decorateMainTable(purchasing);
      decoratePurchasingSubcards(purchasing);
      decorateMethodNote(purchasing);
    }

    const operationsHeading = findHeadingByText("SECTION 5");
    const operations = closestSectionContainer(operationsHeading);

    if (operations) {
      operations.classList.add("som-operations-section");
      decorateHeading(operations, operationsHeading);
      decorateMainTable(operations);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", apply, { once: true });
  } else {
    apply();
  }

  // Re-apply after tab renders / refresh actuals.
  const observer = new MutationObserver(() => apply());
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
  });
})();
