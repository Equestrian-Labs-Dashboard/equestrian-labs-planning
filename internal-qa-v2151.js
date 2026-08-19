const fs = require("fs");
const vm = require("vm");

class NodeEl {
  constructor(id="") {
    this.id = id;
    this.value = "";
    this.innerHTML = "";
    this.className = "";
    this.children = [];
    this.dataset = {};
    this.listeners = {};
  }
  appendChild(x) { this.children.push(x); return x; }
  addEventListener(name, fn) { (this.listeners[name] ||= []).push(fn); }
  fire(name) { for (const fn of (this.listeners[name] || [])) fn({target:this}); }
  setAttribute() {}
}

const ids = {};
function node(id) { return ids[id] ||= new NodeEl(id); }
["displayYear","tab3KpiGrid","tab3PnlTable","tab3OperatingKpis"].forEach(node);
node("displayYear").value = "2027";

global.window = global;
global.document = {
  readyState: "complete",
  getElementById: id => node(id),
  createElement: () => new NodeEl(),
  addEventListener: () => {}
};

global.STATE = {meta:{displayYear:"2027"}};
global.DataService = {saved:0, save(){this.saved++;}};
global.scheduleSave = function(){DataService.saved++;};

global.el = function(tag, attrs={}, children=[]) {
  const e = new NodeEl();
  e.className = attrs.class || "";
  const arr = Array.isArray(children) ? children : [children];
  arr.forEach(c => { if(c !== null && c !== undefined) e.appendChild(c); });
  return e;
};
global.moneyClass = () => "";
global.formatFinancialMoney = n => String(Math.round(Number(n||0)));
global.formatPercent = n => (Number(n||0)*100).toFixed(1)+"%";
global.formatMultiple = n => Number(n||0).toFixed(1)+"x";

const pct = {y2026:0.10,y2027:0.12,y2028:0.15,y2029:0.18};
global.organicGrowthPct = y => pct[y];
global.baseEcommerceRevenue = y => ({y2026:1000000,y2027:2000000,y2028:3000000,y2029:4000000}[y]);

const bridge = {
 y2026:{grossSales:4e6,netSales:3.4e6,gp1:600e3,gp2:430e3,gp3:-31e3,adSpend:465e3},
 y2027:{grossSales:13.7e6,netSales:12e6,gp1:3.6e6,gp2:3.4e6,gp3:2.5e6,adSpend:940e3},
 y2028:{grossSales:15e6,netSales:13e6,gp1:4e6,gp2:3.8e6,gp3:3e6,adSpend:800e3},
 y2029:{grossSales:20e6,netSales:17e6,gp1:5e6,gp2:4.7e6,gp3:4e6,adSpend:1e6}
};
global.marginBridge = y => bridge[y];
global.pnlOpexForYear = y => ({total: y==="y2027" ? 1.933e6 : 1.5e6});
global.ordersForYear = y => ({y2026:1173,y2027:2500,y2028:3200,y2029:4000}[y]);
global.newCustomersForYear = y => ({y2026:600,y2027:900,y2028:1100,y2029:1300}[y]);
global.roasForYear = y => ({y2026:4,y2027:4.2,y2028:4.5,y2029:5}[y]);
global.checkoutAbandonmentRateForYear = y => 0.28;

// Simulate old renderer that wrongly uses 2026.
global.renderFinancialSummary = function() {
  node("tab3KpiGrid").innerHTML = "STALE 2026";
  node("tab3OperatingKpis").innerHTML = "STALE 2026 OPS";
};
global.renderKpis = () => {};
global.renderSheet2Draft = () => {};
global.renderCommercialCashFlow = () => {};
global.renderBoardDashboard = () => { global.boardRendered = (global.boardRendered||0)+1; };
global.renderFormulaQA = () => {};

vm.runInThisContext(fs.readFileSync(process.argv[2], "utf8"));

setTimeout(() => {
  const qa = runCeciV2151QA();
  const failures = [];

  if (qa.failed.length) failures.push("embedded QA failures");
  if (organicGrowthRevenue("y2026") !== 0) failures.push("organic 2026");
  if (organicGrowthRevenue("y2027") !== 200000) failures.push("organic 2027 prior-year assumption");
  if (organicGrowthRevenue("y2028") !== 360000) failures.push("organic 2028 prior-year assumption");
  if (doverMarketOpportunity("y2029") !== 130000000) failures.push("dover");
  if (displayYearKey() !== "y2027") failures.push("display year");

  // The hotfix must have replaced stale content with six cards.
  if (node("tab3KpiGrid").children.length !== 6) failures.push("tab3 KPI cards");
  if (node("tab3OperatingKpis").children.length !== 6) failures.push("tab3 operating KPI cards");

  // Change 2027 -> 2028 and verify persistence + board rerender.
  const beforeSaved = DataService.saved;
  node("displayYear").value = "2028";
  node("displayYear").fire("change");
  if (STATE.meta.displayYear !== "2028") failures.push("STATE displayYear persistence");
  if (displayYearKey() !== "y2028") failures.push("display year change");
  if (DataService.saved <= beforeSaved) failures.push("save triggered");
  if (!global.boardRendered) failures.push("board rerender");

  if (failures.length) {
    console.error("INTERNAL QA FAILED:", failures);
    process.exit(1);
  }
  console.log("INTERNAL QA PASSED: display year, Tab 3 cards, operating KPIs, organic growth, Dover, save, Board rerender.");
}, 20);
