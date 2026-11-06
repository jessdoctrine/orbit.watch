// Optional regional ADS-B layer. No synthetic aircraft or incident predictions.
const regions={
 nyc:{name:'New York',lat:40.71,lon:-74.01},
 la:{name:'Los Angeles',lat:34.05,lon:-118.24},
 miami:{name:'Miami',lat:25.77,lon:-80.19},
 london:{name:'London',lat:51.51,lon:-0.13},
 sf:{name:'San Francisco',lat:37.77,lon:-122.42}
};
export function createExodus({THREE,scene,camera,earth,controls}){
 const $=selector=>document.querySelector(selector);
 const points=new THREE.Points(new THREE.BufferGeometry(),new THREE.PointsMaterial({color:0x7de3cf,size:5,sizeAttenuation:false,depthTest:true}));
 points.visible=false;scene.add(points);
 let active=false,controller=null,refreshToken=0,lastRefresh=0,aircraft=[],selectedIndex=-1;
 const raycaster=new THREE.Raycaster();raycaster.params.Points.threshold=.035;
 const pointer=new THREE.Vector2();
 const selection=new THREE.Mesh(new THREE.SphereGeometry(.012,12,8),new THREE.MeshBasicMaterial({color:0xffffff,depthTest:true}));selection.visible=false;scene.add(selection);
 const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 function clear(){points.geometry.dispose();points.geometry=new THREE.BufferGeometry();aircraft=[];selectedIndex=-1;selection.visible=false;}
 // Match the Orbit Watch texture convention: longitude 0 is +X; east is -Z.
 function coord(lat,lon){const phi=lat*Math.PI/180,lambda=lon*Math.PI/180;return [1.045*Math.cos(phi)*Math.cos(lambda),1.045*Math.sin(phi),-1.045*Math.cos(phi)*Math.sin(lambda)];}
 function focus(region){const distance=camera.position.length();const center=new THREE.Vector3(...coord(region.lat,region.lon)).normalize();camera.position.copy(center.multiplyScalar(distance));controls.target.set(0,0,0);controls.update();}
 function aircraftName(a){return (a.flight||'').trim()||a.r||a.hex||'Unknown aircraft';}
 function val(v,unit=''){return v===undefined||v===null||v===''?'Unavailable':String(v)+unit;}
 function info(a){
  const items=[
   ['Callsign',aircraftName(a)],['ICAO hex',a.hex?String(a.hex).toUpperCase():'Unavailable'],
   ['Aircraft type',val(a.t)],['Registration',val(a.r)],
   ['Altitude',Number.isFinite(a.alt_baro)?val(a.alt_baro,' ft'):val(a.alt_baro)],
   ['Ground speed',Number.isFinite(a.gs)?Math.round(a.gs)+' knots':'Unavailable'],
   ['Heading',Number.isFinite(a.track)?Math.round(a.track)+'°':'Unavailable'],
   ['Latitude',a.lat.toFixed(4)+'°'],['Longitude',a.lon.toFixed(4)+'°']
  ];
  $('#exodus-detail').innerHTML='<h2>'+escape(aircraftName(a))+'</h2><span class="demo-tag real-tag">PUBLIC ADS-B OBSERVATION</span><p class="exodus-note">Selected aircraft in the current regional snapshot. Callsign and other fields may be missing or inaccurate; no passenger information is available.</p><dl>'+items.map(([key,value])=>'<div><dt>'+escape(key)+'</dt><dd>'+escape(value)+'</dd></div>').join('')+'</dl><button type="button" id="exodus-clear-selection" class="secondary">Back to region overview ↗</button>';
  $('#exodus-clear-selection').addEventListener('click',()=>{selectedIndex=-1;selection.visible=false;overview();});
 }
 function overview(){
  const region=regions[$('#exodus-region').value];
  $('#exodus-detail').innerHTML='<h2>'+escape(region.name)+'</h2><p class="exodus-stat">'+aircraft.length.toLocaleString()+'</p><p class="exodus-note">Aircraft with reported positions within 150 nautical miles. Mixed aircraft categories; not a private-jet count. Click an aircraft marker to inspect it.</p><dl><div><dt>Source</dt><dd>adsb.lol</dd></div><div><dt>Retrieved</dt><dd>'+new Date(lastRefresh).toLocaleTimeString()+'</dd></div><div><dt>Anomaly baseline</dt><dd>Not established</dd></div><div><dt>Vessels</dt><dd>Not connected</dd></div><div><dt>Power grid</dt><dd>Not connected</dd></div></dl>';
 }
 function pick(event,host){
  if(!active||!points.visible||!aircraft.length)return null;
  const rect=host.getBoundingClientRect();
  pointer.set(((event.clientX-rect.left)/rect.width)*2-1,-((event.clientY-rect.top)/rect.height)*2+1);
  raycaster.setFromCamera(pointer,camera);
  const surface=raycaster.intersectObject(earth,false)[0];
  const hit=raycaster.intersectObject(points,false).find(hit=>!surface||hit.distance<surface.distance+.04);
  return hit?{index:hit.index,aircraft:aircraft[hit.index]}:null;
 }
 function select(hit){if(!hit)return;selectedIndex=hit.index;const position=points.geometry.attributes.position;
  selection.position.fromBufferAttribute(position,selectedIndex);selection.visible=true;info(hit.aircraft);
 }
 async function update(){
  if(!active)return;
  controller?.abort();controller=new AbortController();const current=++refreshToken;
  const region=regions[$('#exodus-region').value];clear();focus(region);
  $('#exodus-detail').innerHTML='<h2>'+escape(region.name)+'</h2><p class="exodus-note">Checking public aircraft observations…</p>';
  try{
   const response=await fetch('/api/aircraft/'+region.lat+'/'+region.lon+'/150',{signal:controller.signal,headers:{Accept:'application/json'}});
   if(!response.ok)throw new Error('HTTP '+response.status);
   const data=await response.json();if(current!==refreshToken||!active)return;
   if(!Array.isArray(data.ac))throw new Error('Missing aircraft positions');
   const observed=data.ac.filter(a=>Number.isFinite(a.lat)&&Number.isFinite(a.lon));aircraft=observed;
   const positions=new Float32Array(observed.length*3);
   observed.forEach((a,i)=>positions.set(coord(a.lat,a.lon),i*3));
   points.geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));
   points.geometry.computeBoundingSphere();
   lastRefresh=Date.now();
   overview();
   $('#visible-count').textContent=observed.length.toLocaleString()+' AIRCRAFT OBSERVED';
  }catch(error){
   if(error.name==='AbortError'||current!==refreshToken)return;
   clear();$('#visible-count').textContent='AIRCRAFT FEED UNAVAILABLE';
   $('#exodus-detail').innerHTML='<h2>'+escape(region.name)+'</h2><p class="exodus-note">Live aircraft data could not be loaded. The public provider may reject browser requests, limit access, or be temporarily unavailable. No substitute flight counts are shown.</p><dl><div><dt>Vessels</dt><dd>Not connected</dd></div><div><dt>Power grid</dt><dd>Not connected</dd></div></dl>';
  }
 }
 $('#exodus-region').addEventListener('change',update);
 $('#exodus-refresh').addEventListener('click',update);
 $('#aircraft-toggle').addEventListener('change',e=>{points.visible=active&&e.target.checked;selection.visible=points.visible&&selectedIndex>=0;});
 return {pick,select,setActive(next){active=next;points.visible=active&&$('#aircraft-toggle').checked;selection.visible=active&&selectedIndex>=0;if(!active){controller?.abort();return;}update();}};
}
