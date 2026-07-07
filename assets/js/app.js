let STATE = null;
let saveTimer = null;

function scheduleSave() {
  clearTimeout(saveTimer);
  const indicator = document.getElementById("saveIndicator");
  if (indicator) indicator.textContent = "Saving…";
  saveTimer = setTimeout(() => {
    DataService.save(STATE);
    if (indicator) indicator.textContent = "Saved ✓";
  }, 400);
}

function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  Object.entries(attrs).forEach(([k, v]) => {
    if (k === "class") node.className = v;
    else if (k === "html") node.innerHTML = v;
    else node.setAttribute(k, v);
  });
  (Array.isArray(children) ? children : [children]).forEach(c => {
    if (c) node.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
  });
  return node;
}

function optionList(values, selected) {
  return values.map(v => `<option value="${v}" ${v === selected ? "selected" : ""}>${v}</option>`).join("");
}

/* ---------------- Header ---------------- */
function renderHeader() {
  const { meta, lists } = STATE;
  document.getElementById("modelStatus").innerHTML = optionList(lists.modelStatus, meta.modelStatus);
  document.getElementById("fundingScenario").innerHTML = optionList(lists.fundingScenario, meta.fundingScenario);
  document.getElementById("fundingDate").innerHTML = optionList(lists.fundingDate, meta.fundingDate);
  document.getElementById("version").value = meta.version;
  document.getElementById("lastUpdate").value = meta.lastUpdate;
  document.getElementById("owner").value = meta.owner;

  document.getElementById("modelStatus").onchange = e => { meta.modelStatus = e.target.value; scheduleSave(); };
  document.getElementById("fundingScenario").onchange = e => { meta.fundingScenario = e.target.value; scheduleSave(); };
  document.getElementById("fundingDate").onchange = e => { meta.fundingDate = e.target.value; scheduleSave(); };
  document.getElementById("version").oninput = e => { meta.version = e.target.value; scheduleSave(); };
  document.getElementById("lastUpdate").oninput = e => { meta.lastUpdate = e.target.value; scheduleSave(); };
  document.getElementById("owner").oninput = e => { meta.owner = e.target.value; scheduleSave(); };
}

/* ---------------- KPI cards ---------------- */
function renderKpis() {
  const wrap = document.getElementById("kpiGrid");
  wrap.innerHTML = "";
  STATE.kpis.forEach(k => {
    wrap.appendChild(el("div", { class: "kpi-card" }, [
      el("div", { class: "kpi-label" }, k.label),
      el("div", { class: "kpi-value" }, k.value),
      el("div", { class: "kpi-sub" }, k.sub),
    ]));
  });
}

/* ---------------- Section 1: Funding & Allocation ---------------- */
function renderFunding() {
  const cols = ["scenario", "funding", "date", "marketing", "inventory", "payables", "embroidery", "privateLabel"];
  const heads = ["Scenario", "Funding", "Date", "Marketing", "Inventory", "Payables", "Embroidery", "Private Label"];
  const table = document.getElementById("fundingTable");
  table.innerHTML = `<thead><tr>${heads.map(h => `<th>${h}</th>`).join("")}</tr></thead>`;
  const tbody = el("tbody");
  STATE.funding.forEach((row, i) => {
    const tr = el("tr");
    cols.forEach(col => {
      if (col === "scenario") {
        tr.appendChild(el("td", { class: "label-cell gray-cell" }, row.scenario));
      } else if (col === "date") {
        tr.appendChild(makeEditableCell(row, col, "text", () => scheduleSave(), false));
      } else {
        tr.appendChild(makeEditableCell(row, col, "number", () => scheduleSave(), true));
      }
    });
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
}

function makeEditableCell(rowObj, key, type, onChange, formatMoney) {
  const td = el("td", { class: "editable" });
  const input = el("input", { type: type === "number" ? "text" : "text" });
  input.value = rowObj[key] === 0 || rowObj[key] ? (formatMoney && typeof rowObj[key] === "number" ? formatCurrency(rowObj[key]) : rowObj[key]) : "";
  input.addEventListener("change", e => {
    let v = e.target.value.replace(/[$,]/g, "");
    rowObj[key] = formatMoney && v !== "" && !isNaN(v) ? Number(v) : v;
    if (formatMoney && !isNaN(v) && v !== "") input.value = formatCurrency(Number(v));
    onChange();
  });
  td.appendChild(input);
  return td;
}

function formatCurrency(n) {
  return "$" + Number(n).toLocaleString("en-US");
}

/* ---------------- Section 2: Commercial Drivers ---------------- */
function renderDriverTable(tableEl, rows, keyField = "driver") {
  const heads = [keyField === "driver" ? "Driver" : "KPI", "Current", "2026", "2027", "2028", "2029"];
  tableEl.innerHTML = `<thead><tr>${heads.map(h => `<th>${h}</th>`).join("")}</tr></thead>`;
  const tbody = el("tbody");
  rows.forEach(row => {
    const tr = el("tr");
    tr.appendChild(el("td", { class: "label-cell" }, row[keyField]));
    ["current", "y2026", "y2027", "y2028", "y2029"].forEach(k => {
      tr.appendChild(makeEditableCell(row, k, "text", () => scheduleSave()));
    });
    tbody.appendChild(tr);
  });
  tableEl.appendChild(tbody);
}

function renderCommercial() {
  renderDriverTable(document.getElementById("customerTable"), STATE.commercial.customer);
  renderDriverTable(document.getElementById("marketingTable"), STATE.commercial.marketing);
}

/* ---------------- Section 3: Business Unit Drivers ---------------- */
function renderBusinessUnits() {
  const table = document.getElementById("buTable");
  table.innerHTML = `<thead><tr><th>Business Unit</th><th>Owner</th><th>Orders</th><th>AOV</th><th>GM1 %</th><th>Revenue (calc.)</th></tr></thead>`;
  const tbody = el("tbody");
  STATE.businessUnits.forEach(row => {
    const tr = el("tr");
    tr.appendChild(el("td", { class: "label-cell" }, row.unit));
    tr.appendChild(el("td", { class: "gray-cell" }, row.owner));
    ["orders", "aov", "gm1"].forEach(k => tr.appendChild(makeEditableCell(row, k, "text", () => scheduleSave())));
    tr.appendChild(el("td", { class: "calc-cell" }, "—"));
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
}

/* ---------------- Section 4: Purchasing Drivers ---------------- */
function renderPurchasing() {
  renderDriverTable(document.getElementById("purchasingTable"), STATE.purchasing, "kpi");
  const vm = STATE.vendorMix;
  const table = document.getElementById("vendorMixTable");
  table.innerHTML = `<thead><tr><th>Prepaid %</th><th>&lt;15 Days %</th><th>30–45 Days %</th></tr></thead>`;
  const tr = el("tr");
  tr.appendChild(makeEditableCell(vm, "prepaid", "text", () => scheduleSave()));
  tr.appendChild(makeEditableCell(vm, "under15", "text", () => scheduleSave()));
  tr.appendChild(makeEditableCell(vm, "d30to45", "text", () => scheduleSave()));
  table.appendChild(el("tbody", {}, tr));
}

/* ---------------- Section 5: Operations Drivers ---------------- */
function renderOperations() {
  const table = document.getElementById("opsTable");
  table.innerHTML = `<thead><tr><th>KPI</th><th>Value</th></tr></thead>`;
  const tbody = el("tbody");
  STATE.operations.forEach(row => {
    const tr = el("tr");
    tr.appendChild(el("td", { class: "label-cell" }, row.kpi));
    tr.appendChild(makeEditableCell(row, "value", "text", () => scheduleSave()));
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
}

/* ---------------- Section 6: Margin Structure (waterfall) ---------------- */
function renderWaterfall() {
  const wrap = document.getElementById("waterfall");
  wrap.innerHTML = "";
  STATE.waterfall.forEach((row, i) => {
    const wfRow = el("div", { class: "wf-row" + (row.sub ? " sub" : "") }, [
      el("div", {}, row.label),
      el("div", { class: "wf-val" }, "—"),
    ]);
    wrap.appendChild(wfRow);
    if (i < STATE.waterfall.length - 1) {
      wrap.appendChild(el("div", { class: "wf-arrow" }, "↓"));
    }
  });
}

/* ---------------- Section 7: Growth Initiatives ---------------- */
function renderGrowth() {
  const table = document.getElementById("growthTable");
  table.innerHTML = `<thead><tr><th>Initiative</th><th>Owner</th><th>Trigger</th><th>Launch</th><th>Investment</th></tr></thead>`;
  const tbody = el("tbody");
  STATE.growthInitiatives.forEach(row => {
    const tr = el("tr");
    ["initiative", "owner", "trigger", "launch", "investment"].forEach(k => {
      tr.appendChild(makeEditableCell(row, k, "text", () => scheduleSave()));
    });
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
}

function addGrowthRow() {
  STATE.growthInitiatives.push({ initiative: "", owner: "", trigger: "", launch: "", investment: "" });
  renderGrowth();
  scheduleSave();
}

/* ---------------- Section 8: Investment Thesis Checks ---------------- */
function renderThesis() {
  const wrap = document.getElementById("thesisGrid");
  wrap.innerHTML = "";
  STATE.thesis.forEach(t => {
    wrap.appendChild(el("div", { class: "thesis-card" }, [
      el("div", { class: "thesis-label" }, t.label),
      el("div", { class: `dot ${t.status}` }),
      el("div", { class: "thesis-target" }, t.target),
    ]));
  });
}

/* ---------------- Tabs ---------------- */
function initTabs() {
  const buttons = document.querySelectorAll(".tab-btn");
  buttons.forEach(btn => {
    btn.addEventListener("click", () => {
      buttons.forEach(b => b.classList.remove("active"));
      document.querySelectorAll(".tab-panel").forEach(p => p.classList.remove("active"));
      btn.classList.add("active");
      document.getElementById(btn.dataset.tab).classList.add("active");
    });
  });
}

/* ---------------- Boot ---------------- */
async function boot() {
  STATE = await DataService.load();
  renderHeader();
  renderKpis();
  renderFunding();
  renderCommercial();
  renderBusinessUnits();
  renderPurchasing();
  renderOperations();
  renderWaterfall();
  renderGrowth();
  renderThesis();
  initTabs();
  document.getElementById("addGrowthRow").addEventListener("click", addGrowthRow);
  document.getElementById("resetData").addEventListener("click", () => {
    if (confirm("Reset the model to its base values? Your local edits will be lost.")) {
      DataService.reset();
      location.reload();
    }
  });
}

document.addEventListener("DOMContentLoaded", boot);
