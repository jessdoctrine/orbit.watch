// Exodus Watch: scheduled, aggregated public aircraft observations.
// This stores only counts; never stores aircraft hex codes, registrations, or trajectories.
import {summarizeAircraft,REGION_TIMEZONES,SAMPLE_INTERVAL_MS} from '../src/patterns.js';
const CENTERS={
 nyc:{lat:40.71,lon:-74.01},la:{lat:34.05,lon:-118.24},
 miami:{lat:25.77,lon:-80.19},london:{lat:51.51,lon:-0.13},
 sf:{lat:37.77,lon:-122.42}
};
const HORIZON=45*24*60*60*1000;
const json=(data,status=200)=>new Response(JSON.stringify(data),{
 status,headers:{'Content-Type':'application/json; charset=utf-8',
 'Cache-Control':status===200?'public, max-age=120':'no-store',
 'X-Content-Type-Options':'nosniff'}
});
function validate(region){return Object.prototype.hasOwnProperty.call(CENTERS,region);}
export async function recordObservations(db,fetchImpl=fetch,when=Date.now()){
 if(!db)throw new Error('D1 binding missing; create database and configure worker');
 const tick=Math.floor(when/SAMPLE_INTERVAL_MS)*SAMPLE_INTERVAL_MS;
 const outcomes=[];
 // Sequential requests avoid bursts and preserve provider-friendly sampling.
 for(const [region,{lat,lon}] of Object.entries(CENTERS)){
  try{
   const r=await fetchImpl('https://api.adsb.lol/v2/point/'+lat+'/'+lon+'/150',{
    headers:{Accept:'application/json'}
   });
   if(!r.ok)throw new Error('HTTP '+r.status);
   const data=await r.json();
   if(!Array.isArray(data.ac))throw new Error('Unexpected aircraft payload');
   const sample=summarizeAircraft(data.ac,region,tick);
   await db.prepare(
    'INSERT OR IGNORE INTO observations(region,sample_time,total,business,agricultural) VALUES(?,?,?,?,?)'
   ).bind(region,tick,sample.total,sample.business,sample.agricultural).run();
   outcomes.push({region,ok:true});
  }catch(error){
   console.warn('Exodus region collection failed',region,String(error));
   outcomes.push({region,ok:false});
  }
 }
 await db.prepare('DELETE FROM observations WHERE sample_time < ?').bind(tick-HORIZON).run();
 return outcomes;
}
export default {
 async scheduled(event,env,ctx){
  const results=await recordObservations(env.DB,fetch,event.scheduledTime);
  if(results.every(x=>!x.ok))throw new Error('No regions collected; inspect Worker logs');
 },
 async fetch(request,env){
  const url=new URL(request.url);
  if(request.method!=='GET')return json({error:'Method not allowed'},405);
  if(url.pathname==='/health')return json({status:env.DB?'configured':'database-not-configured'});
  if(url.pathname!=='/history')return json({error:'Not found'},404);
  const region=url.searchParams.get('region')||'';
  if(!validate(region))return json({error:'Invalid region'},400);
  if(!env.DB)return json({error:'Database not configured'},503);
  try{
   const min=Date.now()-HORIZON;
   const result=await env.DB.prepare(
    'SELECT region,sample_time,total,business,agricultural FROM observations WHERE region=? AND sample_time>=? ORDER BY sample_time ASC LIMIT 5000'
   ).bind(region,min).all();
   return json({region,source:'cloudflare-d1',sampleIntervalMinutes:15,
    samples:(result.results||[]).map(r=>({region:r.region,at:r.sample_time,total:r.total,
     business:r.business,agricultural:r.agricultural})),generatedAt:Date.now()});
  }catch(error){
   console.error('History query failed',String(error));
   return json({error:'History unavailable'},503);
  }
 }
};
