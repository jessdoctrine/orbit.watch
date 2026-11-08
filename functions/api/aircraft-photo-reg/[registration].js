// Registration-based photo fallback; serves metadata only, not image binaries.
export async function onRequestGet({params}){
 const registration=String(params.registration||'').trim().toUpperCase();
 if(!/^[A-Z0-9-]{2,12}$/.test(registration))return new Response('Invalid registration',{status:400});
 try{
  const upstream=await fetch('https://api.planespotters.net/pub/photos/reg/'+encodeURIComponent(registration),{
   headers:{Accept:'application/json','User-Agent':'EdgeCaseLabs-ExodusWatch/0.2 (Jess@edgecaselabs.info)'},
   cf:{cacheEverything:true,cacheTtl:3600}
  });
  if(!upstream.ok)return new Response(JSON.stringify({photos:[]}),{status:upstream.status===404?404:502,headers:{'Content-Type':'application/json'}});
  const data=await upstream.json();
  const photos=Array.isArray(data.photos)?data.photos.slice(0,1):[];
  return new Response(JSON.stringify({photos}),{headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'public, max-age=3600'}});
 }catch{return new Response(JSON.stringify({photos:[]}),{status:502,headers:{'Content-Type':'application/json'}});}
}
