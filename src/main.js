import './style.css';
import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {catalog,categories} from './catalog.js';
import {pickObject} from './picking.js';

const $=s=>document.querySelector(s);
const enabled=new Set(categories.map(c=>c.id));
let selected=catalog[0], paused=matchMedia('(prefers-reduced-motion: reduce)').matches;
const category=id=>categories.find(c=>c.id===id);
const meshes=[];
let scene,camera,renderer,controls,earth,orbitLine;
function select(object){selected=object; const c=category(object.category);
 $('#detail').innerHTML=`<div class="object-icon" style="--color:${c.color}" aria-hidden="true">${object.category==='station'?'✧':'⌁'}</div><h2>${object.name}</h2><span class="demo-tag">FICTIONAL DEMO OBJECT</span><p class="detail-purpose"><span class="dot" style="--color:${c.color}"></span> ${object.type}</p><section class="object-explanation"><h3>What it is</h3><p>${object.description}</p><h3>What it does</h3><p>${object.activity}</p></section><dl>${[['Operator',object.operator],['Country',object.country],['Demo altitude',object.altitude+' km'],['Demo inclination',object.inclination+'°'],['Demo launch year',object.year],['Demo ID',object.id]].map(([k,v])=>`<div><dt>${k}</dt><dd>${v}</dd></div>`).join('')}</dl>`;
 renderRows();
 if(scene){if(orbitLine){scene.remove(orbitLine);orbitLine.geometry.dispose();orbitLine.material.dispose();}const points=Array.from({length:181},(_,i)=>position(object,i/180*Math.PI*2));orbitLine=new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(points),new THREE.LineBasicMaterial({color:c.color,transparent:true,opacity:0.4}));orbitLine.visible=enabled.has(object.category);scene.add(orbitLine);}
}
function renderRows(){const q=$('#search').value.trim().toLowerCase();const rows=catalog.filter(o=>enabled.has(o.category)&&Object.values(o).join(' ').toLowerCase().includes(q));
 $('#rows').innerHTML=rows.map(o=>`<tr class="${selected.id===o.id?'selected':''}"><td><span class="dot" style="--color:${category(o.category).color}"></span>${o.name}</td><td>${category(o.category).name}</td><td>${o.operator}</td><td>${o.country}</td><td>${o.altitude} km</td><td><button class="inspect" data-id="${o.id}" aria-label="Inspect ${o.name}">Inspect ↗</button></td></tr>`).join('')||'<tr><td colspan="6">No objects match. Try another search or enable more layers.</td></tr>';
 $('#result-count').textContent=`${rows.length} of ${catalog.length} demonstration objects · Directory follows visibility filters`;
 $('#visible-count').textContent=`${catalog.filter(o=>enabled.has(o.category)).length} OBJECTS`;
}
$('#layers').innerHTML=categories.map(c=>`<label class="layer"><span class="dot" style="--color:${c.color}"></span><span>${c.name}<small>${c.description}</small></span><input type="checkbox" value="${c.id}" checked aria-label="Show ${c.name}"></label>`).join('');
$('#layers').addEventListener('change',e=>{const {value,checked}=e.target;checked?enabled.add(value):enabled.delete(value);meshes.forEach(m=>m.visible=enabled.has(m.userData.category));if(orbitLine)orbitLine.visible=enabled.has(selected.category);renderRows();});
$('#search').addEventListener('input',renderRows);
$('#rows').addEventListener('click',e=>{const b=e.target.closest('[data-id]');if(b)select(catalog.find(o=>o.id===b.dataset.id));});
function updatePause(){ $('#pause').textContent=paused?'▷ Resume motion':'Ⅱ Pause motion';$('#pause').setAttribute('aria-pressed',String(paused));}
$('#pause').addEventListener('click',()=>{paused=!paused;updatePause();});updatePause();
$('#reset').addEventListener('click',()=>{if(controls){camera.position.set(0,1.4,4.7);controls.target.set(0,0,0);controls.update();}});
function position(o,angle){const radius=1+o.altitude/6371,inc=o.inclination*Math.PI/180;return new THREE.Vector3(Math.cos(angle)*radius,Math.sin(angle)*Math.sin(inc)*radius,Math.sin(angle)*Math.cos(inc)*radius).applyAxisAngle(new THREE.Vector3(0,1,0),o.plane);}
select(selected);
try{
 const host=$('#scene');scene=new THREE.Scene();camera=new THREE.PerspectiveCamera(38,1,0.1,100);camera.position.set(0,1.4,4.7);
 renderer=new THREE.WebGLRenderer({antialias:true,alpha:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));host.appendChild(renderer.domElement);
 controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.minDistance=2.1;controls.maxDistance=8;controls.enablePan=false;
 scene.add(new THREE.AmbientLight(0xb4d3e9,1.5));const light=new THREE.DirectionalLight(0xffffff,2.5);light.position.set(-3,3,4);scene.add(light);
 const material=new THREE.MeshPhongMaterial({color:0x91b9c9,shininess:12});earth=new THREE.Mesh(new THREE.SphereGeometry(1,64,48),material);scene.add(earth);
 new THREE.TextureLoader().load('/earth.jpg',texture=>{texture.colorSpace=THREE.SRGBColorSpace;material.map=texture;material.color.set(0xffffff);material.needsUpdate=true;},undefined,()=>{ $('#globe-error').hidden=false;$('#globe-error').textContent='Earth imagery could not load. Showing an untextured globe.';});
 const atmosphere=new THREE.Mesh(new THREE.SphereGeometry(1.025,64,48),new THREE.MeshBasicMaterial({color:0x419fca,transparent:true,opacity:0.08,side:THREE.BackSide}));scene.add(atmosphere);
 const grid=new THREE.LineSegments(new THREE.WireframeGeometry(new THREE.SphereGeometry(1.003,24,12)),new THREE.LineBasicMaterial({color:0x7ac9d1,transparent:true,opacity:0.055}));scene.add(grid);
 const stars=[];let seed=13;const rand=()=>{seed=(seed*16807)%2147483647;return(seed-1)/2147483646;};for(let i=0;i<1400;i++){const v=new THREE.Vector3(rand()-.5,rand()-.5,rand()-.5).normalize().multiplyScalar(25);stars.push(v.x,v.y,v.z);}const starGeo=new THREE.BufferGeometry();starGeo.setAttribute('position',new THREE.Float32BufferAttribute(stars,3));scene.add(new THREE.Points(starGeo,new THREE.PointsMaterial({color:0x91b0ca,size:0.018,transparent:true,opacity:0.55})));
 const geometry=new THREE.SphereGeometry(0.009,8,6);for(const o of catalog){const m=new THREE.Mesh(geometry,new THREE.MeshBasicMaterial({color:category(o.category).color}));m.userData=o;m.position.copy(position(o,o.phase));meshes.push(m);scene.add(m);}
 const resize=()=>{const w=host.clientWidth,h=host.clientHeight;renderer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix();};new ResizeObserver(resize).observe(host);resize();
 let down;
 const tooltip=document.createElement('div');tooltip.className='object-tooltip';tooltip.hidden=true;host.appendChild(tooltip);
 const pick=e=>{const rect=host.getBoundingClientRect();return pickObject({meshes,camera,earth,width:rect.width,height:rect.height,x:e.clientX-rect.left,y:e.clientY-rect.top,radius:e.pointerType==='touch'?22:12});};
 host.addEventListener('pointerdown',e=>{down=[e.clientX,e.clientY];tooltip.hidden=true;});
 host.addEventListener('pointermove',e=>{if(e.buttons)return;const hit=pick(e);host.style.cursor=hit?'pointer':'grab';tooltip.hidden=!hit;if(hit){const rect=host.getBoundingClientRect();tooltip.textContent=`${hit.userData.name} · ${hit.userData.type}`;tooltip.style.left=`${Math.min(e.clientX-rect.left+14,Math.max(8,rect.width-240))}px`;tooltip.style.top=`${Math.max(8,e.clientY-rect.top-40)}px`;}});
 host.addEventListener('pointerleave',()=>{tooltip.hidden=true;});
 host.addEventListener('pointercancel',()=>{down=null;tooltip.hidden=true;});
 host.addEventListener('pointerup',e=>{const start=down;down=null;if(!start||Math.hypot(e.clientX-start[0],e.clientY-start[1])>6)return;const hit=pick(e);if(hit){select(hit.userData);tooltip.hidden=true;}});
 select(selected);let elapsed=0,last=performance.now();renderer.setAnimationLoop(now=>{const dt=Math.min((now-last)/1000,.05);last=now;if(!paused){elapsed+=dt*.06;earth.rotation.y+=dt*.018;grid.rotation.y=earth.rotation.y;meshes.forEach(m=>m.position.copy(position(m.userData,m.userData.phase+elapsed/Math.pow(1+m.userData.altitude/6371,1.5))));}controls.update();for(const m of meshes)m.scale.setScalar(m.userData.id===selected.id?2:1);renderer.render(scene,camera);});
}catch(error){console.error(error);$('#globe-error').hidden=false;}
