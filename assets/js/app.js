(() => {
"use strict";
const YEARS=["2026","2027","2028","2029"];
const OTHER_CORRO="Other Corro Channels";
function engineNames(){const names=Object.keys(STATE.engines);return [...names.filter(name=>name!==OTHER_CORRO),...names.filter(name=>name===OTHER_CORRO)]}
let BASE={}, STATE={}, ACTUALS={shopify:{brands:{}},connected:{},smartrr:{}};
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const clone=o=>JSON.parse(JSON.stringify(o));
const n=v=>Number.isFinite(Number(v))?Number(v):0;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const icon=name=>globalThis.ModelIcons?.render(name)||"";
const esc=s=>String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]));
const valid=v=>v!==null&&v!==undefined&&v!==""&&Number.isFinite(Number(v));
const rate=v=>{ if(!valid(v))return null; const x=Number(v); return Math.abs(x)>1?x/100:x; };
const firstValid=(...xs)=>{for(const x of xs)if(valid(x))return Number(x);return null};
const firstPositive=(...xs)=>{for(const x of xs)if(valid(x)&&Number(x)>0)return Number(x);return null};

function fmtMoney(v){v=n(v);if(Math.abs(v)<.5)return "—";const s=v<0?"-":"";v=Math.abs(v);if(v>=1e6)return `${s}$${(v/1e6).toFixed(1).replace(".0","")}M`;if(v>=1e3)return `${s}$${Math.round(v/1e3)}k`;return `${s}$${Math.round(v).toLocaleString("en-US")}`}
function fmtPct(v){return valid(v)?`${(n(v)*100).toFixed(1).replace(".0","")}%`:"—"}
function fmtX(v){return valid(v)?`${n(v).toFixed(1)}x`:"—"}
function fmtNum(v,d=0){return valid(v)?Number(v).toLocaleString("en-US",{minimumFractionDigits:d,maximumFractionDigits:d}):"Data unavailable"}
function fmtCount(v,d=0){if(!valid(v))return"Data unavailable";const x=n(v),s=x<0?"-":"",a=Math.abs(x);if(a>=1e6)return`${s}${(a/1e6).toFixed(1).replace(".0","")}M`;if(a>=1e4)return`${s}${(a/1e3).toFixed(1).replace(".0","")}K`;return Number(x).toLocaleString("en-US",{minimumFractionDigits:d,maximumFractionDigits:d})}
function parseUserValue(t,f="number"){let raw=String(t??"").trim().toLowerCase().replace(/[$,%x,]/g,"");if(!raw)return null;let mult=1;if(raw.endsWith("m")){mult=1e6;raw=raw.slice(0,-1)}else if(raw.endsWith("k")){mult=1e3;raw=raw.slice(0,-1)}let v=parseFloat(raw);if(!Number.isFinite(v))return null;v*=mult;if(f==="pct")v=String(t).includes("%")||Math.abs(v)>1?v/100:v;return v}
function storageKey(status=STATE.meta?.status||"Draft"){return `eqlabs-strategic-model:v45:${status}`}
function loadSaved(status){try{const x=localStorage.getItem(storageKey(status));return x?JSON.parse(x):null}catch{return null}}
function save(){syncFundingMeta();STATE.meta.lastUpdated=new Date().toISOString().slice(0,10);localStorage.setItem(storageKey(),JSON.stringify(STATE));if($("#lastUpdated"))$("#lastUpdated").value=STATE.meta.lastUpdated;flash("Saved ✓")}
function flash(t){const e=$("#sourceStatus");if(!e)return;const old=e.textContent;e.textContent=t;setTimeout(()=>e.textContent=old,1600)}
const FM=globalThis.FundingModel;
function fundingPlan(){return STATE.fundingPlan}
function scenario(){return FM.summary(fundingPlan())}
function activeRounds(){return FM.activeRounds(fundingPlan())}
function dateParts(raw){return FM.dateParts(raw)}
function roundRamp(round){return FM.roundRamp(round)}
function paidRamp(){const total=activeRounds().reduce((s,r)=>s+n(r.marketing),0);if(total<=0)return {2026:0,2027:0,2028:0,2029:0};const out={2026:0,2027:0,2028:0,2029:0};activeRounds().forEach(r=>{const ramp=roundRamp(r),w=n(r.marketing)/total;YEARS.forEach(y=>out[y]+=ramp[y]*w)});return out}
function baseAds(){return n(STATE.commercial.baseAdSpendMonthly)*12}
function incrementalAds(y){return activeRounds().reduce((s,r)=>s+n(r.marketing)*roundRamp(r)[y],0)}
function totalAds(y){return baseAds()+incrementalAds(y)}
function roas(y){return n(STATE.commercial.roasByYear[y]??STATE.meta.roas)}
function doverRampRemaining(){return 1-YEARS.reduce((sum,y)=>sum+n(STATE.commercial.doverRampPct[y]),0)}
function updateDoverRamp(y,value){
 const percent=Number(value);
 if(String(value).trim()===""||!Number.isFinite(percent)||percent<0||percent>100)return false;
 STATE.commercial.doverRampPct[y]=percent/100;return true;
}
function doverGross(y){return n(STATE.commercial.doverMarketOpportunity)*n(STATE.commercial.doverTargetCapturePct[y])*n(STATE.commercial.doverRampPct[y])}
function doverNet(y){return doverGross(y)*(1-n(STATE.commercial.paidAdsOverlapPct[y]))}
function connected(path,fallback=null){let o=ACTUALS.connected;for(const k of path.split("."))o=o?.[k];return o??fallback}
function shopifyDerived(brand,path,fallback=null){let o=ACTUALS.shopify?.brands?.[brand]?.derived;for(const k of path.split("."))o=o?.[k];return o??fallback}
function shopifyPath(brand,path,fallback=null){let o=ACTUALS.shopify?.brands?.[brand];for(const k of path.split("."))o=o?.[k];return o??fallback}
function smartrr(path,fallback=null){let o=ACTUALS.smartrr;for(const k of path.split("."))o=o?.[k];return o??fallback}
function monthLabel(p){if(!p)return"—";const [y,m]=String(p).split("-"),names=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];return `${names[n(m)-1]||m} ${y}`}
function selectedCorroMonth(){const cur=DataService.currentPeriod(),opts=DataService.availableMonths(ACTUALS.shopify.brands?.corro||{},"2026-01"),saved=STATE.meta.corroMonth;if(saved&&opts.includes(saved))return saved;return opts.includes(cur)?cur:(DataService.latestClosedMonth(ACTUALS.shopify.brands?.corro?.kpis_daily||[])||opts.at(-1)||"2026-01")}
function selectedCavaliMonth(){const cur=DataService.currentPeriod(),opts=DataService.availableMonths(ACTUALS.shopify.brands?.cavali||{},cur),saved=STATE.meta.cavaliMonth;if(saved&&opts.includes(saved))return saved;return opts.includes(cur)?cur:(opts[0]||cur)}
function populateMonthFilters(){const a=$("#corroMonth"),b=$("#cavaliMonth");if(!a||!b)return;const cur=DataService.currentPeriod();let co=DataService.availableMonths(ACTUALS.shopify.brands?.corro||{},"2026-01");if(!co.length)co=DataService.monthRange("2026-01",cur);let ca=DataService.availableMonths(ACTUALS.shopify.brands?.cavali||{},cur);if(!ca.length)ca=[cur];a.innerHTML=co.map(p=>`<option value="${p}">${monthLabel(p)}</option>`).join("");b.innerHTML=ca.map(p=>`<option value="${p}">${monthLabel(p)}</option>`).join("");STATE.meta.corroMonth=selectedCorroMonth();STATE.meta.cavaliMonth=selectedCavaliMonth();a.value=STATE.meta.corroMonth;b.value=STATE.meta.cavaliMonth}
function monthlyDisplayActuals(){
  // IMPORTANT: month selectors are YTD cutoffs, not single-month filters.
  const cm=selectedCorroMonth(),vm=selectedCavaliMonth(),corro=ACTUALS.shopify.brands?.corro||{},cav=ACTUALS.shopify.brands?.cavali||{};
  return{corroMonth:cm,cavaliMonth:vm,corro:DataService.aggregateThrough(corro,cm,2026),cav:DataService.aggregateThrough(cav,vm,2026),ecom:DataService.channelThrough(corro,"e-commerce",cm,2026),con:DataService.channelThrough(corro,"Concierge",cm,2026),well:DataService.channelThrough(corro,"Wellington",cm,2026)}
}
function actual2026(){
 const a=monthlyDisplayActuals(),coverage=DataService.coverageThrough(ACTUALS.shopify.brands?.corro,a.corroMonth,ACTUALS.shopify.generated_at);
 const cavCoverage=DataService.coverageThrough(ACTUALS.shopify.brands?.cavali,a.cavaliMonth,ACTUALS.shopify.generated_at);
 const other=Object.fromEntries(["grossSales","netSales","orders","units"].map(key=>[key,n(a.corro[key])-n(a.ecom[key])-n(a.con[key])-n(a.well[key])]));
 return{corro:a.corro,cav:a.cav,ecom:a.ecom,con:a.con,well:a.well,other,coverage,cavCoverage,monthsClosed:coverage.elapsedMonths,remainingMonths:coverage.remainingMonths,corroCutoff:a.corroMonth,cavaliCutoff:a.cavaliMonth};
}
function smartrrTierClassified(){
  const sig=n(smartrr("signature.active",0)),pre=n(smartrr("premier.active",0)),total=n(smartrr("totals.active",0));
  const known=sig+pre;
  // Do not trust a partial tier classification (e.g. 38 classified out of ~400 total).
  return known>0 && (total<=0 || known/total>=0.80);
}
function cavaliObserved(tier,key){return firstValid(shopifyPath("cavali",`membership_observed.2026.${tier}.${key}`,null),shopifyDerived("cavali",`cavali.membershipObserved.${tier}.${key}`,null))}
function cavaliMembers(tier){const path=`${tier}.active`;if(smartrrTierClassified())return firstValid(smartrr(path,null),cavaliObserved(tier,"observedMembers"));return firstPositive(cavaliObserved(tier,"observedMembers"),connected(`cavali.${tier}Members`,null))}
function cavaliBoxes(tier){const sp=smartrr(`${tier}.boxesPerMemberYear`,null);const sf=cavaliObserved(tier,"annualizedBoxesPerMember");return firstPositive(sp,sf,connected(`cavali.${tier}BoxesPerMemberYear`,null))}
function marginFromAggregate(a){
  if(!a) return null;
  const sales=firstPositive(a.netSales,a.grossSales);
  const cogs=firstPositive(a.cogs);
  if(sales!==null && cogs!==null && sales>cogs) return clamp((sales-cogs)/sales,0,.95);
  return null;
}
function selectedMonthGm1(name){
  const a=monthlyDisplayActuals();
  if(name==="Ecommerce") return marginFromAggregate(a.ecom);
  if(name==="Concierge") return marginFromAggregate(a.con);
  if(name==="Wellington") return marginFromAggregate(a.well);
  if(name==="Cavali") return marginFromAggregate(a.cav);
  return null;
}
function actualGm1(name){
  const monthGm=selectedMonthGm1(name);
  if(monthGm!==null && monthGm>0) return monthGm;
  if(name==="Cavali") return firstPositive(
    rate(connected("financial.cavali.gm1",null)),
    rate(shopifyDerived("cavali","totals.gm1",null)),
    .397
  );
  if(name==="Ecommerce") return firstPositive(
    rate(connected("financial.corro.ecommerceGm1",null)),
    rate(shopifyDerived("corro","channels.e-commerce.gm1",null)),
    rate(connected("financial.corro.gm1",null)),
    rate(shopifyDerived("corro","totals.gm1",null)),
    .30
  );
  if(name==="Concierge") return firstPositive(
    rate(connected("financial.corro.conciergeGm1",null)),
    rate(shopifyDerived("corro","channels.Concierge.gm1",null)),
    rate(connected("financial.corro.gm1",null)),
    .35
  );
  if(name==="Wellington") return firstPositive(
    rate(connected("financial.corro.wellingtonGm1",null)),
    rate(shopifyDerived("corro","channels.Wellington.gm1",null)),
    rate(connected("financial.corro.gm1",null)),
    .45
  );
  return null;
}
function actualEngine(name,key){const a=actual2026();
  if(name==="Ecommerce"){if(key==="orders")return a.ecom.orders;if(key==="aov")return a.ecom.orders?a.ecom.grossSales/a.ecom.orders:null;if(key==="gm1")return actualGm1(name)}
  if(name==="Concierge"){if(key==="orders")return a.con.orders;if(key==="units")return a.con.units;if(key==="uniqueCustomers")return a.con.uniqueCustomers;if(key==="unitsPerClient")return a.con.uniqueCustomers?a.con.units/a.con.uniqueCustomers:null;if(key==="unitsPerOrder")return a.con.orders?a.con.units/a.con.orders:null;if(key==="aov")return a.con.orders?a.con.grossSales/a.con.orders:null;if(key==="gm1")return actualGm1(name)}
  if(name==="Wellington"){if(key==="orders")return a.well.orders;if(key==="aov")return a.well.orders?a.well.grossSales/a.well.orders:null;if(key==="gm1")return actualGm1(name)}
  if(name==="Cavali"){if(key==="orders")return a.cav.orders;if(key==="gm1")return actualGm1(name);if(key==="signatureMembers")return cavaliMembers("signature");if(key==="signatureBoxes")return cavaliBoxes("signature");if(key==="premierMembers")return cavaliMembers("premier");if(key==="premierBoxes")return cavaliBoxes("premier")}
  return null
}
function displayActualEngine(name,key){const a=monthlyDisplayActuals();if(name==="Ecommerce"){if(key==="orders")return a.ecom.orders;if(key==="aov")return a.ecom.orders?a.ecom.grossSales/a.ecom.orders:null;if(key==="gm1")return actualGm1(name)}if(name==="Concierge"){if(key==="orders")return a.con.orders;if(key==="units")return a.con.units;if(key==="aov")return a.con.orders?a.con.grossSales/a.con.orders:null;if(key==="uniqueCustomers")return a.con.uniqueCustomers;if(key==="unitsPerClient")return a.con.uniqueCustomers?a.con.units/a.con.uniqueCustomers:null;if(key==="unitsPerOrder")return a.con.orders?a.con.units/a.con.orders:null;if(key==="gm1")return actualGm1(name)}if(name==="Wellington"){if(key==="orders")return a.well.orders;if(key==="aov")return a.well.orders?a.well.grossSales/a.well.orders:null;if(key==="gm1")return actualGm1(name)}if(name==="Cavali"){if(key==="orders")return a.cav.orders;if(key==="aov")return a.cav.orders?a.cav.grossSales/a.cav.orders:null;if(key==="gm1")return actualGm1(name)}return actualEngine(name,key)}
function engVal(name,key,y){
  const e=STATE.engines[name], map={signatureBoxesPerMemberYear:"signatureBoxes",premierBoxesPerMemberYear:"premierBoxes"};
  if(y==="2026" && !["signaturePrice","premierPrice","adSpend","roas","units","asp"].includes(key)){
    const av=actualEngine(name,map[key]||key); if(valid(av))return n(av);
  }
  const manual=e?.[key]?.[y]; if(valid(manual))return n(manual);
  return 0
}
function baseEcommerce(y){if(y==="2026"){const a=actual2026();return n(a.ecom.grossSales)+a.remainingMonths*n(STATE.meta.baseEcommerceMonthly)}const prev=String(n(y)-1),pb=ecommerceBuild(prev),carry=n(STATE.commercial.carryoverPct[y]);return n(pb.base)+carry*(n(pb.organic)+n(pb.paid)+n(pb.dover))}
function organicRevenue(y){return y==="2026"?0:baseEcommerce(y)*n(STATE.commercial.organicGrowthPct[y])}
function paidRevenue(y){return incrementalAds(y)*roas(y)}
function paidRevenueInfluenced(y){return totalAds(y)*roas(y)}
function ecommerceBuild(y){const base=baseEcommerce(y),organic=organicRevenue(y),paid=paidRevenue(y),dover=doverNet(y);return{base,organic,paid,dover,total:base+organic+paid+dover}}
function engine(name,y){
  if(name===OTHER_CORRO){
    const a=actual2026(),elapsed=Math.max(a.coverage.elapsedMonths,1/31);
    const sales=y==="2026"?n(a.other.grossSales)*12/elapsed:engine(name,String(n(y)-1)).sales*(1+n(STATE.engines[name].growthPct[y]));
    return{sales,gm1:engVal(name,"gm1",y)||actualGm1("Ecommerce"),actualYtdSales:y==="2026"?n(a.other.grossSales):null};
  }
  if(name==="Ecommerce"){const b=ecommerceBuild(y),gm=engVal(name,"gm1",y)||.30,aov=engVal(name,"aov",y),sales=b.total,orders=aov?sales/aov:0;return{sales,gm1:gm,orders,aov}}
  if(name==="Concierge"){
    if(y==="2026"){const a=actual2026(),m=Math.max(1,a.monthsClosed),src=a.con,orders=n(src.orders),active=n(src.uniqueCustomers),units=n(src.units),aov=orders?n(src.grossSales)/orders:engVal(name,"aov",y),opc=active?orders/active:0,upc=active?units/active:0,upo=orders?units/orders:0,sales=n(src.grossSales)*(12/m);return{sales,gm1:engVal(name,"gm1",y)||.35,activeClients:active,ordersPerClient:opc,orders,units,unitsPerClient:upc,unitsPerOrder:upo,aov,actualYtdSales:n(src.grossSales),cutoff:a.corroCutoff}}
    const active=n(STATE.engines[name].activeClients[y]),opc=n(STATE.engines[name].ordersPerClient[y]),aov=engVal(name,"aov",y),orders=active*opc,upo=firstPositive(actualEngine("Concierge","unitsPerOrder"),0),units=orders*upo;return{sales:orders*aov,gm1:engVal(name,"gm1",y)||.35,activeClients:active,ordersPerClient:opc,orders,units,unitsPerOrder:upo,unitsPerClient:active?units/active:0,aov}}
  if(name==="Wellington"){
    if(y==="2026"){const a=actual2026(),m=Math.max(1,a.monthsClosed),src=a.well,aov=n(src.orders)?n(src.grossSales)/n(src.orders):engVal(name,"aov",y),orders=n(src.orders)*(12/m);return{sales:n(src.grossSales)*(12/m),gm1:engVal(name,"gm1",y)||.45,orders,aov,actualYtdSales:n(src.grossSales),cutoff:a.corroCutoff}}
    const orders=engVal(name,"orders",y),aov=engVal(name,"aov",y);return{sales:orders*aov,gm1:engVal(name,"gm1",y)||.45,orders,aov}}
  if(name==="Embroidery"){const orders=engVal(name,"orders",y),aov=engVal(name,"aov",y);return{sales:orders*aov,gm1:engVal(name,"gm1",y)||.60,orders,aov}}
  if(name==="Private Label"){const units=engVal(name,"units",y),asp=engVal(name,"asp",y);return{sales:units*asp,gm1:engVal(name,"gm1",y)||.70,units,asp}}
  if(name==="Cavali"){const sm=engVal(name,"signatureMembers",y),sb=engVal(name,"signatureBoxesPerMemberYear",y),sp=engVal(name,"signaturePrice",y),pm=engVal(name,"premierMembers",y),pb=engVal(name,"premierBoxesPerMemberYear",y),pp=engVal(name,"premierPrice",y),subscription=sm*sb*sp+pm*pb*pp,paid=0;return{sales:subscription+paid,subscription,paid,gm1:engVal(name,"gm1",y)||.397,sm,sb,sp,pm,pb,pp,orders:actualEngine(name,"orders")}}
  return{sales:0,gm1:0}
}
function discountsRate(y){if(y==="2026"){const a=actual2026().corro;if(a.grossSales)return clamp((a.grossSales-a.netSales)/a.grossSales,0,.8)}return n(STATE.purchasing.discountsReturnsPct[y])}
function operationsPct(key,y){if(y==="2026"){const map={outboundShippingPct:"financial.corro.outboundShippingPct",packagingPct:"financial.corro.packagingPct",shippingRevenuePct:"financial.corro.shippingRevenuePct"},v=rate(connected(map[key],null));if(v!==null)return v}return n(STATE.operations[key][y])}
function portfolio(y){const items=engineNames().map(name=>({name,...engine(name,y)})),gross=items.reduce((s,x)=>s+x.sales,0),disc=discountsRate(y),net=gross*(1-disc);let gp1=0;items.forEach(x=>{x.net=x.sales*(1-disc);x.gp1=x.net*x.gm1;gp1+=x.gp1});const cogs=Math.max(0,net-gp1),outbound=net*operationsPct("outboundShippingPct",y),packaging=net*operationsPct("packagingPct",y),shipRev=net*operationsPct("shippingRevenuePct",y),gp2=gp1-outbound-packaging+shipRev,cavAds=n(STATE.engines.Cavali.adSpend[y]),advertising=totalAds(y)+cavAds,gp3=gp2-advertising;return{items,gross,disc,net,cogs,gp1,outbound,packaging,shipRev,gp2,advertising,gp3}}
function commissionBreakdown(y){
 const settings=STATE.opex.commissions,p=portfolio(y),basis=settings.basis==="gross"?"gross":"net";
 const rows=p.items.map(item=>{
   const revenue=basis==="gross"?item.sales:item.net,commissionRate=n(settings.rates[item.name]?.[y]);
   return{name:item.name,revenue,rate:commissionRate,commission:revenue*commissionRate};
 });
 const revenue=rows.reduce((sum,row)=>sum+row.revenue,0),variable=rows.reduce((sum,row)=>sum+row.commission,0);
 const cj=n(settings.cjMonthly[y])*12,otherFixed=n(settings.otherFixed[y]),formulaTotal=variable+cj+otherFixed;
 return{rows,basis,revenue,variable,cj,otherFixed,weightedRate:revenue?variable/revenue:0,formulaTotal,total:settings.mode==="manual"?n(STATE.opex.salesMarketing[y]):formulaTotal};
}
function opex(y){
 const sm=commissionBreakdown(y).total,ga=n(STATE.opex.generalAdministrative[y]),other=n(STATE.opex.other[y]);
 return{sm,ga,other,total:sm+ga+other};
}
function financial(y){const p=portfolio(y),o=opex(y),ebitda=p.gp3-o.total;return{...p,...o,ebitda,ebitdaPct:p.net?ebitda/p.net:0}}
function fundingForYear(y){return FM.fundingForYear(fundingPlan(),y)}
function fundingAllocationForYear(key,y){return FM.fundingForYear(fundingPlan(),y,key)}
function privateLabelPhasing(y){
 const rounds=activeRounds().filter(round=>round.privateLabel>0),direct=fundingAllocationForYear("privateLabel",y);
 if(!rounds.length)return 0;
 const lastYear=Math.max(...rounds.map(round=>dateParts(round.date)?.year||2026));
 return direct+(n(y)===lastYear+1?Math.max(0,1e6-scenario().privateLabel):0);
}
function cashYear(y,opening){
 const f=financial(y),funding=fundingForYear(y),operatingReceipts=f.net+f.shipRev,totalCashIn=operatingReceipts+funding+n(STATE.cash.otherReceipts[y]);
 const inventory=fundingAllocationForYear("inventory",y),payables=fundingAllocationForYear("payables",y),capex=fundingAllocationForYear("embroidery",y),privateLabel=privateLabelPhasing(y);
 const operating=f.outbound+f.packaging+f.advertising+f.sm+f.ga+f.other;
 const cashOut=operating+inventory+payables+capex+privateLabel+n(STATE.cash.otherCashOut[y]);
 const ending=opening+totalCashIn-cashOut,runway=operating>0?ending/(operating/12):null,opexFunding=fundingAllocationForYear("opex",y);
 return{opening,cashIn:operatingReceipts,funding,totalCashIn,inventory,payables,advertising:f.advertising,shipping:f.outbound+f.packaging,sm:f.sm,ga:f.ga,other:f.other,growth:capex,capex,privateLabel,cashOut,netFlow:totalCashIn-cashOut,ending,runway,opexFunding};
}
function cashAll(){const out={};let opening=n(STATE.cash.openingCash2026);YEARS.forEach(y=>{out[y]=cashYear(y,opening);opening=out[y].ending});return out}
function purchaseFrequency(){
  const connectedPf=firstPositive(connected("retention.purchaseFrequency",null));
  if(connectedPf!==null) return connectedPf;
  const m=monthlyDisplayActuals().ecom;
  if(firstPositive(m.orders)!==null && firstPositive(m.uniqueCustomers)!==null) return m.orders/m.uniqueCustomers;
  const a=actual2026().ecom;
  if(firstPositive(a.orders)!==null && firstPositive(a.uniqueCustomers)!==null) return a.orders/a.uniqueCustomers;
  return firstPositive(STATE.commercial.purchaseFrequency?.["2026"],1.0);
}
function returningCustomers(){const v=connected("retention.returningCustomersPct",null);return valid(v)?n(v):n(STATE.commercial.returningCustomersPct["2026"])}
function carryoverCurrent(){const rr=connected("retention.returningRevenue",null),tr=connected("retention.totalCustomerRevenue",null);return valid(rr)&&n(tr)?n(rr)/n(tr):null}
function cac2026(){const spend=connected("marketing.corro.adSpend",null),p=connected("marketing.corro.attributedPurchases",null);return valid(spend)&&n(p)?n(spend)/n(p):null}
function annualGpCustomer(y){
  const e=engine("Ecommerce",y);
  const pf=y==="2026"?purchaseFrequency():firstPositive(STATE.commercial.purchaseFrequency[y],1.0);
  const aov=y==="2026"?firstPositive(displayActualEngine("Ecommerce","aov"),e.aov):e.aov;
  const gm=y==="2026"?firstPositive(actualGm1("Ecommerce"),e.gm1):e.gm1;
  if(aov===null || pf===null || gm===null) return null;
  return aov*pf*gm;
}
function kpi(label,value,sub=""){return `<div class="kpi"><div class="label">${label}</div><div class="value ${String(value).startsWith("-")?"negative":""}">${value}</div><div class="sub">${sub}</div></div>`}
function table(headers,rows){return `<div class="table-wrap"><table class="grid"><thead><tr>${headers.map(x=>`<th>${x}</th>`).join("")}</tr></thead><tbody>${rows.join("")}</tbody></table></div>`}
function field(obj,path,y,format="number"){const value=obj[path]?.[y];return `<td class="editable" contenteditable="true" data-path="${esc(path)}" data-year="${y}" data-group="${obj===STATE.commercial?"commercial":obj===STATE.purchasing?"purchasing":obj===STATE.operations?"operations":"unknown"}" data-format="${format}">${format==="pct"?fmtPct(value):format==="money"?fmtMoney(value):esc(value??"")}</td>`}
function editCell(group,path,y,value,format){STATE[group][path][y]=parseUserValue(value,format);save();renderAll()}
function actualFmt(name,key,fmt="number",display=false){const v=display?displayActualEngine(name,key):actualEngine(name,key);if(!valid(v))return"Data unavailable";if(fmt==="pct")return fmtPct(rate(v));if(fmt==="money")return fmtMoney(v);return fmtNum(v)}
function engineRows(name){
 const e=STATE.engines[name];
 if(name===OTHER_CORRO)return[
  `<tr><td>Gross Sales</td><td class="baseline">${exactMoney(actual2026().other.grossSales)} YTD</td>${YEARS.map(y=>`<td>${exactMoney(engine(name,y).sales)}</td>`).join("")}</tr>`,
  `<tr><td>Growth %</td><td class="baseline">Legacy / Shopify Collective</td><td>Actuals + annualized remainder</td>${YEARS.slice(1).map(y=>`<td class="editable" contenteditable="true" data-engine="${name}" data-key="growthPct" data-year="${y}" data-format="pct">${fmtPct(e.growthPct[y])}</td>`).join("")}</tr>`,
  `<tr><td>GM1 %</td><td class="baseline">Corro planning margin</td><td>${fmtPct(engine(name,"2026").gm1)}</td>${YEARS.slice(1).map(y=>`<td class="editable" contenteditable="true" data-engine="${name}" data-key="gm1" data-year="${y}" data-format="pct">${fmtPct(e.gm1[y])}</td>`).join("")}</tr>`
 ];
 const editable=(key,y,fmt="number")=>{const raw=valid(e[key]?.[y])?e[key][y]:engVal(name,key,y);return `<td class="editable" contenteditable="true" data-engine="${name}" data-key="${key}" data-year="${y}" data-format="${fmt}">${fmt==="pct"?fmtPct(raw):fmt==="money"?fmtMoney(raw):esc(raw??"")}</td>`};
 const actualThenFuture=(key,fmt="number")=>{
   const v26 = engine(name, "2026")[key];
   let fmtVal = fmt==="pct"?fmtPct(v26):fmt==="money"?fmtMoney(v26):fmtNum(v26,key==="ordersPerClient"?2:0);
   return `<td class="calculated">${fmtVal}</td>`+YEARS.slice(1).map(y=>editable(key,y,fmt)).join("");
 };
 if(name==="Ecommerce")return[
  `<tr><td>Orders</td><td class="baseline">${fmtNum(engine(name,"2026").orders)}</td>${actualThenFuture("orders")}</tr>`,
  `<tr><td>AOV</td><td class="baseline">${actualFmt(name,"aov","money",true)}</td>${actualThenFuture("aov","money")}</tr>`,
  `<tr><td>GM1 %</td><td class="baseline">${fmtPct(actualGm1(name))}</td>${actualThenFuture("gm1","pct")}</tr>`];
 if(name==="Concierge"){const mc=displayActualEngine(name,"uniqueCustomers"),ao=displayActualEngine(name,"orders"),opc=mc&&ao?n(ao)/n(mc):null;return[
  `<tr><td>Active Clients</td><td class="baseline">${valid(mc)?fmtNum(mc):"Data unavailable"}</td>${actualThenFuture("activeClients")}</tr>`,
  `<tr><td>Units</td><td class="baseline">${actualFmt(name,"units")}</td><td class="calculated">${fmtNum(engine(name,"2026").units)}</td>${YEARS.slice(1).map(y=>`<td class="calculated">${fmtNum(engine(name,y).units)}</td>`).join("")}</tr>`,
  `<tr><td>Units per Client</td><td class="baseline">${valid(displayActualEngine(name,"unitsPerClient"))?fmtNum(displayActualEngine(name,"unitsPerClient"),2):"Data unavailable"}</td><td class="calculated">${fmtNum(engine(name,"2026").unitsPerClient,2)}</td>${YEARS.slice(1).map(y=>`<td class="calculated">${fmtNum(engine(name,y).unitsPerClient,2)}</td>`).join("")}</tr>`,
  `<tr><td>Orders per Client</td><td class="baseline">${valid(engine(name,"2026").ordersPerClient)?engine(name,"2026").ordersPerClient.toFixed(2):"Data unavailable"}</td>${actualThenFuture("ordersPerClient")}</tr>`,
  `<tr><td>AOV</td><td class="baseline">${actualFmt(name,"aov","money",true)}</td>${actualThenFuture("aov","money")}</tr>`,
  `<tr><td>GM1 %</td><td class="baseline">${fmtPct(actualGm1(name))}</td>${actualThenFuture("gm1","pct")}</tr>`]}
 if(name==="Wellington")return[
  `<tr><td>Orders</td><td class="baseline">${fmtNum(engine(name,"2026").orders)}</td>${actualThenFuture("orders")}</tr>`,
  `<tr><td>AOV</td><td class="baseline">${actualFmt(name,"aov","money",true)}</td>${actualThenFuture("aov","money")}</tr>`,
  `<tr><td>GM1 %</td><td class="baseline">${fmtPct(actualGm1(name))}</td>${actualThenFuture("gm1","pct")}</tr>`];
 if(name==="Embroidery")return[
  `<tr><td>Orders</td><td class="baseline">—</td>${YEARS.map(y=>editable("orders",y)).join("")}</tr>`,
  `<tr><td>AOV</td><td class="baseline">—</td>${YEARS.map(y=>editable("aov",y,"money")).join("")}</tr>`,
  `<tr><td>GM1 %</td><td class="baseline">—</td>${YEARS.map(y=>editable("gm1",y,"pct")).join("")}</tr>`];
 if(name==="Private Label")return[
  `<tr><td>Units Sold</td><td class="baseline">—</td>${YEARS.map(y=>editable("units",y)).join("")}</tr>`,
  `<tr><td>Average Selling Price</td><td class="baseline">—</td>${YEARS.map(y=>editable("asp",y,"money")).join("")}</tr>`,
  `<tr><td>GM1 %</td><td class="baseline">—</td>${YEARS.map(y=>editable("gm1",y,"pct")).join("")}</tr>`];
 if(name==="Cavali"){
   const cv=(k,d=0)=>valid(actualEngine(name,k))?fmtNum(actualEngine(name,k),d):"Data unavailable";
   return[
    `<tr><td>Signature Active Members</td><td class="baseline">${cv("signatureMembers")}</td><td class="calculated">${cv("signatureMembers")}</td>${YEARS.slice(1).map(y=>editable("signatureMembers",y)).join("")}</tr>`,
    `<tr><td>Signature Boxes per Member / Year</td><td class="baseline">${cv("signatureBoxes",1)}</td><td class="calculated">${cv("signatureBoxes",1)}</td>${YEARS.slice(1).map(y=>editable("signatureBoxesPerMemberYear",y)).join("")}</tr>`,
    `<tr><td>Signature Price</td><td class="baseline">${fmtMoney(e.signaturePrice["2026"])}</td>${YEARS.map(y=>editable("signaturePrice",y,"money")).join("")}</tr>`,
    `<tr><td>Premier Active Members</td><td class="baseline">${cv("premierMembers")}</td><td class="calculated">${cv("premierMembers")}</td>${YEARS.slice(1).map(y=>editable("premierMembers",y)).join("")}</tr>`,
    `<tr><td>Premier Boxes per Member / Year</td><td class="baseline">${cv("premierBoxes",1)}</td><td class="calculated">${cv("premierBoxes",1)}</td>${YEARS.slice(1).map(y=>editable("premierBoxesPerMemberYear",y)).join("")}</tr>`,
    `<tr><td>Premier Price</td><td class="baseline">${fmtMoney(e.premierPrice["2026"])}</td>${YEARS.map(y=>editable("premierPrice",y,"money")).join("")}</tr>`,
    `<tr><td>GM1 %</td><td class="baseline">${fmtPct(actualGm1(name))}</td>${actualThenFuture("gm1","pct")}</tr>`,
    `<tr><td>Cavali Ad Spend</td><td class="baseline">Connected when available</td>${YEARS.map(y=>editable("adSpend",y,"money")).join("")}</tr>`,
    `<tr><td>Cavali ROAS</td><td class="baseline">Paid-growth assumption</td>${YEARS.map(y=>editable("roas",y)).join("")}</tr>`]}
 return[]
}
function engineKpiSummary(y){
  const rows=portfolio(y).items.map(x=>{
    const isConcierge=x.name==="Concierge",isCavali=x.name==="Cavali",orders=valid(x.orders)?x.orders:null;
    const clients=isConcierge?x.activeClients:(isCavali?x.sm+x.pm:null);
    const aov=valid(x.aov)?x.aov:(orders&&orders>0?x.sales/orders:null);
    const rel=isConcierge&&valid(clients)&&valid(orders)?`${fmtNum(orders/clients,2)} orders/client · ${fmtNum(x.units||0)} units`:isCavali?"Signature + Premier members":"";
    return `<tr class="${isConcierge?"important":""}"><td>${x.name}</td><td>${fmtMoney(x.sales)}</td><td>${orders===null?"—":fmtCount(orders)}</td><td>${clients===null?"—":fmtCount(clients)}</td><td>${aov===null?"—":fmtMoney(aov)}</td><td>${fmtPct(x.gm1)}</td><td>${rel}</td></tr>`;
  });
  return table(["Growth Engine","Gross Sales","Orders","Clients / Members","AOV","GM1 %","Check"],rows);
}
function renderEngineSections(){const cards=engineNames().map(name=>`<div class="card engine-card"><h3>${name} — ${STATE.engines[name].owner}</h3>${table(["Driver","Baseline / Current",...YEARS],engineRows(name))}${name==="Cavali"?`<p class="note">Cavali: subscription counts use Smartrr tiers only when at least 80% of active subscriptions are classified as Signature/Premier; otherwise the UI falls back to Shopify observed tiers so partially classified feeds do not understate revenue. Boxes per Member / Year is displayed to one decimal. Subscription revenue = Members × Boxes/Member/Year × Price. Premier is the client-facing wording.</p>`:""}</div>`).join("");$("#enginesMagic").innerHTML=`<div class="section"><div class="section-title accent-yellow">Section 3 — Growth Engines</div><p class="note">2026 uses YTD connected actuals through the selected cutoff month. Corro Month and Cavali Month are THROUGH dates, not isolated months. 2026 forecast outputs use YTD + remaining-year forecast logic; future inputs remain editable and saved.</p><div class="engine-grid">${cards}</div></div>`}
function renderPurchasing(){const p=STATE.purchasing;
 const month=monthlyDisplayActuals().corro;
 const gm=firstPositive(marginFromAggregate(month),actualGm1("Ecommerce"),.30);
 const markupFromMargin=gm!==null && gm<.95 ? gm/(1-gm) : null;
 const actualMarkup=firstPositive(
   rate(connected("financial.corro.markupPct",null)),
   rate(shopifyDerived("corro","totals.markupPct",null)),
   markupFromMargin,
   .748
 );
 const rawShopifyTurns = shopifyDerived("corro","inventory.inventoryTurns",null);
 const actualTurns=firstPositive(
   connected("financial.corro.inventoryTurns",null),
   rawShopifyTurns !== null && rawShopifyTurns > 0.1 ? rawShopifyTurns : null,
   connected("inventory.corro.turns",null),
   1.36
 );
 const actualDisc=discountsRate("2026");
 const markupSource=firstPositive(rate(connected("financial.corro.markupPct",null)),rate(shopifyDerived("corro","totals.markupPct",null)))!==null?"Connected/validated sold-cost actual":"Derived from selected-cutoff YTD GM1 using Markup = GM / (1 − GM)";
 const turnsSource=firstPositive(connected("financial.corro.inventoryTurns",null),shopifyDerived("corro","inventory.inventoryTurns",null),connected("inventory.corro.turns",null))!==null?"Connected inventory actual":"Planning baseline retained until connected inventory balance is available";
 const rows=[
 `<tr><td>Markup % (on Cost)</td><td class="calculated">${actualMarkup===null?"Data unavailable":fmtPct(actualMarkup)}</td>${YEARS.slice(1).map(y=>field(p,"markupPct",y,"pct")).join("")}</tr>`,
 `<tr><td>Booking Amount</td><td class="editable">${fmtMoney(n(p.bookingAmount["2026"]))}</td>${YEARS.slice(1).map(y=>field(p,"bookingAmount",y,"money")).join("")}</tr>`,
 `<tr><td>Booking Discount %</td><td class="editable">${fmtPct(n(p.bookingDiscountPct["2026"]))}</td>${YEARS.slice(1).map(y=>field(p,"bookingDiscountPct",y,"pct")).join("")}</tr>`,
 `<tr><td>Commercial Economics — Discounts & Returns %</td><td class="calculated">${fmtPct(actualDisc)}</td>${YEARS.slice(1).map(y=>field(p,"discountsReturnsPct",y,"pct")).join("")}</tr>`,
 `<tr><td>Inventory Turns</td><td class="calculated">${actualTurns===null?"Data unavailable":fmtX(actualTurns)}</td>${YEARS.slice(1).map(y=>field(p,"inventoryTurns",y)).join("")}</tr>`];
 $("#purchasingMagic").innerHTML=`<div class="section purchasing-section"><div class="section-title accent-purple">Section 4 — Purchasing Strategy</div><div class="purchasing-kpis"><div class="purchasing-kpi"><span>REALIZED MARKUP</span><strong>${actualMarkup===null?"—":fmtPct(actualMarkup)}</strong><em>${markupSource}</em></div><div class="purchasing-kpi"><span>DISCOUNTS & RETURNS</span><strong>${fmtPct(actualDisc)}</strong><em>2026 actual/current economics</em></div><div class="purchasing-kpi"><span>INVENTORY TURNS</span><strong>${actualTurns===null?"—":fmtX(actualTurns)}</strong><em>${turnsSource}</em></div></div><div class="purchasing-layout"><div class="card"><h3>Commercial Terms & Capital Efficiency</h3>${table(["Driver","2026 Actual","2027","2028","2029"],rows)}<p class="note">Markup = (Selling Price − Cost) / Cost. It is not Gross Margin %. A 0% is never substituted for a missing cost source.</p></div><div class="purchasing-side"><div class="card"><h3>Vendor Payment Mix</h3><div class="vendor-mix"><div><strong>${fmtPct(p.vendorMix.prepaid)}</strong><span>Prepaid</span></div><div><strong>${fmtPct(p.vendorMix.lt15)}</strong><span>&lt;15 days</span></div><div><strong>${fmtPct(p.vendorMix.d30_45)}</strong><span>30–45 days</span></div></div></div><div class="card"><h3>Source Logic</h3><p><b>Markup:</b> ${markupSource}</p><p><b>Inventory Turns:</b> ${turnsSource}</p><p>Forecast values stay editable by scenario.</p></div></div></div></div>`}
function renderOperations(){const p=STATE.operations,rows=["outboundShippingPct","shippingRevenuePct","packagingPct"].map((k,i)=>{const a=rate(connected("financial.corro."+k,null));return `<tr><td>${["Outbound Shipping Cost %","Shipping Revenue %","Packaging Cost %"][i]}</td><td class="baseline">${a===null?"Data unavailable":fmtPct(a)}</td><td class="calculated">${a===null?"Data unavailable":fmtPct(a)}</td>${YEARS.slice(1).map(y=>field(p,k,y,"pct")).join("")}</tr>`});$("#operationsMagic").innerHTML=`<div class="section"><div class="section-title accent-purple">Section 5 — Operations Strategy</div>${table(["Driver","Baseline / Current",...YEARS],rows)}</div>`}
function renderInitiatives(){const rows=STATE.initiatives.map((x,i)=>`<tr>${["initiative","owner","fundingTrigger","status","launchDate","investment"].map(k=>`<td class="editable" contenteditable="true" data-initiative="${i}" data-ikey="${k}">${esc(x[k])}</td>`).join("")}</tr>`);$("#initiativesMagic").innerHTML=`<div class="section"><div class="section-title accent-orange">Section 6 — Growth Initiatives</div>${table(["Initiative","Owner","Funding Trigger","Status","Launch Date","Investment"],rows)}<h3>Section 7 — Strategic Targets</h3><div class="kpis">${kpi("Gross Sales","$20M","2027 Target")}${kpi("GM3","40%","2029 Target >35%")}${kpi("EBITDA","22%","2029 Target >20%")}${kpi("Base Ecommerce",fmtMoney(STATE.meta.baseEcommerceMonthly),"Monthly Run Rate")}${kpi("Dover Capture",fmtPct(STATE.meta.doverCapture),"Scenario target")}</div></div>`}
function revenueReconciliation(){
 const a=actual2026();
 return portfolio("2026").items.map(item=>{
   const actual=item.name==="Ecommerce"?a.ecom.grossSales:item.name==="Concierge"?a.con.grossSales:item.name==="Wellington"?a.well.grossSales:item.name==="Cavali"?a.cav.grossSales:item.name===OTHER_CORRO?a.other.grossSales:0;
   const paid=item.name==="Ecommerce"?paidRevenue("2026"):0,dover=item.name==="Ecommerce"?doverNet("2026"):0;
   return{name:item.name,actual:n(actual),baseline:item.sales-n(actual)-paid-dover,paid,dover,total:item.sales};
 });
}
function renderRevenueReconciliation(){
 const a=actual2026(),rows=revenueReconciliation(),keys=["actual","baseline","paid","dover","total"];
 const html=rows.map(row=>`<tr><td>${esc(row.name)}</td>${keys.map(key=>`<td>${exactMoney(row[key])}</td>`).join("")}</tr>`);
 html.push(`<tr class="important"><td>Total 2026</td>${keys.map(key=>`<td>${exactMoney(rows.reduce((sum,row)=>sum+row[key],0))}</td>`).join("")}</tr>`);
 return `<div class="revenue-audit"><h3>2026 Actuals to Forecast</h3>${table(["Growth Engine","Actual YTD","Remaining Baseline","New Marketing Revenue","Net Dover","2026 Forecast"],html)}<p class="note">Source as of ${esc(a.coverage.asOf||"unavailable")}. Corro: ${exactMoney(a.corro.grossSales)} YTD. Cavali: ${exactMoney(a.cav.grossSales)} YTD. Ecommerce run rate: ${exactMoney(STATE.meta.baseEcommerceMonthly)}/month, Ecommerce channel only. Remaining baseline covers the unelapsed part of the year.</p><p class="note">Existing base-ad revenue is included in actuals and baseline. Only new funding marketing adds incremental revenue. Base advertising remains an expense. Dover is shown net of the selected overlap.</p></div>`;
}
function commissionInput(type,y,value,name=""){
 const percent=type==="rate";
 return `<input class="assumption-input" type="number" min="0" ${percent?'max="100"':""} step="${percent?".1":".01"}" required value="${percent?n(value)*100:n(value)}" data-commission-type="${type}" data-year="${y}" ${name?`data-engine="${esc(name)}"`:""} aria-label="${esc(name||type)} ${y}${percent?" commission percent":""}">`;
}
function renderOperatingAssumptions(){
 const cfg=STATE.opex.commissions;
 const rows=engineNames().map(name=>`<tr><td>${esc(name)} commission %</td>${YEARS.map(y=>`<td>${commissionInput("rate",y,cfg.rates[name]?.[y],name)}</td>`).join("")}</tr>`);
 rows.push(`<tr><td>CJ / affiliate estimate per month</td>${YEARS.map(y=>`<td>${commissionInput("cjMonthly",y,cfg.cjMonthly[y])}</td>`).join("")}</tr>`);
 rows.push(`<tr><td>Other fixed S&amp;M per year</td>${YEARS.map(y=>`<td>${commissionInput("otherFixed",y,cfg.otherFixed[y])}</td>`).join("")}</tr>`);
 rows.push(`<tr><td>Weighted channel commission %</td>${YEARS.map(y=>`<td>${fmtPct(commissionBreakdown(y).weightedRate)}</td>`).join("")}</tr>`);
 rows.push(`<tr class="important"><td>Sales &amp; Marketing</td>${YEARS.map(y=>`<td>${cfg.mode==="manual"?commissionInput("manual",y,STATE.opex.salesMarketing[y]):exactMoney(opex(y).sm)}</td>`).join("")}</tr>`);
 rows.push(`<tr><td>General &amp; Administrative</td>${YEARS.map(y=>`<td>${commissionInput("ga",y,STATE.opex.generalAdministrative[y])}</td>`).join("")}</tr>`);
 rows.push(`<tr><td>Other OPEX</td>${YEARS.map(y=>`<td>${commissionInput("otherOpex",y,STATE.opex.other[y])}</td>`).join("")}</tr>`);
 $("#opexMagic").innerHTML=`<div class="section" id="commissionAssumptions"><div class="section-title accent-green">Operating Expenses &amp; Commissions</div><div class="assumption-controls"><label>S&amp;M Method<select id="commissionMode"><option value="formula">Channel commissions + CJ estimate</option><option value="manual">Manual annual override</option></select></label><label>Commission Revenue Basis<select id="commissionBasis"><option value="net">Net Sales</option><option value="gross">Gross Sales</option></select></label></div>${table(["Planning Assumption",...YEARS],rows)}<p class="note">Planning estimates: Concierge 10%, Wellington 1%, CJ 3,000/month. Other channel commission rates start at 0%; paid advertising is recorded separately. Legacy 2026 S&amp;M of ${exactMoney(STATE.opex.legacySalesMarketing?.["2026"]??210000)} was a fixed planning assumption, not connected commission actuals.</p></div>`;
 $("#commissionMode").value=cfg.mode;$("#commissionBasis").value=cfg.basis;
}
function renderCommissionBreakdown(){
 const rows=engineNames().map(name=>`<tr><td>${esc(name)} commissions</td>${YEARS.map(y=>`<td>${exactMoney(commissionBreakdown(y).rows.find(row=>row.name===name)?.commission||0)}</td>`).join("")}</tr>`);
 rows.push(`<tr><td>CJ / affiliate estimate</td>${YEARS.map(y=>`<td>${exactMoney(commissionBreakdown(y).cj)}</td>`).join("")}</tr>`);
 rows.push(`<tr><td>Other fixed S&amp;M</td>${YEARS.map(y=>`<td>${exactMoney(commissionBreakdown(y).otherFixed)}</td>`).join("")}</tr>`);
 if(STATE.opex.commissions.mode==="manual")rows.push(`<tr><td>Manual S&amp;M adjustment</td>${YEARS.map(y=>`<td>${exactMoney(opex(y).sm-commissionBreakdown(y).formulaTotal)}</td>`).join("")}</tr>`);
 rows.push(`<tr class="important"><td>Total Sales &amp; Marketing</td>${YEARS.map(y=>`<td>${exactMoney(opex(y).sm)}</td>`).join("")}</tr>`);
 return table(["Sales & Marketing Breakdown",...YEARS],rows);
}
function exactMoney(value){return "$"+n(value).toLocaleString("en-US",{maximumFractionDigits:2})}
function fundingDateOptions(value){return FM.months().map(date=>`<option value="${date}" ${date===value?"selected":""}>${date}</option>`).join("")}
function fundingInput(round,key,index){
 const label=`Funding Scenario ${index+1} ${key}`,attrs=`data-funding-id="${esc(round.id)}" data-funding-key="${key}" aria-label="${esc(label)}"`;
 return key==="date"?`<select ${attrs}>${fundingDateOptions(round.date)}</select>`:`<input type="number" min="0" step="0.01" required value="${round[key]}" ${attrs}>`;
}
function fundingCoverageTable(){
 const rows=[
  ["OPEX funding allocation",y=>fundingAllocationForYear("opex",y)],
  ["Projected operating expenses",y=>opex(y).total],
  ["OPEX beyond new funding allocation",y=>Math.max(0,opex(y).total-fundingAllocationForYear("opex",y))]
 ].map(([label,get])=>`<tr><td>${label}</td>${YEARS.map(y=>`<td>${exactMoney(get(y))}</td>`).join("")}</tr>`);
 return table(["OPEX Coverage",...YEARS],rows);
}
function renderFundingAssignment(){
 const keys=FM.ALLOCATIONS,sc=scenario();
 const rows=fundingPlan().rounds.map((round,i)=>`<tr class="${round.enabled?"":"disabled-round"}"><td class="round-label"><label><input type="checkbox" data-funding-id="${esc(round.id)}" data-funding-key="enabled" ${round.enabled?"checked":""}>Funding Scenario ${i+1}</label><span class="round-state">${round.enabled?"Included":"Excluded"}</span>${i>1?`<button class="funding-action" data-remove-funding="${esc(round.id)}">Remove round</button>`:""}</td><td>${fundingInput(round,"date",i)}</td><td>${fundingInput(round,"amount",i)}</td>${keys.map(key=>`<td>${fundingInput(round,key,i)}${key==="opex"?`<label class="balance-auto"><input type="checkbox" data-funding-id="${esc(round.id)}" data-funding-key="opexAuto" ${round.opexAuto?"checked":""}>OPEX = balance</label>`:""}</td>`).join("")}<td class="allocation-balance ${FM.balance(round)<0?"negative":""}">${exactMoney(FM.balance(round))}</td></tr>`);
 rows.push(`<tr class="important"><td>Total Funding</td><td>All included rounds</td><td>${exactMoney(sc.funding)}</td>${keys.map(key=>`<td>${exactMoney(sc[key])}</td>`).join("")}<td>${exactMoney(sc.funding-keys.reduce((sum,key)=>sum+sc[key],0))}</td></tr>`);
 const issues=FM.issues(fundingPlan());
 const deployment=fundingPlan().rounds.map(round=>`<tr><td>${esc(round.label)}</td><td><select data-funding-id="${esc(round.id)}" data-funding-key="marketingTiming" aria-label="${esc(round.label)} marketing timing"><option value="funding-year" ${round.marketingTiming==="funding-year"?"selected":""}>Spend in funding year</option><option value="phased" ${round.marketingTiming==="phased"?"selected":""}>Multi-year ramp</option></select></td>${YEARS.map(y=>`<td>${exactMoney(round.enabled?round.marketing*roundRamp(round)[y]:0)}</td>`).join("")}</tr>`);
 const monthly=FM.schedule(fundingPlan()).map(row=>`<tr><td>${row.label}</td><td>${exactMoney(row.funding)}</td><td>${exactMoney(row.accumulated)}</td><td>${exactMoney(row.inventory)}</td><td>${exactMoney(row.marketing)}</td><td>${exactMoney(row.embroidery)}</td><td>${exactMoney(row.opex)}</td></tr>`);
 return `<div class="section" id="fundingAssignment"><div class="section-title">Section 1 - Funding Scenario Assignment</div><div class="funding-heading"><h3>Funding Allocation</h3><button class="funding-action" id="addFundingRound" title="Add an independent funding round">${icon("Plus")}<span>Add funding round</span></button></div>${issues.length?`<div class="funding-issues" role="alert">${issues.map(esc).join("<br>")}</div>`:""}${table(["Funding Scenario","Funding Date","Funding Amount","Payables","Stock Inventory","Marketing","Embroidery","Private Label","OPEX","Unallocated"],rows).replace('class="grid"','class="grid funding-grid"')}<h3>Marketing Deployment</h3>${table(["Funding Scenario","Marketing Timing",...YEARS],deployment)}<h3>Monthly Funding Schedule</h3>${table(["Month","New Funding","Accumulated Funding","Stock Inventory","Marketing","Embroidery","OPEX Allocation"],monthly)}</div>`;
}
function renderTab1(){const y=STATE.meta.displayYear,r=paidRamp(),rounds=activeRounds(),sc=scenario();

 const acq=[`<tr><td>Base Ad Spend</td><td class="baseline">${fmtMoney(STATE.commercial.baseAdSpendMonthly)} / month</td>${YEARS.map(z=>`<td>${fmtMoney(baseAds())}</td>`).join("")}</tr>`,`<tr><td>Incremental Ad Spend</td><td class="baseline">Funding Marketing Pool</td>${YEARS.map(z=>`<td>${fmtMoney(incrementalAds(z))}</td>`).join("")}</tr>`,`<tr class="important"><td>Total Ad Spend</td><td class="baseline">Base + Incremental</td>${YEARS.map(z=>`<td>${fmtMoney(totalAds(z))}</td>`).join("")}</tr>`,`<tr><td>ROAS</td><td class="baseline">Scenario / editable</td>${YEARS.map(z=>field(STATE.commercial,"roasByYear",z)).join("")}</tr>`,`<tr><td>Target Ad Spend % of Ecommerce Gross Sales</td><td class="baseline">Target</td>${YEARS.map(z=>field(STATE.commercial,"targetAdSpendPct",z,"pct")).join("")}</tr>`,`<tr><td>Ad Spend % of Ecommerce Gross Sales</td><td class="baseline">Calculated</td>${YEARS.map(z=>`<td>${fmtPct(totalAds(z)/(ecommerceBuild(z).total||1))}</td>`).join("")}</tr>`];
 const ret=[`<tr><td>Returning Customers %</td><td class="baseline">${fmtPct(returningCustomers())}</td>${YEARS.map(z=>field(STATE.commercial,"returningCustomersPct",z,"pct")).join("")}</tr>`,`<tr><td>Incremental Revenue Carryover %</td><td class="baseline">${carryoverCurrent()===null?"Data unavailable":fmtPct(carryoverCurrent())}</td>${YEARS.map(z=>field(STATE.commercial,"carryoverPct",z,"pct")).join("")}</tr>`,`<tr><td>Purchase Frequency</td><td class="baseline">${purchaseFrequency()===null?"Data unavailable":purchaseFrequency().toFixed(2)}</td>${YEARS.map(z=>z==="2026"?`<td>${purchaseFrequency()===null?"Data unavailable":purchaseFrequency().toFixed(2)}</td>`:field(STATE.commercial,"purchaseFrequency",z)).join("")}</tr>`,`<tr><td>Annual GP per Customer</td><td class="baseline">Calculated</td>${YEARS.map(z=>`<td>${fmtMoney(annualGpCustomer(z))}</td>`).join("")}</tr>`];
 const market=[`<tr><td>Organic Growth %</td><td class="baseline">2026 FCS: no synthetic organic add</td>${YEARS.map(z=>field(STATE.commercial,"organicGrowthPct",z,"pct")).join("")}</tr>`,`<tr><td>Dover Market Opportunity (Gross)</td><td class="baseline"><input id="doverMarketOpportunity" class="assumption-input" type="number" min="0" step="1000000" required value="${STATE.commercial.doverMarketOpportunity}" aria-label="Dover market opportunity"></td>${YEARS.map(()=>`<td>${fmtMoney(STATE.commercial.doverMarketOpportunity)}</td>`).join("")}</tr>`,`<tr><td>Dover Target Capture % (Gross)</td><td class="baseline">Scenario</td>${YEARS.map(z=>field(STATE.commercial,"doverTargetCapturePct",z,"pct")).join("")}</tr>`,`<tr><td>Dover Ramp %</td><td class="baseline">Annual deployment</td>${YEARS.map(z=>`<td><input class="assumption-input" type="number" min="0" max="100" step=".1" required value="${n(STATE.commercial.doverRampPct[z])*100}" data-dover-ramp-year="${z}" aria-label="Dover ramp ${z} percent"></td>`).join("")}</tr>`,`<tr><td>Net Dover Revenue</td><td class="baseline">Capture after overlap</td>${YEARS.map(z=>`<td>${exactMoney(doverNet(z))}</td>`).join("")}</tr>`,`<tr><td>Paid Ads Overlap %</td><td class="baseline">Assumption</td>${YEARS.map(z=>field(STATE.commercial,"paidAdsOverlapPct",z,"pct")).join("")}</tr>`];
 $("#tab1").innerHTML=`<div class="section"><div class="section-title accent-green">Current Strategic Scenario</div><div class="kpis">${fundingPlan().rounds.slice(0,2).map((round,i)=>kpi(`Funding Scenario ${i+1}`,round.enabled?fmtMoney(round.amount):"None",round.enabled?esc(round.date):"Excluded")).join("")}${kpi("Total Funding",fmtMoney(sc.funding),rounds.map(round=>esc(round.date)).join(" + "))}${kpi("Base Ecommerce",fmtMoney(STATE.meta.baseEcommerceMonthly),"Monthly Run Rate")}${kpi("Dover Capture",fmtPct(STATE.commercial.doverTargetCapturePct[y]),`Forecast ${y}`)}${kpi("ROAS",fmtX(roas(y)),`Forecast ${y}`)}</div></div>${renderFundingAssignment()}<div class="section"><div class="section-title accent-green">Section 2 — Commercial Strategy</div><div class="card"><h3>Acquisition Strategy — Emma</h3>${table(["Driver","Baseline / Current",...YEARS],acq)}<p class="note">Base Ads = $20k/month ($240k/year). Incremental Ads comes from each funding round's Marketing allocation and date. Current blended ramp: ${YEARS.map(z=>fmtPct(r[z])).join(" / ")}. Incremental Paid Growth = New Marketing Spend × ROAS.</p></div><div class="card"><h3>Retention Strategy — Berna</h3>${table(["Driver","Baseline / Current",...YEARS],ret)}<p class="note">Carryover is applied once to the following year's Ecommerce base.</p></div><div class="card"><h3>Market Growth Strategy</h3>${table(["Driver","Baseline / Current",...YEARS],market)}<p class="ramp-status ${doverRampRemaining()<0?"negative":""}">Dover ramp allocated: ${fmtPct(1-doverRampRemaining())} · Remaining: ${fmtPct(doverRampRemaining())}</p></div></div><div id="enginesMagic"></div><div id="purchasingMagic"></div><div id="operationsMagic"></div><div id="opexMagic"></div><div id="initiativesMagic"></div>`;renderEngineSections();renderPurchasing();renderOperations();renderOperatingAssumptions();renderInitiatives()}
function renderTab2(){const y=STATE.meta.displayYear,f=financial(y),revenue=[["Ecommerce Actuals + Remaining Baseline",z=>baseEcommerce(z)],["+ Organic Growth",z=>organicRevenue(z)],["+ Incremental Paid Growth Revenue",z=>paidRevenue(z)],["+ Net Dover Capture",z=>doverNet(z)],["Total Ecommerce Gross Sales",z=>ecommerceBuild(z).total]].map(([l,fn],i)=>`<tr class="${i===4?"important":""}"><td>${l}</td>${YEARS.map(z=>`<td>${fmtMoney(fn(z))}</td>`).join("")}</tr>`),p=portfolio(y),pr=p.items.map(x=>`<tr><td>${x.name}</td><td>${STATE.engines[x.name].owner}</td><td>${fmtMoney(x.sales)}</td><td>${fmtPct(x.sales/(p.gross||1))}</td><td>${fmtPct(x.gm1)}</td><td>${fmtMoney(x.gp1)}</td><td>${fmtPct(x.gp1/(p.gp1||1))}</td></tr>`),bridge=[["Gross Sales","gross","money"],["Discounts & Returns",z=>-portfolio(z).gross*portfolio(z).disc,"money"],["Net Sales","net","money"],["COGS",z=>-portfolio(z).cogs,"money"],["GP1","gp1","money"],["GM1 %",z=>portfolio(z).net?portfolio(z).gp1/portfolio(z).net:0,"pct"],["Outbound Shipping",z=>-portfolio(z).outbound,"money"],["Packaging",z=>-portfolio(z).packaging,"money"],["Shipping Revenue","shipRev","money"],["GP2","gp2","money"],["GM2 %",z=>portfolio(z).net?portfolio(z).gp2/portfolio(z).net:0,"pct"],["Advertising",z=>-portfolio(z).advertising,"money"],["GP3","gp3","money"],["GM3 %",z=>portfolio(z).net?portfolio(z).gp3/portfolio(z).net:0,"pct"]].map(([l,k,t])=>`<tr class="${["Gross Sales","Net Sales","GP1","GP2","GP3"].includes(l)?"important":["GM1 %","GM2 %","GM3 %"].includes(l)?"margin-pct-row":""}"><td>${l}</td>${YEARS.map(z=>{const q=portfolio(z),v=typeof k==="function"?k(z):q[k];return `<td class="${v<0?"negative":""}">${t==="pct"?fmtPct(v):fmtMoney(v)}</td>`}).join("")}</tr>`);$("#tab2").innerHTML=`<div class="section"><div class="section-title accent-green">Financial Snapshot</div><div class="kpis">${kpi("Gross Sales",fmtMoney(f.gross),y)}${kpi("Net Sales",fmtMoney(f.net),"After Discounts & Returns")}${kpi("GM1 %",fmtPct(f.net?f.gp1/f.net:0),"GP1 / Net Sales")}${kpi("Gross Profit 1",fmtMoney(f.gp1),fmtPct(f.gp1/(f.net||1))+" of Net Sales")}${kpi("Gross Profit 3",fmtMoney(f.gp3),fmtPct(f.gp3/(f.net||1))+" of Net Sales")}</div></div><div class="section"><div class="section-title accent-yellow">Growth Engines — Revenue & Profit Contribution</div><h3>Ecommerce Revenue Build</h3>${table(["Revenue Components",...YEARS],revenue)}${renderRevenueReconciliation()}<h3>Growth Engine Portfolio — ${y}</h3>${table(["Growth Engine","Owner","Gross Sales","% Total Sales","GM1 %","GP1","% Total GP1"],pr)}<div class="kpis">${kpi("Paid Revenue Influenced",fmtMoney(paidRevenueInfluenced(y)),fmtPct(paidRevenueInfluenced(y)/(ecommerceBuild(y).total||1))+" of Ecommerce")}${kpi("ROAS",fmtX(roas(y)),"Paid efficiency")}${kpi("Email Revenue %",fmtPct(STATE.commercial.emailRevenuePct[y]),"Influence KPI")}${kpi("Purchase Frequency",y==="2026"?(purchaseFrequency()??0).toFixed(2):n(STATE.commercial.purchaseFrequency[y]).toFixed(1),`Returning Customers: ${fmtPct(STATE.commercial.returningCustomersPct[y])}`)}</div></div><div class="section"><div class="section-title accent-purple">Margin Bridge — incl. GM %</div>${table(["Stage",...YEARS],bridge)}<p class="note">GM1 % = GP1 / Net Sales · GM2 % = GP2 / Net Sales · GM3 % = GP3 / Net Sales. Forecast Ecommerce GM1 defaults: 37% / 42% / 46% (within 36–38% / 41–43% / 45–47% bands). $900K inventory captured in Cash Flow only — not in COGS — preserving gradual, natural margin improvement.</p></div>`}
function renderTab3(){const y=STATE.meta.displayYear,f=financial(y),gm1pct=f.net?f.gp1/f.net:0,gm2pct=f.net?f.gp2/f.net:0,gm3pct=f.net?f.gp3/f.net:0,rows=[["Gross Sales","gross","money"],["Discounts & Returns",z=>-portfolio(z).gross*portfolio(z).disc,"money"],["Net Sales","net","money"],["COGS",z=>-portfolio(z).cogs,"money"],["GP1","gp1","money"],["GM1 %",z=>financial(z).net?financial(z).gp1/financial(z).net:0,"pct"],["Outbound Shipping",z=>-portfolio(z).outbound,"money"],["Packaging",z=>-portfolio(z).packaging,"money"],["Shipping Revenue","shipRev","money"],["GP2","gp2","money"],["GM2 %",z=>financial(z).net?financial(z).gp2/financial(z).net:0,"pct"],["Advertising",z=>-portfolio(z).advertising,"money"],["GP3","gp3","money"],["GM3 %",z=>financial(z).net?financial(z).gp3/financial(z).net:0,"pct"],["Sales & Marketing (S&M)",z=>-opex(z).sm,"money"],["General & Administrative (G&A)",z=>-opex(z).ga,"money"],["Other Operating Expenses",z=>-opex(z).other,"money"],["EBITDA",z=>financial(z).ebitda,"money"],["EBITDA %",z=>financial(z).ebitdaPct,"pct"]].map(([l,k,t])=>`<tr class="${["Gross Sales","Net Sales","GP1","GP2","GP3","EBITDA"].includes(l)?"important":["GM1 %","GM2 %","GM3 %"].includes(l)?"margin-pct-row":""}"><td>${l}</td>${YEARS.map(z=>{const q=financial(z),v=typeof k==="function"?k(z):q[k];return `<td class="${v<0?"negative":""}">${t==="pct"?fmtPct(v):fmtMoney(v)}</td>`}).join("")}</tr>`),newCust=y==="2026"?Math.round((actual2026().ecom.uniqueCustomers||0)*n(STATE.commercial.newCustomerMix[y])):Math.round(n(STATE.engines.Ecommerce.orders[y])*n(STATE.commercial.newCustomerMix[y]));$("#tab3").innerHTML=`<div class="section"><div class="section-title accent-green">KPI Cards</div><div class="kpis">${kpi("Gross Sales",fmtMoney(f.gross),`${y} Forecast`)}${kpi("Net Sales",fmtMoney(f.net),"After Discounts")}${kpi("GM1 %",fmtPct(gm1pct),"GP1 / Net Sales")}${kpi("GP1",fmtMoney(f.gp1),fmtPct(gm1pct)+" of Net Sales")}${kpi("GM2 %",fmtPct(gm2pct),"GP2 / Net Sales")}${kpi("GP2",fmtMoney(f.gp2),fmtPct(gm2pct)+" of Net Sales")}${kpi("GM3 %",fmtPct(gm3pct),"GP3 / Net Sales")}${kpi("GP3",fmtMoney(f.gp3),fmtPct(gm3pct)+" of Net Sales")}${kpi("EBITDA",fmtMoney(f.ebitda),"After Operating Expenses")}</div></div><div class="section"><div class="section-title accent-purple">Commercial P&L</div>${table(["Commercial P&L",...YEARS],rows)}<h3>Sales &amp; Marketing Commissions</h3>${renderCommissionBreakdown()}<h3>OPEX Funding Coverage</h3>${fundingCoverageTable()}<p class="note">GM1 % = GP1 / Net Sales · GM2 % = GP2 / Net Sales · GM3 % = GP3 / Net Sales · EBITDA % = EBITDA / Net Sales. Ecommerce GM1 targets: 37% (2027) / 42% (2028) / 46% (2029) — within 36–38% / 41–43% / 45–47% bands.</p></div><div class="section"><div class="section-title accent-green">Growth Engine GM</div>${engineKpiSummary(y)}<p class="note">Concierge uses Shopify channel actuals for 2026 YTD and annualizes sales/orders through the selected Corro cutoff. Orders, clients and AOV are shown together to make the scale check explicit.</p></div><div class="section"><div class="section-title accent-yellow">Operating KPIs</div><div class="kpis">${kpi("Orders",fmtCount(engine("Ecommerce",y).orders||0),"Ecommerce")}${kpi("New Customers",fmtCount(newCust),"Unique new customers")}${kpi("ROAS",fmtX(roas(y)),"Scenario assumption")}${kpi("Ad Spend",fmtMoney(portfolio(y).advertising),"Advertising")}${kpi("Net / Gross Ratio",fmtPct(f.net/(f.gross||1)),"Net / Gross")}${kpi("Annual GP per Customer",annualGpCustomer(y)!==null?fmtMoney(annualGpCustomer(y)):"Data unavailable","AOV × Purchase Frequency × Ecommerce GM1")}</div></div>`}
function renderTab4(){const cash=cashAll(),y=STATE.meta.displayYear,c=cash[y],ins=[["Corro Receipts (Net Sales)",z=>portfolio(z).items.filter(item=>item.name!=="Cavali").reduce((sum,item)=>sum+item.net,0)],["Cavali Receipts (Net Sales)",z=>portfolio(z).items.find(item=>item.name==="Cavali").net],["Shipping Revenue",z=>portfolio(z).shipRev],["Funding",z=>cash[z].funding],["Other Cash Receipts",z=>n(STATE.cash.otherReceipts[z])],["TOTAL CASH IN",z=>cash[z].totalCashIn]],outs=[["Payables",z=>-cash[z].payables],["Inventory",z=>-cash[z].inventory],["Advertising",z=>-cash[z].advertising],["Shipping & Fulfillment",z=>-cash[z].shipping],["Sales & Marketing (S&M)",z=>-cash[z].sm],["General & Administrative (G&A)",z=>-cash[z].ga],["Other Operating Expenses",z=>-cash[z].other],["CapEx",z=>-cash[z].capex],["Private Label Investment",z=>-cash[z].privateLabel],["Other Cash Out",z=>-n(STATE.cash.otherCashOut[z])],["TOTAL CASH OUT",z=>-cash[z].cashOut]],nets=[["OPENING CASH",z=>cash[z].opening],["TOTAL CASH IN",z=>cash[z].totalCashIn],["TOTAL CASH OUT",z=>-cash[z].cashOut],["NET CASH FLOW",z=>cash[z].netFlow],["ENDING CASH",z=>cash[z].ending]];const rs=a=>a.map(([l,fn])=>`<tr class="${l.includes("TOTAL")||l.includes("CASH")?"important":""}"><td>${l}</td>${YEARS.map(z=>{const v=fn(z);return `<td class="${v<0?"negative":""}">${fmtMoney(v)}</td>`}).join("")}</tr>`);$("#tab4").innerHTML=`<div class="section"><div class="section-title accent-green">Cash Summary</div><div class="kpis">${kpi("Opening Cash",fmtMoney(c.opening),`Forecast ${y}`)}${kpi("Cash In",fmtMoney(c.totalCashIn),"Includes funding when applicable")}${kpi("Operating Cash Out",fmtMoney(-(c.advertising+c.shipping+c.sm+c.ga+c.other)),"Ads + Shipping + S&M + G&A + Other OPEX")}${kpi("Ending Cash",fmtMoney(c.ending),`Forecast ${y}`)}${kpi("Cash Runway",c.runway===null?"—":`${c.runway.toFixed(1)} mo`,"Ending Cash ÷ avg monthly operating cash out")}</div></div><div class="section"><div class="section-title">Cash In</div>${table(["Cash In",...YEARS],rs(ins))}</div><div class="section"><div class="section-title accent-purple">Cash Out</div>${table(["Cash Out",...YEARS],rs(outs))}<h3>OPEX Funding Coverage</h3>${fundingCoverageTable()}<p class="note">Funding Inventory is cash timing only. It is not added directly to P&L COGS; COGS is recognized through sold revenue and GM1.</p></div><div class="section"><div class="section-title accent-orange">Net Cash Flow</div>${table(["Net Cash Flow",...YEARS],rs(nets))}</div>`}
function renderTab5(){const y=STATE.meta.displayYear,f=financial(y),c=cashAll()[y],p=portfolio(y),roundDates=activeRounds().map(x=>x.date).join(" + "),max=Math.max(...YEARS.map(z=>financial(z).gross),1);$("#tab5").innerHTML=`<div class="section"><div class="section-title accent-green">Executive Snapshot</div><p class="note">Direct outputs from Tabs 1–4. No independent Board formulas.</p><div class="kpis">${kpi("Gross Sales",fmtMoney(f.gross),`Forecast ${y}`)}${kpi("Net Sales",fmtMoney(f.net),`Forecast ${y}`)}${kpi("GP3",fmtMoney(f.gp3),`Forecast ${y}`)}${kpi("EBITDA",fmtMoney(f.ebitda),`Forecast ${y}`)}${kpi("Ending Cash",fmtMoney(c.ending),`Forecast ${y}`)}${kpi("Cash Runway",c.runway===null?"—":`${c.runway.toFixed(1)} mo`,`Forecast ${y}`)}${kpi("ROAS",fmtX(roas(y)),`Forecast ${y}`)}${kpi("Dover Capture",fmtPct(STATE.commercial.doverTargetCapturePct[y]),`Forecast ${y}`)}${kpi("Funding",fmtMoney(scenario().funding),roundDates)}</div></div><div class="two-col"><div class="section"><div class="section-title accent-yellow">Revenue Mix</div>${table(["Growth Engine","Gross Sales","% Total"],p.items.map(x=>`<tr><td>${x.name}</td><td>${fmtMoney(x.sales)}</td><td>${fmtPct(x.sales/(p.gross||1))}</td></tr>`))}</div><div class="section"><div class="section-title accent-orange">Revenue Growth</div><div class="board-bars">${YEARS.map(z=>`<div class="bar" style="height:${Math.max(3,financial(z).gross/max*100)}%"><span>${fmtMoney(financial(z).gross)}</span><em>${z}</em></div>`).join("")}</div></div></div>`}
function renderTab6(){
 const rounds=activeRounds(),cash=cashAll(),sc=scenario();
 const tests=[
  ["Each funding round has a unique ID",new Set(fundingPlan().rounds.map(round=>round.id)).size===fundingPlan().rounds.length],
  ["Funding amounts, dates and allocations are valid",FM.issues(fundingPlan()).length===0],
  ["Total funding equals included rounds",Math.abs(sc.funding-rounds.reduce((sum,round)=>sum+round.amount,0))<.01],
  ["Funding receipts reconcile across years",Math.abs(YEARS.reduce((sum,y)=>sum+fundingForYear(y),0)-sc.funding)<.01],
  ["Monthly schedule reconciles to total funding",Math.abs((FM.schedule(fundingPlan()).at(-1)?.accumulated||0)-sc.funding)<.01],
  ["Marketing is fully phased with no spend before funding",rounds.every(round=>Math.abs(YEARS.reduce((sum,y)=>sum+roundRamp(round)[y],0)-1)<1e-8&&YEARS.every(y=>n(y)>=dateParts(round.date)?.year||roundRamp(round)[y]===0))],
  ["OPEX allocation is not charged twice",YEARS.every(y=>Math.abs(financial(y).total-opex(y).total)<.01)],
  ["Cash out includes payables, inventory and embroidery once",YEARS.every(y=>{const c=cash[y];return Math.abs(c.cashOut-(c.inventory+c.payables+c.advertising+c.shipping+c.sm+c.ga+c.other+c.capex+c.privateLabel+n(STATE.cash.otherCashOut[y])))<.01})],
  ["Ending cash rolls into next opening cash",YEARS.slice(1).every(y=>Math.abs(cash[y].opening-cash[String(n(y)-1)].ending)<.01)],
  ["Dover ramp stays within 100%; remainder is unassigned",doverRampRemaining()>=-1e-8&&YEARS.every(y=>n(STATE.commercial.doverRampPct[y])>=0&&n(STATE.commercial.doverRampPct[y])<=1)],
  ["2026 Organic Growth revenue is zero",organicRevenue("2026")===0],
  ["COGS = Net Sales - GP1",YEARS.every(y=>Math.abs(portfolio(y).cogs-(portfolio(y).net-portfolio(y).gp1))<.01)],
  ["Paid growth adds only new marketing revenue",YEARS.every(y=>Math.abs(paidRevenue(y)-incrementalAds(y)*roas(y))<.01)],
  ["Base advertising remains an expense exactly once",YEARS.every(y=>Math.abs(portfolio(y).advertising-totalAds(y))<.01)],
  ["2026 YTD reconciles to Corro plus Cavali actuals",Math.abs(revenueReconciliation().reduce((sum,row)=>sum+row.actual,0)-actual2026().corro.grossSales-actual2026().cav.grossSales)<.01],
  ["All 2026 forecast components reconcile",revenueReconciliation().every(row=>Math.abs(row.actual+row.baseline+row.paid+row.dover-row.total)<.01)],
  ["Unmapped Corro channels are retained",actual2026().other.grossSales>=-.01],
  ["Commission rates are between 0% and 100%",Object.values(STATE.opex.commissions.rates).every(rates=>YEARS.every(y=>n(rates[y])>=0&&n(rates[y])<=1))],
  ["S&M equals channel commissions plus CJ and fixed costs",STATE.opex.commissions.mode==="manual"||YEARS.every(y=>{const c=commissionBreakdown(y);return Math.abs(opex(y).sm-c.variable-c.cj-c.otherFixed)<.01})],
  ["Current engine margins are positive",["Ecommerce","Wellington","Cavali"].every(name=>engine(name,"2026").gm1>0)]
 ];
 const rows=rounds.map(round=>`<tr><td>${esc(round.label)}</td><td>${esc(round.date)}</td><td>${exactMoney(round.marketing)}</td>${YEARS.map(y=>`<td>${exactMoney(round.marketing*roundRamp(round)[y])}</td>`).join("")}</tr>`);
 $("#tab6").innerHTML=`<div class="section"><div class="section-title accent-purple">Formula QA</div>${table(["Test","Status"],tests.map(([name,ok])=>`<tr><td>${name}</td><td class="${ok?"qa-pass":"qa-fail"}">${ok?"PASS":"FAIL"}</td></tr>`))}</div><div class="section"><div class="section-title accent-yellow">Marketing Allocation by Funding Round</div>${table(["Funding Scenario","Date","Marketing Pool",...YEARS],rows)}</div>`;
}
function updateStickyHeader(){
 const header=$(".topbar"),tabs=$(".tabs");
 if(header?.style&&tabs)header.style.setProperty("--sticky-top",`-${Math.max(0,n(tabs.offsetTop)-8)}px`);
}
function renderAll(){renderTab1();renderTab2();renderTab3();renderTab4();renderTab5();renderTab6();bindEditable();syncHeader();updateStickyHeader()}
function bindEditable(){
 $$("[data-dover-ramp-year]").forEach(input=>input.onchange=()=>{
   if(!input.checkValidity()||!updateDoverRamp(input.dataset.doverRampYear,input.value)){input.reportValidity();return}
   save();renderAll();
 });
 if($("#doverMarketOpportunity"))$("#doverMarketOpportunity").onchange=e=>{
   if(!e.target.checkValidity()){e.target.reportValidity();return}
   STATE.commercial.doverMarketOpportunity=n(e.target.value);save();renderAll();
 };

 $$("[data-commission-type]").forEach(input=>input.onchange=()=>{
   if(!input.checkValidity()){input.reportValidity();return}
   const cfg=STATE.opex.commissions,type=input.dataset.commissionType,y=input.dataset.year,value=n(input.value);
   if(type==="rate"){cfg.rates[input.dataset.engine]||={};cfg.rates[input.dataset.engine][y]=value/100}
   else if(type==="manual")STATE.opex.salesMarketing[y]=value;
   else if(type==="ga")STATE.opex.generalAdministrative[y]=value;
   else if(type==="otherOpex")STATE.opex.other[y]=value;
   else cfg[type][y]=value;
   save();renderAll();
 });
 if($("#commissionMode"))$("#commissionMode").onchange=e=>{STATE.opex.commissions.mode=e.target.value;save();renderAll()};
 if($("#commissionBasis"))$("#commissionBasis").onchange=e=>{STATE.opex.commissions.basis=e.target.value;save();renderAll()};

 $$("[contenteditable][data-group]").forEach(td=>td.onblur=()=>editCell(td.dataset.group,td.dataset.path,td.dataset.year,td.textContent,td.dataset.format));
 $$("[contenteditable][data-engine]").forEach(td=>td.onblur=()=>{const v=parseUserValue(td.textContent,td.dataset.format);STATE.engines[td.dataset.engine][td.dataset.key][td.dataset.year]=v;save();renderAll()});
 $$("[data-funding-id]").forEach(input=>input.onchange=()=>{
   const round=fundingPlan().rounds.find(round=>round.id===input.dataset.fundingId),key=input.dataset.fundingKey;
   if(!round)return;
   if(key==="enabled")round.enabled=input.checked;
   else if(key==="marketingTiming")round.marketingTiming=input.value;
   else if(key==="opexAuto"){round.opexAuto=input.checked;delete round.allocationMix;FM.normalizeRound(round,0)}
   else if(!input.checkValidity()||!FM.updateRound(round,key,input.value)){input.reportValidity();return}
   save();renderAll();
 });
 const add=$("#addFundingRound");if(add)add.onclick=()=>{
   let index=1;while(fundingPlan().rounds.some(round=>round.id===`funding-${index}`))index++;
   fundingPlan().rounds.push(FM.normalizeRound({id:`funding-${index}`,label:`Funding Scenario ${fundingPlan().rounds.length+1}`,date:"Jan-27",amount:0},index-1));save();renderAll();
 };
 $$("[data-remove-funding]").forEach(button=>button.onclick=()=>{fundingPlan().rounds=fundingPlan().rounds.filter(round=>round.id!==button.dataset.removeFunding);save();renderAll()});

 $$("[contenteditable][data-initiative]").forEach(td=>td.onblur=()=>{STATE.initiatives[n(td.dataset.initiative)][td.dataset.ikey]=td.textContent.trim();save();renderAll()})
}
function syncFundingMeta(){
 STATE.meta.fundingScenario=fundingPlan().rounds[0]?.preset||"custom";
 STATE.meta.fundingDate=fundingPlan().rounds[0]?.date;
 STATE.meta.fundingScenario2=fundingPlan().rounds[1]?.enabled?fundingPlan().rounds[1]?.preset:"none";
}
function syncFundingHeader(){
 const slots=[["#fundingScenario","#fundingDate","#fundingAmount1","#fundingUnit1"],["#fundingScenario2","#fundingDate2","#fundingAmount2","#fundingUnit2"]];
 slots.forEach(([selector,dateSelector,amountSelector,unitSelector],index)=>{
   const round=fundingPlan().rounds[index],select=$(selector),input=$(amountSelector),unit=$(unitSelector);
   if(!round)return;
   const presets=[...new Set(["Base",...Object.keys(STATE.fundingScenarios||{}),"$1M","$2M","$2.5M","$3M"])];
   select.innerHTML=presets.map(key=>`<option value="${esc(key)}">${esc(key)}</option>`).join("")+'<option value="custom">Custom amount</option><option value="none">None</option>';
   select.value=round.enabled?round.preset:"none";
   $(dateSelector).innerHTML=fundingDateOptions(round.date);$(dateSelector).value=round.date;
   unit.value=round.amountUnit;
   input.value=(round.amount/(round.amountUnit==="millions"?1e6:1)).toLocaleString("en-US",{maximumFractionDigits:round.amountUnit==="millions"?8:2,useGrouping:round.amountUnit!=="millions"});
   input.oninput=()=>input.setCustomValidity?.("");
   select.onchange=event=>{FM.selectPreset(fundingPlan(),index,event.target.value,STATE.fundingScenarios);save();renderAll()};
   $(dateSelector).onchange=event=>{FM.updateRound(round,"date",event.target.value);save();renderAll()};
   unit.onchange=event=>{round.amountUnit=event.target.value;save();renderAll()};
   input.onchange=event=>{
     const amount=FM.parseAmount(event.target.value,round.amountUnit);
     if(amount===null){event.target.setCustomValidity?.("Enter a valid funding amount.");event.target.reportValidity?.();return}
     event.target.setCustomValidity?.("");FM.updateRound(round,"amount",amount);save();renderAll();
   };
 });
 $("#fundingTotal").value=exactMoney(scenario().funding);
 syncFundingMeta();
}
function syncHeader(){
 const m=STATE.meta;syncFundingHeader();
 $("#doverRamp").value=n(STATE.commercial.doverRampPct[m.displayYear])*100;
 $("#doverRampYearLabel").textContent=`DOVER RAMP (${m.displayYear})`;
 $("#doverRampRemaining").value=fmtPct(doverRampRemaining());
 $("#doverRampRemaining").className=doverRampRemaining()<-.00001?"negative":"";
 $("#modelSettingsSummary").textContent=`${m.displayYear} / ROAS ${fmtX(roas(m.displayYear))} / Dover ramp ${fmtPct(STATE.commercial.doverRampPct[m.displayYear])}`;

 $("#statusSelect").value=m.status;$("#displayYear").value=m.displayYear;$("#baseEcommerce").value=m.baseEcommerceMonthly;$("#doverCapture").value=n(STATE.commercial.doverTargetCapturePct[m.displayYear])*100;$("#roas").value=roas(m.displayYear);$("#lastUpdated").value=m.lastUpdated||"";$("#corroMonth").value=selectedCorroMonth();$("#cavaliMonth").value=selectedCavaliMonth();
 $("#sourceStatus").textContent=ACTUALS.shopify.generated_at?`Actuals source: ${ACTUALS.shopify.generated_at.slice(0,10)} - Corro YTD through ${monthLabel(selectedCorroMonth())}${actual2026().coverage.partial?" (partial)":""} - Cavali YTD through ${monthLabel(selectedCavaliMonth())}${actual2026().cavCoverage.partial?" (partial)":""}`:"Actuals not loaded";
}
function refreshThemeButton(){
 const button=$("#themeBtn");if(!button)return;
 const dark=document.documentElement.dataset.theme==="dark";
 button.innerHTML=icon(dark?"Sun":"Moon");
 button.title=dark?"Switch to light theme":"Switch to dark theme";
 button.setAttribute?.("aria-label",button.title);
}
function decorateControls(){
 [["#saveBtn","Save","Save"],["#refreshBtn","RefreshCw","Refresh Actuals"],["#downloadBtn","Download","Download"],["#publishBtn","Upload","Publish To..."],[".actions .action-link","ExternalLink","Returns Report"]].forEach(([selector,name,label])=>{
   const button=$(selector);if(button){button.innerHTML=icon(name)+`<span>${label}</span>`;button.setAttribute?.("aria-label",label)}
 });
 const names=["SlidersHorizontal","TrendingUp","ChartNoAxesCombined","Wallet","LayoutDashboard","ClipboardCheck"];
 $$(".tabs button").forEach(button=>{button.innerHTML=icon(names[n(button.dataset.tab)-1])+`<span>${esc(button.textContent)}</span>`});
 refreshThemeButton();
}
function wire(){
 decorateControls();
 const settings=$("#modelSettings"),savedOpen=localStorage.getItem("eqlabs-settings-open");
 if(settings){
   settings.open=savedOpen!==null?savedOpen==="true":!(typeof matchMedia==="function"&&matchMedia("(max-width: 600px)").matches);
   settings.ontoggle=()=>{localStorage.setItem("eqlabs-settings-open",String(settings.open));updateStickyHeader()};
 }
 if(typeof ResizeObserver==="function")new ResizeObserver(updateStickyHeader).observe($(".topbar"));

 $$(".tabs button").forEach(b=>b.onclick=()=>{$$(".tabs button").forEach(x=>x.classList.remove("active"));b.classList.add("active");$$(".tab-panel").forEach(x=>x.classList.remove("active"));$(`#tab${b.dataset.tab}`).classList.add("active")});
 $("#saveBtn").onclick=save;
 $("#refreshBtn").onclick=async()=>{const d=await DataService.loadAll();ACTUALS={shopify:d.shopify,connected:d.connected,smartrr:d.smartrr||{}};populateMonthFilters();renderAll();flash(ACTUALS.shopify?.generated_at?"Actuals refreshed ✓":"Actuals file is empty")};
 $("#downloadBtn").onclick=()=>{const blob=new Blob([JSON.stringify(STATE,null,2)],{type:"application/json"}),a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=`strategic-model-${STATE.meta.status.toLowerCase()}-${Date.now()}.json`;a.click();URL.revokeObjectURL(a.href)};
 $("#publishBtn").onclick=()=>alert("Cloudflare Pages is static. Save persists in this browser; Download exports the selected scenario.");
 $("#themeBtn").onclick=()=>{const dark=document.documentElement.dataset.theme==="dark";document.documentElement.dataset.theme=dark?"":"dark";localStorage.setItem("eqlabs-theme",dark?"light":"dark");refreshThemeButton()};
 $("#statusSelect").onchange=e=>{const status=e.target.value;STATE=applyFinalDefaults(loadSaved(status)||clone(BASE));STATE.meta.status=status;populateMonthFilters();save();renderAll()};

 $("#displayYear").onchange=e=>{STATE.meta.displayYear=e.target.value;save();renderAll()};
 $("#corroMonth").onchange=e=>{STATE.meta.corroMonth=e.target.value;save();renderAll()};
 $("#cavaliMonth").onchange=e=>{STATE.meta.cavaliMonth=e.target.value;save();renderAll()};
 $("#baseEcommerce").onchange=e=>{STATE.meta.baseEcommerceMonthly=n(e.target.value);save();renderAll()};
 $("#doverCapture").onchange=e=>{if(!e.target.checkValidity()){e.target.reportValidity();return}STATE.meta.doverCapture=n(e.target.value)/100;YEARS.forEach(y=>STATE.commercial.doverTargetCapturePct[y]=STATE.meta.doverCapture);save();renderAll()};
 $("#doverRamp").onchange=e=>{if(!updateDoverRamp(STATE.meta.displayYear,e.target.value)){e.target.reportValidity?.();return}save();renderAll()};
 $("#roas").onchange=e=>{STATE.meta.roas=n(e.target.value);YEARS.forEach(y=>STATE.commercial.roasByYear[y]=n(e.target.value));save();renderAll()}
}
function applyFinalDefaults(s){
 s.meta.version="4.8";
 if(s.commercial.doverRampRevision!=="2026-10-21"){
   s.commercial.previousDoverRampPct||=clone(s.commercial.doverRampPct);
   s.commercial.doverRampPct["2026"]=.01;
   s.commercial.doverRampRevision="2026-10-21";
   s.meta.lastUpdated="2026-10-21";
 }
 if(s.commercial.revenueLogicVersion!==2){
   s.commercial.revenueLogicVersion=2;
   if(n(s.meta.doverCapture)===.15&&YEARS.every(y=>n(s.commercial.doverTargetCapturePct[y])===.15)){
     s.meta.doverCapture=.10;YEARS.forEach(y=>s.commercial.doverTargetCapturePct[y]=.10);
   }
 }
 FM.ensurePlan(s,BASE.fundingPlan||FM.defaultPlan());
 if(s.fundingPlan.marketingTimingVersion!==1){
   s.fundingHistory||={};
   s.fundingHistory.marketingPlanBefore20261020||=clone(s.fundingPlan);
   s.fundingPlan.rounds.forEach(round=>round.marketingTiming||="funding-year");
   s.fundingPlan.marketingTimingVersion=1;
 }
 s.engines[OTHER_CORRO]||=clone(BASE.engines?.[OTHER_CORRO]||{owner:"Corro",growthPct:{2026:0,2027:0,2028:0,2029:0},gm1:{2026:null,2027:.32,2028:.32,2029:.32}});
 if(!s.opex.commissions){
   s.opex.legacySalesMarketing||=clone(s.opex.salesMarketing);
   s.opex.commissions=clone(BASE.opex?.commissions||{
     version:1,mode:"formula",basis:"net",rates:{},cjMonthly:{2026:3000,2027:3000,2028:3000,2029:3000},otherFixed:{2026:0,2027:0,2028:0,2029:0}
   });
 }
 const cfg=s.opex.commissions;
 cfg.mode||="formula";cfg.basis||="net";cfg.rates||={};
 Object.keys(s.engines).forEach(name=>{cfg.rates[name]||=Object.fromEntries(YEARS.map(y=>[y,name==="Concierge"?.10:name==="Wellington"?.01:0]))});
 return s;
}

const LEGACY_FORECAST_DEFAULTS={
  commercial:{doverRampPct:{2026:.05,2027:.55,2028:.25,2029:.15}},
  engines:{
    Concierge:{activeClients:{2027:400,2028:600,2029:700},ordersPerClient:{2027:1.5,2028:1.8,2029:2},aov:{2027:450,2028:480,2029:500}},
    Wellington:{orders:{2027:1200,2028:1400,2029:1600},aov:{2027:175,2028:190,2029:205}},
    Cavali:{signatureMembers:{2027:500,2028:800,2029:1000},signatureBoxesPerMemberYear:{2027:5.2,2028:5.2,2029:5.2},premierMembers:{2027:50,2028:80,2029:150},premierBoxesPerMemberYear:{2027:3.3,2028:3.3,2029:3.3}},
    "Private Label":{units:{2027:100,2028:1000,2029:1000}}
  }
};
const FORECAST_GROWTH={2027:1.10,2028:1.25,2029:1.40};
const FORECAST_AOV_GROWTH={2027:1.03,2028:1.06,2029:1.10};
function sameNumber(a,b){return valid(a)&&valid(b)&&Math.abs(n(a)-n(b))<1e-9}
function setDefaultIfLegacy(target,path,y,value,legacy){
  const current=target?.[path]?.[y];
  if(current===null||current===undefined||current===""||sameNumber(current,legacy)){
    target[path][y]=value;
  }
}
function applyActualBasedForecastDefaults(s){
  const a=monthlyDisplayActuals();
  if(!a?.corro?.monthsClosed)return s;
  const smoothDover={2026:.01,2027:.20,2028:.35,2029:.40};
  YEARS.forEach(y=>{
    const old=LEGACY_FORECAST_DEFAULTS.commercial.doverRampPct[y];
    if(sameNumber(s.commercial.doverRampPct[y],old))s.commercial.doverRampPct[y]=smoothDover[y];
  });

  const conOrders=n(a.con.orders),conClients=n(a.con.uniqueCustomers),conAov=conOrders?n(a.con.grossSales)/conOrders:null,conOpc=conClients?conOrders/conClients:null;
  if(conClients>0){
    YEARS.slice(1).forEach(y=>{
      setDefaultIfLegacy(s.engines.Concierge,"activeClients",y,Math.round(conClients*FORECAST_GROWTH[y]),LEGACY_FORECAST_DEFAULTS.engines.Concierge.activeClients[y]);
      setDefaultIfLegacy(s.engines.Concierge,"ordersPerClient",y,Number((conOpc*(1+(FORECAST_GROWTH[y]-1)/2)).toFixed(2)),LEGACY_FORECAST_DEFAULTS.engines.Concierge.ordersPerClient[y]);
      if(conAov!==null)setDefaultIfLegacy(s.engines.Concierge,"aov",y,Math.round(conAov*FORECAST_AOV_GROWTH[y]),LEGACY_FORECAST_DEFAULTS.engines.Concierge.aov[y]);
    });
  }

  const wellOrders=n(a.well.orders),wellAov=wellOrders?n(a.well.grossSales)/wellOrders:null;
  if(wellOrders>0){
    YEARS.slice(1).forEach(y=>{
      setDefaultIfLegacy(s.engines.Wellington,"orders",y,Math.round(wellOrders*FORECAST_GROWTH[y]),LEGACY_FORECAST_DEFAULTS.engines.Wellington.orders[y]);
      if(wellAov!==null)setDefaultIfLegacy(s.engines.Wellington,"aov",y,Math.round(wellAov*FORECAST_AOV_GROWTH[y]),LEGACY_FORECAST_DEFAULTS.engines.Wellington.aov[y]);
    });
  }

  const sig=actualEngine("Cavali","signatureMembers"),sigBoxes=actualEngine("Cavali","signatureBoxes"),pre=actualEngine("Cavali","premierMembers"),preBoxes=actualEngine("Cavali","premierBoxes");
  YEARS.slice(1).forEach(y=>{
    if(valid(sig))setDefaultIfLegacy(s.engines.Cavali,"signatureMembers",y,Math.round(sig*FORECAST_GROWTH[y]),LEGACY_FORECAST_DEFAULTS.engines.Cavali.signatureMembers[y]);
    if(valid(sigBoxes))setDefaultIfLegacy(s.engines.Cavali,"signatureBoxesPerMemberYear",y,Number(sigBoxes.toFixed(1)),LEGACY_FORECAST_DEFAULTS.engines.Cavali.signatureBoxesPerMemberYear[y]);
    if(valid(pre))setDefaultIfLegacy(s.engines.Cavali,"premierMembers",y,Math.max(1,Math.round(pre*FORECAST_GROWTH[y])),LEGACY_FORECAST_DEFAULTS.engines.Cavali.premierMembers[y]);
    if(valid(preBoxes))setDefaultIfLegacy(s.engines.Cavali,"premierBoxesPerMemberYear",y,Number(preBoxes.toFixed(1)),LEGACY_FORECAST_DEFAULTS.engines.Cavali.premierBoxesPerMemberYear[y]);
  });

  const pl=s.engines["Private Label"];
  setDefaultIfLegacy(pl,"units","2027",100,LEGACY_FORECAST_DEFAULTS.engines["Private Label"].units["2027"]);
  setDefaultIfLegacy(pl,"units","2028",250,LEGACY_FORECAST_DEFAULTS.engines["Private Label"].units["2028"]);
  setDefaultIfLegacy(pl,"units","2029",500,LEGACY_FORECAST_DEFAULTS.engines["Private Label"].units["2029"]);
  return s;
}

// ===== v4.4 Ceci 2026 corrections =====
function reliableCoverageMargin(a,minCoverage=.80,maxMargin=.75){
  if(!a)return null;
  const sales=firstPositive(a.netSales,a.grossSales),cogs=firstPositive(a.cogs),units=firstPositive(a.units),costed=firstValid(a.costedUnits);
  if(sales===null||cogs===null||sales<=cogs)return null;
  if(units!==null&&costed!==null&&n(costed)/n(units)<minCoverage)return null;
  const gm=(sales-cogs)/sales;
  return gm>0&&gm<=maxMargin?gm:null;
}
function saneActualMargin(v,max=.75){const r=rate(v);return r!==null&&r>0&&r<=max?r:null}
const FINANCIAL_REPORT_2026_GM1=.32;
function vetted2026Margin(...values){
  for(const value of values){
    const r=rate(value);
    if(r!==null&&r>=.20&&r<=.36)return r;
  }
  return FINANCIAL_REPORT_2026_GM1;
}
actualGm1=function(name){
  const a=actual2026(),m=monthlyDisplayActuals();
  if(name==="Cavali")return vetted2026Margin(reliableCoverageMargin(a.cav,.80,.36),saneActualMargin(connected("financial.cavali.gm1",null),.36),saneActualMargin(shopifyDerived("cavali","totals.gm1",null),.36),reliableCoverageMargin(m.cav,.80,.36));
  if(name==="Ecommerce")return vetted2026Margin(reliableCoverageMargin(a.ecom,.80,.36),saneActualMargin(connected("financial.corro.ecommerceGm1",null),.36),saneActualMargin(shopifyDerived("corro","channels.e-commerce.gm1",null),.36),reliableCoverageMargin(m.ecom,.80,.36));
  if(name==="Concierge")return vetted2026Margin(reliableCoverageMargin(a.con,.80,.36),saneActualMargin(connected("financial.corro.conciergeGm1",null),.36),saneActualMargin(shopifyDerived("corro","channels.Concierge.gm1",null),.36),reliableCoverageMargin(m.con,.80,.36));
  if(name==="Wellington")return vetted2026Margin(reliableCoverageMargin(a.well,.80,.36),saneActualMargin(connected("financial.corro.wellingtonGm1",null),.36),saneActualMargin(shopifyDerived("corro","channels.Wellington.gm1",null),.36),reliableCoverageMargin(m.well,.80,.36));
  return null;
};
const _engValV43=engVal;
engVal=function(name,key,y){
  return _engValV43(name,key,y);
};

const _engineV43=engine;
engine=function(name,y){
  if(name!=="Cavali")return _engineV43(name,y);

  const sm=engVal(name,"signatureMembers",y);
  const sb=engVal(name,"signatureBoxesPerMemberYear",y);
  const sp=engVal(name,"signaturePrice",y);
  const pm=engVal(name,"premierMembers",y);
  const pb=engVal(name,"premierBoxesPerMemberYear",y);
  const pp=engVal(name,"premierPrice",y);

  const remaining=y==="2026"?actual2026().cavCoverage.remainingMonths/12:1;
  const actualYtdSales=y==="2026"?n(actual2026().cav.grossSales):0;
  const signatureRevenue=sm*sb*sp*remaining;
  const premierRevenue=pm*pb*pp*remaining;
  const sales=actualYtdSales+signatureRevenue+premierRevenue;

  return {
    sales,
    subscription:sales,
    signatureRevenue,
    premierRevenue,
    actualYtdSales,
    paid:0,
    gm1:engVal(name,"gm1",y)||FINANCIAL_REPORT_2026_GM1,
    sm,sb,sp,pm,pb,pp,
    orders:actualEngine("Cavali","orders")
  };
};

operationsPct=function(key,y){
  if(y==="2026"){
    const map={outboundShippingPct:"financial.corro.outboundShippingPct",packagingPct:"financial.corro.packagingPct",shippingRevenuePct:"financial.corro.shippingRevenuePct"},v=rate(connected(map[key],null));
    if(v!==null&&v>0)return v;
  }
  return n(STATE.operations[key][y]);
};
const _portfolioV43=portfolio;
function netSalesForEngine(item,y,discount){
 if(y!=="2026")return item.sales*(1-discount);
 const a=actual2026(),source=item.name==="Ecommerce"?a.ecom:item.name==="Concierge"?a.con:item.name==="Wellington"?a.well:item.name==="Cavali"?a.cav:item.name===OTHER_CORRO?a.other:null;
 return source?n(source.netSales)+(item.sales-n(source.grossSales))*(1-discount):item.sales*(1-discount);
}
portfolio=function(y){
 const items=engineNames().map(name=>({name,...engine(name,y)})),gross=items.reduce((sum,item)=>sum+item.sales,0),forecastDiscount=discountsRate(y);
 let net=0,gp1=0;
 items.forEach(item=>{item.net=netSalesForEngine(item,y,forecastDiscount);item.gp1=item.net*item.gm1;net+=item.net;gp1+=item.gp1});
 const disc=gross?1-net/gross:0,cogs=Math.max(0,net-gp1),outbound=net*operationsPct("outboundShippingPct",y),packaging=net*operationsPct("packagingPct",y),shipRev=net*operationsPct("shippingRevenuePct",y),gp2=gp1-outbound-packaging+shipRev,advertising=totalAds(y),gp3=gp2-advertising;
 return{items,gross,disc,net,cogs,gp1,outbound,packaging,shipRev,gp2,advertising,gp3};
};
const _engineRowsV43=engineRows;
engineRows=function(name){
  if(name!=="Cavali")return _engineRowsV43(name);
  const e=STATE.engines.Cavali;
  const edit=(key,y,fmt="number")=>{
    let raw;
    if(y==="2026" && !["signaturePrice","premierPrice"].includes(key)){
      const av=actualEngine("Cavali",key.replace("PerMemberYear",""));
      raw = valid(av) ? av : (valid(e[key]?.[y])?e[key][y]:engVal(name,key,y));
    } else {
      raw = valid(e[key]?.[y])?e[key][y]:engVal(name,key,y);
    }
    return `<td class="editable" contenteditable="true" data-engine="Cavali" data-key="${key}" data-year="${y}" data-format="${fmt}">${fmt==="pct"?fmtPct(raw):fmt==="money"?fmtMoney(raw):fmtNum(raw,key.includes("Boxes")?1:0)}</td>`;
  };
  const calc=(label,fn)=>`<tr><td>${label}</td><td class="baseline">Calculated</td>${YEARS.map(y=>`<td class="calculated">${fmtMoney(fn(engine("Cavali",y)))}</td>`).join("")}</tr>`;
  return[
    `<tr><td>Signature Active Members</td><td class="baseline">${fmtNum(cavaliMembers("signature"))}</td>${YEARS.map(y=>edit("signatureMembers",y)).join("")}</tr>`,
    `<tr><td>Signature Boxes per Member / Year</td><td class="baseline">${fmtNum(cavaliBoxes("signature"),1)}</td>${YEARS.map(y=>edit("signatureBoxesPerMemberYear",y)).join("")}</tr>`,
    `<tr><td>Signature Price</td><td class="baseline">$99</td>${YEARS.map(y=>edit("signaturePrice",y,"money")).join("")}</tr>`,calc("Signature Revenue (forecast)",x=>x.signatureRevenue),
    `<tr><td>Premier Active Members</td><td class="baseline">${fmtNum(cavaliMembers("premier"))}</td>${YEARS.map(y=>edit("premierMembers",y)).join("")}</tr>`,
    `<tr><td>Premier Boxes per Member / Year</td><td class="baseline">${fmtNum(cavaliBoxes("premier"),1)}</td>${YEARS.map(y=>edit("premierBoxesPerMemberYear",y)).join("")}</tr>`,
    `<tr><td>Premier Price</td><td class="baseline">$199</td>${YEARS.map(y=>edit("premierPrice",y,"money")).join("")}</tr>`,calc("Premier Revenue (forecast)",x=>x.premierRevenue),calc("Actual YTD Sales",x=>x.actualYtdSales),calc("Total Cavali Revenue",x=>x.sales),
    `<tr><td>GM1 %</td><td class="baseline">${fmtPct(actualGm1("Cavali"))}</td><td class="calculated">${fmtPct(actualGm1("Cavali"))}</td>${YEARS.slice(1).map(y=>edit("gm1",y,"pct")).join("")}</tr>`
  ];
};
renderOperations=function(){
  const p=STATE.operations,labels=["Outbound Shipping Cost %","Shipping Revenue %","Packaging Cost %"],keys=["outboundShippingPct","shippingRevenuePct","packagingPct"];
  const rows=keys.map((k,i)=>{const a=rate(connected("financial.corro."+k,null)),src=a!==null&&a>0?fmtPct(a):"Manual / scenario";return `<tr><td>${labels[i]}</td><td class="baseline">${src}</td>${YEARS.map(y=>field(p,k,y,"pct")).join("")}</tr>`});
  $("#operationsMagic").innerHTML=`<div class="section"><div class="section-title accent-purple">Section 5 — Operations Strategy</div><p class="note">2026 is editable and saved. GP2 = GP1 − Outbound Shipping − Packaging + Shipping Revenue; GP3 = GP2 − Advertising.</p>${table(["Driver","Source / Current",...YEARS],rows)}</div>`;
};
// ===== end v4.4 =====

async function init(){
 const d=await DataService.loadAll();BASE=applyFinalDefaults(clone(d.assumptions));ACTUALS={shopify:d.shopify,connected:d.connected,smartrr:d.smartrr||{}};
 STATE=applyFinalDefaults(loadSaved("Draft")||clone(BASE));
 const cur=DataService.currentPeriod(),corroOpts=DataService.availableMonths(ACTUALS.shopify.brands?.corro||{},"2026-01"),latestCorro=corroOpts.includes(cur)?cur:DataService.latestClosedMonth(ACTUALS.shopify.brands?.corro?.kpis_daily||[]);
 if(STATE.meta.corroMonth==="2026-01"&&latestCorro)STATE.meta.corroMonth=latestCorro;
 populateMonthFilters();applyActualBasedForecastDefaults(STATE);
 if(localStorage.getItem("eqlabs-theme")==="dark"){document.documentElement.dataset.theme="dark";$("#themeBtn").textContent="Dark"}
 wire();renderAll();localStorage.setItem(storageKey(),JSON.stringify(STATE));
 window.runModelQA=()=>({fundingPlan:clone(fundingPlan()),funding:scenario(),schedule:FM.schedule(fundingPlan()),fundingIssues:FM.issues(fundingPlan()),doverRamp:clone(STATE.commercial.doverRampPct),doverRampRemaining:doverRampRemaining(),actual2026:actual2026(),reconciliation2026:revenueReconciliation(),commissionSettings:clone(STATE.opex.commissions),commissions:Object.fromEntries(YEARS.map(y=>[y,commissionBreakdown(y)])),paidRamp:paidRamp(),years:Object.fromEntries(YEARS.map(y=>[y,{ecommerce:ecommerceBuild(y),portfolio:portfolio(y),financial:financial(y),cash:cashAll()[y]}])),cavali:{signatureMembers:actualEngine("Cavali","signatureMembers"),signatureBoxes:actualEngine("Cavali","signatureBoxes"),premierMembers:actualEngine("Cavali","premierMembers"),premierBoxes:actualEngine("Cavali","premierBoxes"),gm1:actualGm1("Cavali")}});
}
init().catch(e=>{console.error(e);document.body.insertAdjacentHTML("beforeend",`<pre class="fatal">${esc(e.stack||e.message)}</pre>`)});
})();
