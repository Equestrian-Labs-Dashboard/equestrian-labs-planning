import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import '../assets/js/fundingModel.js';

const F = globalThis.FundingModel;
const read = path => fs.readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const assumptions = JSON.parse(read('data/assumptions.json'));
const copy = value => JSON.parse(JSON.stringify(value));
const close = (a, b) => assert.ok(Math.abs(a - b) < .011, `${a} != ${b}`);
const plan = copy(assumptions.fundingPlan);
assert.deepEqual(plan.rounds.map(r => [r.date, r.amount, r.inventory, r.marketing, r.embroidery, r.opex]), [
  ['Nov-26', 500000, 150000, 150000, 50000, 150000],
  ['Jan-27', 3000000, 1250000, 1250000, 0, 500000]
]);
assert.equal(F.summary(plan).funding, 3500000);
assert.deepEqual(F.issues(plan), []);
assert.deepEqual(F.schedule(plan).map(r => [r.label, r.funding, r.accumulated]), [
  ['Oct-26', 0, 0], ['Nov-26', 500000, 500000], ['Dec-26', 0, 500000],
  ['Jan-27', 3000000, 3500000], ['Feb-27', 0, 3500000], ['Mar-27', 0, 3500000]
]);

for (const amount of [1000000, 2000000, 2500000, 3000000, 0, 3000000]) {
  F.updateAmount(plan.rounds[1], amount);
  close(F.allocated(plan.rounds[1]), amount);
  close(plan.rounds[1].inventory, amount * 5 / 12);
  close(plan.rounds[1].marketing, amount * 5 / 12);
}
F.updateAmount(plan.rounds[0], 25000);
F.updateAmount(plan.rounds[0], 500000);
assert.equal(plan.rounds[0].embroidery, 50000);
assert.equal(plan.rounds[0].inventory, 150000);

for (const date of ['Oct-26', 'Nov-26', 'Dec-26', 'Jan-27', 'Feb-27', 'Mar-27']) {
  assert.equal(F.updateRound(plan.rounds[1], 'date', date), true);
  assert.equal(F.fundingForYear(plan, F.dateParts(date).year), date.endsWith('26') ? 3500000 : 3000000);
  const ramp = F.roundRamp(plan.rounds[1]);
  close(Object.values(ramp).reduce((s, x) => s + x, 0), 1);
  assert.equal(ramp[2026], date.endsWith('27') ? 0 : .05);
}
F.updateRound(plan.rounds[1], 'date', 'Nov-26');
assert.equal(F.schedule(plan).find(r => r.label === 'Nov-26').funding, 3500000);
assert.equal(plan.rounds.length, 2);
F.selectPreset(plan, 1, 'none', assumptions.fundingScenarios);
assert.equal(F.summary(plan).funding, 500000);
F.selectPreset(plan, 1, 'custom', assumptions.fundingScenarios);
assert.equal(F.summary(plan).funding, 3500000);
assert.equal(plan.rounds.length, 2);
const legacy = copy(assumptions);
delete legacy.fundingPlan;
const originalScenarios = copy(legacy.fundingScenarios);
F.ensurePlan(legacy, assumptions.fundingPlan);
assert.deepEqual(legacy.fundingHistory.scenarios, originalScenarios);
assert.deepEqual(legacy.fundingScenarios, originalScenarios);
F.updateAmount(legacy.fundingPlan.rounds[1], 2500000);
F.updateRound(legacy.fundingPlan.rounds[1], 'date', 'Mar-27');
F.updateRound(legacy.fundingPlan.rounds[1], 'marketing', 900000);
const saved = JSON.stringify(legacy);
const restored = JSON.parse(saved);
F.ensurePlan(restored, assumptions.fundingPlan);
assert.equal(JSON.stringify(restored), saved);
assert.equal(F.updateRound(plan.rounds[0], 'date', 'bad'), false);
assert.equal(F.updateAmount(plan.rounds[0], -1), false);
const invalid = copy(plan);
F.updateRound(invalid.rounds[0], 'inventory', 999999);
assert.ok(F.issues(invalid).length > 0);

// Execute the actual application and all six render functions against the local data files.
const elements = new Map();
const element = selector => {
  if (!elements.has(selector)) elements.set(selector, {value: '', innerHTML: '', textContent: '', dataset: {}, classList: {add() {}, remove() {}}, insertAdjacentHTML() {}});
  return elements.get(selector);
};
const storage = new Map();
const context = vm.createContext({
  console, setTimeout() {}, Date, Blob, URL,
  document: {querySelector: element, querySelectorAll: () => [], documentElement: {dataset: {}}, body: {insertAdjacentHTML(_where, html) { throw new Error(html); }}},
  localStorage: {getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value)},
  fetch: async path => ({ok: true, json: async () => JSON.parse(read(String(path).split('?')[0]))})
});
context.window = context;
for (const file of ['dataService.js', 'fundingModel.js', 'app.js']) vm.runInContext(read('assets/js/' + file), context, {filename: file});
for (let count = 0; count < 40 && !context.runModelQA; count++) await new Promise(resolve => setImmediate(resolve));
assert.equal(typeof context.runModelQA, 'function');
const initial = context.runModelQA();
assert.equal(initial.funding.funding, 3500000);
assert.equal(initial.years['2026'].cash.funding, 500000);
assert.equal(initial.years['2027'].cash.funding, 3000000);
assert.equal(initial.years['2026'].cash.inventory, 150000);
assert.equal(initial.years['2027'].cash.inventory, 1250000);
assert.equal(initial.years['2026'].cash.capex, 50000);
assert.equal(initial.years['2027'].cash.capex, 0);
assert.equal(initial.years['2026'].cash.opexFunding, 150000);
assert.equal(initial.years['2027'].cash.opexFunding, 500000);
close(initial.years['2026'].portfolio.advertising, 247500);
close(initial.years['2027'].portfolio.advertising, 800000);
for (const year of ['2026', '2027', '2028', '2029']) {
  const {cash, financial} = initial.years[year];
  close(cash.cashOut, cash.inventory + cash.payables + cash.advertising + cash.shipping + cash.sm + cash.ga + cash.other + cash.capex + cash.privateLabel + assumptions.cash.otherCashOut[year]);
  close(cash.ending, cash.opening + cash.totalCashIn - cash.cashOut);
  close(financial.ebitda, financial.gp3 - financial.total);
}
for (let tab = 1; tab <= 6; tab++) assert.ok(element('#tab' + tab).innerHTML.length > 500);
assert.equal(element('#tab6').innerHTML.includes('>FAIL<'), false);

const baseline2027 = initial.years['2027'];
element('#fundingAmount2').onchange({target: {value: '2000000', checkValidity: () => true}});
element('#fundingDate2').onchange({target: {value: 'Mar-27'}});
const changed = context.runModelQA();
assert.equal(changed.funding.funding, 2500000);
assert.equal(changed.years['2027'].cash.funding, 2000000);
assert.notEqual(changed.years['2027'].financial.ebitda, baseline2027.financial.ebitda);
assert.notEqual(changed.years['2027'].cash.ending, baseline2027.cash.ending);
const changedPlan = JSON.stringify(changed.fundingPlan);
element('#statusSelect').onchange({target: {value: 'Budget'}});
assert.equal(context.runModelQA().funding.funding, 3500000);
element('#statusSelect').onchange({target: {value: 'Draft'}});
assert.equal(JSON.stringify(context.runModelQA().fundingPlan), changedPlan);
assert.equal(element('#tab6').innerHTML.includes('>FAIL<'), false);
console.log('PASS  Funding inputs, allocations, persistence, dates and all six application tabs');
