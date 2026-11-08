import test from 'node:test';
import assert from 'node:assert/strict';
import {classifyAircraft,categoryLabel} from './aircraft-types.js';
test('recognizes business jet type without inferring passengers',()=>{
 assert.equal(classifyAircraft('C56X'),'business');
 assert.match(categoryLabel('C56X'),/type only/);
});
test('recognizes agricultural-capable aircraft without claiming spraying',()=>{
 assert.equal(classifyAircraft('AT8T'),'agricultural');
 assert.match(categoryLabel('AT8T'),/unverified/);
});
test('unknown and airliners are not treated as private jets',()=>{
 assert.equal(classifyAircraft('A321'),'other');
 assert.equal(classifyAircraft(null),'other');
});
