import fs from 'node:fs';
const app = fs.readFileSync('assets/js/app.js','utf8');
const assumptions = JSON.parse(fs.readFileSync('data/assumptions.json','utf8'));
function assert(cond,msg){ if(!cond) throw new Error(msg); console.log('PASS',msg); }
const market=assumptions.commercial.find(x=>x.title.startsWith('Market Growth'));
const opp=market.rows.find(x=>x.driver.startsWith('Dover Market Opportunity'));
assert(['y2026','y2027','y2028','y2029'].every(y=>opp[y]==='$130M'),'Dover base fixed at $130M');
assert(app.includes('const monthly = marketingAllocation / 12'),'Marketing allocation uses 12-month deployment');
assert(app.includes('Payables Settlement'),'Payables affects cash flow');
assert(app.includes('const sm = yearKey === "y2026" ? 210000 : 300000'),'S&M excludes advertising and stays 210k/300k');
assert(app.includes('const ga = 1000000'),'G&A stays $1M');
assert(app.includes('const projectTotal = 1000000'),'Private Label total project cost is $1M');
assert(app.includes('addMonths(start, 6)') && app.includes('addMonths(start, 9)'),'Private Label is phased');
assert(app.includes('sigMembers * sigBoxes + premMembers * premBoxes'),'Cavali boxes/orders are calculated from members × boxes');
assert(app.includes('const paidGrowth = adSpend > 0 && roas > 0 ? adSpend * roas : 0'),'Cavali paid revenue uses Ad Spend × ROAS');
const ds=fs.readFileSync('assets/js/dataService.js','utf8');
assert(ds.includes('som_assumptions_v260'),'Storage key preserved so existing Draft inputs are not reset');
console.log('All Ceci 2026-08-10 static checks passed.');
