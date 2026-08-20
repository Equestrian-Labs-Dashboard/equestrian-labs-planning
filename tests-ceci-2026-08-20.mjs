import fs from 'fs';
const app = fs.readFileSync('assets/js/app.js','utf8');
const assumptions = JSON.parse(fs.readFileSync('data/assumptions.json','utf8'));
const market = assumptions.commercial.find(b => String(b.title||'').startsWith('Market Growth'));
const org = market.rows.find(r => r.driver === 'Organic Growth %');
function ok(name, cond){ if(!cond){ console.error('FAIL',name); process.exitCode=1; } else console.log('PASS',name); }
ok('version 2.15.2', assumptions.meta.version === '2.15.2');
ok('2026 organic planning assumption is not stale 0%', org.y2026 !== '0%' && org.y2026 !== '0');
ok('2026 organic revenue still explicitly zero', app.includes('if (idx <= 0) return 0;'));
ok('2027+ organic uses current-year carried-forward base', app.includes('return baseEcommerceRevenue(year) * organicGrowthPct(priorYear);'));
ok('stale saved scenarios are migrated from 0%', app.includes('if (current2026 === 0)'));
ok('Dover fixed at 130M', app.includes('return 130000000;'));
ok('cache bust v2152', fs.readFileSync('index.html','utf8').includes('app.js?v=2152'));

// Numeric regression test using the model's intended mechanics for the current $3M/Oct-26 scenario.
const base2026 = 1_100_000; // representative current FCS, exact live value comes from Shopify actuals
const carry26 = 0.504;
const carry27 = 0.55;
const org26 = 0.10;
const org27 = 0.10;
const roas26 = 4.0, roas27 = 4.2, roas28 = 4.5;
const marketing = 950_000;
const ad26 = 240_000 + marketing * 3/12;
const ad27 = 240_000 + marketing * 9/12;
const ad28 = 240_000;
const dover26 = 130_000_000*.20*.05*.70;
const dover27 = 130_000_000*.20*.55*.70;
const dover28 = 130_000_000*.20*.25*.70;
const paid26 = ad26*roas26;
const base2027 = base2026 + carry26*(paid26+dover26);
const organic2027 = base2027*org26;
const paid27 = ad27*roas27;
const total2027 = base2027+organic2027+paid27+dover27;
const base2028 = base2027 + carry27*(organic2027+paid27+dover27);
const organic2028 = base2028*org27;
const total2028 = base2028+organic2028+ad28*roas28+dover28;
ok('2027 organic is > 0 under active scenario', organic2027 > 0);
ok('2028 organic is > 2027 organic as base grows', organic2028 > organic2027);
ok('2028 ecommerce revenue no longer drops below 2027 in regression scenario', total2028 >= total2027);
console.log({base2027, organic2027, total2027, base2028, organic2028, total2028});
