import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {makeSatrec,calculate,EARTH_RADIUS} from './orbits.js';
import {classify,makeObject} from './catalog.js';

const snapshot=JSON.parse(readFileSync(new URL('../public/data/catalog.json',import.meta.url),'utf8'));
const iss=snapshot.records.find(r=>Number(r.omm.NORAD_CAT_ID)===25544);
test('ISS propagates near its epoch to plausible altitude and moves over a minute',()=>{
 const date=new Date(iss.omm.EPOCH+'Z');
 const a=calculate(makeSatrec(iss.omm),date),b=calculate(makeSatrec(iss.omm),new Date(+date+60000));
 assert.ok(a&&b);assert.ok(a.altitude>300&&a.altitude<500);
 const distance=Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z)*EARTH_RADIUS;
 assert.ok(distance>350&&distance<550);
 assert.ok(Math.abs(Math.hypot(a.x,a.y,a.z)*EARTH_RADIUS-(EARTH_RADIUS+a.altitude))<30);
});
test('authoritative debris type wins over rocket-like name',()=>{
 assert.equal(classify({OBJECT_NAME:'USA 40 R/B DEB',NORAD_CAT_ID:23159},{OBJECT_TYPE:'DEB'}),'debris');
 assert.equal(classify({OBJECT_NAME:'PAYLOAD & R/B',NORAD_CAT_ID:1},{OBJECT_TYPE:'PAY'}),'satellite');
 assert.equal(classify({OBJECT_NAME:'UNKNOWN',NORAD_CAT_ID:999999},{}),'unknown');
});
test('snapshot has unique real IDs, classifications, and source timestamps',()=>{
 assert.equal(snapshot.records.length,snapshot.manifest.count);
 assert.equal(new Set(snapshot.records.map(r=>r.omm.NORAD_CAT_ID)).size,snapshot.records.length);
 const objects=snapshot.records.map(makeObject);
 for(const c of ['starlink','satellite','debris','rocket','station'])assert.ok(objects.some(o=>o.category===c));
 assert.ok(objects.every(o=>!o.id.startsWith('DEMO-')&&Number.isFinite(Date.parse(o.epoch))));
 assert.ok(Object.values(snapshot.manifest.downloadedAt).every(t=>Number.isFinite(Date.parse(t))));
});
test('the full snapshot propagates with explicit failures instead of fake positions',()=>{
 const date=new Date(snapshot.manifest.downloadedAt['active.json']);let valid=0,failures=0;
 for(const record of snapshot.records){
  let p;try{p=calculate(makeSatrec(record.omm),date);}catch{p=null;}
  if(!p){failures++;continue;}
  assert.ok([p.x,p.y,p.z,p.altitude].every(Number.isFinite));assert.ok(p.altitude>=0);valid++;
 }
 assert.ok(valid/snapshot.records.length>.95);
 console.log(`Snapshot propagation: ${valid} positioned, ${failures} explicitly unavailable`);
});
