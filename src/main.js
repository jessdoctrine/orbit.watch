import './style.css';
import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {categories,makeObject} from './catalog.js';
import {makeSatrec,calculate} from './orbits.js';
import {pickObject} from './picking.js';

const $=s=>document.querySelector(s);
const escape=value=>String(value??'Unknown').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const format=value=>Number(value).toLocaleString();
const utc=value=>new Date(value).toISOString().replace('T',' ').slice(0,19)+' UTC';
const category=id=>categories.find(c=>c.id===id);
const enabled=new Set(categories.map(c=>c.id));
let catalog=[],selected=null,manifest,worker,positionsTime=null;
let paused=matchMedia('(prefers-reduced-motion: reduce)').matches,failed=0,page=0;
let scene,camera,renderer,controls,earth,orbitLine,selectionDot;
const groups=new Map(),pickTargets=[],PAGE_SIZE=100;
const statuses={'+':'Operational','-':'Nonoperational','P':'Partially operational','B':'Backup / standby','S':'Spare','X':'Extended mission','D':'Decayed','?':'Unknown'};
const altitude=o=>Number.isFinite(o.altitude)?`${Math.round(o.altitude).toLocaleString()} km`:'Unavailable';
const isOld=o=>Math.abs(Date.now()-Date.parse(o.epoch))>3.5*86400000;

function renderLayers(){
 $('#layers').innerHTML=categories.map(c=>`<label class="layer"><span class="dot" style="--color:${c.color}"></span><span>${c.name}<small>${c.description}</small><small class="layer-count">${format(catalog.filter(o=>o.category===c.id).length)} in snapshot</small></span><input type="checkbox" value="${c.id}" ${enabled.has(c.id)?'checked':''} aria-label="Show ${c.name}"></label>`).join('');
}
function detail(){
 if(!selected)return;
 const o=selected,c=category(o.category);
 $('#detail').innerHTML=`<div class="object-icon" style="--color:${c.color}" aria-hidden="true">${o.category==='station'?'✧':'⌁'}</div><h2>${escape(o.name)}</h2><span class="demo-tag real-tag">CELESTRAK · NORAD ${escape(o.id)}</span><p class="detail-purpose"><span class="dot" style="--color:${c.color}"></span> ${escape(o.type)}</p><section class="object-explanation"><h3>What it is</h3><p>${escape(o.description)}</p><h3>What it does</h3><p>${escape(o.activity)}</p></section>${isOld(o)?'<p class="data-warning">Orbital epoch is more than 3.5 days from now. Position accuracy may be reduced.</p>':''}<dl>${[
 ['Owner code',o.owner],['Catalog status',statuses[o.status]||o.status],['Estimated altitude',altitude(o)],['Inclination',o.inclination.toFixed(2)+'°'],['Orbital period',o.period.toFixed(1)+' min'],['Launch date',o.launch],['International ID',o.internationalId],['Orbital epoch',utc(o.epoch)],['Position time',positionsTime?utc(positionsTime):'Calculating…']
 ].map(([k,v])=>`<div><dt>${k}</dt><dd ${k==="Estimated altitude"?'data-live="altitude"':k==="Position time"?'data-live="time"':''}>${escape(v)}</dd></div>`).join('')}</dl><a class="catalog-link" href="https://celestrak.org/satcat/records.php?CATNR=${encodeURIComponent(o.id)}" target="_blank" rel="noopener noreferrer">Open source catalog ↗</a><p class="muted">Descriptions identify object classes. Unknown mission details are left unspecified.</p>`;
}
function select(o){
 selected=o;detail();renderRows();
 if(!scene)return;
 if(orbitLine){scene.remove(orbitLine);orbitLine.geometry.dispose();orbitLine.material.dispose();orbitLine=null;}
 const satrec=makeSatrec(o.omm),start=positionsTime||Date.now(),points=[];
 for(let i=0;i<=180;i++){
  const p=calculate(satrec,new Date(start+i/180*o.period*60000));
  if(!p)break;points.push(new THREE.Vector3(p.x,p.y,p.z));
 }
 if(points.length>1){orbitLine=new THREE.Line(new THREE.BufferGeometry().setFromPoints(points),new THREE.LineBasicMaterial({color:category(o.category).color,transparent:true,opacity:.45}));orbitLine.visible=enabled.has(o.category);scene.add(orbitLine);}
}
function renderRows(){
 const q=$('#search').value.trim().toLowerCase();
 const rows=catalog.filter(o=>enabled.has(o.category)&&[o.name,o.id,o.owner,o.launch,o.type,o.internationalId,o.activity].join(' ').toLowerCase().includes(q));
 page=Math.max(0,Math.min(page,Math.ceil(rows.length/PAGE_SIZE)-1));
 $('#rows').innerHTML=rows.slice(page*PAGE_SIZE,(page+1)*PAGE_SIZE).map(o=>`<tr class="${selected?.id===o.id?'selected':''}"><td><span class="dot" style="--color:${category(o.category).color}"></span>${escape(o.name)}</td><td>${category(o.category).name}</td><td>${escape(o.owner)}</td><td>${escape(o.id)}</td><td data-altitude="${o.index}">${altitude(o)}</td><td><button class="inspect" data-id="${escape(o.id)}" aria-label="Inspect ${escape(o.name)}">Inspect ↗</button></td></tr>`).join('')||'<tr><td colspan="6">No matching objects. Try another search or enable more layers.</td></tr>';
 $('#result-count').textContent=`${format(rows.length)} matching / ${format(catalog.length)} cataloged objects · Showing ${rows.length?page*PAGE_SIZE+1:0}–${Math.min((page+1)*PAGE_SIZE,rows.length)}`;
 $('#previous').disabled=page===0;$('#next').disabled=(page+1)*PAGE_SIZE>=rows.length;
 $('#visible-count').textContent=`${format(pickTargets.filter(t=>t.visible).length)} PLOTTED`;
}
function updateStatus(){
 if(!manifest)return;
 const ageHours=(Date.now()-Math.min(...Object.values(manifest.downloadedAt).map(Date.parse)))/3600000;
 $('#status-title').textContent=paused?'POSITIONS PAUSED':ageHours>24?'SAVED DATA · STALE':'CELESTRAK ORBITAL DATA';
 $('#status-detail').textContent=positionsTime?`${utc(positionsTime)} · SGP4 estimates`:'Calculating positions…';
 $('#data-summary').textContent=`${format(catalog.length)} objects in this saved snapshot. ${failed?format(failed)+' could not be positioned. ':''}Downloaded ${utc(manifest.downloadedAt['active.json'])}. ${ageHours>24?'Snapshot is over 24 hours old. Refresh data before relying on its positions. ':''}${manifest.coverage}`;
}
function updatePause(){
 $('#pause').textContent=paused?'▷ Resume positions':'Ⅱ Pause positions';$('#pause').setAttribute('aria-pressed',String(paused));updateStatus();
}
$('#layers').addEventListener('change',e=>{
 const {value,checked}=e.target;checked?enabled.add(value):enabled.delete(value);
 for(const [id,g] of groups)g.points.visible=enabled.has(id);
 pickTargets.forEach(t=>t.visible=t.userData.positioned&&enabled.has(t.userData.category));
 if(orbitLine)orbitLine.visible=enabled.has(selected.category);page=0;renderRows();
});
$('#search').addEventListener('input',()=>{page=0;renderRows();});
$('#rows').addEventListener('click',e=>{const b=e.target.closest('[data-id]');if(b)select(catalog.find(o=>o.id===b.dataset.id));});
$('#previous').addEventListener('click',()=>{page--;renderRows();});
$('#next').addEventListener('click',()=>{page++;renderRows();});
$('#pause').addEventListener('click',()=>{paused=!paused;worker?.postMessage({type:paused?'pause':'resume'});updatePause();});
$('#reset').addEventListener('click',()=>{if(controls){camera.position.set(0,1.4,4.7);controls.target.set(0,0,0);controls.update();}});

function initScene(){
 const host=$('#scene');scene=new THREE.Scene();camera=new THREE.PerspectiveCamera(38,1,.1,150);camera.position.set(0,1.4,4.7);
 renderer=new THREE.WebGLRenderer({antialias:true,alpha:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));host.appendChild(renderer.domElement);
 controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.minDistance=1.25;controls.maxDistance=25;controls.enablePan=false;
 scene.add(new THREE.AmbientLight(0xb4d3e9,1.5));const light=new THREE.DirectionalLight(0xffffff,2.5);light.position.set(-3,3,4);scene.add(light);
 const material=new THREE.MeshPhongMaterial({color:0x91b9c9,shininess:12});earth=new THREE.Mesh(new THREE.SphereGeometry(1,64,48),material);scene.add(earth);
 new THREE.TextureLoader().load('/earth.jpg',texture=>{texture.colorSpace=THREE.SRGBColorSpace;material.map=texture;material.color.set(0xffffff);material.needsUpdate=true;},undefined,()=>{ $('#globe-error').hidden=false;$('#globe-error').textContent='Earth imagery unavailable; showing an untextured globe.';});
 scene.add(new THREE.Mesh(new THREE.SphereGeometry(1.025,64,48),new THREE.MeshBasicMaterial({color:0x419fca,transparent:true,opacity:.08,side:THREE.BackSide})));
 const stars=[];let seed=13;const rand=()=>{seed=(seed*16807)%2147483647;return(seed-1)/2147483646;};for(let i=0;i<1400;i++){const v=new THREE.Vector3(rand()-.5,rand()-.5,rand()-.5).normalize().multiplyScalar(55);stars.push(v.x,v.y,v.z);}const starGeo=new THREE.BufferGeometry();starGeo.setAttribute('position',new THREE.Float32BufferAttribute(stars,3));scene.add(new THREE.Points(starGeo,new THREE.PointsMaterial({color:0x91b0ca,size:.018,transparent:true,opacity:.55})));
 for(const c of categories){
  const members=catalog.filter(o=>o.category===c.id),buffer=new Float32Array(members.length*3),geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.BufferAttribute(buffer,3).setUsage(THREE.DynamicDrawUsage));
  const points=new THREE.Points(geometry,new THREE.PointsMaterial({color:c.color,size:2.1,sizeAttenuation:false}));points.frustumCulled=false;scene.add(points);groups.set(c.id,{members,points,buffer});
 }
 selectionDot=new THREE.Mesh(new THREE.SphereGeometry(.016,12,8),new THREE.MeshBasicMaterial({color:0xffffff}));selectionDot.visible=false;scene.add(selectionDot);
 for(const o of catalog){const target=new THREE.Object3D();target.userData=o;target.visible=false;pickTargets.push(target);}
 const resize=()=>{const w=host.clientWidth,h=host.clientHeight;renderer.setSize(w,h);camera.aspect=w/h;camera.fov=THREE.MathUtils.radToDeg(2*Math.atan(Math.tan(THREE.MathUtils.degToRad(38)/2)/Math.min(camera.aspect,1)));camera.updateProjectionMatrix();};new ResizeObserver(resize).observe(host);resize();
 let down,lastHover=0;const tooltip=document.createElement('div');tooltip.className='object-tooltip';tooltip.hidden=true;host.appendChild(tooltip);
 const pick=e=>{const r=host.getBoundingClientRect();return pickObject({meshes:pickTargets,camera,earth,width:r.width,height:r.height,x:e.clientX-r.left,y:e.clientY-r.top,radius:e.pointerType==='touch'?22:10});};
 host.addEventListener('pointerdown',e=>{down=[e.clientX,e.clientY];tooltip.hidden=true;});
 host.addEventListener('pointermove',e=>{if(e.buttons||performance.now()-lastHover<90)return;lastHover=performance.now();const hit=pick(e);host.style.cursor=hit?'pointer':'grab';tooltip.hidden=!hit;if(hit){const r=host.getBoundingClientRect();tooltip.textContent=`${hit.userData.name} · NORAD ${hit.userData.id}`;tooltip.style.left=`${Math.min(e.clientX-r.left+14,Math.max(8,r.width-240))}px`;tooltip.style.top=`${Math.max(8,e.clientY-r.top-40)}px`;}});
 host.addEventListener('pointerleave',()=>tooltip.hidden=true);host.addEventListener('pointercancel',()=>{down=null;tooltip.hidden=true;});
 host.addEventListener('pointerup',e=>{const start=down;down=null;if(!start||Math.hypot(e.clientX-start[0],e.clientY-start[1])>6)return;const hit=pick(e);if(hit){select(hit.userData);tooltip.hidden=true;}});
 renderer.setAnimationLoop(()=>{controls.update();if(selected){const target=pickTargets[selected.index];selectionDot.visible=target?.visible||false;if(target)selectionDot.position.copy(target.position);}renderer.render(scene,camera);});
}
function receivePositions({data}){
 if(paused&&positionsTime)return;
 const firstPositions=positionsTime===null;positionsTime=data.time;failed=data.failed;
 catalog.forEach((o,i)=>{o.altitude=Number.isFinite(data.altitudes[i])?data.altitudes[i]:null;o.positioned=o.altitude!==null;
  const t=pickTargets[i];if(t){t.visible=o.positioned&&enabled.has(o.category);if(o.positioned)t.position.fromArray(data.positions,i*3);}
 });
 for(const g of groups.values()){
  g.members.forEach((o,j)=>{if(o.positioned)g.buffer.set(data.positions.subarray(o.index*3,o.index*3+3),j*3);else g.buffer.set([1e6,1e6,1e6],j*3);});
  g.points.geometry.attributes.position.needsUpdate=true;
 }
 if(firstPositions){detail();renderRows();}else{if(selected){const alt=$('[data-live="altitude"]');if(alt)alt.textContent=altitude(selected);const timestamp=$('[data-live="time"]');if(timestamp)timestamp.textContent=utc(positionsTime);}for(const cell of document.querySelectorAll('#rows td[data-altitude]')){const o=catalog[Number(cell.dataset.altitude)];cell.textContent=altitude(o);}}$("#visible-count").textContent=`${format(pickTargets.filter(t=>t.visible).length)} PLOTTED`;updateStatus();
}
async function start(){
 $('#detail').textContent='Loading CelesTrak catalog…';
 try{
  const response=await fetch('/data/catalog.json');if(!response.ok)throw new Error(`Catalog HTTP ${response.status}`);
  const snapshot=await response.json();if(!Array.isArray(snapshot.records)||!snapshot.records.length)throw new Error('Empty catalog');
  manifest=snapshot.manifest;catalog=snapshot.records.map(makeObject);renderLayers();renderRows();updateStatus();
  try{initScene();}catch(error){console.error(error);$('#globe-error').hidden=false;scene=null;}
  select(catalog.find(o=>o.id==='25544')||catalog[0]);
  worker=new Worker(new URL('./orbit-worker.js',import.meta.url),{type:'module'});worker.onmessage=receivePositions;
  worker.onerror=()=>{$('#status-title').textContent='POSITION CALCULATION FAILED';$('#status-detail').textContent='Catalog is available; positions are unavailable.';};
  worker.postMessage({type:'init',elements:catalog.map(o=>o.omm)});if(paused)worker.postMessage({type:'pause'});updatePause();
 }catch(error){console.error(error);$('#detail').textContent='Catalog unavailable. No fictional objects are substituted.';$('#status-title').textContent='DATA LOAD FAILED';$('#data-summary').textContent='The saved CelesTrak snapshot could not load. Check the local server and reload.';}
}
start();
