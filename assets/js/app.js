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
  return row.total || parseMoney(row.scenario === "Base" ? 0 : row.scenario.replace("K", "000").replace("M", "000000"));
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
  document.getElementById("doverCapture").value = meta.doverCapture;
  document.getElementById("roas").value = meta.roas;
  document.getElementById("lastUpdate").value = meta.lastUpdate;
  document.getElementById("versionBadge").textContent = `v${meta.version}`;

  document.getElementById("modelStatus").onchange = e => { meta.modelStatus = e.target.value; scheduleSave(); };
  document.getElementById("fundingScenario").onchange = e => { meta.fundingScenario = e.target.value; renderKpis(); scheduleSave(); };
  document.getElementById("fundingDate").onchange = e => { meta.fundingDate = e.target.value; renderKpis(); scheduleSave(); };
  document.getElementById("organicGrowth").onchange = e => { meta.organicGrowth = e.target.value; syncHeaderToTables(); renderKpis(); renderCommercial(); scheduleSave(); };
  document.getElementById("doverCapture").onchange = e => { meta.doverCapture = e.target.value; syncHeaderToTables(); renderKpis(); renderCommercial(); scheduleSave(); };
  document.getElementById("roas").onchange = e => { meta.roas = e.target.value; syncHeaderToTables(); renderKpis(); renderCommercial(); scheduleSave(); };
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
    { label: "Funding", value: STATE.meta.fundingScenario, sub: "$0 · $500K · $1M · $3M · $5M" },
    { label: "Organic Growth", value: STATE.meta.organicGrowth, sub: "Editable assumption" },
    { label: "Dover Capture", value: STATE.meta.doverCapture, sub: "Feeds 2026 scenario" },
    { label: "ROAS", value: STATE.meta.roas, sub: "Editable assumption" },
    { label: "Funding Date", value: STATE.meta.fundingDate || row.date, sub: "Scenario timing" },
  ];
  wrap.innerHTML = "";
  cards.forEach(k => wrap.appendChild(el("div", { class: "kpi-card" }, [
    el("div", { class: "kpi-label" }, k.label),
    el("div", { class: "kpi-value" }, k.value),
    el("div", { class: "kpi-sub" }, k.sub),
  ])));
}

function renderFunding() {
  const cols = ["scenario", "date", "marketing", "inventory", "payables", "embroidery", "privateLabel"];
  const heads = ["Scenario", "Date", "Marketing", "Inventory", "Payables", "Embroidery", "Private Label", "Unallocated Capital"];
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
      if (row.calculated && row.calculated.includes(k)) tr.appendChild(makeCalcCell(row[k] || "Calculated"));
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

function renderBusinessUnits() {
  const wrap = document.getElementById("engineBlocks");
  wrap.innerHTML = "";
  STATE.growthEngines.forEach(engine => {
    const card = el("div", { class: "block-card" }, [
      el("div", { class: "block-title" }, engine.title),
      engine.note ? el("div", { class: "block-note" }, engine.note) : null,
      el("table", { class: "grid" }),
      engine.status ? el("div", { class: "status-pill" }, engine.status) : null,
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

function renderGrowth() {
  const table = document.getElementById("growthTable");
  table.innerHTML = `<thead><tr><th>Initiative</th><th>Owner</th><th>Funding Trigger</th><th>Status</th><th>Launch Date</th><th>Investment</th></tr></thead>`;
  const tbody = el("tbody");
  STATE.growthInitiatives.forEach(row => {
    const tr = el("tr");
    ["initiative", "owner", "trigger", "status", "launch", "investment"].forEach(k => tr.appendChild(makeEditableCell(row, k, () => scheduleSave())));
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
  STATE.thesis.forEach(t => wrap.appendChild(el("div", { class: "thesis-card" }, [
    el("div", { class: "thesis-label" }, t.label),
    el("div", { class: `dot ${t.status || "gray"}` }),
    el("div", { class: "thesis-target" }, t.target),
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
  renderGrowth();
  renderThesis();
  initTabs();
  document.getElementById("addGrowthRow").addEventListener("click", addGrowthRow);
  document.getElementById("saveData").addEventListener("click", saveNow);
  document.getElementById("downloadData").addEventListener("click", downloadState);
  document.getElementById("resetData").addEventListener("click", () => {
    if (confirm("Reset the model to its base values? Your local edits will be lost.")) {
      DataService.reset();
      location.reload();
    }
  });
}

document.addEventListener("DOMContentLoaded", boot);
