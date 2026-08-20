import fs from 'node:fs';
import assert from 'node:assert/strict';

const app = fs.readFileSync('assets/js/app.js','utf8');
const index = fs.readFileSync('index.html','utf8');
const assumptions = JSON.parse(fs.readFileSync('data/assumptions.json','utf8'));

assert.match(app, /const selectedYearKey = `y\$\{String\(\(STATE\.meta && STATE\.meta\.displayYear\) \|\| "2026"\)\}`/, 'Tab 3 must use Display Year');
assert.doesNotMatch(app, /ordersForYear\("y2026"\)/, 'Operating KPI Orders must not be hardcoded to 2026');
assert.doesNotMatch(app, /newCustomersForYear\("y2026"\)/, 'Operating KPI New Customers must not be hardcoded to 2026');
assert.match(app, /bridges\[selectedYearKey\]\.adSpend/, 'Tab 3 Ad Spend must use selected year bridge');
assert.match(app, /const selectedCashYearKey = `y\$\{String\(\(STATE\.meta && STATE\.meta\.displayYear\) \|\| "2026"\)\}`/, 'Tab 4 Cash Summary must use Display Year');
assert.match(app, /return 130000000;/, 'Dover market opportunity must stay fixed at $130M');
assert.match(app, /if \(idx <= 0\) return 0;\s*const priorYear = years\[idx - 1\];\s*return baseEcommerceRevenue\(year\) \* organicGrowthPct\(priorYear\);/s, 'Organic Growth must start in 2027 using the prior-year assumption on the new current-year base');
assert.match(app, /const fundingDate = String\(\(STATE\.meta && STATE\.meta\.fundingDate\) \|\| fundingRow\.date \|\| ""\);/, 'Cash Flow funding timing must use active header Funding Date');
assert.match(app, /renderBoardDashboard\(\)/, 'Display year changes must rerender Board');
assert.match(index, /assets\/js\/app\.js\?v=2152/, 'Index must bust cache for integrated app.js');
assert.equal(assumptions.meta.version, '2.15.2', 'Assumptions version must match integrated model');
assert.ok(!fs.existsSync('assets/js/ceci-v2151-hotfix.js'), 'Standalone hotfix should not remain after integration');

console.log('PASS Display Year -> Tab 3 KPI cards');
console.log('PASS Display Year -> Tab 3 Operating KPIs');
console.log('PASS Display Year -> Tab 4 Cash Summary');
console.log('PASS Display Year -> Tab 5 re-render path');
console.log('PASS Dover fixed $130M');
console.log('PASS Organic Growth 2026=0 / prior-year assumption drives next year');
console.log('PASS Funding Date uses active model trigger');
console.log('PASS cache-busted integrated app.js v2.15.2');
console.log('All Ceci 2026-08-19 integration checks passed.');
