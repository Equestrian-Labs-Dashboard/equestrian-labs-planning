import fs from 'node:fs';
import assert from 'node:assert/strict';

const app = fs.readFileSync('assets/js/app.js','utf8');
const sync = fs.readFileSync('scripts/sync-shopify-actuals.mjs','utf8');
const workflow = fs.readFileSync('.github/workflows/deploy.yml','utf8');
const assumptions = JSON.parse(fs.readFileSync('data/assumptions.json','utf8'));

assert.match(sync, /inventoryItem\s*\{\s*unitCost/s, 'Shopify sync must request variant unit cost');
assert.match(sync, /agg\.cogs \+= cogs/, 'Shopify sync must aggregate COGS');
assert.match(sync, /gross_profit:\s*round2\(r\.net_sales - r\.cogs\)/, 'Shopify sync must expose GP');
assert.match(sync, /pct_gm:/, 'Channel revenue share must expose gross margin');
assert.match(app, /ecommerceMetrics\.gm1 \|\| corro\.gm1/, 'Ecommerce current GM1 must prefer ecommerce channel GM1');
assert.ok((app.match(/setCavaliForecastFields\(cavaliEngine, cavali, cavaliAds\)/g) || []).length >= 1, 'Cavali actuals refresh helper must be wired');
assert.match(app, /saveScenarioInputs\(\(STATE\.meta && STATE\.meta\.modelStatus\) \|\| "Draft"\)/, 'Save must snapshot active scenario');
assert.match(app, /DataService\.save\(STATE\)/, 'Save must persist complete model state');
assert.match(app, /scheduleSave\(\)/, 'Editable changes must schedule persistence');
assert.match(workflow, /GOOGLE_CREDENTIALS/, 'Workflow must use Google service credentials');
assert.match(workflow, /SHEET_ID_CORRO/, 'Workflow must use Corro sheet');
assert.match(workflow, /SHEET_ID_CAVALI/, 'Workflow must use Cavali sheet');

for (const name of ['Ecommerce','Concierge','Wellington','Cavali']) {
  const block = assumptions.growthEngines.find(b => b.title.startsWith(name));
  assert.ok(block, `${name} block missing`);
  const gm = block.rows.find(r => r.driver === 'GM1 %');
  assert.ok(gm, `${name} GM1 row missing`);
}

assert.match(app, /Checkout Abandonment Rate/, 'Financial Summary must include Checkout Abandonment Rate');
assert.match(app, /const isSubtotal = name === "Operating Cash Out";/, 'Cash Out renderer must identify Operating Cash Out subtotal');
assert.equal(assumptions.meta.version, '2.15.3', 'Visible model data version must be v2.15.3');
const cavali = assumptions.growthEngines.find(b => b.title.startsWith('Cavali'));
assert.notEqual(cavali.rows.find(r=>r.driver==='Cavali CAC').y2026, '$100', 'Cavali CAC must not default to fake $100');
assert.ok(['—','$0','Calculated'].includes(cavali.rows.find(r=>r.driver==='Cavali Ad Spend').y2026), 'Cavali Ad Spend 2026 must be connected/calculated or neutral');
assert.ok(assumptions.growthInitiatives.find(x=>x.initiative==='Market Expansion'), 'Market Expansion initiative must exist');

console.log('PASS integration: persistence, Shopify COGS/GP, workflow credentials, version, no fake Cavali defaults');
