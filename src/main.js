import './style.css';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { buildTable } from './table.js';
import { OBJECTS, createArtwork, replaceWithModel } from './objects.js';
import { TableTurn, clampScale } from './state.js';
const $=s=>document.querySelector(s),host=$('#scene');
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
const dialog=$('#about-dialog');
$('#about').onclick=()=>dialog.showModal();$('#close-about').onclick=()=>dialog.close();
dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();}});
let renderer;
try {renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:'high-performance'});}catch(error){$('#loading').textContent='当前浏览器无法启动三维画面，请开启硬件加速或使用支持 WebGL 的浏览器。';throw error;}
renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;
host.prepend(renderer.domElement);renderer.domElement.setAttribute('aria-label','三角餐桌三维场景');
const scene=new THREE.Scene();scene.fog=new THREE.FogExp2(0x101316,.025);
const camera=new THREE.PerspectiveCamera(38,1,.1,80);camera.position.set(0,9.0,12.7);camera.lookAt(0,1,0);
const pmrem=new THREE.PMREMGenerator(renderer),environment=new RoomEnvironment();const env=pmrem.fromScene(environment,.04);scene.environment=env.texture;scene.environmentIntensity=.28;environment.dispose();pmrem.dispose();
scene.add(new THREE.HemisphereLight(0xbacace,0x29241b,1.3));
const key=new THREE.DirectionalLight(0xffefd3,3.0);key.position.set(-3,8,5);key.castShadow=true;key.shadow.mapSize.set(2048,2048);Object.assign(key.shadow.camera,{left:-7,right:7,top:7,bottom:-7,near:1,far:25});key.shadow.normalBias=.018;key.shadow.bias=-.0001;key.shadow.radius=4;scene.add(key);
const fill=new THREE.DirectionalLight(0xb7d1dc,1.4);fill.position.set(5,5,-5);scene.add(fill);
const floor=new THREE.Mesh(new THREE.PlaneGeometry(200,200),new THREE.MeshStandardMaterial({color:0x101518,roughness:.95,metalness:.04}));floor.rotation.x=-Math.PI/2;floor.position.y=-.03;floor.receiveShadow=true;scene.add(floor);
const {root:table,places}=buildTable();scene.add(table);
const turn=new TableTurn(),artworks=[],pickers=[],scales=[1,1,1];let selected=0,hovered=-1,drag=null,lastSide=0;
const raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2();const hint=$('#hover-hint'),buttons=[];
OBJECTS.forEach((config,i)=>{
 const artwork=createArtwork(config);artwork.position.y=.085;places[i].add(artwork);artworks.push(artwork);
 replaceWithModel(artwork,config).catch(error=>{console.error('Model loading failed:',error);$('#status').textContent=`${config.name}模型未能加载，保留概念形态。`;});
 const picker=new THREE.Mesh(new THREE.BoxGeometry(1.75,1.5,1.7),new THREE.MeshBasicMaterial({visible:false}));picker.position.y=.78;picker.userData.index=i;places[i].add(picker);pickers.push(picker);
 const b=document.createElement('button');b.className='hotspot';b.textContent=String(i+1).padStart(2,'0');b.setAttribute('aria-label',`选择${config.name}，左右拖动旋转`);b.setAttribute('aria-pressed',String(i===0));
 b.addEventListener('click',()=>{if(!turn.busy)select(i);});
 b.addEventListener('pointerdown',e=>beginDrag(e,i,b));b.addEventListener('pointermove',moveDrag);b.addEventListener('pointerup',endDrag);b.addEventListener('pointercancel',endDrag);
 b.addEventListener('wheel',e=>{if(!turn.busy){e.preventDefault();select(i);zoom(i,Math.exp(-e.deltaY*.001));}},{passive:false});
 $('#hotspots').append(b);buttons.push(b);
});
function select(i){selected=i;buttons.forEach((b,j)=>b.setAttribute('aria-pressed',String(i===j)));$('#selected-label').textContent=`物件 ${String(i+1).padStart(2,'0')}`;$('#scale-label').value=`${Math.round(scales[i]*100)}%`;$('#work-number').textContent=`OBJECT ${String(i+1).padStart(2,'0')} / 03`;$('#work-title').textContent=OBJECTS[i].name;$('#work-english').textContent=OBJECTS[i].english;$('#work-material').textContent=OBJECTS[i].material;}
function zoom(i,factor){scales[i]=clampScale(scales[i]*factor);artworks[i].scale.setScalar(scales[i]);pickers[i].scale.setScalar(Math.max(1,scales[i]));if(i===selected)$('#scale-label').value=`${Math.round(scales[i]*100)}%`;}
function rotateTable(d){endDrag();hovered=-1;hint.hidden=true;turn.turn(d);}
$('#previous').onclick=()=>rotateTable(-1);$('#next').onclick=()=>rotateTable(1);
$('#smaller').onclick=()=>{if(!turn.busy)zoom(selected,1/1.12);};$('#larger').onclick=()=>{if(!turn.busy)zoom(selected,1.12);};
$('#reset').onclick=()=>{if(turn.busy)return;scales[selected]=1;artworks[selected].scale.setScalar(1);artworks[selected].rotation.y=0;pickers[selected].scale.setScalar(1);$('#scale-label').value='100%';$('#status').textContent=`已复位${OBJECTS[selected].name}`;};
addEventListener('keydown',e=>{if(e.repeat||e.altKey||e.ctrlKey||e.metaKey||dialog.open||e.target.closest('input,textarea,select,[contenteditable="true"]'))return;const k=e.key.toLowerCase();if(k==='a'||k==='d'){e.preventDefault();rotateTable(k==='a'?-1:1);}});
function hit(e){const rect=renderer.domElement.getBoundingClientRect();pointer.set((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1);raycaster.setFromCamera(pointer,camera);return raycaster.intersectObjects(pickers,false)[0]?.object.userData.index??-1;}
function beginDrag(e,i,target=renderer.domElement){if(turn.busy||e.button!==0)return;e.preventDefault();select(i);drag={i,x:e.clientX,id:e.pointerId,target};target.setPointerCapture(e.pointerId);hint.hidden=true;renderer.domElement.style.cursor='grabbing';}
function moveDrag(e){if(drag&&e.pointerId===drag.id){artworks[drag.i].rotation.y+=(e.clientX-drag.x)*.012;drag.x=e.clientX;e.preventDefault();}}
function endDrag(){if(drag){if(drag.target.hasPointerCapture(drag.id))drag.target.releasePointerCapture(drag.id);drag=null;}renderer.domElement.style.cursor='default';}
renderer.domElement.addEventListener('pointerdown',e=>{const i=hit(e);if(i>=0)beginDrag(e,i);});
renderer.domElement.addEventListener('pointermove',e=>{
 if(drag){moveDrag(e);return;}if(turn.busy||e.pointerType==='touch')return;
 hovered=hit(e);renderer.domElement.style.cursor=hovered>=0?'grab':'default';hint.hidden=hovered<0;
 if(hovered>=0){$('#hover-name').textContent=OBJECTS[hovered].name;hint.style.left=`${Math.min(e.clientX+20,innerWidth-225)}px`;hint.style.top=`${Math.min(e.clientY+22,innerHeight-90)}px`;}
});
renderer.domElement.addEventListener('pointerleave',()=>{hovered=-1;hint.hidden=true;});
renderer.domElement.addEventListener('pointerup',endDrag);renderer.domElement.addEventListener('pointercancel',endDrag);addEventListener('blur',endDrag);
renderer.domElement.addEventListener('wheel',e=>{if(turn.busy)return;const i=hit(e);if(i<0)return;e.preventDefault();select(i);zoom(i,Math.exp(-Math.max(-150,Math.min(150,e.deltaY))*.0015));},{passive:false});
const projected=new THREE.Vector3();
function resize(){const w=host.clientWidth,h=host.clientHeight;camera.aspect=w/h;const mobile=w<600;const distance=mobile?Math.max(15,14.8/camera.aspect):14.0;const direction=new THREE.Vector3(0,.59,.81).normalize();camera.position.copy(direction.multiplyScalar(distance));camera.lookAt(0,mobile?1.4:1.05,0);camera.updateProjectionMatrix();renderer.setSize(w,h);}
addEventListener('resize',resize);resize();
function animate(now){
 turn.update(now,reduced.matches);table.rotation.y=turn.angle;
 if(lastSide!==turn.side){lastSide=turn.side;select(lastSide);$('#side').textContent=String(lastSide+1).padStart(2,'0');document.querySelectorAll('.side-dots i').forEach((el,i)=>el.classList.toggle('active',i===lastSide));$('#status').textContent=`餐桌第 ${lastSide+1} 侧，${OBJECTS[lastSide].name}`;}
 table.updateMatrixWorld(true);
 buttons.forEach((b,i)=>{projected.set(0,.14,.92);places[i].localToWorld(projected);projected.project(camera);b.style.left=`${(projected.x*.5+.5)*host.clientWidth}px`;b.style.top=`${(-projected.y*.5+.5)*host.clientHeight}px`;b.disabled=turn.busy;});
 renderer.render(scene,camera);
 // Read-only diagnostics used to verify actual scene state, never to drive interaction.
 host.dataset.side=String(turn.side);host.dataset.angle=String(turn.angle);host.dataset.busy=String(turn.busy);host.dataset.scales=scales.join(',');host.dataset.rotations=artworks.map(o=>o.rotation.y).join(',');
}
renderer.setAnimationLoop(animate);$('#loading').remove();select(0);
renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();renderer.setAnimationLoop(null);$('#status').textContent='三维画面暂时中断，请刷新页面恢复。';const p=document.createElement('p');p.id='loading';p.textContent='三维画面暂时中断，请刷新恢复。';host.append(p);});
