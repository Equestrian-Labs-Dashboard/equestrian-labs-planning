#!/usr/bin/env node
/*
  Cavali Smartrr sync v4.2
  IMPORTANT: do not invent tier counts. If the purchase-state payload cannot classify
  Signature/Premier, mark tierClassification=false so app.js falls back to Shopify
  observed tier members instead of showing false zero active counts.
*/
import fs from "node:fs/promises";
const KEY=process.env.SMARTRR_API_KEY_CAVALI||process.env.SMARTRR_TOKEN_CAVALI||"";
const OUT="data/cavali_smartrr_actuals.json", SHOPIFY="data/shopify_actuals.json", BASE="https://api.smartrr.com/vendor/purchase-state";
async function readJson(p,f={}){try{return JSON.parse(await fs.readFile(p,"utf8"))}catch{return f}}
function deepStrings(o,out=[],d=0){if(o==null||d>9)return out;if(typeof o==="string"||typeof o==="number")out.push(String(o));else if(Array.isArray(o))o.slice(0,500).forEach(v=>deepStrings(v,out,d+1));else if(typeof o==="object")Object.entries(o).forEach(([k,v])=>{out.push(k);deepStrings(v,out,d+1)});return out}
function txt(o){return deepStrings(o).join(" ").toLowerCase()}
function family(o){const t=txt(o);if(/premier|premium/.test(t))return"premier";if(/signature|welcome box|dedicated equestrian/.test(t))return"signature";return"other"}
function cadence(o){const t=txt(o);if(/weekly/.test(t))return 52;if(/bi[- ]?weekly|every 2 weeks/.test(t))return 26;if(/monthly/.test(t))return 12;if(/bi[- ]?monthly|every 2 months/.test(t))return 6;if(/quarterly|every 3 months/.test(t))return 4;if(/every 4 months/.test(t))return 3;if(/semi[- ]?annual|twice a year|every 6 months/.test(t))return 2;if(/annual|yearly|once a year/.test(t))return 1;return null}
function idOf(s){return String(s?.id||s?.purchaseStateId||s?.shopifyId||s?.subscriptionId||s?.subscription_id||s?.externalSubscriptionId||JSON.stringify(s).slice(0,180))}
function itemsOf(p){if(Array.isArray(p))return p;if(!p||typeof p!=="object")return[];for(const k of ["data","items","results","purchaseStates","purchaseState","subscriptions"]){const v=p[k];if(Array.isArray(v))return v;if(v&&typeof v==="object"){const x=itemsOf(v);if(x.length)return x}}return[]}
async function get(status,page){const qs=new URLSearchParams({pageSize:"250",pageNumber:String(page),"filterEquals[purchaseStateStatus]":status,include:"items,lineItems,orderLineItems,stLineItems,product,variant,purchasableVariant,orders"});let r=await fetch(`${BASE}?${qs}`,{headers:{accept:"application/json","x-smartrr-access-token":KEY,"x-smartrr-api-key":KEY,token:KEY}});if(r.status===401||r.status===403)r=await fetch(`${BASE}?${qs}`,{headers:{accept:"application/json",authorization:`Bearer ${KEY}`}});return r}
async function fetchStatus(status){const out=[];for(let p=0;p<200;p++){const r=await get(status,p);if(!r.ok){console.warn(`Smartrr ${status}: HTTP ${r.status}`);break}const a=itemsOf(await r.json());if(!a.length)break;out.push(...a.map(x=>({...x,_requestedStatus:status})));if(a.length<250)break}return out}
function weighted(a){const v=a.map(cadence).filter(Number.isFinite);return v.length?v.reduce((s,x)=>s+x,0)/v.length:null}
function shopifyFallback(s,t,k){return s?.brands?.cavali?.membership_observed?.["2026"]?.[t]?.[k]??s?.brands?.cavali?.derived?.cavali?.membershipObserved?.[t]?.[k]??null}
async function main(){const previous=await readJson(OUT,{}),shopify=await readJson(SHOPIFY,{brands:{}});if(!KEY){console.warn("No Smartrr key; preserving current file.");return}
 const all=[...(await fetchStatus("ACTIVE")),...(await fetchStatus("PAUSED")),...(await fetchStatus("CANCELLED"))],seen=new Map();for(const s of all)seen.set(idOf(s),s);const states=[...seen.values()],g={signature:{active:[],paused:[],cancelled:[]},premier:{active:[],paused:[],cancelled:[]},other:{active:[],paused:[],cancelled:[]}};
 for(const s of states){const f=family(s),st=String(s.purchaseStateStatus||s.status||s._requestedStatus||"").toLowerCase(),b=st.includes("pause")?"paused":/cancel|inactive/.test(st)?"cancelled":"active";g[f][b].push(s)}
 const knownActive=g.signature.active.length+g.premier.active.length,totalActive=knownActive+g.other.active.length,classificationCoverage=totalActive?knownActive/totalActive:0;const classified=knownActive>0&&classificationCoverage>=0.80;
 function tier(t){const c=weighted(g[t].active),sf=shopifyFallback(shopify,t,"annualizedBoxesPerMember");return{active:classified?g[t].active.length:null,paused:classified?g[t].paused.length:null,cancelled:classified?g[t].cancelled.length:null,boxesPerMemberYear:c??sf??previous?.[t]?.boxesPerMemberYear??null,boxesSource:c?"smartrr_plan_cadence":sf?"shopify_ytd_annualized":"previous_or_unavailable"}}
 const out={generated_at:new Date().toISOString(),available:true,source:"smartrr_purchase_state",tierClassification:classified,classificationCoverage,signature:tier("signature"),premier:tier("premier"),other:{active:g.other.active.length,paused:g.other.paused.length,cancelled:g.other.cancelled.length},totals:{active:g.signature.active.length+g.premier.active.length+g.other.active.length,paused:g.signature.paused.length+g.premier.paused.length+g.other.paused.length,cancelled:g.signature.cancelled.length+g.premier.cancelled.length+g.other.cancelled.length},note:classified?"Smartrr tier classification reliable (>=80% of active subscriptions classified).":"Smartrr tier classification is missing or incomplete (<80% coverage); app must use Shopify observed tiers instead of understating members/revenue."};
 await fs.writeFile(OUT,JSON.stringify(out,null,2));console.log(JSON.stringify(out,null,2))}
main().catch(e=>{console.error(e);process.exit(1)});
