import test from 'node:test';
import assert from 'node:assert/strict';
import {TableTurn,STEP,clampScale} from '../src/state.js';
import {buildTable} from '../src/table.js';
import {createArtwork,OBJECTS} from '../src/objects.js';
import {Box3} from 'three';
function finish(t){for(let time=0;time<10000&&t.busy;time+=20)t.update(time);}
test('three left or right turns return to the original side without resetting the accumulated angle',()=>{for(const d of [-1,1]){const t=new TableTurn();for(let i=0;i<3;i++)t.turn(d);finish(t);assert.equal(t.side,0);assert.ok(Math.abs(t.angle-d*2*Math.PI)<1e-9);}});
test('opposite turns cancel; rapid mixed input is processed in order',()=>{const t=new TableTurn();t.turn(-1);t.turn(1);finish(t);assert.equal(t.angle,0);const q=new TableTurn(100);[-1,1,1,-1,-1].forEach(x=>q.turn(x));finish(q);assert.equal(q.steps,-1);assert.equal(q.side,1);});
test('angle is monotonic across three same-direction turns, including the third boundary',()=>{const t=new TableTurn(100);[1,1,1].forEach(d=>t.turn(d));let last=0;for(let time=0;time<=400;time+=5){t.update(time);assert.ok(t.angle>=last);last=t.angle;}assert.equal(t.angle,3*STEP);});
test('reduced motion consumes each queued turn without tweening',()=>{const t=new TableTurn();[1,1,1].forEach(d=>t.turn(d));t.update(0,true);assert.equal(t.steps,1);t.update(1,true);t.update(2,true);assert.equal(t.side,0);assert.equal(t.busy,false);});
test('object scale stays within the permitted viewing range',()=>{assert.equal(clampScale(.1),.75);assert.equal(clampScale(3),1.8);assert.equal(clampScale(1.12),1.12);});
test('exactly three place settings and three distinct finite sculptures; scaling keeps their base on the plate',()=>{const {root,places}=buildTable();assert.equal(places.length,3);assert.equal(places.filter(p=>p.children.some(c=>c.name.startsWith('plate-'))).length,3);const counts=[];OBJECTS.forEach((c,i)=>{const obj=createArtwork(c);places[i].add(obj);obj.updateMatrixWorld(true);let meshes=0;obj.traverse(n=>{if(n.isMesh){meshes++;for(const v of n.geometry.attributes.position.array)assert.ok(Number.isFinite(v));}});counts.push(meshes);places[i].remove(obj);for(const scale of [.75,1,1.8]){obj.scale.setScalar(scale);obj.updateMatrixWorld(true);const b=new Box3().setFromObject(obj);assert.ok(Math.abs(b.min.y)<1e-5);assert.ok(b.max.y>0);}});assert.equal(new Set(counts).size,3);assert.equal(root.children.includes(places[0]),true);});
