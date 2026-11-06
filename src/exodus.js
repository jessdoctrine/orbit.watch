// Optional regional ADS-B layer. No synthetic aircraft or incident predictions.
const regions={
 nyc:{name:'New York',lat:40.71,lon:-74.01},
 la:{name:'Los Angeles',lat:34.05,lon:-118.24},
 miami:{name:'Miami',lat:25.77,lon:-80.19},
 london:{name:'London',lat:51.51,lon:-0.13},
 sf:{name:'San Francisco',lat:37.77,lon:-122.42}
};
export function createExodus({THREE,scene}){
 const $=selector=>document.querySelector(selector);
 const points=new THREE.Points(new THREE.BufferGeometry(),new THREE.PointsMaterial({color:0x7de3cf,size:3.5,sizeAttenuation:false,depthTest:false}));
 points.visible=false;scene.add(points);
 let active=false,controller=null,refreshToken=0,lastRefresh=0;
 const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 function clear(){points.geometry.dispose();points.geometry=new THREE.BufferGeometry();}
 function coord(lat,lon){const phi=(90-lat)*Math.PI/180,theta=(lon+180)*Math.PI/180;return [1.045*Math.sin(phi)*Math.cos(theta),1.045*Math.cos(phi),-1.045*Math.sin(phi)*Math.sin(theta)];}
 async function update(){
  if(!active)return;
  controller?.abort();controller=new AbortController();const current=++refreshToken;
  const region=regions[$('#exodus-region').value];clear();
  $('#exodus-detail').innerHTML='<h2>'+escape(region.name)+'</h2><p class="exodus-note">Checking public aircraft observations…</p>';
  try{
   const response=await fetch('/api/aircraft/'+region.lat+'/'+region.lon+'/150',{signal:controller.signal,headers:{Accept:'application/json'}});
   if(!response.ok)throw new Error('HTTP '+response.status);
   const data=await response.json();if(current!==refreshToken||!active)return;
   if(!Array.isArray(data.ac))throw new Error('Missing aircraft positions');
   const observed=data.ac.filter(a=>Number.isFinite(a.lat)&&Number.isFinite(a.lon));
   const positions=new Float32Array(observed.length*3);
   observed.forEach((a,i)=>positions.set(coord(a.lat,a.lon),i*3));
   points.geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));
   points.geometry.computeBoundingSphere();
   lastRefresh=Date.now();
   $('#exodus-detail').innerHTML='<h2>'+escape(region.name)+'</h2><p class="exodus-stat">'+observed.length.toLocaleString()+'</p><p class="exodus-note">Aircraft with reported positions within 150 nautical miles. Mixed aircraft categories; not a private-jet count.</p><dl><div><dt>Source</dt><dd>adsb.lol</dd></div><div><dt>Retrieved</dt><dd>'+new Date(lastRefresh).toLocaleTimeString()+'</dd></div><div><dt>Anomaly baseline</dt><dd>Not established</dd></div><div><dt>Vessels</dt><dd>Not connected</dd></div><div><dt>Power grid</dt><dd>Not connected</dd></div></dl>';
   $('#visible-count').textContent=observed.length.toLocaleString()+' AIRCRAFT OBSERVED';
  }catch(error){
   if(error.name==='AbortError'||current!==refreshToken)return;
   clear();$('#visible-count').textContent='AIRCRAFT FEED UNAVAILABLE';
   $('#exodus-detail').innerHTML='<h2>'+escape(region.name)+'</h2><p class="exodus-note">Live aircraft data could not be loaded. The public provider may reject browser requests, limit access, or be temporarily unavailable. No substitute flight counts are shown.</p><dl><div><dt>Vessels</dt><dd>Not connected</dd></div><div><dt>Power grid</dt><dd>Not connected</dd></div></dl>';
  }
 }
 $('#exodus-region').addEventListener('change',update);
 $('#exodus-refresh').addEventListener('click',update);
 $('#aircraft-toggle').addEventListener('change',e=>{points.visible=active&&e.target.checked;});
 return {setActive(next){active=next;points.visible=active&&$('#aircraft-toggle').checked;if(!active){controller?.abort();return;}update();}};
}
