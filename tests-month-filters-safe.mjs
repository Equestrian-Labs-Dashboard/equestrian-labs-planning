import fs from 'node:fs';
const app=fs.readFileSync('assets/js/app.js','utf8');
const index=fs.readFileSync('index.html','utf8');
const workflow=fs.readFileSync('.github/workflows/sync-actuals.yml','utf8');
const must=[
 ['Corro selector',index.includes('id="corroMonth"')],
 ['Cavali selector',index.includes('id="cavaliMonth"')],
 ['Core actual2026 preserved',app.includes('function actual2026()')],
 ['Core actualEngine preserved',app.includes('function actualEngine(name,key){const a=actual2026()')],
 ['Display-only monthly layer',app.includes('function displayActualEngine')],
 ['2026 FCS still closed YTD + remaining run rate',app.includes("n(a.ecom.grossSales)+a.remainingMonths*n(STATE.meta.baseEcommerceMonthly)")],
 ['Corro starts 2026',app.includes("availableMonths(ACTUALS.shopify.brands?.corro||{},'2026-01')")],
 ['Cavali starts current month',app.includes("availableMonths(ACTUALS.shopify.brands?.cavali||{},current)")],
 ['Pages environment',workflow.includes('name: github-pages')],
];
let bad=0;
for(const [name,ok] of must){console.log(ok?'PASS':'FAIL',name);if(!ok)bad++;}
process.exit(bad?1:0);
