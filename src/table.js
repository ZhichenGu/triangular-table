import * as THREE from 'three';
const cloth=new THREE.MeshStandardMaterial({color:0xd7d0bb,roughness:.93,side:THREE.DoubleSide});
const china=new THREE.MeshPhysicalMaterial({color:0xe8e4d8,roughness:.23,metalness:.08,clearcoat:.65});
const silver=new THREE.MeshStandardMaterial({color:0xa6aca9,metalness:.94,roughness:.25});
const trim=new THREE.MeshStandardMaterial({color:0x9c8862,metalness:.6,roughness:.4});
function mesh(g,m,parent,x=0,y=0,z=0){const o=new THREE.Mesh(g,m);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o;}
function edgePoints(r){return [new THREE.Vector3(-Math.sqrt(3)*r/2,0,r/2),new THREE.Vector3(Math.sqrt(3)*r/2,0,r/2),new THREE.Vector3(0,0,-r)];}
function clothSkirt(parent,a,b,inside=false){
 const positions=[],indices=[],width=a.distanceTo(b),normal=new THREE.Vector3().addVectors(a,b).normalize().multiplyScalar(inside?-1:1);
 const N=110,M=18;
 for(let i=0;i<=N;i++)for(let j=0;j<=M;j++){
  const u=i/N,v=j/M,p=a.clone().lerp(b,u);
  const folds=(Math.sin(u*width*17)*.035+Math.sin(u*width*7+.4)*.027)*Math.pow(v,.7);
  p.addScaledVector(normal,folds+.038*Math.sin(v*Math.PI));
  positions.push(p.x,1.43-v*(inside?.86:1.15)+Math.sin(u*width*17)*.017*v*v,p.z);
 }
 for(let i=0;i<N;i++)for(let j=0;j<M;j++){let a=i*(M+1)+j,b=a+M+1;indices.push(a,b,a+1,b,b+1,a+1);}
 const geom=new THREE.BufferGeometry();geom.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geom.setIndex(indices);geom.computeVertexNormals();mesh(geom,cloth,parent);
 // Fine stitched hem catches the gallery light without a bold decorative band.
 const line=[];for(let i=0;i<=N;i++){const k=(i*(M+1)+M)*3;line.push(new THREE.Vector3(positions[k],positions[k+1]+.06,positions[k+2]));}
 mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(line),N,.006,4,false),new THREE.MeshStandardMaterial({color:0xb3a58b,roughness:1}),parent);
}
function glass(parent,x,z){
 const material=new THREE.MeshPhysicalMaterial({color:0xc8d0c8,metalness:.22,roughness:.1,transparent:true,opacity:.52,side:THREE.DoubleSide});
 mesh(new THREE.CylinderGeometry(.12,.135,.018,32),silver,parent,x,.018,z);
 mesh(new THREE.CylinderGeometry(.018,.024,.30,16),silver,parent,x,.17,z);
 const points=[new THREE.Vector2(.028,0),new THREE.Vector2(.07,.025),new THREE.Vector2(.15,.07),new THREE.Vector2(.18,.16),new THREE.Vector2(.175,.22)];
 mesh(new THREE.LatheGeometry(points,40),material,parent,x,.30,z);
 const lip=mesh(new THREE.TorusGeometry(.175,.006,6,40),silver,parent,x,.52,z);lip.rotation.x=Math.PI/2;
}
function cutlery(parent,x,kind){
 mesh(new THREE.CapsuleGeometry(.018,.32,4,8),silver,parent,x,.027,.14).rotation.x=Math.PI/2;
 if(kind==='fork'){
 mesh(new THREE.BoxGeometry(.10,.022,.14),silver,parent,x,.035,-.13);
 for(let i=0;i<4;i++)mesh(new THREE.CapsuleGeometry(.009,.115,3,6),silver,parent,x+(i-1.5)*.027,.035,-.25).rotation.x=Math.PI/2;
 }else{const blade=mesh(new THREE.BoxGeometry(.07,.025,.36),silver,parent,x-.015,.04,-.2);blade.rotation.y=-.03;}
}
export function buildTable(){
 const root=new THREE.Group();root.name='table';const outer=edgePoints(4.5),inner=edgePoints(2.05);
 const shape=new THREE.Shape();shape.moveTo(outer[0].x,-outer[0].z);outer.slice(1).forEach(p=>shape.lineTo(p.x,-p.z));shape.closePath();
 const hole=new THREE.Path();hole.moveTo(inner[0].x,-inner[0].z);[inner[2],inner[1]].forEach(p=>hole.lineTo(p.x,-p.z));hole.closePath();shape.holes.push(hole);
 const top=mesh(new THREE.ExtrudeGeometry(shape,{depth:.075,bevelEnabled:true,bevelThickness:.04,bevelSize:.045,bevelSegments:3,steps:1}),cloth,root,0,1.38,0);top.rotation.x=-Math.PI/2;
 for(let i=0;i<3;i++){clothSkirt(root,outer[i],outer[(i+1)%3]);clothSkirt(root,inner[i],inner[(i+1)%3],true);}
 const places=[];
 for(let i=0;i<3;i++){
  const angle=i*Math.PI*2/3,place=new THREE.Group();place.position.set(Math.sin(angle)*1.65,1.48,Math.cos(angle)*1.65);place.rotation.y=angle;root.add(place);
  const profile=[new THREE.Vector2(.001,.035),new THREE.Vector2(.48,.035),new THREE.Vector2(.62,.045),new THREE.Vector2(.77,.10),new THREE.Vector2(.88,.115),new THREE.Vector2(.91,.09),new THREE.Vector2(.88,.065),new THREE.Vector2(.65,.016),new THREE.Vector2(.001,.012)];
  const plate=mesh(new THREE.LatheGeometry(profile,80),china,place);plate.name='plate-'+i;
  const rim=mesh(new THREE.TorusGeometry(.867,.006,6,80),trim,place,0,.114,0);rim.rotation.x=Math.PI/2;rim.name='plate-rim';
  const innerRing=mesh(new THREE.TorusGeometry(.625,.003,5,80),trim,place,0,.048,0);innerRing.rotation.x=Math.PI/2;innerRing.name='plate-inner-ring';
  cutlery(place,-1.04,'fork');cutlery(place,1.04,'knife');glass(place,1.10,-.61);
  const napkin=mesh(new THREE.BoxGeometry(.32,.022,.49),new THREE.MeshStandardMaterial({color:0xd6d0c2,roughness:1}),place,-1.35,.025,.025);napkin.rotation.y=.08;
  places.push(place);
 }
 return {root,places};
}
