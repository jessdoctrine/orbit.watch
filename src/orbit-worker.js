import {makeSatrec,calculate} from './orbits.js';
let records=[],running=true,timer;
function tick(){
 clearTimeout(timer);if(!running||!records.length)return;
 const time=Date.now(),date=new Date(time),positions=new Float32Array(records.length*3),altitudes=new Float32Array(records.length);
 let failed=0;
 for(let i=0;i<records.length;i++){
  let p;try{p=records[i]&&calculate(records[i],date);}catch{p=null;}
  if(!p){positions.fill(NaN,i*3,i*3+3);altitudes[i]=NaN;failed++;continue;}
  positions.set([p.x,p.y,p.z],i*3);altitudes[i]=p.altitude;
 }
 postMessage({time,positions,altitudes,failed},[positions.buffer,altitudes.buffer]);
 timer=setTimeout(tick,2000);
}
onmessage=({data})=>{
 if(data.type==='init'){records=data.elements.map(o=>{try{return makeSatrec(o);}catch{return null;}});running=true;tick();}
 if(data.type==='pause'){running=false;clearTimeout(timer);}
 if(data.type==='resume'){running=true;tick();}
};
