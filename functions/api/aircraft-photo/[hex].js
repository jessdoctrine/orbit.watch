// Aircraft photo metadata gateway; photos themselves remain hosted by Planespotters.net.
// A single lookup occurs only when an aircraft is selected.
export async function onRequestGet({params}){
 const hex=String(params.hex||'').toLowerCase();
 if(!/^[a-f0-9]{6}$/.test(hex))return new Response('Invalid aircraft identifier',{status:400});
 try{
  const upstream=await fetch('https://api.planespotters.net/pub/photos/hex/'+hex,{
   headers:{Accept:'application/json','User-Agent':'EdgeCaseLabs-ExodusWatch/0.2 (Jess@edgecaselabs.info)'},cf:{cacheEverything:true,cacheTtl:3600}
  });
  if(!upstream.ok)return new Response(JSON.stringify({photos:[]}),{status:upstream.status===404?404:502,headers:{'Content-Type':'application/json'}});
  const body=await upstream.json();
  const photos=Array.isArray(body.photos)?body.photos.slice(0,1):[];
  return new Response(JSON.stringify({photos}),{headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'public, max-age=3600'}});
 }catch{
  return new Response(JSON.stringify({photos:[]}),{status:502,headers:{'Content-Type':'application/json'}});
 }
}
