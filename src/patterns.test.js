import test from 'node:test';
import assert from 'node:assert/strict';
import {summarizeAircraft,appendSample,evaluatePattern,localWindow,pruneSamples,SAMPLE_INTERVAL_MS} from './patterns.js';
const aircraft=(hex,t)=>({hex,t,lat:40.7,lon:-74.0});
test('snapshot counts only unique positioned hex identifiers',()=>{
 const s=summarizeAircraft([aircraft('abcdef','C56X'),aircraft('abcdef','C56X'),aircraft('123abc','A321'),aircraft('987abc','AT8T'),{hex:'123456',t:'C56X'}],'nyc',100);
 assert.deepEqual([s.total,s.business,s.agricultural],[3,1,1]);
});
test('prevents repeated refreshes from fabricating historical samples',()=>{
 const sample={region:'nyc',at:Date.UTC(2026,10,6,18),total:100,business:10,agricultural:0};
 const a=appendSample([],sample);
 const b=appendSample(a.samples,{...sample,at:sample.at+SAMPLE_INTERVAL_MS-1});
 assert.equal(a.added,true);assert.equal(b.added,false);assert.equal(b.samples.length,1);
});
test('stays building without at least three distinct comparable earlier days',()=>{
 const now=Date.UTC(2026,10,6,18);const current={region:'nyc',at:now,total:100,business:20,agricultural:0};
 const samples=[1,2].map(i=>({...current,at:now-i*24*3600000,business:5}));
 assert.equal(evaluatePattern(samples,current).status,'building');
});
test('flags marked observational rise using three comparable weekdays',()=>{
 const now=Date.UTC(2026,10,6,18); // Friday 1pm New York
 const current={region:'nyc',at:now,total:160,business:20,agricultural:0};
 const samples=[1,2,3].map(i=>({...current,at:now-i*24*3600000,business:6}));
 const outcome=evaluatePattern(samples,current);
 assert.equal(outcome.status,'elevated');assert.equal(outcome.baseline,6);
});
test('does not call low-count change elevated',()=>{
 const now=Date.UTC(2026,10,6,18),current={region:'nyc',at:now,total:80,business:6,agricultural:0};
 const samples=[1,2,3].map(i=>({...current,at:now-i*24*3600000,business:2}));
 assert.equal(evaluatePattern(samples,current).status,'typical');
});
test('local time calculations use target region time zone',()=>{
 assert.equal(localWindow(Date.UTC(2026,10,6,18),'nyc').hour,13);
 assert.equal(localWindow(Date.UTC(2026,10,6,18),'la').hour,10);
});
test('prunes invalid and too-old records',()=>{
 const now=Date.UTC(2026,10,6,18);
 assert.equal(pruneSamples([{region:'nyc',at:now-50*86400000,business:1,total:2,agricultural:0},{region:'nyc',at:now-10000,business:1,total:2,agricultural:0}],now).length,1);
});
