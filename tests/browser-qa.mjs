import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';

const require = createRequire(import.meta.url);
const {chromium} = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({headless: true, ...(process.env.CHROME_PATH ? {executablePath: process.env.CHROME_PATH} : {})});
const output = new URL('../artifacts/funding-qa/', import.meta.url);
fs.mkdirSync(output, {recursive: true});
const errors = [];
const url = process.env.MODEL_URL || 'http://127.0.0.1:4174/';
try {
  const context = await browser.newContext({viewport: {width: 1440, height: 1000}});
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(url);
  await page.waitForFunction(() => typeof window.runModelQA === 'function');
  const snapshot = () => page.evaluate(() => window.runModelQA());
  const amount = async (id, value) => { await page.locator(id).fill(String(value)); await page.locator(id).press('Tab'); };
  let state = await snapshot();
  assert.equal(state.funding.funding, 3500000);
  assert.equal(await page.locator('#fundingDate').inputValue(), 'Nov-26');
  assert.equal(await page.locator('#fundingDate2').inputValue(), 'Jan-27');
  assert.equal(await page.locator('.qa-fail').count(), 0);
  const preciseInventory = page.locator('[data-funding-id="funding-2"][data-funding-key="inventory"]');
  await preciseInventory.focus();
  await preciseInventory.press('Tab');
  assert.equal((await snapshot()).fundingPlan.rounds[1].inventory, 1250000);
  await page.screenshot({path: fileURLToPath(new URL('desktop.png', output)), fullPage: false});
  for (let tab = 1; tab <= 6; tab++) {
    await page.locator(`.tabs button[data-tab="${tab}"]`).click();
    assert.equal(await page.locator(`#tab${tab}`).isVisible(), true);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), true, `Desktop overflow in tab ${tab}`);
  }
  await page.locator('.tabs button[data-tab="1"]').click();
  const baseline = state.years['2027'];
  for (const value of [1000000, 2000000, 2500000, 3000000]) {
    await amount('#fundingAmount2', value);
    state = await snapshot();
    assert.equal(state.funding.funding, 500000 + value);
    assert.ok(Math.abs(state.fundingPlan.rounds[1].inventory - value * 5 / 12) < .011);
  }
  await page.locator('#fundingDate').selectOption('Dec-26');
  await page.locator('#fundingDate2').selectOption('Mar-27');
  await amount('#fundingAmount2', 2500000);
  await page.locator('[data-funding-id="funding-2"][data-funding-key="marketing"]').fill('900000');
  await page.locator('[data-funding-id="funding-2"][data-funding-key="marketing"]').press('Tab');
  state = await snapshot();
  assert.equal(state.fundingPlan.rounds[1].marketing, 900000);
  assert.equal(state.schedule.find(row => row.label === 'Jan-27').funding, 0);
  assert.equal(state.schedule.find(row => row.label === 'Mar-27').funding, 2500000);
  assert.notEqual(state.years['2027'].financial.ebitda, baseline.financial.ebitda);
  assert.notEqual(state.years['2027'].cash.ending, baseline.cash.ending);
  const persisted = JSON.stringify(state.fundingPlan);
  await page.reload();
  await page.waitForFunction(() => typeof window.runModelQA === 'function');
  assert.equal(JSON.stringify((await snapshot()).fundingPlan), persisted);
  await page.locator('#statusSelect').selectOption('Budget');
  assert.equal((await snapshot()).funding.funding, 3500000);
  await page.locator('#statusSelect').selectOption('Draft');
  assert.equal(JSON.stringify((await snapshot()).fundingPlan), persisted);
  await page.locator('#fundingScenario2').selectOption('none');
  assert.equal((await snapshot()).funding.funding, 500000);
  await page.locator('#fundingScenario2').selectOption('custom');
  assert.equal((await snapshot()).funding.funding, 3000000);
  assert.equal((await snapshot()).fundingPlan.rounds.length, 2);
  await page.locator('#addFundingRound').click();
  await amount('[data-funding-id="funding-3"][data-funding-key="amount"]', 100000);
  await page.locator('[data-funding-id="funding-3"][data-funding-key="date"]').selectOption('Dec-26');
  assert.equal((await snapshot()).schedule.find(row => row.label === 'Dec-26').funding, 600000);
  await page.locator('[data-remove-funding="funding-3"]').click();
  assert.equal((await snapshot()).fundingPlan.rounds.length, 2);
  assert.equal(await page.locator('.qa-fail').count(), 0);

  const legacy = JSON.parse(fs.readFileSync(new URL('../data/assumptions.json', import.meta.url), 'utf8'));
  delete legacy.fundingPlan;
  legacy.meta.fundingScenario = '$3M';
  legacy.meta.fundingScenario2 = 'added-2m-nov26';
  legacy.meta.baseEcommerceMonthly = 81000;
  await page.evaluate(data => localStorage.setItem('eqlabs-strategic-model:v45:Draft', JSON.stringify(data)), legacy);
  await page.reload();
  await page.waitForFunction(() => typeof window.runModelQA === 'function');
  assert.equal((await snapshot()).funding.funding, 3500000);
  assert.equal(await page.locator('#baseEcommerce').inputValue(), '81000');
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('eqlabs-strategic-model:v45:Draft')));
  assert.deepEqual(saved.fundingHistory.scenarios, legacy.fundingScenarios);
  console.log('PASS  Browser edits, recalculation, reload, legacy migration, statuses, round inclusion and same-month funding');

  await context.close();
  const visualContext = await browser.newContext();
  const visual = await visualContext.newPage();
  visual.on('pageerror', error => errors.push(error.message));
  for (const [width, height, name] of [[1440, 1000, 'desktop'], [390, 844, 'mobile']]) {
    await visual.setViewportSize({width, height});
    await visual.goto(url);
    await visual.waitForFunction(() => typeof window.runModelQA === 'function');
    await visual.screenshot({path: fileURLToPath(new URL(`${name}.png`, output)), fullPage: false});
    await visual.locator('#fundingAssignment').scrollIntoViewIfNeeded();
    await visual.screenshot({path: fileURLToPath(new URL(`${name}-funding.png`, output)), fullPage: false});
    for (let tab = 1; tab <= 6; tab++) {
      await visual.locator(`.tabs button[data-tab="${tab}"]`).click();
      assert.equal(await visual.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true, `${name} overflow in tab ${tab}`);
    }
    assert.equal(await visual.locator('.qa-fail').count(), 0);
  }
  assert.deepEqual(errors, []);
  console.log('PASS  Desktop and mobile layouts across all six tabs; no page errors');
} finally {
  await browser.close();
}
