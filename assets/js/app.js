let STATE = null;
let saveTimer = null;

function isFormulaToken(v) {
  const text = String(v ?? "").trim().toLowerCase();
  return text === "calculated" || text === "kpi / calculated" || text === "source" || text === "n/a" || text === "na" || text === "—" || text === "-" || text === "";
}


function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  Object.entries(attrs).forEach(([k, v]) => {
    if (k === "class") node.className = v;
    else if (k === "html") node.innerHTML = v;
    else node.setAttribute(k, v);
  });
  (Array.isArray(children) ? children : [children]).forEach(c => {
    if (c !== null && c !== undefined && c !== "") node.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
  });
  return node;
}

function optionList(values, selected) {
  return values.map(v => `<option value="${v}" ${v === selected ? "selected" : ""}>${v}</option>`).join("");
}

function parseMoney(v) {
  if (typeof v === "number") return v;
  if (!v) return 0;
  const raw = String(v).trim();
  const cleaned = raw.replace(/[$,]/g, "").replace(/\/\s*month/i, "").trim();
  const m = cleaned.match(/^(-?\d+(?:\.\d+)?)\s*([kKmM])?$/);
  if (m) {
    const n = Number(m[1]);
    const suffix = (m[2] || "").toLowerCase();
    if (suffix === "k") return n * 1000;
    if (suffix === "m") return n * 1000000;
    return n;
  }
  return Number(cleaned) || 0;
}

function formatCurrency(n) {
  const value = Number(n || 0);
  const sign = value < 0 ? "-" : "";
  const abs = Math.abs(value);
  return sign + "$" + Math.round(abs).toLocaleString("en-US");
}

function formatCompactCurrency(n) {
  const value = Number(n || 0);
  const sign = value < 0 ? "-" : "";
  const abs = Math.abs(value);
  if (abs >= 1000000) return sign + "$" + (abs / 1000000).toFixed(1).replace(".0", "") + "M";
  if (abs >= 1000) return sign + "$" + (abs / 1000).toFixed(0) + "k";
  return sign + "$" + Math.round(abs).toLocaleString("en-US");
}

function formatMoney(n) {
  // Software-style display: < $1M as k, >= $1M as M with one decimal.
  return formatCompactCurrency(n);
}

function formatFinancialMoney(n, opts = {}) {
  const value = Number(n || 0);
  if (opts.dashZero && Math.abs(value) < 0.5) return "—";
  return formatMoney(value);
}

function moneyClass(value, base = "calc-cell") {
  const text = String(value ?? "").trim();
  let cls = base;
  if (text === "—" || text === "$0") cls += " zero-value";
  if (text.startsWith("-$") || text.startsWith("(")) cls += " negative-value";
  return cls;
}

function fundingTotal(row) {
  if (row.total !== undefined && row.total !== null) return parseMoney(row.total);
  const label = String(row.scenario || "").replace("$", "").trim();
  if (!label || label === "Base") return 0;
  if (label.toLowerCase().endsWith("k")) return parseFloat(label) * 1000;
  if (label.toUpperCase().endsWith("M")) return parseFloat(label) * 1000000;
  return parseMoney(label);
}

function scenarioLabel() {
  return STATE.meta.fundingScenario === "Base $0" ? "Base" : STATE.meta.fundingScenario;
}

function selectedFundingRow() {
  return STATE.funding.find(r => r.scenario === scenarioLabel()) || STATE.funding[0];
}

function updateIndicator(text) {
  const indicator = document.getElementById("saveIndicator");
  if (indicator) indicator.textContent = text;
}

function saveNow() {
  clearTimeout(saveTimer);
  DataService.save(STATE);
  updateIndicator("Saved ✓");
}

function scheduleSave() {
  if (STATE && typeof renderSheet2Draft === "function") renderSheet2Draft();
  clearTimeout(saveTimer);
  updateIndicator("Saving…");
  saveTimer = setTimeout(saveNow, 400);
}

function downloadState() {
  saveNow();
  const blob = new Blob([JSON.stringify(STATE, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `strategic-model-assumptions-${new Date().toISOString().slice(0,10)}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function makeEditableCell(rowObj, key, onChange, opts = {}) {
  const td = el("td", { class: "editable" });
  const input = el("input", { type: "text" });
  input.value = rowObj[key] ?? "";
  if (opts.money && typeof rowObj[key] === "number") input.value = formatMoney(rowObj[key]);
  input.addEventListener("change", e => {
    let v = e.target.value;
    if (opts.money) {
      rowObj[key] = parseMoney(v);
      input.value = rowObj[key] ? formatMoney(rowObj[key]) : "$0";
    } else {
      rowObj[key] = v;
    }
    onChange();
  });
  td.appendChild(input);
  return td;
}

function makeCalcCell(value, className = "calc-cell") {
  return el("td", { class: moneyClass(value, className) }, value);
}


function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function scenarioSnapshot() {
  const snap = deepClone(STATE);
  delete snap.scenarioVersions;
  return snap;
}

function ensureScenarioStore() {
  if (!STATE.scenarioVersions) STATE.scenarioVersions = {};
}

function saveScenarioInputs(status) {
  ensureScenarioStore();
  const key = status || (STATE.meta && STATE.meta.modelStatus) || "Draft";
  STATE.scenarioVersions[key] = scenarioSnapshot();
}

function renderAll() {
  syncHeaderToTables();
  renderHeader();
  renderKpis();
  renderFunding();
  renderCommercial();
  renderBusinessUnits();
  renderPurchasing();
  renderOperations();
  renderSheet2Draft();
  renderFinancialSummary();
  renderCommercialCashFlow();
  renderFormulaQA();
  renderGrowth();
  renderThesis();
}

function switchModelStatus(nextStatus) {
  if (!STATE || !STATE.meta) return;
  const currentStatus = STATE.meta.modelStatus || "Draft";
  if (nextStatus === currentStatus) return;
  saveScenarioInputs(currentStatus);
  const store = STATE.scenarioVersions || {};
  if (store[nextStatus]) {
    const nextState = deepClone(store[nextStatus]);
    nextState.scenarioVersions = store;
    STATE = nextState;
  }
  STATE.meta.modelStatus = nextStatus;
  renderAll();
  saveNow();
}

function publishScenario() {
  ensureScenarioStore();
  const source = STATE.meta.modelStatus || "Draft";
  const choices = ["Budget", "Forecast", "Board"].filter(x => x !== source);
  const target = prompt(`Publish ${source} inputs to which scenario?\n${choices.join(" / ")}`, choices[0] || "Budget");
  if (!target || !choices.includes(target)) return;
  if (!confirm(`This will overwrite ${target} with the current ${source} inputs. Continue?`)) return;
  saveScenarioInputs(source);
  const snap = scenarioSnapshot();
  snap.meta.modelStatus = target;
  STATE.scenarioVersions[target] = snap;
  saveNow();
  alert(`${source} published to ${target}.`);
}

function renderHeader() {
  const { meta, lists } = STATE;
  document.getElementById("modelStatus").innerHTML = optionList(lists.modelStatus, meta.modelStatus);
  document.getElementById("fundingScenario").innerHTML = optionList(lists.fundingScenario, meta.fundingScenario);
  document.getElementById("fundingDate").innerHTML = optionList(lists.fundingDate, meta.fundingDate);
  document.getElementById("baseEcommerce").value = meta.baseEcommerceMonthly || "$70k";
  document.getElementById("doverCapture").innerHTML = optionList(lists.doverCapture || ["5%", "10%", "15%", "20%", "30%"], meta.doverCapture);
  document.getElementById("roas").innerHTML = optionList(lists.roas || ["3.0x", "3.5x", "4.0x"], meta.roas);
  document.getElementById("lastUpdate").value = meta.lastUpdate;
  document.getElementById("versionBadge").textContent = `v${meta.version}`;

  document.getElementById("modelStatus").onchange = e => switchModelStatus(e.target.value);
  document.getElementById("fundingScenario").onchange = e => { meta.fundingScenario = e.target.value; applyFundingOrganicDefault(); renderKpis(); renderFunding(); renderCommercial(); renderGrowth(); renderBusinessUnits(); renderSheet2Draft(); renderThesis(); scheduleSave(); };
  document.getElementById("fundingDate").onchange = e => { meta.fundingDate = e.target.value; renderKpis(); renderGrowth(); renderSheet2Draft(); scheduleSave(); };
  document.getElementById("baseEcommerce").onchange = e => { meta.baseEcommerceMonthly = e.target.value; renderKpis(); renderSheet2Draft(); renderThesis(); scheduleSave(); };
  document.getElementById("doverCapture").onchange = e => { meta.doverCapture = e.target.value; syncHeaderToTables(); renderKpis(); renderCommercial(); renderSheet2Draft(); renderThesis(); scheduleSave(); };
  document.getElementById("roas").onchange = e => { meta.roas = e.target.value; syncHeaderToTables(); renderKpis(); renderCommercial(); renderSheet2Draft(); renderThesis(); scheduleSave(); };
  document.getElementById("lastUpdate").oninput = e => { meta.lastUpdate = e.target.value; scheduleSave(); };
}


function selectedOrganicGrowth() {
  const market = getBlock(STATE.commercial, "Market Growth");
  const row = market ? getRow(market.rows, "Organic Growth %") : {};
  return row.y2026 || (selectedFundingRow() || {}).organicGrowthDefault || STATE.meta.organicGrowth || "10%";
}

function applyFundingOrganicDefault() {
  const row = selectedFundingRow();
  const market = getBlock(STATE.commercial, "Market Growth");
  if (market && row && row.organicGrowthDefault) {
    const org = getRow(market.rows, "Organic Growth %");
    if (org) {
      org.y2026 = row.organicGrowthDefault;
      STATE.meta.organicGrowth = row.organicGrowthDefault;
    }
  }
}

function syncHeaderToTables() {
  const years = ["y2026", "y2027", "y2028", "y2029"];
  const market = STATE.commercial.find(b => b.title.includes("Market Growth"));
  if (market) {
    const dover = market.rows.find(r => String(r.driver || "").startsWith("Dover Target Capture")) || market.rows.find(r => r.driver === "Dover Capture %");
    // Header Dover Capture is the scenario target; when it changes, apply it across all forecast years.
    if (dover) years.forEach(y => { dover[y] = STATE.meta.doverCapture; });
  }
  const acq = STATE.commercial.find(b => b.title.includes("Acquisition"));
  if (acq) {
    const roas = acq.rows.find(r => r.driver === "ROAS");
    // Header ROAS is also a scenario assumption; keep all forecast years aligned unless users edit later.
    if (roas) years.forEach(y => { roas[y] = STATE.meta.roas; });
  }
}

function renderKpis() {
  const wrap = document.getElementById("kpiGrid");
  const row = selectedFundingRow();
  const cards = [
    { label: "Funding", value: STATE.meta.fundingScenario, sub: "" },
    { label: "Funding Date", value: STATE.meta.fundingDate || row.date, sub: "" },
    { label: "Base Ecommerce", value: STATE.meta.baseEcommerceMonthly || "$70k", sub: "Monthly Run Rate" },
    { label: "Dover Capture", value: STATE.meta.doverCapture, sub: "" },
    { label: "ROAS", value: STATE.meta.roas, sub: "" },
  ];
  wrap.innerHTML = "";
  cards.forEach(k => wrap.appendChild(el("div", { class: "kpi-card" }, [
    el("div", { class: "kpi-label" }, k.label),
    el("div", { class: "kpi-value" }, k.value),
    k.sub ? el("div", { class: "kpi-sub" }, k.sub) : null,
  ])));
}

function renderFunding() {
  const cols = ["scenario", "date", "organicGrowthDefault", "payables", "inventory", "marketing", "embroidery", "privateLabel"];
  const heads = ["Scenario", "Date", "Organic Growth", "Payables", "Inventory", "Marketing", "Embroidery", "Private Label", "Unallocated Capital"];
  const table = document.getElementById("fundingTable");
  table.innerHTML = `<thead><tr>${heads.map(h => `<th>${h}</th>`).join("")}</tr></thead>`;
  const tbody = el("tbody");
  STATE.funding.forEach(row => {
    const tr = el("tr");
    cols.forEach(col => {
      if (col === "scenario") tr.appendChild(el("td", { class: "label-cell scenario-cell" }, row.scenario));
      else if (col === "date") tr.appendChild(makeEditableCell(row, col, () => { renderFunding(); scheduleSave(); }));
      else if (col === "organicGrowthDefault") tr.appendChild(makeEditableCell(row, col, () => { applyFundingOrganicDefault(); renderCommercial(); renderSheet2Draft(); renderThesis(); scheduleSave(); }));
      else tr.appendChild(makeEditableCell(row, col, () => { renderFunding(); scheduleSave(); }, { money: true }));
    });
    const allocated = ["marketing", "inventory", "payables", "embroidery", "privateLabel"].reduce((sum, k) => sum + parseMoney(row[k]), 0);
    const unallocated = fundingTotal(row) - allocated;
    const cls = unallocated === 0 ? "calc-cell" : "calc-cell warning-cell";
    tr.appendChild(makeCalcCell((unallocated === 0 ? "✓ " : "⚠ ") + formatMoney(unallocated), cls));
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
}

function isMarketGrowthSharedAssumption(row) {
  const driver = String((row && row.driver) || "");
  return driver.startsWith("Dover Market Opportunity") || driver.startsWith("Dover Target Capture") || driver.startsWith("Paid Ads Overlap");
}

function syncSharedMarketGrowthAssumption(row, changedKey) {
  if (!row || !isMarketGrowthSharedAssumption(row)) return;
  const years = ["y2026", "y2027", "y2028", "y2029"];
  const sourceKey = years.includes(changedKey) ? changedKey : "y2026";
  const value = row[sourceKey] || row.current || row.y2026 || "";
  if (!value) return;
  years.forEach(y => { row[y] = value; });
  if (String(row.driver || "").startsWith("Dover Market Opportunity")) {
    row.current = value;
  }
}

function displayCurrentForDriver(row) {
  if (!row) return "";
  if (String(row.driver || "").startsWith("Dover Market Opportunity")) {
    return row.y2026 || row.current || "";
  }
  return row.current || "";
}

function renderDriverTable(tableEl, rows) {
  const heads = ["Driver", "Baseline / Current", "2026", "2027", "2028", "2029"];
  tableEl.innerHTML = `<thead><tr>${heads.map(h => `<th>${h}</th>`).join("")}</tr></thead>`;
  const tbody = el("tbody");
  rows.forEach(row => {
    const tr = el("tr", { class: row.driver === "Discounts & Returns %" ? "economics-row" : "" });
    tr.appendChild(el("td", { class: "label-cell" }, row.driver));
    ["current", "y2026", "y2027", "y2028", "y2029"].forEach(k => {
      if (k === "current") tr.appendChild(makeCalcCell(displayCurrentForDriver(row), "gray-cell"));
      else if (row.calculated && row.calculated.includes(k)) tr.appendChild(makeCalcCell(computedCommercialValue(row, k) || row[k] || "Calculated"));
      else tr.appendChild(makeEditableCell(row, k, () => {
        syncSharedMarketGrowthAssumption(row, k);
        renderCommercial();
        renderSheet2Draft();
        scheduleSave();
      }));
    });
    tbody.appendChild(tr);
  });
  tableEl.appendChild(tbody);
}

function renderCommercial() {
  syncHeaderToTables();
  const wrap = document.getElementById("commercialBlocks");
  wrap.innerHTML = "";
  STATE.commercial.forEach(block => {
    const card = el("div", { class: "block-card" }, [
      el("div", { class: "block-title" }, block.title),
      el("table", { class: "grid" })
    ]);
    renderDriverTable(card.querySelector("table"), block.rows);
    if (block.title && block.title.includes("Market Growth")) {
      card.appendChild(renderDoverRamp(block));
    }
    wrap.appendChild(card);
  });
}

function renderEngineTable(tableEl, rows) {
  const heads = ["Driver", "Baseline / Current", "2026", "2027", "2028", "2029"];
  tableEl.innerHTML = `<thead><tr>${heads.map(h => `<th>${h}</th>`).join("")}</tr></thead>`;
  const tbody = el("tbody");
  rows.forEach(row => {
    const tr = el("tr");
    tr.appendChild(el("td", { class: "label-cell" }, row.driver));
    ["current", "y2026", "y2027", "y2028", "y2029"].forEach(k => {
      if (k === "current") tr.appendChild(makeCalcCell(row[k] || "", "gray-cell"));
      else tr.appendChild(makeEditableCell(row, k, () => scheduleSave()));
    });
    tbody.appendChild(tr);
  });
  tableEl.appendChild(tbody);
}

function fundingAmountSelected() {
  return fundingTotal(selectedFundingRow());
}

function gateStatusForEngine(engine) {
  const funding = fundingAmountSelected();
  if (engine.title.startsWith("Embroidery")) {
    return funding >= 1000000 ? { text: "ACTIVE ✓", cls: "active" } : { text: "LOCKED 🔒 below $1M", cls: "locked" };
  }
  if (engine.title.startsWith("Private Label")) {
    return funding >= 3000000 ? { text: "ACTIVE ✓", cls: "active" } : { text: "LOCKED 🔒 below $3M", cls: "locked" };
  }
  return null;
}

function renderBusinessUnits() {
  const wrap = document.getElementById("engineBlocks");
  wrap.innerHTML = "";
  const order = ["Ecommerce", "Concierge", "Wellington", "Embroidery", "Cavali", "Private Label"];
  const engines = [...(STATE.growthEngines || [])].sort((a, b) => {
    const ai = order.findIndex(x => String(a.title || "").startsWith(x));
    const bi = order.findIndex(x => String(b.title || "").startsWith(x));
    return (ai < 0 ? 99 : ai) - (bi < 0 ? 99 : bi);
  });
  engines.forEach(engine => {
    const gate = gateStatusForEngine(engine);
    const full = String(engine.title || "").startsWith("Cavali") || String(engine.title || "").startsWith("Private Label");
    const card = el("div", { class: "block-card" + (full ? " full-width" : "") }, [
      el("div", { class: "block-title" }, engine.title),
      engine.note ? el("div", { class: "block-note" }, engine.note) : null,
      el("table", { class: "grid" }),
      gate ? el("div", { class: `status-pill ${gate.cls}` }, gate.text) : null,
    ]);
    renderEngineTable(card.querySelector("table"), engine.rows);
    wrap.appendChild(card);
  });
}

function renderPurchasing() {
  renderDriverTable(document.getElementById("purchasingTable"), STATE.purchasing.commercialTerms);
  const vmTable = document.getElementById("vendorMixTable");
  vmTable.innerHTML = `<thead><tr><th>Prepaid %</th><th>&lt;15 Days %</th><th>30–45 Days %</th></tr></thead>`;
  const tbody = el("tbody");
  const tr = el("tr");
  ["prepaid", "under15", "d30to45"].forEach(k => tr.appendChild(makeEditableCell(STATE.purchasing.vendorMix, k, () => { renderPurchasing(); scheduleSave(); })));
  tbody.appendChild(tr);
  const total = parsePercent(STATE.purchasing.vendorMix.prepaid) + parsePercent(STATE.purchasing.vendorMix.under15) + parsePercent(STATE.purchasing.vendorMix.d30to45);
  const check = el("tr");
  check.appendChild(el("td", { class: Math.abs(total - 1) < 0.001 ? "calc-cell" : "calc-cell warning-cell", colspan: "3" }, (Math.abs(total - 1) < 0.001 ? "✓ " : "⚠ ") + `Vendor mix total ${formatPercent(total)}`));
  tbody.appendChild(check);
  vmTable.appendChild(tbody);
  renderDriverTable(document.getElementById("capitalEfficiencyTable"), STATE.purchasing.capitalEfficiency);
}

function renderOperations() {
  renderDriverTable(document.getElementById("opsTable"), STATE.operations);
}

function parsePercent(v) {
  if (typeof v === "number") return v > 1 ? v / 100 : v;
  const n = parseFloat(String(v || "").replace("%", ""));
  if (isNaN(n)) return 0;
  return n > 1 ? n / 100 : n;
}

function parseMultiple(v) {
  const n = parseFloat(String(v || "").replace("x", ""));
  return isNaN(n) ? 0 : n;
}

function parseNumber(v) {
  if (typeof v === "number") return v;
  if (!v) return 0;
  const raw = String(v).trim();
  const cleaned = raw.replace(/[$,%x,]/g, "").replace(/\/\s*month/i, "").trim();
  const m = cleaned.match(/^(-?\d+(?:\.\d+)?)\s*([kKmM])?$/);
  if (m) {
    const n = Number(m[1]);
    const suffix = (m[2] || "").toLowerCase();
    if (suffix === "k") return n * 1000;
    if (suffix === "m") return n * 1000000;
    return n;
  }
  const n = Number(cleaned);
  return isNaN(n) ? 0 : n;
}

function formatPercent(n) {
  return (Number(n || 0) * 100).toFixed(1).replace(".0", "") + "%";
}

function formatMultiple(n) {
  return Number(n || 0).toFixed(1) + "x";
}


function monthIndexFromFundingDate(value) {
  const s = String(value || "").trim();
  const m = s.match(/^([A-Za-z]{3})-(\d{2})$/);
  if (!m) return null;
  const months = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 };
  const mon = months[m[1].toLowerCase()];
  if (mon === undefined) return null;
  return { year: 2000 + Number(m[2]), month: mon };
}

function addMonths(dateObj, monthsToAdd) {
  const d = new Date(dateObj.year, dateObj.month + monthsToAdd, 1);
  return { year: d.getFullYear(), month: d.getMonth() };
}

function monthsBetweenInclusive(start, end) {
  if (!start || !end) return [];
  const out = [];
  let y = start.year, m = start.month;
  while (y < end.year || (y === end.year && m <= end.month)) {
    out.push({ year: y, month: m });
    m += 1;
    if (m > 11) { m = 0; y += 1; }
  }
  return out;
}

function adSpendCoverageEndForScenario(total, start) {
  if (!start) return null;
  if (total <= 500000) return addMonths(start, 5);
  if (total <= 1000000) return { year: 2027, month: 11 };
  if (total <= 3000000) return { year: 2028, month: 11 };
  return { year: 2029, month: 11 };
}

function incrementalAdSpendByYear(yearKey) {
  const year = Number(String(yearKey).replace("y", ""));
  const funding = selectedFundingRow();
  const total = fundingTotal(funding);
  const marketingAllocation = parseMoney(funding.marketing);
  if (!year || !marketingAllocation || total <= 0) return 0;
  const fundingDate = monthIndexFromFundingDate(STATE.meta.fundingDate || funding.date);
  if (!fundingDate) return 0;
  const start = addMonths(fundingDate, 1);
  const end = adSpendCoverageEndForScenario(total, start);
  const months = monthsBetweenInclusive(start, end);
  if (!months.length) return 0;
  const monthly = marketingAllocation / months.length;
  return months.filter(x => x.year === year).length * monthly;
}

function baseAdSpendByYear(yearKey) {
  const year = Number(String(yearKey).replace("y", ""));
  return year ? 20000 * 12 : 0;
}

function totalAdSpendManualOrEditable(yearKey) {
  const acq = getBlock(STATE.commercial, "Acquisition");
  const totalRow = getRow(acq ? acq.rows : [], "Total Ad Spend");
  const directCell = totalRow ? totalRow[yearKey] : "";
  return !isFormulaToken(directCell) ? parseMoney(directCell) : 0;
}

function targetAdSpendPct(yearKey) {
  const acq = getBlock(STATE.commercial, "Acquisition");
  const rows = acq ? acq.rows : [];
  const targetRow = getRow(rows, "Target Ad Spend % of Ecommerce Gross Sales");
  const legacyRow = getRow(rows, "Ad Spend % of Gross Sales");
  const cell = (targetRow && targetRow[yearKey]) || (legacyRow && legacyRow[yearKey]) || (targetRow && targetRow.current) || "20%";
  return parsePercent(cell || "20%");
}

function roasForYear(yearKey) {
  const acq = getBlock(STATE.commercial, "Acquisition");
  return parseMultiple(val(acq ? acq.rows : [], "ROAS", yearKey) || STATE.meta.roas || "0x");
}

function totalAdSpendByYear(yearKey) {
  // 2029 is intentionally editable. In the current $3M scenario, funding-driven
  // incremental marketing ends in 2028, so management chooses reinvestment for 2029.
  // 2026–2028 are calculated from Target Ad Spend % of Ecommerce Gross Sales.
  if (yearKey === "y2029") return totalAdSpendManualOrEditable(yearKey);
  return ecommerceBuild(yearKey).adSpend;
}

function privateLabelLaunchStart() {
  const fundingDate = monthIndexFromFundingDate(STATE.meta.fundingDate || (selectedFundingRow() || {}).date);
  return fundingDate ? addMonths(fundingDate, 12) : null;
}

function privateLabelRevenueActiveForYear(yearKey) {
  const year = Number(String(yearKey).replace("y", ""));
  const launch = privateLabelLaunchStart();
  if (!year || !launch) return false;
  return year > launch.year || (year === launch.year && launch.month <= 11);
}

function computedCommercialValue(row, key) {
  if (!row || !key || key === "current") return null;
  if (row.driver === "Base Ad Spend") return formatMoney(baseAdSpendByYear(key));
  if (row.driver === "Incremental Ad Spend") {
    if (key === "y2029") return "—";
    return formatMoney(incrementalAdSpendByYear(key));
  }
  if (row.driver === "Total Ad Spend") {
    // Calculated through 2028 from Target Ad Spend % of Ecommerce Gross Sales;
    // 2029 is editable and therefore handled by the cell value.
    if (key === "y2029") return null;
    return formatMoney(totalAdSpendByYear(key));
  }
  if (row.driver === "Target Ad Spend % of Ecommerce Gross Sales") {
    if (key === "y2029") {
      const gross = ecommerceBuild(key).total;
      return gross ? formatPercent(totalAdSpendByYear(key) / gross) : "—";
    }
    return null;
  }
  if (row.driver === "Ad Spend % of Ecommerce Gross Sales" || row.driver === "Ad Spend % of Gross Sales") {
    const gross = ecommerceBuild(key).total;
    return gross ? formatPercent(totalAdSpendByYear(key) / gross) : "—";
  }
  if (row.driver === "CAC") {
    const ecommerce = getBlock(STATE.growthEngines, "Ecommerce");
    const orders = parseNumber(val(ecommerce ? ecommerce.rows : [], "Orders", key));
    const newPct = parsePercent(val((getBlock(STATE.commercial, "Acquisition") || {}).rows, "New Customer Mix %", key));
    const newCustomers = orders * (newPct || 0);
    return newCustomers ? formatMoney(totalAdSpendByYear(key) / newCustomers) : "—";
  }
  if (row.driver === "Annual GP per Customer") {
    const ecommerce = getBlock(STATE.growthEngines, "Ecommerce");
    const retention = getBlock(STATE.commercial, "Retention");
    const aov = parseMoney(val(ecommerce ? ecommerce.rows : [], "AOV", key));
    const pf = parseNumber(val(retention ? retention.rows : [], "Purchase Frequency", key));
    const gm1 = parsePercent(val(ecommerce ? ecommerce.rows : [], "GM1 %", key));
    return (aov && pf && gm1) ? formatMoney(aov * pf * gm1) : "—";
  }
  return null;
}

function yearLabel(key) {
  return key === "current" ? "Current" : key.replace("y", "");
}

function getBlock(list, titleStarts) {
  return (list || []).find(b => String(b.title || "").startsWith(titleStarts));
}

function getRow(rows, driver) {
  return (rows || []).find(r => r.driver === driver) || {};
}

function isBlankLike(v) {
  const s = String(v ?? "").trim();
  if (!s || s === "$" || s === "-" || s === "—") return true;
  if (/^calculated$/i.test(s) || /^kpi \/ calculated$/i.test(s)) return true;
  if (/^no ad_spend/i.test(s) || /^needs /i.test(s) || /^revenue share/i.test(s)) return true;
  return false;
}
function isFormulaToken(v) {
  const text = String(v ?? "").trim().toLowerCase();
  return text === "calculated" || text === "kpi / calculated" || text === "source" || text === "n/a" || text === "na" || text === "—" || text === "-" || text === "";
}

function val(rows, driver, year) {
  const row = getRow(rows, driver);
  const requested = row[year];
  if (year !== "current" && isBlankLike(requested) && !isBlankLike(row.current)) return row.current;
  return requested || "";
}

function engineKeyFromTitle(title) {
  const t = String(title || "").toLowerCase();
  if (t.startsWith("ecommerce")) return "Ecommerce";
  if (t.startsWith("concierge")) return "Concierge";
  if (t.startsWith("wellington")) return "Wellington";
  if (t.startsWith("cavali")) return "Cavali";
  if (t.startsWith("embroidery")) return "Embroidery";
  if (t.startsWith("private label")) return "Private Label";
  return "";
}

function actualEngineFallback(title, active) {
  if (!active || !STATE.actuals || !STATE.actuals.engineGrossSales) return null;
  const key = engineKeyFromTitle(title);
  const gross = parseNumber(STATE.actuals.engineGrossSales[key]);
  if (!key || !gross) return null;
  const gm1 = parsePercent((STATE.actuals.engineGm1 || {})[key]);
  return { gross, gp1: gross * gm1, gm1, active: true, note: "Google Sheet actual / baseline" };
}

function engineGrossAndGp(engine, year) {
  const title = engine.title || "";
  const rows = engine.rows || [];
  let gross = 0;
  let gp1 = 0;
  let note = "";
  let active = true;

  if (title.startsWith("Embroidery") && fundingAmountSelected() < 1000000) active = false;
  if (title.startsWith("Private Label") && fundingAmountSelected() < 3000000) active = false;
  if (title.startsWith("Private Label") && active && !privateLabelRevenueActiveForYear(year)) return { gross: 0, gp1: 0, gm1: 0, active: true, note: "Active gate; pending launch" };

  if (!active) return { gross: 0, gp1: 0, gm1: 0, active: false, note: "Locked by funding gate" };

  if (title.startsWith("Ecommerce") || title.startsWith("Wellington") || title.startsWith("Embroidery")) {
    const orders = parseNumber(val(rows, "Orders", year));
    const aov = parseMoney(val(rows, "AOV", year));
    const gm1 = parsePercent(val(rows, "GM1 %", year));
    gross = orders * aov;
    gp1 = gross * gm1;
    note = "Orders × AOV";
    if (!gross) { const fallback = actualEngineFallback(title, active); if (fallback) return fallback; }
    return { gross, gp1, gm1, active, note };
  }

  if (title.startsWith("Concierge")) {
    const clients = parseNumber(val(rows, "Active Clients", year));
    const ordersPerClient = parseNumber(val(rows, "Orders per Client", year));
    const aov = parseMoney(val(rows, "AOV", year));
    const gm1 = parsePercent(val(rows, "GM1 %", year));
    gross = clients * ordersPerClient * aov;
    gp1 = gross * gm1;
    note = "Clients × Orders/Client × AOV";
    if (!gross) { const fallback = actualEngineFallback(title, active); if (fallback) return fallback; }
    return { gross, gp1, gm1, active, note };
  }

  if (title.startsWith("Cavali")) {
    const sigMembers = parseNumber(val(rows, "Signature Active Members", year));
    const sigBoxes = parseNumber(val(rows, "Signature Boxes per Year", year));
    const sigPrice = parseMoney(val(rows, "Signature Price", year));
    const premMembers = parseNumber(val(rows, "Premium Active Members", year));
    const premBoxes = parseNumber(val(rows, "Premium Boxes per Year", year));
    const premPrice = parseMoney(val(rows, "Premium Price", year));
    const gm1 = parsePercent(val(rows, "GM1 %", year));
    gross = sigMembers * sigBoxes * sigPrice + premMembers * premBoxes * premPrice;
    gp1 = gross * gm1;
    note = "$99 + $199 membership products";
    if (!gross) { const fallback = actualEngineFallback(title, active); if (fallback) return fallback; }
    return { gross, gp1, gm1, active, note };
  }

  if (title.startsWith("Private Label")) {
    const units = parseNumber(val(rows, "Units Sold", year));
    const asp = parseMoney(val(rows, "Average Selling Price", year));
    const gm1 = parsePercent(val(rows, "GM1 %", year));
    gross = units * asp;
    gp1 = gross * gm1;
    note = "Units × ASP";
    if (!gross) { const fallback = actualEngineFallback(title, active); if (fallback) return fallback; }
    return { gross, gp1, gm1, active, note };
  }

  return { gross, gp1, gm1: 0, active, note };
}

function engineOutputs(year = "y2026") {
  return (STATE.growthEngines || []).map(engine => {
    const out = engineGrossAndGp(engine, year);
    return {
      engine: (engine.title || "").split(" — ")[0],
      owner: ((engine.title || "").split(" — ")[1] || ""),
      title: engine.title,
      ...out
    };
  });
}

function marginBridge(year = "y2026") {
  const outputs = engineOutputs(year);
  const grossSales = outputs.reduce((s, r) => s + r.gross, 0);
  const gp1 = outputs.reduce((s, r) => s + r.gp1, 0);
  const acq = getBlock(STATE.commercial, "Acquisition");
  const dnrPct = parsePercent(val((STATE.purchasing || {}).commercialTerms || [], "Discounts & Returns %", year));
  const discountsReturns = grossSales * dnrPct;
  const netSales = grossSales - discountsReturns;

  const outboundPct = parsePercent(val(STATE.operations, "Outbound Shipping Cost %", year));
  const packagingPct = parsePercent(val(STATE.operations, "Packaging Cost %", year));
  const shippingRevPct = parsePercent(val(STATE.operations, "Shipping Revenue %", year));
  const outboundShipping = netSales * outboundPct;
  const packaging = netSales * packagingPct;
  const shippingRevenue = netSales * shippingRevPct;
  const gp2 = gp1 - outboundShipping - packaging + shippingRevenue;

  const cavali = getBlock(STATE.growthEngines, "Cavali");
  const cavaliAdSpend = parseMoney(val(cavali ? cavali.rows : [], "Cavali Ad Spend", year));
  const adSpend = totalAdSpendByYear(year) + cavaliAdSpend;
  const gp3 = gp2 - adSpend;

  return { grossSales, discountsReturns, netSales, dnrPct, gp1, outboundShipping, packaging, shippingRevenue, gp2, adSpend, variableMarketing: adSpend, gp3 };
}

function renderMiniCards(id, cards) {
  const wrap = document.getElementById(id);
  if (!wrap) return;
  wrap.innerHTML = "";
  cards.forEach(k => wrap.appendChild(el("div", { class: "kpi-card" }, [
    el("div", { class: "kpi-label" }, k.label),
    el("div", { class: "kpi-value" }, k.value),
    k.sub ? el("div", { class: "kpi-sub" }, k.sub) : null,
  ])));
}


/* ---------------- V16 Dover ramp + Ecommerce Revenue Build + Carryover ---------------- */
function yearKeys() { return ["y2026", "y2027", "y2028", "y2029"]; }

function currentDoverTargetPct(year) {
  const market = getBlock(STATE.commercial, "Market Growth");
  const rows = market ? market.rows : [];
  const row = (rows || []).find(r => String(r.driver || "").startsWith("Dover Target Capture"));
  const v = row ? (row[year] || row.current || "") : "";
  return parsePercent(v || STATE.meta.doverCapture || "20%");
}

function doverRampPct(year) {
  const market = getBlock(STATE.commercial, "Market Growth");
  const ramp = market && market.doverRamp ? market.doverRamp[year] : "0%";
  return parsePercent(ramp);
}

function paidAdsOverlapPct(year) {
  const market = getBlock(STATE.commercial, "Market Growth");
  const rows = market ? market.rows : [];
  const row = (rows || []).find(r => String(r.driver || "").startsWith("Paid Ads Overlap"));
  const v = row ? (row[year] || row.current || "") : "";
  return parsePercent(v || "30%");
}

function doverMarketOpportunity(year) {
  const market = getBlock(STATE.commercial, "Market Growth");
  const rows = market ? market.rows : [];
  const row = (rows || []).find(r => String(r.driver || "").startsWith("Dover Market Opportunity"));
  const v = row ? (row[year] || row.current || "") : "";
  return parseMoney(v || "$100M");
}

function grossDoverOpportunity(year) {
  return doverMarketOpportunity(year) * currentDoverTargetPct(year) * doverRampPct(year);
}

function netDoverCapture(year) {
  return grossDoverOpportunity(year) * (1 - paidAdsOverlapPct(year));
}

function organicGrowthPct(year) {
  const market = getBlock(STATE.commercial, "Market Growth");
  return parsePercent(val(market ? market.rows : [], "Organic Growth %", year) || selectedOrganicGrowth());
}

function carryoverPctForYear(year) {
  const retention = getBlock(STATE.commercial, "Retention");
  return parsePercent(val(retention ? retention.rows : [], "Incremental Revenue Carryover %", year) || "0%");
}

function baseEcommerceRevenue(year) {
  const years = yearKeys();
  const idx = years.indexOf(year);
  const monthly = parseMoney(STATE.meta.baseEcommerceMonthly || "$70k");
  const initialBase = monthly * 12;
  if (idx <= 0) return initialBase;

  let base = initialBase;
  for (let i = 1; i <= idx; i++) {
    const priorYear = years[i - 1];
    const priorOrganic = base * organicGrowthPct(priorYear);
    const priorPaid = incrementalPaidGrowth(priorYear);
    const priorDover = netDoverCapture(priorYear);
    const carryover = carryoverPctForYear(priorYear);
    // Latest Easy Numbers Test logic: the editable carryover rate applies to
    // Organic Growth + Paid Growth Revenue + Net Dover Capture. This keeps the
    // formula map and implemented model aligned before actuals are loaded.
    base = base + carryover * (priorOrganic + priorPaid + priorDover);
  }
  return base;
}

function organicGrowthRevenue(year) {
  return baseEcommerceRevenue(year) * organicGrowthPct(year);
}

function incrementalPaidGrowth(year) {
  return ecommerceBuild(year).paid;
}

function ecommerceBuild(year) {
  const base = baseEcommerceRevenue(year);
  const organic = organicGrowthRevenue(year);
  const dover = netDoverCapture(year);
  const roas = roasForYear(year);
  const prePaidRevenue = base + organic + dover;

  let adSpend = 0;
  let paid = 0;
  let total = prePaidRevenue;
  let warning = "";

  if (year === "y2029") {
    // 2029 is management reinvestment: direct editable spend, then ROAS creates paid growth revenue.
    adSpend = totalAdSpendManualOrEditable(year);
    paid = adSpend * roas;
    total = prePaidRevenue + paid;
  } else {
    // 2026–2028: solve the circular relationship exactly.
    // Total Ecommerce Gross Sales = prePaidRevenue + (Total Ecommerce Gross Sales × Ad Spend % × ROAS)
    // => Total Ecommerce Gross Sales = prePaidRevenue / (1 - Ad Spend % × ROAS)
    const pct = targetAdSpendPct(year);
    const multiplier = pct * roas;
    if (pct > 0 && multiplier < 1) {
      total = prePaidRevenue / (1 - multiplier);
      adSpend = total * pct;
      paid = adSpend * roas;
    } else if (pct > 0 && multiplier >= 1) {
      warning = "Ad Spend % × ROAS must be below 100%";
      // Conservative fallback so the page never breaks.
      adSpend = baseAdSpendByYear(year) + incrementalAdSpendByYear(year);
      paid = adSpend * roas;
      total = prePaidRevenue + paid;
    } else {
      // If target percentage is blank/zero, use the funding/base spend fallback.
      adSpend = baseAdSpendByYear(year) + incrementalAdSpendByYear(year);
      paid = adSpend * roas;
      total = prePaidRevenue + paid;
    }
  }

  return { base, organic, paid, dover, total, adSpend, roas, warning };
}

function renderDoverRamp(block) {
  const market = block || getBlock(STATE.commercial, "Market Growth");
  if (!market.doverRamp) market.doverRamp = { y2026: "5%", y2027: "55%", y2028: "25%", y2029: "15%" };
  const wrap = el("div", { class: "dover-ramp-wrap" });
  const opp = doverMarketOpportunity("y2026");
  const targetPct = currentDoverTargetPct("y2026");
  const target = opp * targetPct;
  wrap.appendChild(el("div", { class: "dover-assumption-grid" }, [
    el("div", { class: "dover-assumption" }, [el("span", {}, "Dover Market Opportunity (Gross)"), el("strong", {}, formatCompactCurrency(opp))]),
    el("div", { class: "dover-assumption" }, [el("span", {}, "Gross Addressable Opportunity"), el("strong", {}, `${formatPercent(targetPct)} Target = ${formatCompactCurrency(target)}`)]),
    el("div", { class: "dover-assumption" }, [el("span", {}, "Paid Ads Overlap"), el("strong", {}, formatPercent(paidAdsOverlapPct("y2026")))])
  ]));
  const table = el("table", { class: "grid dover-ramp-table" });
  table.innerHTML = `<thead><tr><th>Dover Capture Ramp</th>${yearKeys().map(y => `<th>${yearLabel(y)}</th>`).join("")}<th>Total</th></tr></thead>`;
  const tbody = el("tbody");
  const pctRow = el("tr");
  pctRow.appendChild(el("td", { class: "label-cell" }, "% of Target Capture"));
  yearKeys().forEach(y => pctRow.appendChild(makeEditableCell(market.doverRamp, y, () => { renderCommercial(); renderSheet2Draft(); scheduleSave(); })));
  const totalPct = yearKeys().reduce((s, y) => s + parsePercent(market.doverRamp[y]), 0);
  pctRow.appendChild(makeCalcCell(formatPercent(totalPct), Math.abs(totalPct - 1) < 0.001 ? "calc-cell" : "calc-cell warning-cell"));
  tbody.appendChild(pctRow);
  const grossRow = el("tr");
  grossRow.appendChild(el("td", { class: "label-cell" }, "Gross Dover Capture (before paid overlap)"));
  yearKeys().forEach(y => grossRow.appendChild(makeCalcCell(formatCompactCurrency(grossDoverOpportunity(y)))));
  grossRow.appendChild(makeCalcCell(formatCompactCurrency(yearKeys().reduce((s,y)=>s+grossDoverOpportunity(y),0))));
  tbody.appendChild(grossRow);
  const netRow = el("tr");
  netRow.appendChild(el("td", { class: "label-cell" }, "Net Dover Capture after paid ads overlap"));
  yearKeys().forEach(y => netRow.appendChild(makeCalcCell(formatCompactCurrency(netDoverCapture(y)))));
  netRow.appendChild(makeCalcCell(formatCompactCurrency(yearKeys().reduce((s,y)=>s+netDoverCapture(y),0))));
  tbody.appendChild(netRow);
  table.appendChild(tbody);
  wrap.appendChild(el("p", { class: "section-sub" }, "Dover Capture Ramp"));
  wrap.appendChild(table);
  return wrap;
}

function renderEcommerceRevenueBuild() {
  const table = document.getElementById("ecommerceBuildTable");
  if (!table) return;
  const years = yearKeys();
  const rows = [
    ["Base Ecommerce Revenue", y => ecommerceBuild(y).base],
    ["+ Organic Growth", y => ecommerceBuild(y).organic],
    ["+ Paid Growth Revenue", y => ecommerceBuild(y).paid],
    ["+ Net Dover Capture", y => ecommerceBuild(y).dover],
    ["Total Ecommerce Gross Sales", y => ecommerceBuild(y).total, true]
  ];
  table.innerHTML = `<thead><tr><th>Revenue Components</th>${years.map(y => `<th>${yearLabel(y)}</th>`).join("")}</tr></thead>`;
  const tbody = el("tbody");
  rows.forEach(([label, fn, total]) => {
    const tr = el("tr");
    tr.appendChild(el("td", { class: "label-cell" + (total ? " total-row-label" : "") }, label));
    years.forEach(y => tr.appendChild(makeCalcCell(formatCompactCurrency(fn(y)))));
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
}

function selectedDnrPct(year) {
  return parsePercent(val((STATE.purchasing || {}).commercialTerms || [], "Discounts & Returns %", year));
}

function engineGrossAndGp(engine, year) {
  const title = engine.title || "";
  const rows = engine.rows || [];
  let gross = 0;
  let gm1 = 0;
  let note = "";
  let active = true;

  if (title.startsWith("Embroidery") && fundingAmountSelected() < 1000000) active = false;
  if (title.startsWith("Private Label") && fundingAmountSelected() < 3000000) active = false;
  if (title.startsWith("Private Label") && active && !privateLabelRevenueActiveForYear(year)) return { gross: 0, gp1: 0, gm1: 0, active: true, note: "Active gate; pending launch" };
  if (!active) return { gross: 0, gp1: 0, gm1: 0, active: false, note: "Locked by funding gate" };

  if (title.startsWith("Ecommerce")) {
    gross = ecommerceBuild(year).total;
    gm1 = parsePercent(val(rows, "GM1 %", year));
    note = "Base + Organic + Paid Growth + Net Dover";
  } else if (title.startsWith("Wellington") || title.startsWith("Embroidery")) {
    const orders = parseNumber(val(rows, "Orders", year));
    const aov = parseMoney(val(rows, "AOV", year));
    gm1 = parsePercent(val(rows, "GM1 %", year));
    gross = orders * aov;
    note = "Orders × AOV";
  } else if (title.startsWith("Concierge")) {
    const clients = parseNumber(val(rows, "Active Clients", year));
    const ordersPerClient = parseNumber(val(rows, "Orders per Client", year));
    const aov = parseMoney(val(rows, "AOV", year));
    gm1 = parsePercent(val(rows, "GM1 %", year));
    gross = clients * ordersPerClient * aov;
    note = "Clients × Orders/Client × AOV";
  } else if (title.startsWith("Cavali")) {
    const sigMembers = parseNumber(val(rows, "Signature Active Members", year));
    const sigBoxes = parseNumber(val(rows, "Signature Boxes per Year", year));
    const sigPrice = parseMoney(val(rows, "Signature Price", year));
    const premMembers = parseNumber(val(rows, "Premium Active Members", year));
    const premBoxes = parseNumber(val(rows, "Premium Boxes per Year", year));
    const premPrice = parseMoney(val(rows, "Premium Price", year));
    gm1 = parsePercent(val(rows, "GM1 %", year));
    const base = sigMembers * sigBoxes * sigPrice + premMembers * premBoxes * premPrice;
    const adSpend = parseMoney(val(rows, "Cavali Ad Spend", year));
    const cac = parseMoney(val(rows, "Cavali CAC", year));
    const newMembers = cac ? adSpend / cac : 0;
    const memberCount = sigMembers + premMembers;
    const weightedBoxes = memberCount ? ((sigMembers * sigBoxes) + (premMembers * premBoxes)) / memberCount : 0;
    const weightedPrice = memberCount ? ((sigMembers * sigPrice) + (premMembers * premPrice)) / memberCount : 0;
    const paidGrowth = newMembers * weightedBoxes * weightedPrice;
    gross = base + paidGrowth;
    note = "$99 + $199 memberships + paid growth WA";
  } else if (title.startsWith("Private Label")) {
    const units = parseNumber(val(rows, "Units Sold", year));
    const asp = parseMoney(val(rows, "Average Selling Price", year));
    gm1 = parsePercent(val(rows, "GM1 %", year));
    gross = units * asp;
    note = "Units × ASP";
  }

  if (!gross) {
    const fallback = actualEngineFallback(title, active);
    if (fallback) { gross = fallback.gross; gm1 = fallback.gm1; note = fallback.note; }
  }
  const engineNetSales = gross * (1 - selectedDnrPct(year));
  const gp1 = engineNetSales * gm1;
  return { gross, gp1, gm1, active, note };
}

function renderSheet2Scenario() {
  renderMiniCards("sheet2ScenarioGrid", [
    { label: "Funding", value: STATE.meta.fundingScenario, sub: "" },
    { label: "Funding Date", value: STATE.meta.fundingDate, sub: "" },
    { label: "Base Ecommerce", value: STATE.meta.baseEcommerceMonthly || "$70k", sub: "Monthly Run Rate" },
    { label: "Dover Capture", value: STATE.meta.doverCapture, sub: "" },
    { label: "ROAS", value: STATE.meta.roas, sub: "" },
  ]);
}

function renderFinancialSnapshot(year = "y2026") {
  const m = marginBridge(year);
  renderMiniCards("financialSnapshotGrid", [
    { label: "Gross Sales", value: formatMoney(m.grossSales), sub: yearLabel(year) },
    { label: "Net Sales", value: formatMoney(m.netSales), sub: "After Discounts & Returns" },
    { label: "Net-to-Gross", value: m.grossSales ? formatPercent(m.netSales / m.grossSales) : "—", sub: "Net Sales / Gross Sales" },
    { label: "Gross Profit 1", value: formatMoney(m.gp1), sub: m.netSales ? `${formatPercent(m.gp1 / m.netSales)} of Net Sales` : "GP1 / Net Sales" },
    { label: "Gross Profit 2", value: formatMoney(m.gp2), sub: m.netSales ? `${formatPercent(m.gp2 / m.netSales)} of Net Sales` : "GP2 / Net Sales" },
    { label: "Gross Profit 3", value: formatMoney(m.gp3), sub: m.netSales ? `${formatPercent(m.gp3 / m.netSales)} of Net Sales` : "GP3 / Net Sales" },
  ]);
}

function renderSheet2EngineDetail(year = "y2026") {
  const table = document.getElementById("sheet2EngineDetailTable");
  if (!table) return;
  const heads = ["Growth Engine", "Owner", "Formula", "Status", "Gross Sales", "GM1 %", "GP1"];
  table.innerHTML = `<thead><tr>${heads.map(h => `<th>${h}</th>`).join("")}</tr></thead>`;
  const tbody = el("tbody");
  engineOutputs(year).forEach(row => {
    const tr = el("tr");
    tr.appendChild(el("td", { class: "label-cell" }, row.engine));
    tr.appendChild(makeCalcCell(row.owner || "—"));
    tr.appendChild(makeCalcCell(row.note || "Formula pending"));
    tr.appendChild(el("td", { class: "calc-cell" }, el("span", { class: `status-pill ${row.active ? "active" : "locked"} inline` }, row.active ? "ACTIVE ✓" : "LOCKED 🔒")));
    tr.appendChild(makeCalcCell(formatMoney(row.gross)));
    tr.appendChild(makeCalcCell(row.gm1 ? formatPercent(row.gm1) : "—"));
    tr.appendChild(makeCalcCell(formatMoney(row.gp1)));
    tbody.appendChild(tr);
  });

  const acq = getBlock(STATE.commercial, "Acquisition");
  const adSpend = totalAdSpendByYear(year);
  const roas = parseMultiple(val(acq ? acq.rows : [], "ROAS", year));
  const support = el("tr");
  support.appendChild(el("td", { class: "label-cell" }, "Paid Revenue Influenced"));
  support.appendChild(makeCalcCell("Emma"));
  support.appendChild(makeCalcCell("Ad Spend × ROAS — informational only"));
  support.appendChild(makeCalcCell("Do not add to sales"));
  support.appendChild(makeCalcCell(formatMoney(adSpend * roas)));
  support.appendChild(makeCalcCell(formatMultiple(roas)));
  support.appendChild(makeCalcCell("Validation KPI"));
  tbody.appendChild(support);

  table.appendChild(tbody);
}

function renderSheet2ExecSummary(year = "y2026") {
  const table = document.getElementById("sheet2ExecSummaryTable");
  if (!table) return;
  const outputs = engineOutputs(year);
  const totalSales = outputs.reduce((s, r) => s + r.gross, 0);
  const totalGp1 = outputs.reduce((s, r) => s + r.gp1, 0);
  const heads = ["Growth Engine", "Owner", "Gross Sales", "% Total Sales", "GM1 %", "GP1", "% Total GP1"];
  table.innerHTML = `<thead><tr>${heads.map(h => `<th>${h}</th>`).join("")}</tr></thead>`;
  const tbody = el("tbody");
  outputs.forEach(row => {
    const tr = el("tr");
    tr.appendChild(el("td", { class: "label-cell" }, row.engine));
    tr.appendChild(makeCalcCell(row.owner || "—"));
    tr.appendChild(makeCalcCell(formatMoney(row.gross)));
    tr.appendChild(makeCalcCell(totalSales ? formatPercent(row.gross / totalSales) : "—"));
    tr.appendChild(makeCalcCell(row.gm1 ? formatPercent(row.gm1) : "—"));
    tr.appendChild(makeCalcCell(formatMoney(row.gp1)));
    tr.appendChild(makeCalcCell(totalGp1 ? formatPercent(row.gp1 / totalGp1) : "—"));
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
}

function renderSheet2SupportingKpis(year = "y2026") {
  const wrap = document.getElementById("sheet2SupportingKpis");
  if (!wrap) return;
  const acq = getBlock(STATE.commercial, "Acquisition");
  const retention = getBlock(STATE.commercial, "Retention");
  const adSpend = totalAdSpendByYear(year);
  const roas = parseMultiple(val(acq ? acq.rows : [], "ROAS", year));
  const paidInfluenced = adSpend * roas;
  const ecommerceGross = ecommerceBuild(year).total;
  const paidShare = ecommerceGross ? formatPercent(paidInfluenced / ecommerceGross) : "—";
  const emailRev = val(retention ? retention.rows : [], "Email Revenue %", year) || "—";
  const returning = val(retention ? retention.rows : [], "Returning Customers %", year) || "—";
  const carryover = val(retention ? retention.rows : [], "Incremental Revenue Carryover %", year) || "—";
  const purchaseFrequency = val(retention ? retention.rows : [], "Purchase Frequency", year) || "—";
  const cards = [
    { label: "Paid Revenue Influenced", value: formatFinancialMoney(Math.round(paidInfluenced), {dashZero:true}), note: `${paidShare} of Ecommerce Gross Sales · Informational KPI — included within Ecommerce` },
    { label: "ROAS", value: formatMultiple(roas), note: "Paid efficiency assumption" },
    { label: "Email Revenue %", value: emailRev, note: "Influence KPI, not added again" },
    { label: "Purchase Frequency", value: purchaseFrequency, note: `Returning Customers: ${returning} · Carryover: ${carryover}` },
  ];
  wrap.innerHTML = "";
  cards.forEach(k => wrap.appendChild(el("div", { class: "supporting-card" }, [
    el("div", { class: "supporting-label" }, k.label),
    el("div", { class: "supporting-value" }, k.value),
    el("div", { class: "supporting-note" }, k.note),
  ])));
}

function renderSheet2MarginBridge(year = "y2026") {
  const table = document.getElementById("sheet2MarginBridgeTable");
  if (!table) return;
  const years = ["y2026", "y2027", "y2028", "y2029"];
  const stages = [
    ["Gross Sales", m => m.grossSales],
    ["Discounts & Returns", m => -m.discountsReturns],
    ["Net Sales", m => m.netSales],
    ["COGS", m => -(m.netSales - m.gp1)],
    ["Gross Profit 1", m => m.gp1],
    ["Outbound Shipping", m => -m.outboundShipping],
    ["Packaging", m => -m.packaging],
    ["Shipping Revenue", m => m.shippingRevenue],
    ["Gross Profit 2", m => m.gp2],
    ["Ad Spend", m => -m.adSpend],
    ["Gross Profit 3", m => m.gp3],
  ];
  const bridges = Object.fromEntries(years.map(y => [y, marginBridge(y)]));
  table.innerHTML = `<thead><tr><th>Stage</th>${years.map(y => `<th>${yearLabel(y)}</th>`).join("")}</tr></thead>`;
  const tbody = el("tbody");
  stages.forEach(([stage, fn]) => {
    const tr = el("tr");
    const isTotal = ["Net Sales", "Gross Profit 1", "Gross Profit 2", "Gross Profit 3"].includes(stage);
    tr.appendChild(el("td", { class: "label-cell" + (isTotal ? " total-row-label" : "") }, stage));
    years.forEach(y => tr.appendChild(makeCalcCell(formatMoney(fn(bridges[y])))));
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
}

function renderSheet2FormulaNotes() {
  const table = document.getElementById("sheet2FormulaNotesTable");
  if (!table) return;
  const notes = (STATE.engineSheet && STATE.engineSheet.formulaNotes) || [];
  table.innerHTML = `<thead><tr><th>Item</th><th>Status</th><th>Needed to finish / automate</th></tr></thead>`;
  const tbody = el("tbody");
  notes.forEach(row => {
    const tr = el("tr");
    tr.appendChild(el("td", { class: "label-cell" }, row.item));
    tr.appendChild(makeCalcCell(row.status));
    tr.appendChild(makeCalcCell(row.needed));
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
}

function renderSheet2Draft() {
  renderSheet2Scenario();
  renderFinancialSnapshot("y2026");
  renderEcommerceRevenueBuild();
  renderSheet2ExecSummary("y2026");
  renderSheet2SupportingKpis("y2026");
  renderSheet2MarginBridge("y2026");
}


function renderFormulaQA() {
  const root = document.getElementById("formulaQaBlocks");
  if (!root) return;
  root.innerHTML = "";
  const sections = [
    {title:"1. Core Ecommerce Revenue Build", rows:[
      ["Annual Base Ecommerce Revenue", "$100/month × 12", "$1.2k"],
      ["Organic Growth Revenue", "$1.2k base × 10%", "$120"],
      ["Paid Growth Revenue", "$100 Total Ad Spend × 3.0x ROAS. Assumption: Constant ROAS during selected fiscal year.", "$300"],
      ["Gross Dover Opportunity", "$1k market × 10% capture × 100% ramp", "$100"],
      ["Net Dover Capture", "$100 gross Dover × (1 − 20% overlap)", "$80"],
      ["Total Ecommerce Gross Sales", "$1.2k + $120 + $300 + $80", "$1.7k"]
    ]},
    {title:"2. Dover Capture & Paid Ads Overlap", rows:[
      ["Gross Dover Opportunity", "$10k market × 20% capture × 50% ramp", "$1k"],
      ["Net Dover Capture", "$1k × (1 − 30% overlap)", "$700"],
      ["Ramp validation", "5% + 55% + 25% + 15%", "100%"]
    ]},
    {title:"3. Carryover & Next-Year Ecommerce Base", rows:[
      ["Carryover anti-double-counting rule", "Carryover applies only once when calculating the following year's Base Ecommerce Revenue", "Test #1"],
      ["Next-Year Base — 0% carryover", "Prior Base $1k + Organic $100 + 0% × (Paid $200 + Dover $300)", "$1.1k"],
      ["Next-Year Base — 50% carryover", "Prior Base $1k + 50% × (Organic $100 + Paid $200 + Dover $300)", "$1.3k"],
      ["Carryover scope check", "Organic $100 + Paid $200 + Dover $300", "$600 incremental pool"]
    ]},
    {title:"4. Funding, Ad Spend & ROAS", rows:[
      ["Base Ad Spend", "$20k × 12 months", "$240k"],
      ["Incremental Ad Spend", "$600 marketing allocation ÷ 6 covered months", "$100/month"],
      ["Paid Growth Revenue", "$100 Total Ad Spend × 3.0x ROAS. Assumption: Constant ROAS during selected fiscal year.", "$300"],
      ["Paid Revenue Influenced %", "$300 influenced ÷ $1.5k Ecommerce Gross Sales", "20%"]
    ]},
    {title:"5. Default Logic (2029 onwards) — Reinvestment", rows:[
      ["2029 Default Ad Spend", "Prior Year Ecommerce Gross Sales $1k × Reinvestment % 20%", "$200"],
      ["2029 Paid Growth Revenue", "$200 Ad Spend × 3.0x ROAS", "$600"],
      ["Direction check", "Change reinvestment from 20% to 10%", "Ad Spend falls from $200 to $100"]
    ]},
    {title:"6. Growth Engine Formula Tests", rows:[
      ["Ecommerce Gross Sales", "Use Ecommerce Revenue Build total", "Must tie exactly to Ecommerce portfolio row"],
      ["Concierge Gross Sales", "10 active clients × 2 orders/client × $100 AOV", "$2k"],
      ["Wellington Gross Sales", "10 orders × $100 AOV", "$1k"],
      ["Cavali Signature Revenue", "10 members × 2 boxes/year × $99", "$2.0k"],
      ["Cavali Premium Revenue", "10 members × 2 boxes/year × $199", "$4.0k"],
      ["Cavali Paid Growth Members", "$1k Cavali Ad Spend ÷ $100 CAC", "10 new members"]
    ]},
    {title:"7. Gross-to-Net & Margin Bridge", rows:[
      ["Discounts & Returns", "$1.7k Gross Sales × 10%", "$170"],
      ["Net Sales", "$1.7k − $170", "$1.5k"],
      ["COGS", "$1.5k × (1 − 50% GM1)", "$765"],
      ["GP1", "$1.5k − $765", "$765"],
      ["Outbound Shipping", "$1.5k × 10%", "$153"],
      ["Packaging", "$1.5k × 5%", "$77"],
      ["Shipping Revenue", "$1.5k × 2%", "$31"],
      ["GP2", "$765 − $153 − $77 + $31", "$566"],
      ["GP3", "$566 − $100 Ad Spend", "$466"]
    ]},
    {title:"8. GP1 by Growth Engine", rows:[
      ["Engine Net Sales", "$1k Gross × (1 − 10% Discounts & Returns)", "$900"],
      ["Engine GP1", "$900 Net Sales × 50% GM1", "$450"]
    ]},
    {title:"9. Portfolio Reconciliation Checks", rows:[
      ["Total Portfolio Gross Sales", "Sum all Growth Engine Gross Sales", "Must equal Financial Snapshot Gross Sales"],
      ["Total Portfolio GP1", "Sum all Growth Engine GP1", "Must equal Financial Snapshot GP1"],
      ["% Total Sales", "Sum all engine revenue shares", "100%"],
      ["% Total GP1", "Sum all engine GP1 shares", "100%"],
      ["Ecommerce tie-out", "Ecommerce Revenue Build total", "Must equal Ecommerce row in Portfolio"]
    ]},
    {title:"10. Scenario & Gate Checks", rows:[
      ["Organic Growth defaults", "$0/$500k; $1M/$3M; $5M/$10M", "5%; 10%; 15%"],
      ["Unallocated Capital", "$1k funding − $200 payables − $300 inventory − $100 marketing", "$400"],
      ["Private Label gate", "Funding below required threshold", "Private Label remains inactive"],
      ["Private Label launch timing", "Funding Date + 12 months", "Launch date exactly 12 months later"]
    ]}
  ];
  sections.forEach(sec => {
    const wrap = el("section", {class:"mini-card qa-card"});
    wrap.appendChild(el("h3", {}, sec.title));
    const table = el("table", {class:"grid qa-table"});
    const thead = el("thead", {}, el("tr", {}, ["Test / Formula", "Simple Test Input", "Expected Result", "PASS / FAIL", "Notes"].map(h => el("th", {}, h))));
    const tbody = el("tbody");
    sec.rows.forEach(r => {
      const tr = el("tr");
      tr.appendChild(el("td", {class:"label-cell"}, r[0]));
      tr.appendChild(el("td", {}, r[1]));
      tr.appendChild(el("td", {class:"calc-cell"}, r[2]));
      tr.appendChild(el("td", {}, "☐ PASS   ☐ FAIL"));
      tr.appendChild(el("td", {}, ""));
      tbody.appendChild(tr);
    });
    table.appendChild(thead); table.appendChild(tbody);
    wrap.appendChild(table); root.appendChild(wrap);
  });
  const load = document.getElementById("loadEasyNumbers");
  if (load) load.onclick = loadEasyNumberInputs;
  const restore = document.getElementById("restoreScenarioValues");
  if (restore) restore.onclick = () => { alert("Scenario values remain saved by Model Status. Use Save/Publish To… after reviewing QA results."); };
}

function loadEasyNumberInputs() {
  if (!confirm("Load simple Easy Numbers Test inputs into Draft? Save your current scenario first if needed.")) return;
  if (!STATE || !STATE.meta) return;
  saveScenarioInputs(STATE.meta.modelStatus || "Draft");
  STATE.meta.modelStatus = "Draft";
  STATE.meta.baseEcommerceMonthly = "$100";
  STATE.meta.fundingScenario = "Base";
  STATE.meta.fundingDate = "Jul-26";
  STATE.meta.doverCapture = "10%";
  STATE.meta.roas = "3.0x";
  const market = getBlock(STATE.commercial, "Market Growth");
  if (market) {
    const og = getRow(market.rows, "Organic Growth %"); if (og) yearKeys().forEach(y => og[y] = "10%");
    const opp = getRow(market.rows, "Dover Market Opportunity (Gross)"); if (opp) { opp.current = "$1k"; yearKeys().forEach(y => opp[y] = "$1k"); }
    const cap = getRow(market.rows, "Dover Target Capture %"); if (cap) yearKeys().forEach(y => cap[y] = "10%");
    const over = getRow(market.rows, "Paid Ads Overlap %"); if (over) yearKeys().forEach(y => over[y] = "20%");
    market.doverRamp = { y2026:"100%", y2027:"0%", y2028:"0%", y2029:"0%" };
  }
  const ret = getBlock(STATE.commercial, "Retention");
  if (ret) {
    const c = getRow(ret.rows, "Incremental Revenue Carryover %"); if (c) { c.y2026="0%"; c.y2027="50%"; c.y2028="50%"; c.y2029="—"; }
  }
  const acq = getBlock(STATE.commercial, "Acquisition");
  if (acq) {
    const target = getRow(acq.rows, "Target Ad Spend % of Ecommerce Gross Sales"); if (target) { target.y2026="—"; target.y2027="—"; target.y2028="—"; target.y2029="20%"; }
    const total = getRow(acq.rows, "Total Ad Spend"); if (total) { total.y2026="$100"; total.y2027="$100"; total.y2028="$100"; total.y2029="$200"; }
  }
  renderAll();
  saveNow();
}

function parseTriggerAmount(trigger) {
  const t = String(trigger || "").toLowerCase();
  if (t.includes("base")) return 0;
  const m = t.match(/(\d+(?:\.\d+)?)\s*m/);
  if (m) return parseFloat(m[1]) * 1000000;
  const k = t.match(/(\d+(?:\.\d+)?)\s*k/);
  if (k) return parseFloat(k[1]) * 1000;
  return 0;
}

function statusForTrigger(trigger) {
  const needed = parseTriggerAmount(trigger);
  const active = fundingAmountSelected() >= needed;
  return { text: active ? "ACTIVE ✓" : "LOCKED 🔒", cls: active ? "active" : "locked" };
}

function renderGrowth() {
  const table = document.getElementById("growthTable");
  table.innerHTML = `<thead><tr><th>Initiative</th><th>Owner</th><th>Funding Trigger</th><th>Status</th><th>Launch Date</th><th>Investment</th></tr></thead>`;
  const tbody = el("tbody");
  STATE.growthInitiatives.forEach(row => {
    const tr = el("tr");
    ["initiative", "owner", "trigger"].forEach(k => tr.appendChild(makeEditableCell(row, k, () => { renderGrowth(); scheduleSave(); })));
    const st = statusForTrigger(row.trigger);
    tr.appendChild(el("td", { class: "calc-cell" }, el("span", { class: `status-pill ${st.cls} inline` }, st.text)));
    ["launch", "investment"].forEach(k => tr.appendChild(makeEditableCell(row, k, () => scheduleSave())));
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
}

function addGrowthRow() {
  STATE.growthInitiatives.push({ initiative: "", owner: "", trigger: "", status: "", launch: "", investment: "" });
  renderGrowth();
  scheduleSave();
}

function renderThesis() {
  const wrap = document.getElementById("thesisGrid");
  wrap.innerHTML = "";
  const dynamic = (STATE.thesis || []).map(t => {
    if (t.label === "Base Ecommerce") return { ...t, value: STATE.meta.baseEcommerceMonthly || "$70k" };
    if (t.label === "Dover Capture") return { ...t, value: STATE.meta.doverCapture };
    return t;
  });
  dynamic.forEach(t => wrap.appendChild(el("div", { class: "thesis-card target-card" }, [
    el("div", { class: "thesis-label" }, t.label),
    el("div", { class: "thesis-value" }, t.value || "—"),
    el("div", { class: "thesis-target" }, t.sub || t.target || ""),
  ])));
}



/* ---------------- Tab 03 Financial Summary + Tab 04 Commercial Cash Flow ---------------- */
function pnlOpexForYear(yearKey, bridge) {
  const months = yearKey === "y2026" ? 12 : 12;
  const payroll = 40000 * months;
  const ga = 45000 * months;
  const sm = (bridge.grossSales || 0) * 0.0662;
  const tech = 0;
  return { payroll, ga, sm, tech, total: payroll + ga + sm + tech };
}

function ordersForYear(yearKey) {
  const ecommerce = getBlock(STATE.growthEngines, "Ecommerce");
  return parseNumber(val(ecommerce ? ecommerce.rows : [], "Orders", yearKey));
}

function newCustomersForYear(yearKey) {
  const acq = getBlock(STATE.commercial, "Acquisition");
  const mix = parsePercent(val(acq ? acq.rows : [], "New Customer Mix %", yearKey));
  return ordersForYear(yearKey) * (mix || 0);
}

function renderFinancialSummary() {
  const kpiWrap = document.getElementById("tab3KpiGrid");
  const table = document.getElementById("tab3PnlTable");
  const opsWrap = document.getElementById("tab3OperatingKpis");
  if (!kpiWrap || !table || !opsWrap) return;
  const years = yearKeys();
  const bridges = Object.fromEntries(years.map(y => [y, marginBridge(y)]));
  const b = bridges.y2026;
  const o = pnlOpexForYear("y2026", b);
  const ebitda = b.gp3 - o.total;
  kpiWrap.innerHTML = "";
  [
    { label: "Gross Sales", value: formatFinancialMoney(b.grossSales, {dashZero:true}), sub: "2026 Forecast" },
    { label: "Net Sales", value: formatFinancialMoney(b.netSales, {dashZero:true}), sub: "After Discounts" },
    { label: "GP1", value: formatFinancialMoney(b.gp1, {dashZero:true}), sub: b.gp1 ? `${formatPercent(b.netSales ? b.gp1 / b.netSales : 0)} of Net Sales` : "After COGS" },
    { label: "GP2", value: formatFinancialMoney(b.gp2, {dashZero:true}), sub: b.gp2 ? `${formatPercent(b.netSales ? b.gp2 / b.netSales : 0)} of Net Sales` : "After Fulfillment" },
    { label: "GP3", value: formatFinancialMoney(b.gp3, {dashZero:true}), sub: b.gp3 ? `${formatPercent(b.netSales ? b.gp3 / b.netSales : 0)} of Net Sales` : "After Advertising" },
    { label: "EBITDA", value: formatFinancialMoney(ebitda, {dashZero:true}), sub: "After Operating Expenses" }
  ].forEach(card => kpiWrap.appendChild(el("div", { class: "kpi-card" }, [
    el("div", { class: "kpi-label" }, card.label), el("div", { class: "kpi-value " + moneyClass(card.value, "") }, card.value), el("div", { class: "kpi-sub" }, card.sub)
  ])));

  table.innerHTML = `<thead><tr><th>Commercial P&L</th>${years.map(y => `<th>${yearLabel(y)}</th>`).join("")}</tr></thead>`;
  const tbody = el("tbody");
  const rows = [
    ["Gross Sales", y => bridges[y].grossSales],
    ["Discounts & Returns", y => -bridges[y].discountsReturns],
    ["Net Sales", y => bridges[y].netSales, true],
    ["COGS", y => -(bridges[y].netSales - bridges[y].gp1)],
    ["GP1", y => bridges[y].gp1, true],
    ["Outbound Shipping", y => -bridges[y].outboundShipping],
    ["Packaging", y => -bridges[y].packaging],
    ["Shipping Revenue", y => bridges[y].shippingRevenue],
    ["GP2", y => bridges[y].gp2, true],
    ["Advertising", y => -bridges[y].adSpend],
    ["GP3", y => bridges[y].gp3, true],
    ["Sales & Marketing (S&M)", y => -pnlOpexForYear(y, bridges[y]).sm],
    ["General & Administrative (G&A)", y => -(pnlOpexForYear(y, bridges[y]).payroll + pnlOpexForYear(y, bridges[y]).ga)],
    ["Other Operating Expenses", y => -pnlOpexForYear(y, bridges[y]).tech],
    ["EBITDA", y => bridges[y].gp3 - pnlOpexForYear(y, bridges[y]).total, true],
    ["EBITDA %", y => { const e = bridges[y].gp3 - pnlOpexForYear(y, bridges[y]).total; return bridges[y].netSales ? e / bridges[y].netSales : 0; }, true, "pct"]
  ];
  rows.forEach(([label, fn, bold, type]) => {
    const tr = el("tr", { class: bold ? "important-row" : "" });
    tr.appendChild(el("td", { class: "label-cell" + (bold ? " total-row-label" : "") }, label));
    years.forEach(y => tr.appendChild(makeCalcCell(type === "pct" ? formatPercent(fn(y)) : formatFinancialMoney(fn(y), {dashZero:true}))));
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);

  opsWrap.innerHTML = "";
  [
    { label: "Orders", value: Math.round(ordersForYear("y2026") || 0).toLocaleString("en-US"), sub: "Ecommerce" },
    { label: "New Customers", value: Math.round(newCustomersForYear("y2026") || 0).toLocaleString("en-US"), sub: "Unique new customers" },
    { label: "ROAS", value: `${roasForYear("y2026").toFixed(1)}x`, sub: "Scenario assumption" },
    { label: "Ad Spend", value: formatFinancialMoney(totalAdSpendByYear("y2026"), {dashZero:true}), sub: "Advertising" },
    { label: "Net / Gross Ratio", value: formatPercent(b.grossSales ? b.netSales / b.grossSales : 0), sub: "Net Sales / Gross Sales" },
    { label: "Checkout Abandonment Rate", value: "—", sub: "Shopify KPI" }
  ].forEach(card => opsWrap.appendChild(el("div", { class: "kpi-card" }, [
    el("div", { class: "kpi-label" }, card.label), el("div", { class: "kpi-value " + moneyClass(card.value, "") }, card.value), el("div", { class: "kpi-sub" }, card.sub)
  ])));
}

function cashFlowRows(yearKey) {
  const outputs = engineOutputs(yearKey);
  const fundingRow = selectedFundingRow();
  const fundingDate = String(fundingRow.date || STATE.meta.fundingDate || "");
  const fundingYear = fundingDate.includes("27") ? "y2027" : "y2026";
  const funding = yearKey === fundingYear ? fundingAmountSelected() : 0;
  const ecommerce = (outputs.find(x => x.engine === "Ecommerce") || {}).gross || 0;
  const concierge = (outputs.find(x => x.engine === "Concierge") || {}).gross || 0;
  const wellington = (outputs.find(x => x.engine === "Wellington") || {}).gross || 0;
  const embroidery = (outputs.find(x => x.engine === "Embroidery") || {}).gross || 0;
  const privateLabelRevenue = (outputs.find(x => x.engine === "Private Label") || {}).gross || 0;
  const cavali = (outputs.find(x => x.engine === "Cavali") || {}).gross || 0;
  const cashIn = {
    "Shopify Deposits Corro": ecommerce + concierge + wellington + embroidery + privateLabelRevenue,
    "Shopify Deposits Cavali": cavali,
    "Funding": funding,
    "Other Cash Receipts": 0
  };
  const b = marginBridge(yearKey);
  const o = pnlOpexForYear(yearKey, b);
  const recurrentInventory = yearKey === fundingYear ? parseMoney(fundingRow.inventory) : 0;
  const advertising = b.adSpend;
  const shipping = b.outboundShipping + b.packaging;
  const sm = o.sm;
  const ga = o.payroll + o.ga;
  const otherOperating = o.tech;
  const operatingCashOut = recurrentInventory + advertising + shipping + sm + ga + otherOperating;
  const cashOut = {
    "Operating Cash Out": operatingCashOut,
    "Inventory": recurrentInventory,
    "Advertising": advertising,
    "Shipping & Fulfillment": shipping,
    "Sales & Marketing (S&M)": sm,
    "General & Administrative (G&A)": ga,
    "Growth Investments": yearKey === fundingYear ? parseMoney(fundingRow.embroidery) : 0,
    "CapEx": 0,
    "Private Label Investment": yearKey === fundingYear ? parseMoney(fundingRow.privateLabel) : 0,
    "Other Cash Out": 0,
    "Other": otherOperating
  };
  return { cashIn, cashOut, operatingCashOut };
}

function renderCashTable(id, title, rowsByYear, sign = 1) {
  const table = document.getElementById(id);
  if (!table) return;
  const years = yearKeys();
  table.innerHTML = `<thead><tr><th>${title}</th>${years.map(y => `<th>${yearLabel(y)}</th>`).join("")}</tr></thead>`;
  const tbody = el("tbody");
  const rowNames = Object.keys(rowsByYear.y2026 || {});
  rowNames.forEach(name => {
    const isSubtotal = name === "Operating Cash Out";
    const tr = el("tr", { class: isSubtotal ? "important-row" : "" });
    tr.appendChild(el("td", { class: "label-cell" + (isSubtotal ? " total-row-label" : "") }, name));
    years.forEach(y => tr.appendChild(makeCalcCell(formatFinancialMoney((rowsByYear[y][name] || 0) * sign, {dashZero:true}))));
    tbody.appendChild(tr);
  });
  const total = el("tr", { class: "important-row" });
  total.appendChild(el("td", { class: "label-cell total-row-label" }, title.startsWith("Cash In") ? "TOTAL CASH IN" : "TOTAL CASH OUT"));
  years.forEach(y => {
    let totalValue;
    if (title.startsWith("Cash Out")) {
      const r = rowsByYear[y];
      totalValue = (r["Operating Cash Out"] || 0) + (r["Growth Investments"] || 0) + (r["CapEx"] || 0) + (r["Private Label Investment"] || 0) + (r["Other Cash Out"] || 0);
    } else {
      totalValue = Object.values(rowsByYear[y]).reduce((s, v) => s + Number(v || 0), 0);
    }
    total.appendChild(makeCalcCell(formatFinancialMoney(totalValue * sign, {dashZero:true})));
  });
  tbody.appendChild(total);
  table.appendChild(tbody);
}

function renderCommercialCashFlow() {
  const kpis = document.getElementById("tab4CashKpis");
  const netTable = document.getElementById("tab4NetCashTable");
  const waterfall = document.getElementById("tab4Waterfall");
  if (!kpis || !netTable || !waterfall) return;
  const years = yearKeys();
  const flow = Object.fromEntries(years.map(y => [y, cashFlowRows(y)]));
  const cashInRows = Object.fromEntries(years.map(y => [y, flow[y].cashIn]));
  const cashOutRows = Object.fromEntries(years.map(y => [y, flow[y].cashOut]));
  renderCashTable("tab4CashInTable", "Cash In", cashInRows, 1);
  renderCashTable("tab4CashOutTable", "Cash Out", cashOutRows, -1);
  const opening = parseMoney((STATE.cashFlow && STATE.cashFlow.openingCash) || "$0");
  let running = opening;
  const totals = {};
  years.forEach(y => {
    const cashIn = Object.values(cashInRows[y]).reduce((s, v) => s + Number(v || 0), 0);
    const cashOut = (cashOutRows[y]["Operating Cash Out"] || 0) + (cashOutRows[y]["Growth Investments"] || 0) + (cashOutRows[y]["CapEx"] || 0) + (cashOutRows[y]["Private Label Investment"] || 0) + (cashOutRows[y]["Other Cash Out"] || 0);
    const net = cashIn - cashOut;
    running += net;
    totals[y] = { cashIn, cashOut, net, ending: running };
  });
  kpis.innerHTML = "";
  [
    { label: "Opening Cash", value: formatFinancialMoney(opening, {dashZero:true}), sub: "Scenario input" },
    { label: "Ending Cash", value: formatFinancialMoney(totals.y2026.ending, {dashZero:true}), sub: "2026" },
    { label: "Net Cash Flow", value: formatFinancialMoney(totals.y2026.net, {dashZero:true}), sub: "2026" },
    { label: "Cash Coverage", value: totals.y2026.cashOut ? `${Math.max(0, (totals.y2026.ending / (totals.y2026.cashOut / 12))).toFixed(1)} mo` : "—", sub: "Ending Cash / Avg Monthly Operating Cash Out" },
    { label: "Minimum Cash Buffer", value: formatFinancialMoney((STATE.cashFlow && STATE.cashFlow.minimumCashBuffer) || 0, {dashZero:true}), sub: "Reference" }
  ].forEach(card => kpis.appendChild(el("div", { class: "kpi-card" }, [
    el("div", { class: "kpi-label" }, card.label), el("div", { class: "kpi-value" }, card.value), el("div", { class: "kpi-sub" }, card.sub)
  ])));
  netTable.innerHTML = `<thead><tr><th>Net Cash Flow</th>${years.map(y => `<th>${yearLabel(y)}</th>`).join("")}</tr></thead>`;
  const tbody = el("tbody");
  [
    ["TOTAL CASH IN", y => totals[y].cashIn],
    ["TOTAL CASH OUT", y => -totals[y].cashOut],
    ["NET CASH FLOW", y => totals[y].net],
    ["ENDING CASH", y => totals[y].ending]
  ].forEach(([label, fn]) => {
    const tr = el("tr");
    tr.appendChild(el("td", { class: "label-cell total-row-label" }, label));
    years.forEach(y => tr.appendChild(makeCalcCell(formatFinancialMoney(fn(y), {dashZero:true}))));
    tbody.appendChild(tr);
  });
  netTable.appendChild(tbody);
  const y = totals.y2026;
  waterfall.innerHTML = "";
  [
    ["Opening Cash", opening], ["Cash In", y.cashIn], ["Funding", flow.y2026.cashIn["Funding"] || 0], ["Cash Out", -y.cashOut], ["CapEx", -(flow.y2026.cashOut["CapEx"] || 0)], ["Ending Cash", y.ending]
  ].forEach(([label, value]) => waterfall.appendChild(el("div", { class: "waterfall-item" }, [el("span", {}, label), el("strong", {}, formatFinancialMoney(value, {dashZero:true}))])));
}

function initTabs() {
  const buttons = document.querySelectorAll(".tab-btn");
  buttons.forEach(btn => btn.addEventListener("click", () => {
    buttons.forEach(b => b.classList.remove("active"));
    document.querySelectorAll(".tab-panel").forEach(p => p.classList.remove("active"));
    btn.classList.add("active");
    document.getElementById(btn.dataset.tab).classList.add("active");
  }));
}


/* ---------------- External actuals from Google Sheets ---------------- */
function sheetCsvUrl(source) {
  if (!source || !source.spreadsheetId) return null;
  const base = `https://docs.google.com/spreadsheets/d/${source.spreadsheetId}/gviz/tq?tqx=out:csv`;
  if (source.gid) return `${base}&gid=${encodeURIComponent(source.gid)}`;
  if (source.sheet) return `${base}&sheet=${encodeURIComponent(source.sheet)}`;
  return null;
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const next = text[i + 1];
    if (ch === '"') {
      if (inQuotes && next === '"') { cell += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (ch === "," && !inQuotes) {
      row.push(cell); cell = "";
    } else if ((ch === "\n" || ch === "\r") && !inQuotes) {
      if (ch === "\r" && next === "\n") i++;
      row.push(cell); cell = "";
      if (row.some(v => String(v).trim() !== "")) rows.push(row);
      row = [];
    } else {
      cell += ch;
    }
  }
  row.push(cell);
  if (row.some(v => String(v).trim() !== "")) rows.push(row);
  if (!rows.length) return [];
  const headers = rows[0].map(h => String(h || "").trim());
  return rows.slice(1).map(r => {
    const obj = {};
    headers.forEach((h, i) => { obj[h] = (r[i] ?? "").trim(); });
    return obj;
  });
}

async function fetchSheetRows(source) {
  const url = sheetCsvUrl(source);
  if (!url) throw new Error("Missing sheet source");
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`${source.label || source.sheet || "Sheet"}: HTTP ${res.status}`);
  return parseCsv(await res.text());
}

async function fetchOptionalSheetRows(source, sheetName, label) {
  try {
    return await fetchSheetRows({ ...source, gid: "", sheet: sheetName, label });
  } catch (err) {
    console.warn(`Optional sheet not loaded: ${label || sheetName}`, err);
    return [];
  }
}

async function fetchDashboardBundle(source, brand) {
  const tabs = source.tabs || {};
  const base = { spreadsheetId: source.spreadsheetId };
  const [kpis, revenueShare, newVsReturning, adSpend, smartrrProductVolume, productsQ1] = await Promise.all([
    fetchOptionalSheetRows(base, tabs.kpis || source.sheet || "kpis_daily", `${brand} kpis_daily`),
    fetchOptionalSheetRows(base, tabs.revenueShare || "revenue_share", `${brand} revenue_share`),
    fetchOptionalSheetRows(base, tabs.newVsReturning || "new_vs_returning", `${brand} new_vs_returning`),
    fetchOptionalSheetRows(base, tabs.adSpend || "ad_spend", `${brand} ad_spend`),
    brand === "cavali" ? fetchOptionalSheetRows(base, tabs.smartrrProductVolume || "smartrr_product_volume", `${brand} smartrr_product_volume`) : Promise.resolve([]),
    fetchOptionalSheetRows(base, tabs.products || "products_q1_2026", `${brand} products_q1_2026`)
  ]);
  return { kpis, revenueShare, newVsReturning, adSpend, smartrrProductVolume, productsQ1 };
}

function monthlyRows(rows) {
  return (rows || []).filter(r => /^\d{4}-\d{2}$/.test(String(r.period || "")));
}

function latestYearAndMonth(rows) {
  const periods = monthlyRows(rows).map(r => String(r.period));
  if (!periods.length) return null;
  periods.sort();
  const latest = periods[periods.length - 1];
  const [year, month] = latest.split("-").map(Number);
  return { year, month };
}

function rowsForYtd(rows, year, throughMonth) {
  return monthlyRows(rows).filter(r => {
    const [y, m] = String(r.period).split("-").map(Number);
    return y === year && m <= throughMonth;
  });
}

function sumField(rows, field) {
  return (rows || []).reduce((s, r) => s + parseNumber(r[field]), 0);
}

function weightedAov(rows) {
  const orders = sumField(rows, "nb_orders");
  const gross = sumField(rows, "gross_sales");
  return orders ? gross / orders : 0;
}

function weightedGm1(rows) {
  const net = sumField(rows, "net_sales");
  const gp = sumField(rows, "gross_profit");
  return net ? gp / net : 0;
}

function dashboardActuals(rows) {
  const latest = latestYearAndMonth(rows);
  if (!latest) return null;
  const throughMonth = Math.min(latest.month, (STATE && STATE.meta && STATE.meta.actualsThroughMonth) || 6);
  const ytd = rowsForYtd(rows, latest.year, throughMonth);
  const prevYtd = rowsForYtd(rows, latest.year - 1, throughMonth);
  const gross = sumField(ytd, "gross_sales");
  const prevGross = sumField(prevYtd, "gross_sales");
  const orders = sumField(ytd, "nb_orders");
  const customers = sumField(ytd, "new_customers") + sumField(ytd, "returning_customers");
  const returning = sumField(ytd, "returning_customers");
  const discountsReturns = sumField(ytd, "total_discounts") + sumField(ytd, "total_returns");
  return {
    latest,
    periodLabel: `${latest.year} YTD through ${String(throughMonth).padStart(2, "0")}`,
    grossSales: gross,
    netSales: sumField(ytd, "net_sales"),
    grossProfit: sumField(ytd, "gross_profit"),
    organicGrowth: prevGross ? (gross / prevGross) - 1 : 0,
    discountReturnsPct: gross ? discountsReturns / gross : 0,
    orders,
    aov: weightedAov(ytd),
    gm1: weightedGm1(ytd),
    returningCustomerPct: customers ? returning / customers : 0,
    purchaseFrequency: customers ? orders / customers : 0,
    newCustomerPct: customers ? sumField(ytd, "new_customers") / customers : 0,
    newCustomers: sumField(ytd, "new_customers")
  };
}

function adSpendActuals(rows, kpiActuals) {
  if (!rows || !rows.length || !kpiActuals || !kpiActuals.latest) return null;
  const throughMonth = Math.min(kpiActuals.latest.month, (STATE && STATE.meta && STATE.meta.actualsThroughMonth) || 6);
  const ytd = rowsForYtd(rows, kpiActuals.latest.year, throughMonth);
  const spend = sumField(ytd, "ad_spend");
  const weightedRoasNumerator = (ytd || []).reduce((s, r) => s + parseNumber(r.ad_spend) * parseNumber(r.roas), 0);
  const roas = spend ? weightedRoasNumerator / spend : 0;
  const cos = kpiActuals.grossSales ? spend / kpiActuals.grossSales : 0;
  const cac = kpiActuals.newCustomers ? spend / kpiActuals.newCustomers : 0;
  return { spend, roas, cos, cac };
}

function channelRevenueYtd(rows, channel, latest) {
  if (!rows || !rows.length || !latest) return 0;
  const throughMonth = Math.min(latest.month, (STATE && STATE.meta && STATE.meta.actualsThroughMonth) || 6);
  const ytd = rowsForYtd(rows, latest.year, throughMonth);
  return ytd
    .filter(r => String(r.channel || "").toLowerCase().includes(String(channel).toLowerCase()))
    .reduce((s, r) => s + parseNumber(r.amount), 0);
}

function normalizeProductKey(product) {
  const raw = String(product || "").toLowerCase();
  if (raw.includes("signature")) return "signature";
  if (raw.includes("premier") || raw.includes("premium")) return "premium";
  return raw.replace(/[^a-z0-9]+/g, "");
}

function latestRowsByPeriodStart(rows) {
  if (!rows || !rows.length) return [];
  const valid = rows.filter(r => r.period_start || r.period);
  if (!valid.length) return rows;
  const periods = valid.map(r => `${r.period_start || ""}|${r.period || ""}`).sort();
  const latestKey = periods[periods.length - 1];
  const [latestStart, latestPeriod] = latestKey.split("|");
  return valid.filter(r => String(r.period_start || "") === latestStart && String(r.period || "") === latestPeriod);
}

function smartrrMembershipActuals(rows) {
  const latestRows = latestRowsByPeriodStart(rows);
  const out = { signatureActive: 0, premiumActive: 0, signatureNew: 0, premiumNew: 0 };
  latestRows.forEach(r => {
    const key = normalizeProductKey(r.product_variant || r.product || "");
    const active = parseNumber(r.active_subscribers_current);
    const newer = parseNumber(r.new_subscribers);
    if (key === "signature") {
      out.signatureActive += active;
      out.signatureNew += newer;
    } else if (key === "premium") {
      out.premiumActive += active;
      out.premiumNew += newer;
    }
  });
  return out;
}


function firstPresent(row, names) {
  const keys = Object.keys(row || {});
  for (const wanted of names) {
    const exact = keys.find(k => k.toLowerCase() === wanted.toLowerCase());
    if (exact && row[exact] !== "") return row[exact];
  }
  for (const wanted of names) {
    const partial = keys.find(k => k.toLowerCase().replace(/[^a-z0-9]/g, "").includes(wanted.toLowerCase().replace(/[^a-z0-9]/g, "")));
    if (partial && row[partial] !== "") return row[partial];
  }
  return "";
}

function parsePctOrDecimal(v) {
  const raw = String(v || "").trim();
  if (!raw) return null;
  const n = parseNumber(raw);
  if (!Number.isFinite(n)) return null;
  if (raw.includes("%")) return n / 100;
  return Math.abs(n) > 3 ? n / 100 : n;
}

function weightedMarkupActuals(productRowsList) {
  const rows = (productRowsList || []).flat().filter(Boolean);
  let numerator = 0;
  let denominator = 0;
  rows.forEach(r => {
    const explicitMarkup = parsePctOrDecimal(firstPresent(r, ["markup_pct", "pct_markup", "markup %", "markup", "margin_markup"]));
    const cost = parseNumber(firstPresent(r, ["cost", "unit_cost", "cost_per_item", "product_cost", "variant_cost", "cogs", "cost_of_goods_sold"]));
    const price = parseNumber(firstPresent(r, ["price", "selling_price", "average_selling_price", "avg_price", "retail_price", "unit_price", "aov"]));
    let weight = parseNumber(firstPresent(r, ["units_sold", "nb_units", "quantity", "qty", "total_quantity", "orders", "inventory_quantity", "variant_inventory_qty"]));
    if (!weight || weight < 0) weight = 1;

    let markup = explicitMarkup;
    if (markup === null && cost > 0 && price > 0) markup = (price - cost) / cost;
    if (markup === null || !Number.isFinite(markup)) return;

    numerator += markup * weight;
    denominator += weight;
  });
  return denominator ? numerator / denominator : null;
}

function weightedInventoryTurnsActuals(productRowsList) {
  const rows = (productRowsList || []).flat().filter(Boolean);
  let numerator = 0;
  let denominator = 0;
  rows.forEach(r => {
    const explicit = parsePctOrDecimal(firstPresent(r, ["inventory_turns", "inventory turns", "turns", "inventory_turnover", "inventory turnover"]));
    let weight = parseNumber(firstPresent(r, ["cogs", "cost_of_goods_sold", "gross_sales", "net_sales", "units_sold", "nb_units", "quantity", "qty"]));
    if (!weight || weight < 0) weight = 1;
    if (explicit !== null && Number.isFinite(explicit)) { numerator += explicit * weight; denominator += weight; }
  });
  return denominator ? numerator / denominator : null;
}

function setCurrentInRows(rows, driver, value) {
  const row = getRow(rows, driver);
  if (row && Object.keys(row).length) row.current = value;
}

function applyActualsToState(corroBundle, cavaliBundle) {
  const corro = dashboardActuals(corroBundle.kpis);
  const cavali = dashboardActuals(cavaliBundle.kpis);
  const corroAds = adSpendActuals(corroBundle.adSpend, corro);
  const cavaliAds = adSpendActuals(cavaliBundle.adSpend, cavali);
  const cavaliMembers = smartrrMembershipActuals(cavaliBundle.smartrrProductVolume);

  if (!STATE.actuals) STATE.actuals = {};
  STATE.actuals.lastRefresh = new Date().toISOString();
  STATE.actuals.corroPeriod = corro ? corro.periodLabel : "No monthly rows found";
  STATE.actuals.cavaliPeriod = cavali ? cavali.periodLabel : "No monthly rows found";
  STATE.actuals.sources = {
    corro: {
      kpis_daily: (corroBundle.kpis || []).length,
      revenue_share: (corroBundle.revenueShare || []).length,
      new_vs_returning: (corroBundle.newVsReturning || []).length,
      ad_spend: (corroBundle.adSpend || []).length,
      products_q1_2026: (corroBundle.productsQ1 || []).length
    },
    cavali: {
      kpis_daily: (cavaliBundle.kpis || []).length,
      revenue_share: (cavaliBundle.revenueShare || []).length,
      new_vs_returning: (cavaliBundle.newVsReturning || []).length,
      ad_spend: (cavaliBundle.adSpend || []).length,
      smartrr_product_volume: (cavaliBundle.smartrrProductVolume || []).length,
      products_q1_2026: (cavaliBundle.productsQ1 || []).length
    }
  };

  const acq = getBlock(STATE.commercial, "Acquisition");
  const retention = getBlock(STATE.commercial, "Retention");
  const market = getBlock(STATE.commercial, "Market Growth");
  const ecommerce = getBlock(STATE.growthEngines, "Ecommerce");
  const cavaliEngine = getBlock(STATE.growthEngines, "Cavali");
  const concierge = getBlock(STATE.growthEngines, "Concierge");
  const wellington = getBlock(STATE.growthEngines, "Wellington");

  const markupActual = weightedMarkupActuals([corroBundle.productsQ1, cavaliBundle.productsQ1]);
  if (markupActual !== null && STATE.purchasing && STATE.purchasing.commercialTerms) {
    setCurrentInRows(STATE.purchasing.commercialTerms, "Markup %", formatPercent(markupActual));
  }
  const inventoryTurnsActual = weightedInventoryTurnsActuals([corroBundle.productsQ1, cavaliBundle.productsQ1]);
  if (inventoryTurnsActual !== null && STATE.purchasing && STATE.purchasing.capitalEfficiency) {
    setCurrentInRows(STATE.purchasing.capitalEfficiency, "Inventory Turns", inventoryTurnsActual.toFixed(1) + "x");
  }

  const conciergeRevenue = corro ? channelRevenueYtd(corroBundle.revenueShare, "Concierge", corro.latest) : 0;
  const wellingtonRevenue = corro ? channelRevenueYtd(corroBundle.revenueShare, "Wellington", corro.latest) : 0;
  const onlineRevenue = corro ? channelRevenueYtd(corroBundle.revenueShare, "Online", corro.latest) : 0;
  STATE.actuals.engineGrossSales = {
    Ecommerce: onlineRevenue || (corro ? Math.max(0, corro.grossSales - conciergeRevenue - wellingtonRevenue) : 0),
    Concierge: conciergeRevenue,
    Wellington: wellingtonRevenue,
    Cavali: cavali ? cavali.grossSales : 0
  };
  STATE.actuals.engineGm1 = {
    Ecommerce: corro ? corro.gm1 : 0,
    Concierge: corro ? corro.gm1 : 0,
    Wellington: corro ? corro.gm1 : 0,
    Cavali: cavali ? cavali.gm1 : 0
  };

  if (corro) {
    if (acq) {
      setCurrentInRows(acq.rows, "New Customer Mix %", formatPercent(corro.newCustomerPct));
      if (corroAds && corroAds.spend) {
        setCurrentInRows(acq.rows, "Base Ad Spend", "$20k / month");
        setCurrentInRows(acq.rows, "Incremental Ad Spend", "$0");
        setCurrentInRows(acq.rows, "ROAS", formatMultiple(corroAds.roas));
        setCurrentInRows(acq.rows, "Ad Spend % of Gross Sales", formatPercent(corroAds.cos));
        setCurrentInRows(acq.rows, "CAC", formatMoney(corroAds.cac));
      } else {
        setCurrentInRows(acq.rows, "Base Ad Spend", "$20k / month");
        setCurrentInRows(acq.rows, "Incremental Ad Spend", "$0");
        setCurrentInRows(acq.rows, "ROAS", "No ad_spend rows");
      }
    }
    if (retention) {
      setCurrentInRows(retention.rows, "Returning Customers %", formatPercent(corro.returningCustomerPct));
      setCurrentInRows(retention.rows, "Purchase Frequency", corro.purchaseFrequency.toFixed(2));
      const annualGp = corro.aov * corro.purchaseFrequency * corro.gm1;
      setCurrentInRows(retention.rows, "Annual GP per Customer", formatCurrency(Math.round(annualGp)));
    }
    if (market) {
      setCurrentInRows(market.rows, "Organic Growth %", formatPercent(corro.organicGrowth));
    }
    if (STATE.purchasing && STATE.purchasing.commercialTerms) {
      setCurrentInRows(STATE.purchasing.commercialTerms, "Discounts & Returns %", formatPercent(corro.discountReturnsPct));
    }
    if (ecommerce) {
      setCurrentInRows(ecommerce.rows, "Orders", Math.round(corro.orders).toLocaleString("en-US"));
      setCurrentInRows(ecommerce.rows, "AOV", formatMoney(corro.aov));
      setCurrentInRows(ecommerce.rows, "GM1 %", formatPercent(corro.gm1));
    }
    // Concierge and Wellington revenue comes from revenue_share. It is used in Tab 02
    // as an actual/baseline fallback, but we do not force it into AOV because
    // revenue_share does not provide Orders × AOV inputs.
  }

  if (cavali && cavaliEngine) {
    setCurrentInRows(cavaliEngine.rows, "GM1 %", formatPercent(cavali.gm1));
    setCurrentInRows(cavaliEngine.rows, "Organic Member Growth", formatPercent(cavali.organicGrowth));
    if (cavaliAds && cavaliAds.spend) {
      setCurrentInRows(cavaliEngine.rows, "Cavali Ad Spend", formatMoney(cavaliAds.spend));
      setCurrentInRows(cavaliEngine.rows, "Cavali CAC", formatMoney(cavaliAds.cac));
    } else {
      setCurrentInRows(cavaliEngine.rows, "Cavali Ad Spend", "No ad_spend rows");
      setCurrentInRows(cavaliEngine.rows, "Cavali CAC", "Needs members/ad source");
    }
    if (cavaliMembers.signatureActive || cavaliMembers.premiumActive) {
      setCurrentInRows(cavaliEngine.rows, "Signature Active Members", Math.round(cavaliMembers.signatureActive).toLocaleString("en-US"));
      setCurrentInRows(cavaliEngine.rows, "Premium Active Members", Math.round(cavaliMembers.premiumActive).toLocaleString("en-US"));
    }
  }
}

async function refreshActualsFromSheets({ silent = false } = {}) {
  const sources = STATE.dataSources || {};
  const corroSource = sources.corroDashboard || sources.corro;
  const cavaliSource = sources.cavaliDashboard || sources.cavali;
  if (!corroSource || !cavaliSource) return;
  try {
    updateIndicator("Refreshing actuals…");
    const [corroBundle, cavaliBundle] = await Promise.all([
      fetchDashboardBundle(corroSource, "corro"),
      fetchDashboardBundle(cavaliSource, "cavali")
    ]);
    applyActualsToState(corroBundle, cavaliBundle);
    renderCommercial();
    renderBusinessUnits();
    renderSheet2Draft();
    saveNow();
    const msg = `Actuals refreshed ✓ ${STATE.actuals.corroPeriod || ""}`;
    updateIndicator(msg);
    if (!silent) alert(`Actuals connected from Google Sheets.\nCorro: ${STATE.actuals.corroPeriod}\nCavali: ${STATE.actuals.cavaliPeriod}\n\nLoaded tabs:\nCorro: ${JSON.stringify(STATE.actuals.sources.corro)}\nCavali: ${JSON.stringify(STATE.actuals.sources.cavali)}\n\nStill needed for full automation: Klaviyo/email revenue and clean QuickBooks shipping/packaging/OPEX. Markup weighted average is read from products_q1_2026 when price/cost/units columns are present.`);
  } catch (err) {
    console.error(err);
    updateIndicator("Actuals refresh failed");
    if (!silent) alert(`Could not refresh Google Sheet actuals: ${err.message}\n\nMake sure both Google Sheets are shared as Viewer with the link and tabs are named kpis_daily, revenue_share, new_vs_returning, ad_spend, and smartrr_product_volume for Cavali.`);
  }
}

async function boot() {
  STATE = await DataService.load();
  renderAll();
  refreshActualsFromSheets({ silent: true });
  initTabs();
  document.getElementById("addGrowthRow").addEventListener("click", addGrowthRow);
  document.getElementById("saveData").addEventListener("click", saveNow);
  document.getElementById("refreshActuals").addEventListener("click", () => refreshActualsFromSheets());
  document.getElementById("downloadData").addEventListener("click", downloadState);
  document.getElementById("publishScenario").addEventListener("click", publishScenario);
  document.getElementById("resetData").addEventListener("click", () => {
    if (confirm("Reset the model to its base values? Your local edits will be lost.")) {
      DataService.reset();
      location.reload();
    }
  });
}

document.addEventListener("DOMContentLoaded", boot);
