
/*
 * EQUESTRIAN LABS — Strategic Operating Model
 * Ceci meeting consolidation v4.1 — 2026-08-21
 *
 * LOAD AFTER:
 *   assets/js/app.js
 *   assets/js/ceci-final-hotfix-v2.17.js
 *
 * IMPORTANT:
 * - This file REPLACES the temporary v3.8 / v3.9 / v4.0 patches.
 * - Do NOT load restore-2026-gm1-markup-v3.8.js
 * - Do NOT load fix-actuals-cavali-annualgp-v3.9.js
 * - Do NOT load smooth-gm1-cogs-v4.0.js
 *
 * MEETING SCOPE APPLIED:
 * 1) 2026 connected GM1 actuals are preserved; no fake 0%.
 * 2) Cavali Active Members come from Smartrr, not Shopify.
 * 3) Cavali Signature/Premier Boxes per Member / Year display at 1 decimal.
 * 4) Client-facing wording is Premier, not Premium.
 * 5) 2026 Markup uses connected actual when available; no fake 0%.
 * 6) Company GM1 forecast is a gradual margin path, NOT an inventory-funding split:
 *      2027 monthly path 36% -> 38% (annual model midpoint 37%)
 *      2028 monthly path 41% -> 43% (annual model midpoint 42%)
 *      2029 monthly path 45% -> 47% (annual model midpoint 46%)
 *    Valid saved management values inside each band are preserved.
 * 7) 2026 GM1 FCS is built from YTD actual plus a gradual funding-date ramp;
 *    it does not jump directly to the future target.
 * 8) P&L COGS = Net Sales × (1 - GM1); Inventory funding remains Cash Flow timing only.
 * 9) GP1 -> GP2 -> GP3 cascades from that corrected GM1/COGS logic.
 * 10) Annual GP per Customer = Ecommerce AOV × Purchase Frequency × Ecommerce GM1.
 * 11) Existing Paid Ads, Dover, Carryover, Private Label, Shipping assumptions,
 *     Cash Flow and scenario persistence remain untouched.
 */
(function () {
  "use strict";

  const YEARS = ["y2026","y2027","y2028","y2029"];
  const FORECAST_BANDS = {
    y2027: {start:0.36, end:0.38, min:0.36, max:0.38, def:0.37},
    y2028: {start:0.41, end:0.43, min:0.41, max:0.43, def:0.42},
    y2029: {start:0.45, end:0.47, min:0.45, max:0.47, def:0.46}
  };
  const CAVALI_REVIEW_FALLBACK = 0.397;

  function num(v) {
    if (typeof v === "number") return Number.isFinite(v) ? v : null;
    const s = String(v ?? "").trim();
    if (!s || /^(—|-|n\/a|na|data unavailable|actuals pending)$/i.test(s)) return null;
    const n = Number(s.replace(/[$,%x,\s]/g,""));
    return Number.isFinite(n) ? n : null;
  }

  function pct(v) {
    const s = String(v ?? "").trim();
    let n = num(v);
    if (n === null) return null;
    if (s.includes("%") || n > 1) n /= 100;
    return n >= 0 && n < 1.5 ? n : null;
  }

  function positive(v) {
    const n = num(v);
    return n !== null && n > 0 ? n : null;
  }

  function money(v) {
    if (typeof v === "number") return Number.isFinite(v) ? v : null;
    if (typeof window.parseMoney === "function") {
      try {
        const n = window.parseMoney(v);
        if (Number.isFinite(n)) return n;
      } catch {}
    }
    const s = String(v ?? "").trim().toLowerCase().replace(/[$,\s]/g,"");
    if (!s || /^(—|-|n\/a|na)$/.test(s)) return null;
    const m = s.match(/^(-?\d+(?:\.\d+)?)([km])?$/);
    if (!m) return null;
    let n = Number(m[1]);
    if (m[2] === "k") n *= 1e3;
    if (m[2] === "m") n *= 1e6;
    return Number.isFinite(n) ? n : null;
  }

  function fmtPct(v, digits=1) {
    return `${(Number(v || 0) * 100).toFixed(digits).replace(/\.0$/, "")}%`;
  }

  function fmtMoney(v) {
    if (typeof window.formatFinancialMoney === "function") {
      try { return window.formatFinancialMoney(v,{dashZero:true}); } catch {}
    }
    if (typeof window.formatMoney === "function") {
      try { return window.formatMoney(v); } catch {}
    }
    const a = Math.abs(Number(v || 0));
    const sign = v < 0 ? "-" : "";
    if (a >= 1e6) return `${sign}$${(a/1e6).toFixed(1).replace(/\.0$/,"")}M`;
    if (a >= 1e3) return `${sign}$${Math.round(a/1e3)}k`;
    return `${sign}$${Math.round(a).toLocaleString("en-US")}`;
  }

  function getBlockSafe(collection, title) {
    try {
      if (typeof window.getBlock === "function") {
        const b = window.getBlock(collection || [], title);
        if (b && b.title) return b;
      }
    } catch {}
    return (collection || []).find(b => String(b?.title || "").startsWith(title)) || null;
  }

  function getRowSafe(rows, names) {
    if (!Array.isArray(rows)) return null;
    const list = Array.isArray(names) ? names : [names];
    for (const name of list) {
      try {
        if (typeof window.getRow === "function") {
          const r = window.getRow(rows, name);
          if (r && r.driver) return r;
        }
      } catch {}
      const r = rows.find(x =>
        String(x?.driver || "").trim().toLowerCase() === String(name).trim().toLowerCase()
      );
      if (r) return r;
    }
    return null;
  }

  function engine(name) {
    return getBlockSafe(window.STATE?.growthEngines, name);
  }

  function engineRow(name, drivers) {
    return getRowSafe(engine(name)?.rows, drivers);
  }

  function commercialBlock(name) {
    return getBlockSafe(window.STATE?.commercial, name);
  }

  function setCurrent(row, value) {
    if (!row || value === null || value === undefined) return;
    row.current = value;
  }

  function set2026(row, value) {
    if (!row || value === null || value === undefined) return;
    row.y2026 = value;
  }

  function dashboardActual(bundle) {
    try {
      if (typeof window.dashboardActuals === "function") {
        return window.dashboardActuals(bundle?.kpis || []);
      }
    } catch {}
    return null;
  }

  function gmFromMetric(metric) {
    if (!metric) return null;
    for (const k of ["gm1","pct_gm","gross_margin","grossMargin","gm"]) {
      const p = pct(metric[k]);
      if (p !== null && p > 0) return p;
    }
    const net = money(metric.netSales ?? metric.net_sales);
    const gp  = money(metric.grossProfit ?? metric.gross_profit ?? metric.gp1);
    const cogs = money(metric.cogs ?? metric.cost_of_goods_sold);
    if (net > 0 && gp >= 0) return gp / net;
    if (net > 0 && cogs >= 0 && cogs <= net) return (net - cogs) / net;
    return null;
  }

  function currentActualGM1(name) {
    const fromState = pct(window.STATE?.actuals?.engineGm1?.[name]);
    if (fromState && fromState > 0) return fromState;
    const row = engineRow(name,"GM1 %");
    const r = pct(row?.current);
    return r && r > 0 ? r : null;
  }

  function fundingDateParts() {
    const raw = String(
      window.STATE?.meta?.fundingDate ||
      ((typeof window.selectedFundingRow === "function" && window.selectedFundingRow()) || {}).date ||
      ""
    ).trim();

    const m = raw.match(/([A-Za-z]{3})[-\s](\d{2,4})/);
    if (!m) return {month:10,year:2026};

    const months = {jan:1,feb:2,mar:3,apr:4,may:5,jun:6,jul:7,aug:8,sep:9,oct:10,nov:11,dec:12};
    let year = Number(m[2]);
    if (year < 100) year += 2000;
    return {month:months[m[1].toLowerCase()] || 10, year};
  }

  function actualThroughMonth() {
    const m = Number(window.STATE?.meta?.actualsThroughMonth || 0);
    if (m >= 1 && m <= 12) return m;
    const d = new Date();
    return d.getFullYear() === 2026 ? Math.max(1, Math.min(12, d.getMonth()+1)) : 8;
  }

  function linearPath(start, end) {
    return Array.from({length:12}, (_,i) => start + (end-start)*(i/11));
  }

  function forecastMonthlyGM1(yearKey) {
    if (FORECAST_BANDS[yearKey]) {
      const b = FORECAST_BANDS[yearKey];
      return linearPath(b.start,b.end);
    }

    // 2026: keep actual months at the actual YTD margin and only begin the
    // improvement when funding is expected to arrive.
    const actual = currentActualGM1("Ecommerce");
    if (!(actual > 0)) return Array(12).fill(null);

    const {month:fundMonth,year:fundYear} = fundingDateParts();
    const through = actualThroughMonth();

    // No 2026 funding -> no artificial 2026 margin jump.
    if (fundYear > 2026) return Array(12).fill(actual);

    // Funding earlier in the year permits a little more exit-margin improvement.
    let exitLift = 0.015;              // Oct-Dec style case: roughly +1.5 pts
    if (fundMonth <= 6) exitLift = 0.025;
    else if (fundMonth <= 9) exitLift = 0.020;

    const exit = Math.min(0.34, actual + exitLift);
    const startRampMonth = Math.max(through + 1, fundMonth);
    const values = Array(12).fill(actual);

    if (startRampMonth <= 12) {
      const count = 13 - startRampMonth;
      for (let m=startRampMonth; m<=12; m++) {
        const step = count <= 1 ? 1 : (m-startRampMonth)/(count-1);
        values[m-1] = actual + (exit-actual)*step;
      }
    }
    return values;
  }

  function average(arr) {
    const v = (arr || []).filter(x => Number.isFinite(x));
    return v.length ? v.reduce((a,b)=>a+b,0)/v.length : null;
  }

  function selectedPortfolioGM1(yearKey) {
    if (yearKey === "y2026") {
      const avg = average(forecastMonthlyGM1("y2026"));
      return avg && avg > 0 ? avg : currentActualGM1("Ecommerce");
    }

    const band = FORECAST_BANDS[yearKey];
    if (!band) return null;

    // Preserve a saved management value if it is inside Ceci's agreed band.
    const row = engineRow("Ecommerce","GM1 %");
    const saved = pct(row?.[yearKey]);
    if (saved !== null && saved >= band.min && saved <= band.max) return saved;

    return band.def;
  }

  function applyForecastGM1Rows() {
    const ecom = engineRow("Ecommerce","GM1 %");
    if (!ecom) return;

    const y26 = selectedPortfolioGM1("y2026");
    if (y26 > 0) ecom.y2026 = fmtPct(y26);

    for (const y of ["y2027","y2028","y2029"]) {
      const band = FORECAST_BANDS[y];
      const existing = pct(ecom[y]);
      if (!(existing !== null && existing >= band.min && existing <= band.max)) {
        ecom[y] = fmtPct(band.def);
      }
    }
  }

  function smartrrMembership(bundle) {
    try {
      if (typeof window.smartrrMembershipActuals === "function") {
        return window.smartrrMembershipActuals(bundle?.smartrrProductVolume || []);
      }
    } catch {}
    return {signatureActive:0,premiumActive:0};
  }

  function roundOne(v) {
    const n = positive(v);
    return n === null ? null : Number(n.toFixed(1)).toString();
  }

  function restoreCavaliActuals(cavaliBundle) {
    const c = engine("Cavali");
    if (!c) return;

    const sm = smartrrMembership(cavaliBundle);

    const sigMembers = getRowSafe(c.rows,"Signature Active Members");
    const premMembers = getRowSafe(c.rows,["Premier Active Members","Premium Active Members"]);
    const sigBoxes = getRowSafe(c.rows,["Signature Boxes per Member / Year","Signature Boxes per Year"]);
    const premBoxes = getRowSafe(c.rows,["Premier Boxes per Member / Year","Premium Boxes per Member / Year","Premium Boxes per Year"]);
    const premPrice = getRowSafe(c.rows,["Premier Price","Premium Price"]);

    if (positive(sm.signatureActive)) {
      const v = Math.round(sm.signatureActive).toLocaleString("en-US");
      setCurrent(sigMembers,v); set2026(sigMembers,v);
    }
    if (positive(sm.premiumActive)) {
      const v = Math.round(sm.premiumActive).toLocaleString("en-US");
      setCurrent(premMembers,v); set2026(premMembers,v);
    }

    const sb = roundOne(sigBoxes?.current) ?? roundOne(sigBoxes?.y2026);
    const pb = roundOne(premBoxes?.current) ?? roundOne(premBoxes?.y2026);
    if (sb !== null) { setCurrent(sigBoxes,sb); set2026(sigBoxes,sb); }
    if (pb !== null) { setCurrent(premBoxes,pb); set2026(premBoxes,pb); }

    if (sigBoxes) sigBoxes.driver = "Signature Boxes / Member / Year";
    if (premBoxes) premBoxes.driver = "Premier Boxes / Member / Year";
    if (premMembers) premMembers.driver = "Premier Active Members";
    if (premPrice) premPrice.driver = "Premier Price";

    // Cavali GM1 actual: source first; fallback only when the source truly has no usable margin.
    const cavaliActual = dashboardActual(cavaliBundle);
    let cavaliGM = gmFromMetric(cavaliActual) || currentActualGM1("Cavali");
    if (!(cavaliGM > 0)) cavaliGM = CAVALI_REVIEW_FALLBACK;

    const gmRow = getRowSafe(c.rows,"GM1 %");
    setCurrent(gmRow,fmtPct(cavaliGM));
    if (!(pct(gmRow?.y2026) > 0)) set2026(gmRow,fmtPct(cavaliGM));

    window.STATE.actuals ||= {};
    window.STATE.actuals.engineGm1 ||= {};
    window.STATE.actuals.engineGm1.Cavali = cavaliGM;
  }

  function restoreCorroGM1(corroBundle) {
    const actual = dashboardActual(corroBundle);
    const gm = gmFromMetric(actual);
    if (!(gm > 0)) return;

    window.STATE.actuals ||= {};
    window.STATE.actuals.engineGm1 ||= {};

    ["Ecommerce","Concierge","Wellington"].forEach(name => {
      window.STATE.actuals.engineGm1[name] = gm;
      const row = engineRow(name,"GM1 %");
      setCurrent(row,fmtPct(gm));
    });
  }

  function restoreMarkup(corroBundle,cavaliBundle) {
    const rows = window.STATE?.purchasing?.commercialTerms || [];
    const row = getRowSafe(rows,["Markup % (on Cost)","Markup %","Markup"]);
    if (!row) return;

    let actual = null;
    try {
      if (typeof window.weightedMarkupActuals === "function") {
        actual = window.weightedMarkupActuals([
          corroBundle?.productsQ1 || [],
          cavaliBundle?.productsQ1 || []
        ]);
      }
    } catch {}

    if (Number.isFinite(actual) && actual > 0) {
      row.current = fmtPct(actual);
      row.y2026 = fmtPct(actual);
    }
    row.driver = "Markup % (on Cost)";
    row.note = "Connected actual when available. Markup = (Selling Price - Cost) / Cost; it is not GM1.";
  }

  function recomputeAnnualGP() {
    const retention = commercialBlock("Retention");
    const ecom = engine("Ecommerce");
    if (!retention || !ecom) return;

    const annual = getRowSafe(retention.rows,"Annual GP per Customer");
    const pf = getRowSafe(retention.rows,"Purchase Frequency");
    const aov = getRowSafe(ecom.rows,"AOV");
    const gm = getRowSafe(ecom.rows,"GM1 %");
    if (!annual || !pf || !aov || !gm) return;

    for (const y of YEARS) {
      const av = money(aov[y] ?? aov.current);
      const freq = positive(pf[y] ?? pf.current);
      const margin = pct(gm[y] ?? gm.current);
      if (av > 0 && freq > 0 && margin > 0) {
        annual[y] = fmtMoney(av * freq * margin);
      }
    }
    const avc = money(aov.current);
    const pfc = positive(pf.current);
    const gmc = pct(gm.current);
    if (avc > 0 && pfc > 0 && gmc > 0) annual.current = fmtMoney(avc*pfc*gmc);
  }

  /*
   * Portfolio Financial logic:
   * The funding Inventory allocation is NEVER spread into P&L COGS.
   * Financial GM1 drives GP1 and COGS; GP2 / GP3 then cascade normally.
   */
  const originalMarginBridge = typeof window.marginBridge === "function" ? window.marginBridge : null;
  if (originalMarginBridge) {
    window.marginBridge = function(yearKey) {
      const b = originalMarginBridge(yearKey);
      if (!b) return b;

      const gm1 = selectedPortfolioGM1(yearKey);
      if (!(gm1 > 0) || !(Number(b.netSales) >= 0)) return b;

      const net = Number(b.netSales || 0);
      const gp1 = net * gm1;
      const cogs = net - gp1;
      const gp2 = gp1 - Number(b.outboundShipping || 0) - Number(b.packaging || 0) + Number(b.shippingRevenue || 0);
      const gp3 = gp2 - Number(b.adSpend || 0);

      return {
        ...b,
        gm1Pct: gm1,
        gp1,
        cogs,
        gp2,
        gp3,
        inventoryFundingExcludedFromCogs: true
      };
    };
  }

  function addMarginNote() {
    const root = document.getElementById("formulaQaBlocks");
    if (!root || root.querySelector(".ceci-20260821-margin-note")) return;

    const y26 = forecastMonthlyGM1("y2026");
    const card = document.createElement("section");
    card.className = "mini-card qa-card ceci-20260821-margin-note";
    card.innerHTML = `
      <h3>GM1 / COGS — Ceci 2026-08-21 review</h3>
      <table class="grid qa-table">
        <thead><tr><th>Period</th><th>GM1 logic</th><th>COGS logic</th><th>Status</th></tr></thead>
        <tbody>
          <tr><td>2026</td><td>YTD actual + gradual funding-date FCS; Dec exit ≈ ${y26[11] ? fmtPct(y26[11]) : "source pending"}</td><td>Net Sales × (1 − GM1)</td><td>✓</td></tr>
          <tr><td>2027</td><td>Monthly 36% → 38%; annual midpoint 37%</td><td>Net Sales × (1 − GM1)</td><td>✓</td></tr>
          <tr><td>2028</td><td>Monthly 41% → 43%; annual midpoint 42%</td><td>Net Sales × (1 − GM1)</td><td>✓</td></tr>
          <tr><td>2029</td><td>Monthly 45% → 47%; annual midpoint 46%</td><td>Net Sales × (1 − GM1)</td><td>✓</td></tr>
          <tr><td>Inventory Funding</td><td>Working-capital / Cash Flow timing</td><td>Not added directly to P&L COGS</td><td>✓</td></tr>
        </tbody>
      </table>
    `;
    root.appendChild(card);
  }

  function rerenderAffected() {
    applyForecastGM1Rows();
    recomputeAnnualGP();

    for (const fn of [
      "renderBusinessUnits",
      "renderPurchasing",
      "renderSheet2Draft",
      "renderFinancialSummary",
      "renderCommercialCashFlow",
      "renderBoardDashboard",
      "renderFormulaQA"
    ]) {
      try { if (typeof window[fn] === "function") window[fn](); } catch(err) {
        console.warn("v4.1 render skipped",fn,err);
      }
    }
    addMarginNote();
  }

  const originalApply = typeof window.applyActualsToState === "function" ? window.applyActualsToState : null;
  if (originalApply) {
    window.applyActualsToState = function(corroBundle,cavaliBundle) {
      const result = originalApply.apply(this,arguments);

      restoreCorroGM1(corroBundle);
      restoreCavaliActuals(cavaliBundle);
      restoreMarkup(corroBundle,cavaliBundle);
      applyForecastGM1Rows();
      recomputeAnnualGP();

      setTimeout(rerenderAffected,0);
      return result;
    };
  }

  // Preserve the values when scenario/header inputs cause a re-render.
  const originalRenderAll = typeof window.renderAll === "function" ? window.renderAll : null;
  if (originalRenderAll) {
    window.renderAll = function() {
      applyForecastGM1Rows();
      recomputeAnnualGP();
      const result = originalRenderAll.apply(this,arguments);
      addMarginNote();
      return result;
    };
  }

  window.runCeci20260821ModelQA = function() {
    const c = engine("Cavali");
    const ret = commercialBlock("Retention");
    const rows = YEARS.map(y => {
      const b = typeof window.marginBridge === "function" ? window.marginBridge(y) : {};
      return {
        year:y.slice(1),
        gm1: b.gm1Pct ?? (b.netSales ? b.gp1/b.netSales : null),
        grossSales:b.grossSales,
        netSales:b.netSales,
        cogs:b.cogs,
        gp1:b.gp1,
        gp2:b.gp2,
        gp3:b.gp3
      };
    });
    console.table(rows);

    const cavali = {
      signatureActive:getRowSafe(c?.rows,"Signature Active Members")?.y2026,
      signatureBoxes:getRowSafe(c?.rows,["Signature Boxes / Member / Year","Signature Boxes per Member / Year"])?.y2026,
      premierActive:getRowSafe(c?.rows,"Premier Active Members")?.y2026,
      premierBoxes:getRowSafe(c?.rows,["Premier Boxes / Member / Year","Premier Boxes per Member / Year"])?.y2026,
      cavaliGM1:getRowSafe(c?.rows,"GM1 %")?.current,
      ecommerceGM1:engineRow("Ecommerce","GM1 %")?.current,
      markup2026:getRowSafe(window.STATE?.purchasing?.commercialTerms || [],["Markup % (on Cost)","Markup %"])?.y2026,
      annualGP2026:getRowSafe(ret?.rows,"Annual GP per Customer")?.y2026
    };
    console.table(cavali);

    return {
      financial:rows,
      cavali,
      monthlyGM1:{
        y2026:forecastMonthlyGM1("y2026"),
        y2027:forecastMonthlyGM1("y2027"),
        y2028:forecastMonthlyGM1("y2028"),
        y2029:forecastMonthlyGM1("y2029")
      }
    };
  };

  document.addEventListener("DOMContentLoaded",()=>setTimeout(rerenderAffected,0));
  if (document.readyState !== "loading") setTimeout(rerenderAffected,0);

  console.info("Ceci meeting model consolidation v4.1 loaded.");
})();
