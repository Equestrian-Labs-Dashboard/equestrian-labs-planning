import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const assumptions = JSON.parse(fs.readFileSync(new URL('./data/assumptions.json', import.meta.url), 'utf8'));
const source = fs.readFileSync(new URL('./assets/js/app.js', import.meta.url), 'utf8');

const test = `
STATE=${JSON.stringify(assumptions)};
STATE.operations.find(r=>r.driver==='Outbound Shipping Cost %').y2026='10%';
STATE.operations.find(r=>r.driver==='Packaging Cost %').y2026='5%';
STATE.operations.find(r=>r.driver==='Shipping Revenue %').y2026='2%';
let b=marginBridge('y2026');
assert.ok(Math.abs(b.gp2-(b.gp1-b.netSales*.10-b.netSales*.05+b.netSales*.02))<.01);
assert.ok(Math.abs(b.gp3-(b.gp2-b.adSpend))<.01);

STATE.meta.fundingScenario='$3M';
STATE.meta.fundingDate='Jan-27';
assert.equal(cashFlowRows('y2026').cashIn.Funding,0);
assert.equal(cashFlowRows('y2027').cashIn.Funding,3000000);

assert.equal(doverMarketOpportunity('y2026'),130000000);
assert.equal(doverMarketOpportunity('y2029'),130000000);
assert.equal(organicGrowthRevenue('y2026'),0);
assert.ok(Number.isFinite(organicGrowthRevenue('y2027')));

globalThis.__R={gp:{gp1:b.gp1,gp2:b.gp2,gp3:b.gp3}, funding2027:cashFlowRows('y2027').cashIn.Funding};
`;

const sandbox={
  console,assert,
  document:{addEventListener(){},createElement(){return{setAttribute(){},appendChild(){},addEventListener(){},style:{}}},createTextNode(v){return v},getElementById(){return null},body:{setAttribute(){},getAttribute(){return'light'}}},
  localStorage:{getItem(){return null},setItem(){}},
  DataService:{},window:{},location:{reload(){}},alert(){},confirm(){return false},
  setTimeout,clearTimeout,Date,Math,Number,String,Object,Array,JSON,Map,Set
};
vm.createContext(sandbox);
vm.runInContext(source+'\n'+test,sandbox);
console.log('PASS core model formulas, funding date trigger, Dover, Organic Growth');
console.log(JSON.stringify(sandbox.__R,null,2));
