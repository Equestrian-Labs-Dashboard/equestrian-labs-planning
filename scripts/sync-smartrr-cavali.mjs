#!/usr/bin/env node
import fs from 'node:fs/promises';

const KEY = process.env.SMARTRR_API_KEY_CAVALI || process.env.SMARTRR_TOKEN_CAVALI || '';
const OUT = 'data/cavali_smartrr_actuals.json';
const SHOPIFY = 'data/shopify_actuals.json';
const BASE = 'https://api.smartrr.com/vendor/purchase-state';

async function readJson(path, fallback={}){try{return JSON.parse(await fs.readFile(path,'utf8'))}catch{return fallback}}
function deepStrings(obj,out=[],depth=0){if(obj==null||depth>7)return out;if(typeof obj==='string'||typeof obj==='number')out.push(String(obj));else if(Array.isArray(obj))obj.slice(0,200).forEach(v=>deepStrings(v,out,depth+1));else if(typeof obj==='object')Object.values(obj).forEach(v=>deepStrings(v,out,depth+1));return out}
function lowerText(obj){return deepStrings(obj).join(' ').toLowerCase()}
function family(obj){const t=lowerText(obj);if(/\bpremier\b|\bpremium\b/.test(t))return 'premier';if(/\bsignature\b/.test(t))return 'signature';return 'other'}
function cadence(obj){const t=lowerText(obj);if(/weekly/.test(t))return 52;if(/bi[- ]?weekly|every 2 weeks/.test(t))return 26;if(/monthly/.test(t))return 12;if(/bi[- ]?monthly|every 2 months/.test(t))return 6;if(/quarterly|every 3 months/.test(t))return 4;if(/every 4 months/.test(t))return 3;if(/semi[- ]?annual|twice a year|every 6 months/.test(t))return 2;if(/annual|yearly|once a year/.test(t))return 1;return null}
function idOf(s){return String(s?.id||s?.purchaseStateId||s?.shopifyId||s?.subscriptionId||s?.subscription_id||s?.externalSubscriptionId||JSON.stringify(s).slice(0,180))}
function itemsOf(payload){if(Array.isArray(payload))return payload;if(!payload||typeof payload!=='object')return [];for(const k of ['data','items','results','purchaseStates','purchaseState','subscriptions']){const v=payload[k];if(Array.isArray(v))return v;if(v&&typeof v==='object'){const x=itemsOf(v);if(x.length)return x}}return []}
async function get(url,params){const qs=new URLSearchParams(params);const headersA={accept:'application/json','x-smartrr-access-token':KEY,'x-smartrr-api-key':KEY,token:KEY};let r=await fetch(`${url}?${qs}`,{headers:headersA});if(r.status===401||r.status===403){r=await fetch(`${url}?${qs}`,{headers:{accept:'application/json',authorization:`Bearer ${KEY}`}})}return r}
async function fetchStatus(status){const out=[];for(let page=0;page<200;page++){const r=await get(BASE,{pageSize:'250',pageNumber:String(page),'filterEquals[purchaseStateStatus]':status,include:'items,lineItems,orderLineItems,stLineItems,product,variant,purchasableVariant,orders'});if(!r.ok){console.warn(`Smartrr ${status}: HTTP ${r.status} ${(await r.text()).slice(0,250)}`);break}const payload=await r.json();const items=itemsOf(payload);if(!items.length)break;out.push(...items.map(x=>({...x,_requestedStatus:status})));if(items.length<250)break}return out}
function weightedCadence(states){const vals=states.map(cadence).filter(v=>Number.isFinite(v));if(!vals.length)return null;return vals.reduce((a,b)=>a+b,0)/vals.length}
function shopifyFallback(shopify,tier,key){const year=String(new Date().getUTCFullYear());return shopify?.brands?.cavali?.membership_observed?.[year]?.[tier]?.[key] ?? shopify?.brands?.cavali?.derived?.cavali?.membershipObserved?.[tier]?.[key] ?? null}
async function main(){
 const previous=await readJson(OUT,{}); const shopify=await readJson(SHOPIFY,{brands:{}});
 if(!KEY){
   const fallback={generated_at:new Date().toISOString(),available:false,source:'shopify_fallback_no_smartrr_key',signature:{active:shopifyFallback(shopify,'signature','observedMembers')??previous?.signature?.active??null,paused:previous?.signature?.paused??null,boxesPerMemberYear:shopifyFallback(shopify,'signature','annualizedBoxesPerMember')??previous?.signature?.boxesPerMemberYear??null},premier:{active:shopifyFallback(shopify,'premier','observedMembers')??previous?.premier?.active??null,paused:previous?.premier?.paused??null,boxesPerMemberYear:shopifyFallback(shopify,'premier','annualizedBoxesPerMember')??previous?.premier?.boxesPerMemberYear??null},note:'Add SMARTRR_API_KEY_CAVALI in this repository to use current active subscriber totals.'};
   await fs.writeFile(OUT,JSON.stringify(fallback,null,2)); console.warn('SMARTRR_API_KEY_CAVALI missing; preserved/used Shopify fallback.'); return;
 }
 const all=[...(await fetchStatus('ACTIVE')),...(await fetchStatus('PAUSED')),...(await fetchStatus('CANCELLED'))];
 const seen=new Map();for(const s of all){seen.set(idOf(s),s)}const states=[...seen.values()];
 const grouped={signature:{active:[],paused:[],cancelled:[]},premier:{active:[],paused:[],cancelled:[]},other:{active:[],paused:[],cancelled:[]}};
 for(const s of states){const fam=family(s);const status=String(s.purchaseStateStatus||s.status||s._requestedStatus||'').toLowerCase();const bucket=status.includes('pause')?'paused':status.includes('cancel')||status.includes('inactive')?'cancelled':'active';grouped[fam][bucket].push(s)}
 function result(tier){const g=grouped[tier];const c=weightedCadence(g.active);const sf=shopifyFallback(shopify,tier,'annualizedBoxesPerMember');return {active:g.active.length,paused:g.paused.length,cancelled:g.cancelled.length,boxesPerMemberYear:c??sf??previous?.[tier]?.boxesPerMemberYear??null,boxesSource:c?'smartrr_plan_cadence':sf?'shopify_ytd_annualized':'previous_or_unavailable'}}
 const output={generated_at:new Date().toISOString(),available:true,source:'smartrr_purchase_state',signature:result('signature'),premier:result('premier'),other:{active:grouped.other.active.length,paused:grouped.other.paused.length,cancelled:grouped.other.cancelled.length},totals:{active:states.filter(s=>String(s.purchaseStateStatus||s.status||s._requestedStatus||'').toLowerCase().includes('active')).length,paused:states.filter(s=>String(s.purchaseStateStatus||s.status||s._requestedStatus||'').toLowerCase().includes('pause')).length,cancelled:states.filter(s=>/cancel|inactive/.test(String(s.purchaseStateStatus||s.status||s._requestedStatus||'').toLowerCase())).length},note:'Active members come from Smartrr purchase-state status. Boxes/member/year uses Smartrr cadence when present; otherwise Shopify YTD annualized subscription box units.'};
 await fs.mkdir('data',{recursive:true});await fs.writeFile(OUT,JSON.stringify(output,null,2));
 console.log('Cavali Smartrr actuals:',JSON.stringify(output,null,2));
}
main().catch(e=>{console.error(e);process.exit(1)});
