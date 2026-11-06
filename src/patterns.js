// Local, observational baselines for Exodus Watch.
// Counts are aircraft observed in a 150 NM radius, NOT departures or threats.
import {classifyAircraft} from './aircraft-types.js';

export const SAMPLE_INTERVAL_MS=15*60*1000;
const RETENTION_MS=45*24*60*60*1000;
const MAX_SAMPLES=15000;
export const STORAGE_KEY='edgecase-exodus-patterns-v1';
export const REGION_TIMEZONES={
 nyc:'America/New_York',la:'America/Los_Angeles',miami:'America/New_York',
 london:'Europe/London',sf:'America/Los_Angeles'
};
const counts=(list,kind)=>list.filter(a=>classifyAircraft(a.t)===kind).length;

export function summarizeAircraft(aircraft,region,at=Date.now()){
 const unique=new Map();
 for(const a of aircraft){
  if(!Number.isFinite(a?.lat)||!Number.isFinite(a?.lon))continue;
  const key=String(a.hex||'').trim().toLowerCase();
  if(!/^[a-f0-9]{6}$/.test(key))continue;
  unique.set(key,a);
 }
 const list=[...unique.values()];
 return {region,at,total:list.length,business:counts(list,'business'),
  agricultural:counts(list,'agricultural')};
}
export function localWindow(at,region){
 const timeZone=REGION_TIMEZONES[region];
 if(!timeZone)throw new Error('Unknown region');
 const parts=Object.fromEntries(new Intl.DateTimeFormat('en-US',{
  timeZone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',
  weekday:'short',hourCycle:'h23'
 }).formatToParts(new Date(at)).map(p=>[p.type,p.value]));
 return {day:parts.year+'-'+parts.month+'-'+parts.day,
  hour:Number(parts.hour),weekend:parts.weekday==='Sat'||parts.weekday==='Sun'};
}
export function pruneSamples(samples,now=Date.now()){
 if(!Array.isArray(samples))return [];
 return samples.filter(s=>s&&REGION_TIMEZONES[s.region]&&Number.isFinite(s.at)&&
  s.at<=now&&s.at>now-RETENTION_MS&&
  ['total','business','agricultural'].every(k=>Number.isInteger(s[k])&&s[k]>=0&&s[k]<=100000))
  .sort((a,b)=>a.at-b.at).slice(-MAX_SAMPLES);
}
export function appendSample(samples,sample){
 const clean=pruneSamples(samples,sample.at);
 const recent=clean.some(s=>s.region===sample.region&&Math.abs(s.at-sample.at)<SAMPLE_INTERVAL_MS);
 return {samples:recent?clean:pruneSamples([...clean,sample],sample.at),added:!recent};
}
const mean=values=>values.reduce((a,b)=>a+b,0)/values.length;
const median=values=>{
 const sorted=[...values].sort((a,b)=>a-b);const n=sorted.length;
 return n%2?sorted[(n-1)/2]:(sorted[n/2-1]+sorted[n/2])/2;
};
export function evaluatePattern(samples,current){
 const window=localWindow(current.at,current.region);
 const days=new Map();
 for(const sample of pruneSamples(samples,current.at)){
  if(sample.region!==current.region||sample.at>=current.at-SAMPLE_INTERVAL_MS)continue;
  const prior=localWindow(sample.at,sample.region);
  if(prior.day===window.day||prior.hour!==window.hour||prior.weekend!==window.weekend)continue;
  if(!days.has(prior.day))days.set(prior.day,[]);
  days.get(prior.day).push(sample.business);
 }
 const dailyMeans=[...days.values()].map(mean);
 const daysReady=dailyMeans.length>=3;
 if(!daysReady)return {status:'building',days:dailyMeans.length,needed:3,baseline:null,
  message:'Building a baseline from earlier '+(window.weekend?'weekend':'weekday')+' observations at this local hour.'};
 const baseline=median(dailyMeans);
 const difference=current.business-baseline;
 const ratio=baseline>0?current.business/baseline:null;
 // Require meaningful absolute and relative changes to suppress small-count noise.
 const elevated=difference>=5&&baseline>=3&&ratio>=1.75;
 return {status:elevated?'elevated':'typical',days:dailyMeans.length,needed:3,
  baseline:Math.round(baseline*10)/10,ratio,
  message:elevated?'Observed business-jet model count is elevated relative to this browser\'s baseline. Verify coverage and context.':'Observed business-jet model count is within the exploratory threshold.'};
}
export function loadSamples(storage){
 try{return pruneSamples(JSON.parse(storage.getItem(STORAGE_KEY)||'[]'));}
 catch{return [];}
}
export function saveSamples(storage,samples){
 try{storage.setItem(STORAGE_KEY,JSON.stringify(pruneSamples(samples)));return true;}
 catch{return false;}
}
