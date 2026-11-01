import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {pickObject} from './picking.js';

const camera=new THREE.PerspectiveCamera(40,1,0.1,100);
camera.position.set(0,0,5);camera.lookAt(0,0,0);
const earth=new THREE.Mesh(new THREE.SphereGeometry(1,32,24),new THREE.MeshBasicMaterial());
function dot(x,y,z){const m=new THREE.Mesh();m.position.set(x,y,z);return m;}
const pick=(meshes,x=200,y=200)=>pickObject({meshes,camera,earth,width:400,height:400,x,y});
test('selects within 12 pixels of a dot instead of requiring a direct hit',()=>{
 const front=dot(0,0,1.2);assert.equal(pick([front],210,200),front);assert.equal(pick([front],214,200),null);
});
test('does not select an object hidden behind Earth',()=>assert.equal(pick([dot(0,0,-1.2)]),null));
test('ignores disabled layers',()=>{const hidden=dot(0,0,1.2);hidden.visible=false;assert.equal(pick([hidden]),null);});
test('selects the nearest dot on screen',()=>{const centered=dot(0,0,1.2),offset=dot(.04,0,1.2);assert.equal(pick([offset,centered]),centered);});
