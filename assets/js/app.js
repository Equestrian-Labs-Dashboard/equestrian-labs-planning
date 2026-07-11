let STATE = null;
let saveTimer = null;

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
  return Number(String(v).replace(/[$,]/g, "")) || 0;
}

function formatCurrency(n) {
  return "$" + Number(n || 0).toLocaleString("en-US");
}

function fundingTotal(row) {
  if (row.total !== undefined && row.total !== null) return parseMoney(row.total);
  const label = String(row.scenario || "").replace("$", "").trim();
  if (!label || label === "Base") return 0;
  if (label.endsWith("K")) return parseFloat(label) * 1000;
  if (label.endsWith("M")) return parseFloat(label) * 1000000;
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
  if (opts.money && typeof rowObj[key] === "number") input.value = formatCurrency(rowObj[key]);
  input.addEventListener("change", e => {
    let v = e.target.value;
    if (opts.money) {
      rowObj[key] = parseMoney(v);
      input.value = rowObj[key] ? formatCurrency(rowObj[key]) : "$0";
    } else {
      rowObj[key] = v;
    }
    onChange();
  });
  td.appendChild(input);
  return td;
}

function makeCalcCell(value, className = "calc-cell") {
  return el("td", { class: className }, value);
}

function renderHeader() {
  const { meta, lists } = STATE;
  document.getElementById("modelStatus").innerHTML = optionList(lists.modelStatus, meta.modelStatus);
  document.getElementById("fundingScenario").innerHTML = optionList(lists.fundingScenario, meta.fundingScenario);
  document.getElementById("fundingDate").innerHTML = optionList(lists.fundingDate, meta.fundingDate);
  document.getElementById("organicGrowth").value = meta.organicGrowth;
  document.getElementById("doverCapture").innerHTML = optionList(lists.doverCapture || ["5%", "10%", "15%", "20%", "30%"], meta.doverCapture);
  document.getElementById("roas").innerHTML = optionList(lists.roas || ["3.0x", "3.5x", "4.0x"], meta.roas);
  document.getElementById("lastUpdate").value = meta.lastUpdate;
  document.getElementById("versionBadge").textContent = `v${meta.version}`;

  document.getElementById("modelStatus").onchange = e => { meta.modelStatus = e.target.value; scheduleSave(); };
  document.getElementById("fundingScenario").onchange = e => { meta.fundingScenario = e.target.value; renderKpis(); renderGrowth(); renderBusinessUnits(); scheduleSave(); };
  document.getElementById("fundingDate").onchange = e => { meta.fundingDate = e.target.value; renderKpis(); scheduleSave(); };
  document.getElementById("organicGrowth").onchange = e => { meta.organicGrowth = e.target.value; syncHeaderToTables(); renderKpis(); renderCommercial(); renderThesis(); scheduleSave(); };
  document.getElementById("doverCapture").onchange = e => { meta.doverCapture = e.target.value; syncHeaderToTables(); renderKpis(); renderCommercial(); renderThesis(); scheduleSave(); };
  document.getElementById("roas").onchange = e => { meta.roas = e.target.value; syncHeaderToTables(); renderKpis(); renderCommercial(); renderThesis(); scheduleSave(); };
  document.getElementById("lastUpdate").oninput = e => { meta.lastUpdate = e.target.value; scheduleSave(); };
}

function syncHeaderToTables() {
  const market = STATE.commercial.find(b => b.title.includes("Market Growth"));
  if (market) {
    const org = market.rows.find(r => r.driver === "Organic Growth %");
    const dover = market.rows.find(r => r.driver === "Dover Capture %");
    if (org) org.y2026 = STATE.meta.organicGrowth;
    if (dover) dover.y2026 = STATE.meta.doverCapture;
  }
  const acq = STATE.commercial.find(b => b.title.includes("Acquisition"));
  if (acq) {
    const roas = acq.rows.find(r => r.driver === "ROAS");
    if (roas) roas.y2026 = STATE.meta.roas;
  }
}

function renderKpis() {
  const wrap = document.getElementById("kpiGrid");
  const row = selectedFundingRow();
  const cards = [
    { label: "Funding", value: STATE.meta.fundingScenario, sub: "Selected scenario" },
    { label: "Funding Date", value: STATE.meta.fundingDate || row.date, sub: "Scenario timing" },
    { label: "Organic Growth", value: STATE.meta.organicGrowth, sub: "" },
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
  const cols = ["scenario", "date", "payables", "inventory", "marketing", "embroidery", "privateLabel"];
  const heads = ["Scenario", "Date", "Payables", "Inventory", "Marketing", "Embroidery", "Private Label", "Unallocated Capital"];
  const table = document.getElementById("fundingTable");
  table.innerHTML = `<thead><tr>${heads.map(h => `<th>${h}</th>`).join("")}</tr></thead>`;
  const tbody = el("tbody");
  STATE.funding.forEach(row => {
    const tr = el("tr");
    cols.forEach(col => {
      if (col === "scenario") tr.appendChild(el("td", { class: "label-cell gray-cell" }, row.scenario));
      else if (col === "date") tr.appendChild(makeEditableCell(row, col, () => { renderFunding(); scheduleSave(); }));
      else tr.appendChild(makeEditableCell(row, col, () => { renderFunding(); scheduleSave(); }, { money: true }));
    });
    const allocated = ["marketing", "inventory", "payables", "embroidery", "privateLabel"].reduce((sum, k) => sum + parseMoney(row[k]), 0);
    const unallocated = fundingTotal(row) - allocated;
    const cls = unallocated === 0 ? "calc-cell" : "calc-cell warning-cell";
    tr.appendChild(makeCalcCell((unallocated === 0 ? "✓ " : "⚠ ") + formatCurrency(unallocated), cls));
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
}

function renderDriverTable(tableEl, rows) {
  const heads = ["Driver", "Baseline / Current", "2026", "2027", "2028", "2029"];
  tableEl.innerHTML = `<thead><tr>${heads.map(h => `<th>${h}</th>`).join("")}</tr></thead>`;
  const tbody = el("tbody");
  rows.forEach(row => {
    const tr = el("tr");
    tr.appendChild(el("td", { class: "label-cell" }, row.driver));
    ["current", "y2026", "y2027", "y2028", "y2029"].forEach(k => {
      if (k === "current") tr.appendChild(makeCalcCell(row[k] || "", "gray-cell"));
      else if (row.calculated && row.calculated.includes(k)) tr.appendChild(makeCalcCell(row[k] || "Calculated"));
      else tr.appendChild(makeEditableCell(row, k, () => scheduleSave()));
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
    ["current", "y2026", "y2027", "y2028", "y2029"].forEach(k => tr.appendChild(makeEditableCell(row, k, () => scheduleSave())));
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
  STATE.growthEngines.forEach(engine => {
    const gate = gateStatusForEngine(engine);
    const card = el("div", { class: "block-card" }, [
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
  const tr = el("tr");
  ["prepaid", "under15", "d30to45"].forEach(k => tr.appendChild(makeEditableCell(STATE.purchasing.vendorMix, k, () => scheduleSave())));
  vmTable.appendChild(el("tbody", {}, tr));
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
  const cleaned = String(v || "").replace(/[$,%x,]/g, "").trim();
  const n = Number(cleaned);
  return isNaN(n) ? 0 : n;
}

function formatPercent(n) {
  return (Number(n || 0) * 100).toFixed(1).replace(".0", "") + "%";
}

function formatMultiple(n) {
  return Number(n || 0).toFixed(1) + "x";
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

function val(rows, driver, year) {
  return getRow(rows, driver)[year] || "";
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

  if (!active) return { gross: 0, gp1: 0, gm1: 0, active: false, note: "Locked by funding gate" };

  if (title.startsWith("Ecommerce") || title.startsWith("Wellington") || title.startsWith("Embroidery")) {
    const orders = parseNumber(val(rows, "Orders", year));
    const aov = parseMoney(val(rows, "AOV", year));
    const gm1 = parsePercent(val(rows, "GM1 %", year));
    gross = orders * aov;
    gp1 = gross * gm1;
    note = "Orders × AOV";
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
    return { gross, gp1, gm1, active, note };
  }

  if (title.startsWith("Private Label")) {
    const units = parseNumber(val(rows, "Units Sold", year));
    const asp = parseMoney(val(rows, "Average Selling Price", year));
    const gm1 = parsePercent(val(rows, "GM1 %", year));
    gross = units * asp;
    gp1 = gross * gm1;
    note = "Units × ASP";
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
  const market = getBlock(STATE.commercial, "Market Growth");
  const acq = getBlock(STATE.commercial, "Acquisition");
  const dnrPct = parsePercent(val(market ? market.rows : [], "Discounts & Returns %", year));
  const discountsReturns = grossSales * dnrPct;
  const netSales = grossSales - discountsReturns;

  const outboundPct = parsePercent(val(STATE.operations, "Outbound Shipping Cost %", year));
  const packagingPct = parsePercent(val(STATE.operations, "Packaging Cost %", year));
  const shippingRevPct = parsePercent(val(STATE.operations, "Shipping Revenue %", year));
  const outboundShipping = netSales * outboundPct;
  const packaging = netSales * packagingPct;
  const shippingRevenue = netSales * shippingRevPct;
  const gp2 = gp1 - outboundShipping - packaging + shippingRevenue;

  const totalAdSpend = parseMoney(val(acq ? acq.rows : [], "Total Ad Spend", year));
  const cavali = getBlock(STATE.growthEngines, "Cavali");
  const cavaliAdSpend = parseMoney(val(cavali ? cavali.rows : [], "Cavali Ad Spend", year));
  const variableMarketing = totalAdSpend + cavaliAdSpend;
  const gp3 = gp2 - variableMarketing;

  return { grossSales, discountsReturns, netSales, dnrPct, gp1, outboundShipping, packaging, shippingRevenue, gp2, variableMarketing, gp3 };
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

function renderSheet2Scenario() {
  renderMiniCards("sheet2ScenarioGrid", [
    { label: "Active Scenario", value: STATE.meta.fundingScenario, sub: "Tab 01 link" },
    { label: "Funding", value: STATE.meta.fundingScenario, sub: "Tab 01 link" },
    { label: "Funding Date", value: STATE.meta.fundingDate, sub: "Tab 01 link" },
    { label: "Organic Growth", value: STATE.meta.organicGrowth, sub: "Tab 01 link" },
    { label: "Dover Capture", value: STATE.meta.doverCapture, sub: "Tab 01 link" },
  ]);
}

function renderFinancialSnapshot(year = "y2026") {
  const m = marginBridge(year);
  renderMiniCards("financialSnapshotGrid", [
    { label: "Gross Sales", value: formatCurrency(Math.round(m.grossSales)), sub: yearLabel(year) + " formula" },
    { label: "Net Sales", value: formatCurrency(Math.round(m.netSales)), sub: "After Dis&Ret" },
    { label: "Net-to-Gross", value: m.grossSales ? formatPercent(m.netSales / m.grossSales) : "—", sub: "Calculated" },
    { label: "Gross Profit 1", value: formatCurrency(Math.round(m.gp1)), sub: m.netSales ? formatPercent(m.gp1 / m.netSales) : "GP1 margin" },
    { label: "Gross Profit 2", value: formatCurrency(Math.round(m.gp2)), sub: m.netSales ? formatPercent(m.gp2 / m.netSales) : "GP2 margin" },
    { label: "Gross Profit 3", value: formatCurrency(Math.round(m.gp3)), sub: m.netSales ? formatPercent(m.gp3 / m.netSales) : "GP3 margin" },
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
    tr.appendChild(makeCalcCell(formatCurrency(Math.round(row.gross))));
    tr.appendChild(makeCalcCell(row.gm1 ? formatPercent(row.gm1) : "—"));
    tr.appendChild(makeCalcCell(formatCurrency(Math.round(row.gp1))));
    tbody.appendChild(tr);
  });

  const acq = getBlock(STATE.commercial, "Acquisition");
  const adSpend = parseMoney(val(acq ? acq.rows : [], "Total Ad Spend", year));
  const roas = parseMultiple(val(acq ? acq.rows : [], "ROAS", year));
  const support = el("tr");
  support.appendChild(el("td", { class: "label-cell" }, "Paid Revenue Influenced"));
  support.appendChild(makeCalcCell("Emma"));
  support.appendChild(makeCalcCell("Ad Spend × ROAS — disclosure only"));
  support.appendChild(makeCalcCell("Do not add to sales"));
  support.appendChild(makeCalcCell(formatCurrency(Math.round(adSpend * roas))));
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
  const heads = ["Growth Engine", "Owner", "Gross Sales", "% Total Sales", "GP1", "% Total GP1"];
  table.innerHTML = `<thead><tr>${heads.map(h => `<th>${h}</th>`).join("")}</tr></thead>`;
  const tbody = el("tbody");
  outputs.forEach(row => {
    const tr = el("tr");
    tr.appendChild(el("td", { class: "label-cell" }, row.engine));
    tr.appendChild(makeCalcCell(row.owner || "—"));
    tr.appendChild(makeCalcCell(formatCurrency(Math.round(row.gross))));
    tr.appendChild(makeCalcCell(totalSales ? formatPercent(row.gross / totalSales) : "—"));
    tr.appendChild(makeCalcCell(formatCurrency(Math.round(row.gp1))));
    tr.appendChild(makeCalcCell(totalGp1 ? formatPercent(row.gp1 / totalGp1) : "—"));
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
}

function renderSheet2MarginBridge(year = "y2026") {
  const table = document.getElementById("sheet2MarginBridgeTable");
  if (!table) return;
  const m = marginBridge(year);
  const rows = [
    ["Gross Sales", "SUM(active Growth Engine Gross Sales)", m.grossSales],
    ["Discounts & Returns", "Gross Sales × Dis&Ret % from Tab 01", -m.discountsReturns],
    ["Net Sales", "Gross Sales − Discounts & Returns", m.netSales],
    ["Gross Profit 1", "SUM(engine GP1)", m.gp1],
    ["Outbound Shipping", "Net Sales × Outbound Shipping Cost %", -m.outboundShipping],
    ["Packaging", "Net Sales × Packaging Cost %", -m.packaging],
    ["Shipping Revenue", "Net Sales × Shipping Revenue %", m.shippingRevenue],
    ["Gross Profit 2", "GP1 − Shipping − Packaging + Shipping Revenue", m.gp2],
    ["Variable Marketing", "Total Ad Spend + Cavali Ad Spend", -m.variableMarketing],
    ["Gross Profit 3", "GP2 − Variable Marketing", m.gp3],
  ];
  table.innerHTML = `<thead><tr><th>Stage</th><th>Formula / source</th><th>${yearLabel(year)}</th></tr></thead>`;
  const tbody = el("tbody");
  rows.forEach(([stage, source, value]) => {
    const tr = el("tr");
    tr.appendChild(el("td", { class: "label-cell" }, stage));
    tr.appendChild(makeCalcCell(source));
    tr.appendChild(makeCalcCell(formatCurrency(Math.round(value))));
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
  renderSheet2EngineDetail("y2026");
  renderSheet2ExecSummary("y2026");
  renderSheet2MarginBridge("y2026");
  renderSheet2FormulaNotes();
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
    if (t.label === "Organic Growth") return { ...t, value: STATE.meta.organicGrowth };
    if (t.label === "Dover Capture") return { ...t, value: STATE.meta.doverCapture };
    return t;
  });
  dynamic.forEach(t => wrap.appendChild(el("div", { class: "thesis-card target-card" }, [
    el("div", { class: "thesis-label" }, t.label),
    el("div", { class: "thesis-value" }, t.value || "—"),
    el("div", { class: "thesis-target" }, t.sub || t.target || ""),
  ])));
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
  const ytd = rowsForYtd(rows, latest.year, latest.month);
  const prevYtd = rowsForYtd(rows, latest.year - 1, latest.month);
  const gross = sumField(ytd, "gross_sales");
  const prevGross = sumField(prevYtd, "gross_sales");
  const orders = sumField(ytd, "nb_orders");
  const customers = sumField(ytd, "new_customers") + sumField(ytd, "returning_customers");
  const returning = sumField(ytd, "returning_customers");
  const discountsReturns = sumField(ytd, "total_discounts") + sumField(ytd, "total_returns");
  return {
    latest,
    periodLabel: `${latest.year} YTD through ${String(latest.month).padStart(2, "0")}`,
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
  const ytd = rowsForYtd(rows, kpiActuals.latest.year, kpiActuals.latest.month);
  const spend = sumField(ytd, "ad_spend");
  const weightedRoasNumerator = (ytd || []).reduce((s, r) => s + parseNumber(r.ad_spend) * parseNumber(r.roas), 0);
  const roas = spend ? weightedRoasNumerator / spend : 0;
  const cos = kpiActuals.grossSales ? spend / kpiActuals.grossSales : 0;
  const cac = kpiActuals.newCustomers ? spend / kpiActuals.newCustomers : 0;
  return { spend, roas, cos, cac };
}

function channelRevenueYtd(rows, channel, latest) {
  if (!rows || !rows.length || !latest) return 0;
  const ytd = rowsForYtd(rows, latest.year, latest.month);
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

  if (corro) {
    if (acq) {
      setCurrentInRows(acq.rows, "New Customer %", formatPercent(corro.newCustomerPct));
      if (corroAds && corroAds.spend) {
        setCurrentInRows(acq.rows, "Total Ad Spend", formatCurrency(Math.round(corroAds.spend)));
        setCurrentInRows(acq.rows, "Incremental Ad Spend", formatCurrency(Math.round(corroAds.spend)));
        setCurrentInRows(acq.rows, "ROAS", formatMultiple(corroAds.roas));
        setCurrentInRows(acq.rows, "Ad Spend % of Gross Sales", formatPercent(corroAds.cos));
        setCurrentInRows(acq.rows, "CAC", formatCurrency(Math.round(corroAds.cac)));
      } else {
        setCurrentInRows(acq.rows, "Total Ad Spend", "No ad_spend rows");
        setCurrentInRows(acq.rows, "Incremental Ad Spend", "No ad_spend rows");
        setCurrentInRows(acq.rows, "ROAS", "No ad_spend rows");
      }
    }
    if (retention) {
      setCurrentInRows(retention.rows, "Returning Customers %", formatPercent(corro.returningCustomerPct));
      setCurrentInRows(retention.rows, "Purchase Frequency", corro.purchaseFrequency.toFixed(2));
      const annualGp = corro.aov * corro.purchaseFrequency * corro.gm1;
      setCurrentInRows(retention.rows, "Annual Customer Gross Profit", formatCurrency(Math.round(annualGp)));
    }
    if (market) {
      setCurrentInRows(market.rows, "Organic Growth %", formatPercent(corro.organicGrowth));
      setCurrentInRows(market.rows, "Discounts & Returns %", formatPercent(corro.discountReturnsPct));
    }
    if (ecommerce) {
      setCurrentInRows(ecommerce.rows, "Orders", Math.round(corro.orders).toLocaleString("en-US"));
      setCurrentInRows(ecommerce.rows, "AOV", formatCurrency(Math.round(corro.aov)));
      setCurrentInRows(ecommerce.rows, "GM1 %", formatPercent(corro.gm1));
    }
    if (concierge) {
      const conciergeRevenue = channelRevenueYtd(corroBundle.revenueShare, "Concierge", corro.latest);
      if (conciergeRevenue) setCurrentInRows(concierge.rows, "AOV", `Revenue share: ${formatCurrency(Math.round(conciergeRevenue))}`);
    }
    if (wellington) {
      const wellingtonRevenue = channelRevenueYtd(corroBundle.revenueShare, "Wellington", corro.latest);
      if (wellingtonRevenue) setCurrentInRows(wellington.rows, "AOV", `Revenue share: ${formatCurrency(Math.round(wellingtonRevenue))}`);
    }
  }

  if (cavali && cavaliEngine) {
    setCurrentInRows(cavaliEngine.rows, "GM1 %", formatPercent(cavali.gm1));
    setCurrentInRows(cavaliEngine.rows, "Organic Member Growth", formatPercent(cavali.organicGrowth));
    if (cavaliAds && cavaliAds.spend) {
      setCurrentInRows(cavaliEngine.rows, "Cavali Ad Spend", formatCurrency(Math.round(cavaliAds.spend)));
      setCurrentInRows(cavaliEngine.rows, "Cavali CAC", formatCurrency(Math.round(cavaliAds.cac)));
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
  syncHeaderToTables();
  renderHeader();
  renderKpis();
  renderFunding();
  renderCommercial();
  renderBusinessUnits();
  renderPurchasing();
  renderOperations();
  renderSheet2Draft();
  renderGrowth();
  renderThesis();
  refreshActualsFromSheets({ silent: true });
  initTabs();
  document.getElementById("addGrowthRow").addEventListener("click", addGrowthRow);
  document.getElementById("saveData").addEventListener("click", saveNow);
  document.getElementById("refreshActuals").addEventListener("click", () => refreshActualsFromSheets());
  document.getElementById("downloadData").addEventListener("click", downloadState);
  document.getElementById("resetData").addEventListener("click", () => {
    if (confirm("Reset the model to its base values? Your local edits will be lost.")) {
      DataService.reset();
      location.reload();
    }
  });
}

document.addEventListener("DOMContentLoaded", boot);
