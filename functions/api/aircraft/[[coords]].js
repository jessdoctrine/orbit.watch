// Cloudflare Pages same-origin aircraft gateway.
// Only geographic queries are supported, without arbitrary upstream URLs.
export async function onRequestGet({params}){
 const segments=params.coords;
 if(!Array.isArray(segments)||segments.length!==3)return new Response('Invalid coordinates',{status:400});
 const [lat,lon,radius]=segments.map(Number);
 if(!Number.isFinite(lat)||Math.abs(lat)>90||!Number.isFinite(lon)||Math.abs(lon)>180||!Number.isInteger(radius)||radius<1||radius>150){
  return new Response('Invalid aircraft search area',{status:400});
 }
 const endpoint=`https://api.adsb.lol/v2/point/${lat}/${lon}/${radius}`;
 try{
  const response=await fetch(endpoint,{headers:{Accept:'application/json'},cf:{cacheTtl:20,cacheEverything:true}});
  if(!response.ok)return new Response(JSON.stringify({error:'Aircraft source unavailable'}),{status:502,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});
  const body=await response.text();
  return new Response(body,{headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'public, max-age=20','Access-Control-Allow-Origin':'*','X-Data-Source':'adsb.lol'}});
 }catch{
  return new Response(JSON.stringify({error:'Aircraft source unreachable'}),{status:502,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});
 }
}
