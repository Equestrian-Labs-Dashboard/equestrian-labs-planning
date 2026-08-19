/*
Equestrian Labs — Strategic Operating Model
Ceci corrections hotfix v2.15.1 — 2026-08-19
Load AFTER assets/js/app.js.

Corrections:
1) Display Year drives Tab 2/3/4/5 outputs.
2) Tab 3 KPI + Operating KPI cards use selected year (no y2026 hardcode).
3) 2026 Organic Growth revenue = 0; each year's assumption drives NEXT year's organic revenue.
4) Dover Market Opportunity remains fixed at $130M for 2026–2029.
5) Existing scenario state/persistence is preserved; no reset and no replacement of app.js.
*/
(function () {
  "use strict";

  const YEARS = ["y2026", "y2027", "y2028", "y2029"];

  function safeCall(name, ...args) {
    try {
      const fn = window[name];
      if (typeof fn === "function") return fn(...args);
    } catch (err) {
      console.error(`[v2.15.1] ${name} failed`, err);
    }
  }

  function selectedYearLabel() {
    const select = document.getElementById("displayYear");
    const raw =
      (select && select.value) ||
      (window.STATE && STATE.meta && STATE.meta.displayYear) ||
      "2026";
    const y = String(raw).replace(/^y/, "");
    return YEARS.includes(`y${y}`) ? y : "2026";
  }

  function selectedYearKey() {
    return `y${selectedYearLabel()}`;
  }

  // Make selected year helpers authoritative for all downstream renderers.
  window.displayYearLabel = selectedYearLabel;
  window.displayYearKey = selectedYearKey;
  window.forecastPeriod = function (extra = "") {
    return [`Forecast ${selectedYearLabel()}`, extra]
      .filter(Boolean)
      .join(" · ");
  };

  // Ceci: Dover market base stays $130M. Capture % and annual ramp can change.
  window.doverMarketOpportunity = function () {
    return 130000000;
  };

  // Preserve original percentage resolver before replacing revenue formula.
  const originalOrganicGrowthPct =
    typeof window.organicGrowthPct === "function"
      ? window.organicGrowthPct
      : null;

  function priorYear(yearKey) {
    const i = YEARS.indexOf(yearKey);
    return i > 0 ? YEARS[i - 1] : null;
  }

  function organicPct(yearKey) {
    if (originalOrganicGrowthPct) {
      const n = Number(originalOrganicGrowthPct(yearKey) || 0);
      return Number.isFinite(n) ? n : 0;
    }
    return 0;
  }

  /*
   Ceci logic:
   - 2026 is Actuals + FCS, therefore no extra synthetic Organic Growth revenue in 2026.
   - The 2026 growth assumption creates 2027 Organic Growth.
   - 2027 assumption creates 2028.
   - 2028 assumption creates 2029.
  */
  window.organicGrowthRevenue = function (yearKey) {
    if (yearKey === "y2026") return 0;

    const prior = priorYear(yearKey);
    if (!prior) return 0;

    const base =
      typeof window.baseEcommerceRevenue === "function"
        ? Number(window.baseEcommerceRevenue(yearKey) || 0)
        : 0;

    return base * organicPct(prior);
  };

  const originalRenderFinancialSummary =
    typeof window.renderFinancialSummary === "function"
      ? window.renderFinancialSummary
      : null;

  function buildCard(label, value, sub) {
    if (typeof window.el === "function") {
      return el("div", { class: "kpi-card" }, [
        el("div", { class: "kpi-label" }, label),
        el(
          "div",
          {
            class:
              "kpi-value " +
              (typeof window.moneyClass === "function"
                ? moneyClass(value, "")
                : "")
          },
          value
        ),
        el("div", { class: "kpi-sub" }, sub)
      ]);
    }

    const card = document.createElement("div");
    card.className = "kpi-card";
    card.innerHTML =
      `<div class="kpi-label">${label}</div>` +
      `<div class="kpi-value">${value}</div>` +
      `<div class="kpi-sub">${sub}</div>`;
    return card;
  }

  /*
   Keep the existing Tab 3 P&L renderer.
   Then replace ONLY the cards that were incorrectly hard-coded to y2026.
  */
  window.renderFinancialSummary = function () {
    if (originalRenderFinancialSummary) {
      originalRenderFinancialSummary();
    }

    if (
      typeof window.marginBridge !== "function" ||
      typeof window.pnlOpexForYear !== "function"
    ) {
      return;
    }

    const y = selectedYearKey();
    const year = selectedYearLabel();
    const b = marginBridge(y);
    const opex = pnlOpexForYear(y, b);
    const ebitda = Number(b.gp3 || 0) - Number(opex.total || 0);

    const fmtMoney = n =>
      typeof window.formatFinancialMoney === "function"
        ? formatFinancialMoney(n, { dashZero: true })
        : `$${Math.round(Number(n || 0)).toLocaleString("en-US")}`;

    const fmtPct = n =>
      typeof window.formatPercent === "function"
        ? formatPercent(n)
        : `${(Number(n || 0) * 100).toFixed(1)}%`;

    const fmtMultiple = n =>
      typeof window.formatMultiple === "function"
        ? formatMultiple(n)
        : `${Number(n || 0).toFixed(1)}x`;

    const kpiWrap = document.getElementById("tab3KpiGrid");
    if (kpiWrap) {
      const cards = [
        ["Gross Sales", fmtMoney(b.grossSales), `Forecast ${year}`],
        [
          "Net Sales",
          fmtMoney(b.netSales),
          `Forecast ${year} · After Discounts & Returns`
        ],
        [
          "GP1",
          fmtMoney(b.gp1),
          `Forecast ${year} · ${
            b.netSales ? fmtPct(b.gp1 / b.netSales) + " of Net Sales" : "After COGS"
          }`
        ],
        [
          "GP2",
          fmtMoney(b.gp2),
          `Forecast ${year} · ${
            b.netSales
              ? fmtPct(b.gp2 / b.netSales) + " of Net Sales"
              : "After Fulfillment"
          }`
        ],
        [
          "GP3",
          fmtMoney(b.gp3),
          `Forecast ${year} · ${
            b.netSales
              ? fmtPct(b.gp3 / b.netSales) + " of Net Sales"
              : "After Advertising"
          }`
        ],
        [
          "EBITDA",
          fmtMoney(ebitda),
          `Forecast ${year} · After Operating Expenses`
        ]
      ];

      kpiWrap.innerHTML = "";
      cards.forEach(([label, value, sub]) =>
        kpiWrap.appendChild(buildCard(label, value, sub))
      );
    }

    // Fix the second hard-coded y2026 problem: Operating KPIs.
    const ops = document.getElementById("tab3OperatingKpis");
    if (ops) {
      const orders =
        typeof window.ordersForYear === "function"
          ? Number(ordersForYear(y) || 0)
          : 0;

      const newCustomers =
        typeof window.newCustomersForYear === "function"
          ? Number(newCustomersForYear(y) || 0)
          : 0;

      const roas =
        typeof window.roasForYear === "function"
          ? Number(roasForYear(y) || 0)
          : 0;

      const adSpend =
        Number(b.adSpend || 0) ||
        (typeof window.totalAdSpendByYear === "function"
          ? Number(totalAdSpendByYear(y) || 0)
          : 0);

      const abandonment =
        typeof window.checkoutAbandonmentRateForYear === "function"
          ? checkoutAbandonmentRateForYear(y)
          : null;

      const netGross =
        Number(b.grossSales || 0) !== 0
          ? Number(b.netSales || 0) / Number(b.grossSales || 0)
          : 0;

      const cards = [
        [
          "Orders",
          Math.round(orders).toLocaleString("en-US"),
          `Forecast ${year} · Ecommerce`
        ],
        [
          "New Customers",
          Math.round(newCustomers).toLocaleString("en-US"),
          `Forecast ${year} · Unique new customers`
        ],
        [
          "ROAS",
          fmtMultiple(roas),
          `Forecast ${year} · Scenario assumption`
        ],
        [
          "Ad Spend",
          fmtMoney(adSpend),
          `Forecast ${year} · Advertising`
        ],
        [
          "Net / Gross Ratio",
          fmtPct(netGross),
          `Forecast ${year} · Net Sales / Gross Sales`
        ],
        [
          "Checkout Abandonment Rate",
          abandonment == null ? "Data unavailable" : fmtPct(abandonment),
          `Forecast ${year} · Shopify KPI`
        ]
      ];

      ops.innerHTML = "";
      cards.forEach(([label, value, sub]) =>
        ops.appendChild(buildCard(label, value, sub))
      );
    }
  };

  function rerenderForDisplayYear() {
    safeCall("renderKpis");
    safeCall("renderSheet2Draft");
    safeCall("renderFinancialSummary");
    safeCall("renderCommercialCashFlow");

    // Different revisions used different Board renderer names.
    [
      "renderBoardDashboard",
      "renderBoard",
      "renderTab5",
      "renderExecutiveDashboard",
      "renderBoardView",
      "renderBoardTab"
    ].forEach(name => safeCall(name));

    safeCall("renderFormulaQA");
  }

  function bindDisplayYear() {
    const select = document.getElementById("displayYear");
    if (!select || select.dataset.ceciV2151 === "1") return;

    select.dataset.ceciV2151 = "1";

    if (window.STATE && STATE.meta && STATE.meta.displayYear) {
      select.value = String(STATE.meta.displayYear).replace(/^y/, "");
    }

    select.addEventListener("change", function (event) {
      if (window.STATE && STATE.meta) {
        STATE.meta.displayYear = String(event.target.value).replace(/^y/, "");
      }

      rerenderForDisplayYear();

      // Use existing persistence flow; do not bypass scenario logic.
      if (typeof window.scheduleSave === "function") {
        scheduleSave();
      } else if (
        window.DataService &&
        typeof DataService.save === "function" &&
        window.STATE
      ) {
        DataService.save(STATE);
      }
    });
  }

  window.runCeciV2151QA = function () {
    const results = [];

    function check(name, ok, detail) {
      results.push({ name, ok: Boolean(ok), detail: detail || "" });
    }

    check(
      "Display Year key",
      YEARS.includes(selectedYearKey()),
      selectedYearKey()
    );

    check(
      "Dover fixed 2026",
      doverMarketOpportunity("y2026") === 130000000,
      doverMarketOpportunity("y2026")
    );

    check(
      "Dover fixed 2029",
      doverMarketOpportunity("y2029") === 130000000,
      doverMarketOpportunity("y2029")
    );

    if (typeof window.organicGrowthRevenue === "function") {
      check(
        "2026 Organic Growth output = 0",
        organicGrowthRevenue("y2026") === 0,
        organicGrowthRevenue("y2026")
      );

      ["y2027", "y2028", "y2029"].forEach(y => {
        const value = Number(organicGrowthRevenue(y));
        check(
          `${y.slice(1)} Organic Growth finite`,
          Number.isFinite(value) && value >= 0,
          value
        );
      });
    }

    if (
      typeof window.marginBridge === "function" &&
      typeof window.pnlOpexForYear === "function"
    ) {
      const y = selectedYearKey();
      const b = marginBridge(y);
      const o = pnlOpexForYear(y, b);
      const ebitda = Number(b.gp3 || 0) - Number(o.total || 0);
      check(
        `EBITDA available for ${y.slice(1)}`,
        Number.isFinite(ebitda),
        ebitda
      );
    }

    console.table(results);
    const failed = results.filter(r => !r.ok);
    if (failed.length) {
      console.error("Ceci v2.15.1 QA FAILED", failed);
    } else {
      console.info("Ceci v2.15.1 QA PASSED");
    }

    return { results, failed };
  };

  function install() {
    bindDisplayYear();
    rerenderForDisplayYear();
    console.info("[Strategic Model v2.15.1] Ceci corrections active");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => setTimeout(install, 0));
  } else {
    setTimeout(install, 0);
  }
})();
