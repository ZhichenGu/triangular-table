import './style.css';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { buildTable } from './table.js';
import { OBJECTS, createArtwork, replaceWithModel } from './objects.js';
import { TableTurn, clampScale } from './state.js';
const $=s=>document.querySelector(s),host=$('#scene'),detailHost=$('#detail-scene'),dialog=$('#inspector');
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
function makeRenderer(parent){const r=new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance'});r.setClearColor(0x000000,1);r.setPixelRatio(Math.min(devicePixelRatio,2));r.toneMapping=THREE.ACESFilmicToneMapping;r.toneMappingExposure=1.15;parent.prepend(r.domElement);return r;}
let renderer;
try{renderer=makeRenderer(host);}catch(error){$('#loading').textContent='无法启动三维画面，请使用支持 WebGL 的浏览器。';throw error;}
renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.domElement.setAttribute('aria-label','三角餐桌三维场景');
const scene=new THREE.Scene();scene.background=new THREE.Color(0x000000);
const camera=new THREE.PerspectiveCamera(42,1,.1,100);
const pmrem=new THREE.PMREMGenerator(renderer),environment=new RoomEnvironment();const env=pmrem.fromScene(environment,.04);scene.environment=env.texture;scene.environmentIntensity=.28;environment.dispose();pmrem.dispose();
function addLights(target,shadows=false){target.add(new THREE.HemisphereLight(0xbacace,0x29241b,1.3));const key=new THREE.DirectionalLight(0xffefd3,3);key.position.set(-3,8,5);key.castShadow=shadows;if(shadows){key.shadow.mapSize.set(2048,2048);Object.assign(key.shadow.camera,{left:-7,right:7,top:7,bottom:-7,near:1,far:25});key.shadow.normalBias=.018;key.shadow.bias=-.0001;key.shadow.radius=4;}target.add(key);const fill=new THREE.DirectionalLight(0xb7d1dc,1.4);fill.position.set(5,5,-5);target.add(fill);}
addLights(scene,true);
// No illuminated floor, gradient, or fog: every background pixel is pure black.
const {root:table,places}=buildTable();scene.add(table);
const baseAngle=Math.PI,turn=new TableTurn(),artworks=[],pickers=[],buttons=[];
const scales=[1,1,1],angles=[0,0,0];let selected=-1,suppressed=-1,drag=null,lastSide=0;
const raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2();
let detailRenderer,detailScene,detailCamera,detailRoot,detailArtwork;
OBJECTS.forEach((config,i)=>{
 const artwork=createArtwork(config);artwork.position.y=.085;places[i].add(artwork);artworks.push(artwork);
 replaceWithModel(artwork,config).then(()=>{if(dialog.open&&selected===i)populateDetail(i);}).catch(error=>{console.error('Model loading failed:',error);$('#status').textContent=`${config.name}模型未能加载，保留概念形态。`;});
 const picker=new THREE.Mesh(new THREE.BoxGeometry(1.85,1.6,1.85),new THREE.MeshBasicMaterial({visible:false}));picker.position.y=.75;picker.userData.index=i;places[i].add(picker);pickers.push(picker);
 const b=document.createElement('button');b.className='hotspot';b.setAttribute('aria-label',`查看${config.name}的餐盘`);b.addEventListener('pointerenter',e=>{if(e.pointerType!=='touch')openDetail(i);});b.addEventListener('click',()=>openDetail(i,true));$('#hotspots').append(b);buttons.push(b);
});
function setupDetail(){
 if(detailRenderer)return;
 detailRenderer=makeRenderer(detailHost);detailRenderer.setClearColor(0x080808,1);detailRenderer.domElement.setAttribute('aria-label','可旋转和缩放的餐盘作品');
 detailScene=new THREE.Scene();detailScene.environment=env.texture;detailScene.environmentIntensity=.40;addLights(detailScene);
 detailCamera=new THREE.PerspectiveCamera(37,1,.1,30);detailCamera.position.set(0,2.25,3.9);detailCamera.lookAt(0,.65,0);detailRoot=new THREE.Group();detailScene.add(detailRoot);
 detailHost.addEventListener('pointerdown',e=>{if(e.button!==0)return;e.preventDefault();drag={x:e.clientX,id:e.pointerId};detailHost.setPointerCapture(e.pointerId);detailHost.classList.add('dragging');});
 detailHost.addEventListener('pointermove',e=>{if(!drag||e.pointerId!==drag.id)return;angles[selected]+=(e.clientX-drag.x)*.012;drag.x=e.clientX;detailArtwork.rotation.y=angles[selected];});
 detailHost.addEventListener('pointerup',endDrag);detailHost.addEventListener('pointercancel',endDrag);
 detailHost.addEventListener('wheel',e=>{e.preventDefault();zoom(Math.exp(-Math.max(-150,Math.min(150,e.deltaY))*.0015));},{passive:false});
}
function populateDetail(i){
 detailRoot.clear();places[i].children.filter(o=>o.name.startsWith('plate-')).forEach(o=>detailRoot.add(o.clone()));
 detailArtwork=artworks[i].clone(true);detailArtwork.scale.setScalar(scales[i]);detailArtwork.rotation.y=angles[i];detailRoot.add(detailArtwork);$('#scale-label').value=`${Math.round(scales[i]*100)}%`;
}
function openDetail(i,explicit=false){
 if(turn.busy||dialog.open||(!explicit&&i===suppressed))return;selected=i;setupDetail();populateDetail(i);dialog.setAttribute('aria-label',`${OBJECTS[i].name}：餐盘与三维物件查看窗口`);dialog.showModal();resizeDetail();$('#close-inspector').focus({preventScroll:true});$('#status').textContent=`已打开${OBJECTS[i].name}，拖动旋转，滚轮缩放`;
}
function closeDetail(){if(dialog.open)dialog.close();}
function endDrag(){if(drag&&detailHost.hasPointerCapture(drag.id))detailHost.releasePointerCapture(drag.id);drag=null;detailHost.classList.remove('dragging');}
dialog.addEventListener('close',()=>{endDrag();suppressed=selected;});
$('#close-inspector').onclick=closeDetail;
dialog.addEventListener('click',e=>{if(e.target!==dialog)return;const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)closeDetail();});
function zoom(factor){if(selected<0||!dialog.open)return;scales[selected]=clampScale(scales[selected]*factor);detailArtwork.scale.setScalar(scales[selected]);$('#scale-label').value=`${Math.round(scales[selected]*100)}%`;frameDetail();}
$('#smaller').onclick=()=>zoom(1/1.12);$('#larger').onclick=()=>zoom(1.12);$('#reset').onclick=()=>{scales[selected]=1;angles[selected]=0;detailArtwork.scale.setScalar(1);detailArtwork.rotation.y=0;$('#scale-label').value='100%';frameDetail();};
function rotateTable(d){closeDetail();endDrag();turn.turn(d);}
$('#previous').onclick=()=>rotateTable(-1);$('#next').onclick=()=>rotateTable(1);
addEventListener('keydown',e=>{if(e.repeat||e.altKey||e.ctrlKey||e.metaKey||e.target.closest('input,textarea,select,[contenteditable="true"]'))return;const k=e.key.toLowerCase();if(k==='a'||k==='d'){e.preventDefault();rotateTable(k==='a'?-1:1);}});
function hit(e){const r=renderer.domElement.getBoundingClientRect();pointer.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);raycaster.setFromCamera(pointer,camera);return raycaster.intersectObjects(pickers,false)[0]?.object.userData.index??-1;}
renderer.domElement.addEventListener('pointermove',e=>{if(turn.busy||dialog.open||e.pointerType==='touch')return;const i=hit(e);if(i!==suppressed)suppressed=-1;renderer.domElement.style.cursor=i>=0?'pointer':'default';if(i>=0)openDetail(i);});
renderer.domElement.addEventListener('click',e=>{const i=hit(e);if(i>=0)openDetail(i,true);});
addEventListener('blur',endDrag);
function frameDetail(){
 if(!detailArtwork)return;detailRoot.updateMatrixWorld(true);const box=new THREE.Box3().setFromObject(detailRoot),sphere=box.getBoundingSphere(new THREE.Sphere());const fov=THREE.MathUtils.degToRad(detailCamera.fov);const limitingAngle=Math.min(fov/2,Math.atan(Math.tan(fov/2)*detailCamera.aspect));const distance=Math.max(4.2,sphere.radius/Math.sin(limitingAngle)*1.08);detailCamera.position.copy(sphere.center).addScaledVector(new THREE.Vector3(0,.40,.9165),distance);detailCamera.lookAt(sphere.center);
}
function resizeDetail(){if(!detailRenderer||!dialog.open)return;const w=detailHost.clientWidth,h=detailHost.clientHeight;detailCamera.aspect=w/h;detailCamera.updateProjectionMatrix();detailRenderer.setSize(w,h);frameDetail();}
function resize(){const w=host.clientWidth,h=host.clientHeight;camera.aspect=w/h;const distance=Math.max(11.6,10.8/camera.aspect);camera.position.set(0,0.8+distance*.36,distance*.933);camera.lookAt(0,.8,0);camera.updateProjectionMatrix();renderer.setSize(w,h);resizeDetail();}
addEventListener('resize',resize);resize();
const projected=new THREE.Vector3();
function animate(now){turn.update(now,reduced.matches);table.rotation.y=baseAngle+turn.angle;
 if(lastSide!==turn.side){lastSide=turn.side;$('#side').value=`${String(lastSide+1).padStart(2,'0')} / 03`;$('#status').textContent=`餐桌方向 ${lastSide+1}`;}
 table.updateMatrixWorld(true);buttons.forEach((b,i)=>{projected.set(0,.15,0);places[i].localToWorld(projected);projected.project(camera);b.style.left=`${(projected.x*.5+.5)*host.clientWidth}px`;b.style.top=`${(-projected.y*.5+.5)*host.clientHeight}px`;b.disabled=turn.busy;});
 renderer.render(scene,camera);if(dialog.open&&detailRenderer)detailRenderer.render(detailScene,detailCamera);
 host.dataset.side=String(turn.side);host.dataset.angle=String(turn.angle);host.dataset.busy=String(turn.busy);host.dataset.scales=scales.join(',');host.dataset.rotations=angles.join(',');host.dataset.inspected=dialog.open?String(selected):'';
}
renderer.setAnimationLoop(animate);$('#loading').remove();
renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();renderer.setAnimationLoop(null);const p=document.createElement('p');p.id='loading';p.textContent='三维画面暂时中断，请刷新恢复。';host.append(p);});
