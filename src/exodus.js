// Optional regional ADS-B layer. No synthetic aircraft or incident predictions.
import {classifyAircraft,categoryLabel} from './aircraft-types.js';
import {summarizeAircraft,appendSample,evaluatePattern,loadSamples,saveSamples,SAMPLE_INTERVAL_MS} from './patterns.js';
const regions={
 nyc:{name:'New York',lat:40.71,lon:-74.01},
 la:{name:'Los Angeles',lat:34.05,lon:-118.24},
 miami:{name:'Miami',lat:25.77,lon:-80.19},
 london:{name:'London',lat:51.51,lon:-0.13},
 sf:{name:'San Francisco',lat:37.77,lon:-122.42}
};
export function createExodus({THREE,scene,camera,earth,controls}){
 const $=selector=>document.querySelector(selector);
 const points=new THREE.Points(new THREE.BufferGeometry(),new THREE.PointsMaterial({vertexColors:true,size:5,sizeAttenuation:false,depthTest:true}));
 points.visible=false;scene.add(points);
 let active=false,controller=null,refreshToken=0,lastRefresh=0,aircraft=[],selectedIndex=-1,visibleAircraft=[],photoToken=0,refreshInterval=null;
 let historical=loadSamples(localStorage);
 const raycaster=new THREE.Raycaster();
 const projected=new THREE.Vector3(),world=new THREE.Vector3(),direction=new THREE.Vector3();
 const selectedColor=new THREE.Color('#ffffff');
 const palette={business:new THREE.Color('#f4c978'),agricultural:new THREE.Color('#96d4f4'),other:new THREE.Color('#7de3cf')};
 function colorSelected(index,isSelected){
  const attribute=points.geometry.getAttribute('color');
  if(!attribute||index<0||index>=visibleAircraft.length)return;
  const color=isSelected?selectedColor:palette[classifyAircraft(visibleAircraft[index].t)];
  attribute.setXYZ(index,color.r,color.g,color.b);
  attribute.needsUpdate=true;
 }
 function clearSelection(){
  photoToken++;
  colorSelected(selectedIndex,false);selectedIndex=-1;
 }
 const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 function clear(){photoToken++;points.geometry.dispose();points.geometry=new THREE.BufferGeometry();aircraft=[];visibleAircraft=[];selectedIndex=-1;}
 // Match the Orbit Watch texture convention: longitude 0 is +X; east is -Z.
 function coord(lat,lon){const phi=lat*Math.PI/180,lambda=lon*Math.PI/180;return [1.045*Math.cos(phi)*Math.cos(lambda),1.045*Math.sin(phi),-1.045*Math.cos(phi)*Math.sin(lambda)];}
 function focus(region){const distance=camera.position.length();const center=new THREE.Vector3(...coord(region.lat,region.lon)).normalize();camera.position.copy(center.multiplyScalar(distance));controls.target.set(0,0,0);controls.update();}
 function aircraftName(a){return (a.flight||'').trim()||a.r||a.hex||'Unknown aircraft';}
 function val(v,unit=''){return v===undefined||v===null||v===''?'Unavailable':String(v)+unit;}
 function info(a){
  const items=[
   ['Callsign',aircraftName(a)],['ICAO hex',a.hex?String(a.hex).toUpperCase():'Unavailable'],
   ['Aircraft type',val(a.t)],['Model category',categoryLabel(a.t)],['Registration',val(a.r)],
   ['Altitude',Number.isFinite(a.alt_baro)?val(a.alt_baro,' ft'):val(a.alt_baro)],
   ['Ground speed',Number.isFinite(a.gs)?Math.round(a.gs)+' knots':'Unavailable'],
   ['Heading',Number.isFinite(a.track)?Math.round(a.track)+'°':'Unavailable'],
   ['Latitude',a.lat.toFixed(4)+'°'],['Longitude',a.lon.toFixed(4)+'°']
  ];
  $('#exodus-detail').innerHTML='<h2>'+escape(aircraftName(a))+'</h2><div id="exodus-photo" class="exodus-photo"><span class="exodus-photo-placeholder">Checking for an aircraft photo…</span></div><span class="demo-tag real-tag">PUBLIC ADS-B OBSERVATION</span><p class="exodus-note">Selected aircraft in the current regional snapshot. Callsign and other fields may be missing or inaccurate; no passenger information is available.</p><dl>'+items.map(([key,value])=>'<div><dt>'+escape(key)+'</dt><dd>'+escape(value)+'</dd></div>').join('')+'</dl><button type="button" id="exodus-clear-selection" class="secondary">Back to region overview ↗</button>';
  $('#exodus-clear-selection').addEventListener('click',()=>{clearSelection();overview();});
  loadPhoto(a);
 }
 // Photos are requested only on selection, not for every aircraft in a region.
 // PlaneSpotters photos are airframe references, not evidence of present appearance.
 async function loadPhoto(a){
  const target=$('#exodus-photo');
  if(!target)return;
  const key=String(a.hex||'').trim().toLowerCase();
  const registration=String(a.r||'').trim().toUpperCase();
  const token=++photoToken;
  const request=async path=>{
   const response=await fetch(path);
   if(!response.ok)throw new Error('Photo provider returned '+response.status);
   const data=await response.json();
   return Array.isArray(data.photos)?data.photos[0]:null;
  };
  try{
   let photo=null;
   let unavailable=false;
   if(/^[a-f0-9]{6}$/.test(key)){
    try{photo=await request('/api/aircraft-photo/'+key);}catch{unavailable=true;}
   }
   // Registration is a secondary lookup only; a hex match is preferred.
   if(!photo&&/^[A-Z0-9-]{2,12}$/.test(registration)){
    try{photo=await request('/api/aircraft-photo-reg/'+encodeURIComponent(registration));}
    catch{unavailable=true;}
   }
   if(token!==photoToken||!target.isConnected)return;
   const src=photo?.thumbnail?.src;
   const link=photo?.link;
   if(!src||!link){
    target.textContent=unavailable?'Aircraft photo service unavailable':'No matching aircraft photograph found';
    return;
   }
   const imageUrl=new URL(src,location.href);
   const sourceUrl=new URL(link,location.href);
   const allowedImageHost=['planespotters.net','plnspttrs.net'].some(host=>imageUrl.hostname===host||imageUrl.hostname.endsWith('.'+host));
   const allowedLinkHost=sourceUrl.hostname==='planespotters.net'||sourceUrl.hostname.endsWith('.planespotters.net');
   if(imageUrl.protocol!=='https:'||!allowedImageHost||sourceUrl.protocol!=='https:'||!allowedLinkHost){
    target.textContent='Aircraft photo host unavailable';
    return;
   }
   target.textContent='';
   const anchor=document.createElement('a');
   anchor.href=sourceUrl.href;anchor.target='_blank';anchor.rel='noopener noreferrer';
   anchor.title='View source photograph on Planespotters.net';
   const img=document.createElement('img');
   img.src=imageUrl.href;img.alt='Archive photograph of the selected aircraft';img.loading='lazy';
   img.addEventListener('error',()=>{if(token===photoToken&&target.isConnected)target.textContent='Photo could not be displayed';});
   anchor.appendChild(img);
   target.appendChild(anchor);
   const credit=document.createElement('small');
   credit.className='exodus-photo-credit';
   credit.textContent='© '+(photo.photographer||'Photographer')+' · Planespotters.net · archival photo';
   target.appendChild(credit);
  }catch{
   if(token===photoToken&&target.isConnected)target.textContent='Aircraft photo service unavailable';
  }
 }
 function renderPattern(regionId){
  const current=summarizeAircraft(aircraft,regionId,lastRefresh||Date.now());
  const result=evaluatePattern(historical,current);
  $('#pattern-current').textContent=current.business.toLocaleString()+' observed';
  const label=result.status==='building'?'BUILDING':result.status==='elevated'?'ELEVATED':'TYPICAL';
  const status=$('#pattern-status');status.textContent=label;status.dataset.status=result.status;
  $('#pattern-baseline').textContent=result.status==='building'?result.days+' / '+result.needed+' comparable past days':
   'Typical at this local hour: '+result.baseline.toLocaleString()+' observed';
  $('#pattern-explanation').textContent=result.message+' Samples are recorded on this device while Exodus is open; counts are not departures.';
 }
 function overview(){
  const region=regions[$('#exodus-region').value];
  $('#exodus-detail').innerHTML='<h2>'+escape(region.name)+'</h2><p class="exodus-stat">'+aircraft.length.toLocaleString()+'</p><p class="exodus-note">Aircraft with reported positions within 150 nautical miles. Model filters are approximate; passenger identity and spraying activity cannot be determined. Click an aircraft marker to inspect it.</p><dl><div><dt>Source</dt><dd>adsb.lol</dd></div><div><dt>Retrieved</dt><dd>'+new Date(lastRefresh).toLocaleTimeString()+'</dd></div><div><dt>Pattern baseline</dt><dd>See sidebar</dd></div><div><dt>Vessels</dt><dd>Not connected</dd></div><div><dt>Power grid</dt><dd>Not connected</dd></div></dl>';
 }
 // Pick the closest visible on-screen dot in CSS pixels rather than using
 // a fixed-size 3D raycasting threshold, which becomes inaccurate when zooming.
 function pick(event,host){
  if(!active||!points.visible||!visibleAircraft.length)return null;
  const rect=host.getBoundingClientRect();
  const mx=event.clientX-rect.left,my=event.clientY-rect.top;
  const limit=event.pointerType==='touch'?14:9;
  let nearest=-1,best=limit*limit;
  const positions=points.geometry.getAttribute('position');
  if(!positions)return null;
  camera.updateMatrixWorld();
  earth.updateMatrixWorld();
  for(let i=0;i<visibleAircraft.length;i++){
   world.fromBufferAttribute(positions,i);
   projected.copy(world).project(camera);
   if(projected.z<-1||projected.z>1)continue;
   const px=(projected.x+1)*rect.width/2;
   const py=(1-projected.y)*rect.height/2;
   const distanceSq=(px-mx)**2+(py-my)**2;
   if(distanceSq>best)continue;
   // Reject dots obscured by the globe on the far side of Earth.
   direction.copy(world).sub(camera.position);
   const toAircraft=direction.length();
   raycaster.set(camera.position,direction.normalize());
   raycaster.near=0;raycaster.far=toAircraft-.006;
   if(raycaster.intersectObject(earth,false).length)continue;
   best=distanceSq;nearest=i;
  }
  return nearest>=0?{index:nearest,aircraft:visibleAircraft[nearest]}:null;
 }
 function select(hit){
  if(!hit)return;
  clearSelection();
  selectedIndex=hit.index;
  colorSelected(selectedIndex,true);
  info(hit.aircraft);
 }
 function applyFilter(){
  const wanted=$('#aircraft-class').value;
  visibleAircraft=aircraft.filter(a=>wanted==='all'||classifyAircraft(a.t)===wanted);
  selectedIndex=-1;photoToken++;
  points.geometry.dispose();points.geometry=new THREE.BufferGeometry();
  const positions=new Float32Array(visibleAircraft.length*3);
  const colors=new Float32Array(visibleAircraft.length*3);
  visibleAircraft.forEach((a,i)=>{
    positions.set(coord(a.lat,a.lon),i*3);
    const color=palette[classifyAircraft(a.t)];
    colors.set([color.r,color.g,color.b],i*3);
  });
  points.geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));
  points.geometry.setAttribute('color',new THREE.BufferAttribute(colors,3));
  points.geometry.computeBoundingSphere();
  $('#visible-count').textContent=visibleAircraft.length.toLocaleString()+' / '+aircraft.length.toLocaleString()+' AIRCRAFT';
  overview();
 }
 async function update(){
  if(!active)return;
  controller?.abort();controller=new AbortController();const current=++refreshToken;
  const region=regions[$('#exodus-region').value];clear();focus(region);
  $('#pattern-status').textContent='LOADING';$('#pattern-status').dataset.status='building';
  $('#pattern-current').textContent='—';$('#pattern-baseline').textContent='Checking live observations…';
  $('#exodus-detail').innerHTML='<h2>'+escape(region.name)+'</h2><p class="exodus-note">Checking public aircraft observations…</p>';
  try{
   const response=await fetch('/api/aircraft/'+region.lat+'/'+region.lon+'/150',{signal:controller.signal,headers:{Accept:'application/json'}});
   if(!response.ok)throw new Error('HTTP '+response.status);
   const data=await response.json();if(current!==refreshToken||!active)return;
   if(!Array.isArray(data.ac))throw new Error('Missing aircraft positions');
   const observed=data.ac.filter(a=>Number.isFinite(a.lat)&&Number.isFinite(a.lon));aircraft=observed;
   lastRefresh=Date.now();
   const snapshot=summarizeAircraft(aircraft,$('#exodus-region').value,lastRefresh);
   const next=appendSample(historical,snapshot);historical=next.samples;
   const persisted=!next.added||saveSamples(localStorage,historical);
   applyFilter();
   renderPattern($('#exodus-region').value);
   if(!persisted)$('#pattern-explanation').textContent='Browser storage unavailable; the baseline will not persist after this session.';
  }catch(error){
   if(error.name==='AbortError'||current!==refreshToken)return;
   clear();$('#visible-count').textContent='AIRCRAFT FEED UNAVAILABLE';
   $('#pattern-status').textContent='UNAVAILABLE';$('#pattern-current').textContent='—';$('#pattern-baseline').textContent='No current observation';
   $('#exodus-detail').innerHTML='<h2>'+escape(region.name)+'</h2><p class="exodus-note">Live aircraft data could not be loaded. The public provider may reject browser requests, limit access, or be temporarily unavailable. No substitute flight counts are shown.</p><dl><div><dt>Vessels</dt><dd>Not connected</dd></div><div><dt>Power grid</dt><dd>Not connected</dd></div></dl>';
  }
 }
 $('#exodus-region').addEventListener('change',update);
 $('#aircraft-class').addEventListener('change',applyFilter);
 $('#exodus-refresh').addEventListener('click',update);
 $('#aircraft-toggle').addEventListener('change',e=>{points.visible=active&&e.target.checked;});
 return {pick,select,setActive(next){
  active=next;points.visible=active&&$('#aircraft-toggle').checked;
  if(!active){controller?.abort();clearInterval(refreshInterval);refreshInterval=null;return;}
  update();
  // Only collect while the browser tab and Exodus mode are active.
  clearInterval(refreshInterval);
  refreshInterval=setInterval(()=>{if(active&&document.visibilityState==='visible')update();},SAMPLE_INTERVAL_MS);
 }};
}
