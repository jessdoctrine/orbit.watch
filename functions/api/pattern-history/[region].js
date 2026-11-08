// Public read-only history gateway: configure EXODUS_COLLECTOR_URL in Pages.
// The URL must be a trusted, operator-supplied https Worker address.
export async function onRequestGet({params,env}){
 const region=String(params.region||'');
 if(!['nyc','la','miami','london','sf'].includes(region))
  return Response.json({error:'Invalid region'},{status:400});
 const base=String(env.EXODUS_COLLECTOR_URL||'').trim();
 if(!/^https:\/\/[^\s]+$/.test(base))
  return Response.json({error:'Collector not configured'},{status:503});
 try{
  const url=new URL('/history',base);
  url.searchParams.set('region',region);
  const upstream=await fetch(url,{headers:{Accept:'application/json'},cf:{cacheTtl:90,cacheEverything:true}});
  if(!upstream.ok)return Response.json({error:'Collector history unavailable'},{status:502});
  const data=await upstream.json();
  if(!Array.isArray(data.samples))throw new Error('Invalid collector response');
  return Response.json({region,samples:data.samples,source:'cloudflare-d1'},
   {headers:{'Cache-Control':'public, max-age=90'}});
 }catch{return Response.json({error:'Collector unavailable'},{status:502});}
}
