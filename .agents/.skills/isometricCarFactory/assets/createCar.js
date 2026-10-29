import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const BLUE = '#387fc4';
const validColor = (value, fallback) => typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value) ? value : fallback;

const profiles = {
  hatchback: { length: 3.65, hoodLength: .92, hoodZ: -1.35, rearDeckLength: .32, rearDeckZ: 1.64,
    bottomFront: -.94, roofFront: -.43, roofBack: 1.36, bottomBack: 1.68, upperY: 1.7,
    frontAxle: -1.1, rearAxle: 1.1, mirrorZ: -.78, rearHandleZ: .88 },
};

/** Low-poly vehicles; Y up, front -Z, tires at Y=0.
 * Options: bodyType ('sedan' | 'hatchback'), color/wheelColor/glassColor (#RRGGBB), scale (>0).
 * Unknown body types and invalid colors fall back to sedan / Coastal Blue.
 * All resources belong to this instance. Call userData.dispose() when removing it.
 */
export function createCar({ bodyType = 'sedan', color = BLUE, scale = 1, wheelColor = '#232a2b', glassColor = '#293f48' } = {}) {
  if (bodyType !== 'hatchback') return createSedan({ color, scale, wheelColor, glassColor });
  const car = new THREE.Group();
  const profile = profiles.hatchback;
  car.name = 'Hatchback';
  const material = (color, roughness = .65, metalness = 0) => new THREE.MeshStandardMaterial({ color, roughness, metalness });
  const paint = material(validColor(color, BLUE), .46, .12);
  const glass = material(validColor(glassColor, '#293f48'), .3, .15);
  const rubber = material(validColor(wheelColor, '#232a2b'), .95);
  const trim = material('#243137', .75);
  const silver = material('#bdc8cd', .35, .5);
  const hubDark = material('#63717a', .5, .3);
  const headlight = material('#fff3c8', .4);
  const tailLight = material('#c65a49', .4);
  const shapeCache = new Map();
  function mesh(geometry, mat, x, y, z) {
    const part = new THREE.Mesh(geometry, mat);
    part.position.set(x, y, z); part.castShadow = true; part.receiveShadow = true;
    car.add(part); return part;
  }
  function box(w, h, d, mat, x, y, z, radius = .025) {
    const key = `${w},${h},${d},${radius}`;
    if (!shapeCache.has(key)) shapeCache.set(key, new RoundedBoxGeometry(w, h, d, 1, radius));
    return mesh(shapeCache.get(key), mat, x, y, z);
  }
  function quad(points, mat) {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(points.flat(), 3));
    geometry.setIndex([0, 1, 2, 0, 2, 3]); geometry.computeVertexNormals();
    const part = mesh(geometry, mat, 0, 0, 0);
    part.name = 'window';
    return part;
  }
  function bar(a, b, width, mat) {
    const start = new THREE.Vector3(...a), end = new THREE.Vector3(...b);
    const part = box(width, start.distanceTo(end), width, mat, ...start.clone().add(end).multiplyScalar(.5).toArray(), .008);
    part.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), end.sub(start).normalize());
    return part;
  }

  // The hatchback ends directly behind its upright cabin.
  box(1.87, .42, profile.length, paint, 0, .66, 0, .13);
  box(1.86, .22, profile.hoodLength, paint, 0, .91, profile.hoodZ, .075);
  box(1.85, .18, profile.rearDeckLength, paint, 0, .89, profile.rearDeckZ, .06);
  box(1.69, .11, profile.length - .44, trim, 0, .43, 0, .035);
  // Tapered cabin: lower edges are wider than the roof.
  const { bottomFront, roofFront, roofBack, bottomBack, upperY } = profile;
  const lowerY = .99, lowerX = .845, upperX = .71;
  quad([[-upperX,upperY,roofFront], [upperX,upperY,roofFront], [lowerX,lowerY,bottomFront], [-lowerX,lowerY,bottomFront]], glass);
  quad([[upperX,upperY,roofBack], [-upperX,upperY,roofBack], [-lowerX,lowerY,bottomBack], [lowerX,lowerY,bottomBack]], glass);
  for (const sign of [-1, 1]) {
    const vertices = [[sign*lowerX,lowerY,bottomFront], [sign*upperX,upperY,roofFront], [sign*upperX,upperY,roofBack], [sign*lowerX,lowerY,bottomBack]];
    if (sign === -1) vertices.reverse();
    quad(vertices, glass);
    bar([sign*lowerX,lowerY,bottomFront], [sign*upperX,upperY,roofFront], .065, paint);
    bar([sign*upperX,upperY,roofBack], [sign*lowerX,lowerY,bottomBack], .075, paint);
    bar([sign*lowerX,lowerY,.16], [sign*upperX,upperY,.16], .067, trim);
    bar([sign*lowerX,lowerY,bottomFront], [sign*lowerX,lowerY,bottomBack], .045, silver);
    box(.11,.17,.25, paint, sign*1.0, 1.04, profile.mirrorZ, .035);
    box(.014,.105,.17, glass, sign*1.061, 1.055, profile.mirrorZ + .015, .01);
    for (const z of [-.48, profile.rearHandleZ]) box(.025,.035,.19, silver, sign*.938, .885, z, .01);
    // Subtle lower door seams.
    bar([sign*.938,.49,.2], [sign*.938,.94,.2], .009, trim);
    bar([sign*.936,.51,-.94], [sign*.936,.51,1.08], .014, trim);
  }
  box(1.48,.09,roofBack-roofFront+.11,paint,0,upperY+.03,(roofFront+roofBack)/2,.045);
  bar([-.72,upperY+.01,roofFront-.02],[.72,upperY+.01,roofFront-.02],.055,paint);
  bar([-.72,upperY+.01,roofBack+.03],[.72,upperY+.01,roofBack+.03],.055,paint);
  {
    // Rear window sill, roof lip and a wiper emphasize the liftgate.
    bar([-lowerX,lowerY,bottomBack],[lowerX,lowerY,bottomBack],.055,paint);
    box(1.49,.065,.19,paint,0,upperY+.04,roofBack+.06,.02);
    bar([-.32,1.13,1.626],[.23,1.13,1.626],.025,trim);
    box(.24,.035,.025,trim,0,.905,profile.length/2+.005,.008);
  }
  // Tires have horizontal X axles. Four tires touch y=0 exactly.
  const tireGeometry = new THREE.CylinderGeometry(.365,.365,.22,16);
  const hubGeometry = new THREE.CylinderGeometry(.235,.235,.235,12);
  const capGeometry = new THREE.CylinderGeometry(.105,.105,.25,12);
  const wheelGroups = [];
  for (const x of [-.94,.94]) for (const z of [profile.frontAxle,profile.rearAxle]) {
    const wheel = mesh(tireGeometry,rubber,x,.365,z); wheel.rotation.z = Math.PI/2;
    wheel.name = 'tire'; wheelGroups.push(wheel);
    const hub = mesh(hubGeometry, silver, x,.365,z); hub.rotation.z = Math.PI/2;
    const cap = mesh(capGeometry, hubDark, x,.365,z); cap.rotation.z = Math.PI/2;
    for (let i=0;i<5;i++) {
      const angle=i*Math.PI*2/5;
      const spoke=box(.014,.065,.025,hubDark,x+Math.sign(x)*.121,.365+Math.cos(angle)*.165,z+Math.sin(angle)*.165,.005);
      spoke.rotation.x=angle;
    }
  }
  // Front lights and a restrained grille, with contrasting rear lamps.
  const nose = -profile.length/2, rear = profile.length/2;
  box(1.65,.14,.08,trim,0,.51,nose+.007,.025);
  box(.73,.17,.035,trim,0,.73,nose-.009,.02);
  for (const y of [.68,.73,.78]) box(.61,.012,.015,hubDark,0,y,nose-.03,.004);
  for (const x of [-.65,.65]) {
    box(.39,.19,.06,headlight,x,.83,nose-.004,.035);
    box(.25,.23,.055,tailLight,x,.85,rear-.005,.025);
  }
  box(1.65,.13,.08,trim,0,.52,rear-.007,.025);
  box(.46,.15,.02,silver,0,.75,rear+.01,.015);
  car.scale.setScalar(Number.isFinite(scale) && scale > 0 ? scale : 1);
  car.userData = {
    bodyType: 'hatchback', paintMaterials: [paint], wheels: wheelGroups,
    setPaintColor: (next) => setCarColor(car, next),
    dispose() {
      const geometries = new Set(), materials = new Set();
      car.traverse(part => { if (part.isMesh) { geometries.add(part.geometry); materials.add(part.material); } });
      geometries.forEach(g => g.dispose()); materials.forEach(m => m.dispose());
    },
  };
  return car;
}

/** Only paint changes; glass, wheels and lights keep their original materials. */
export function setCarColor(car, color) {
  const normalized = validColor(color, BLUE);
  car.userData.paintMaterials.forEach(material => material.color.set(normalized));
}

// A three-box sedan with a continuous shoulder and open wheel wells.
// Longitudinal stations shape the body; cabin glazing follows the same curved roof.
function createSedan({ color, scale, wheelColor, glassColor }) {
  const car = new THREE.Group();
  car.name = 'Sedan';
  const material = (hex, roughness = .65, metalness = 0) => new THREE.MeshStandardMaterial({ color: hex, roughness, metalness });
  const paint = material(validColor(color, BLUE), .48, .12);
  const glass = material(validColor(glassColor, '#293f48'), .32, .12);
  const rubber = material(validColor(wheelColor, '#232a2b'), .95);
  const trim = material('#202a2e');
  const seam = material('#718087');
  const silver = material('#c6cfd2', .38, .45);
  const lamp = material('#eef4ed', .35);
  const red = material('#c72e36', .4);
  const amber = material('#e2a24b');
  const geometries = new Map();
  function mesh(geometry, mat, name, x = 0, y = 0, z = 0) {
    const part = new THREE.Mesh(geometry, mat);
    part.name = name; part.position.set(x, y, z);
    part.castShadow = true; part.receiveShadow = true; car.add(part);
    return part;
  }
  function box(w, h, d, mat, name, x, y, z, radius = .015) {
    const key = [w,h,d,radius].join(',');
    if (!geometries.has(key)) geometries.set(key, new RoundedBoxGeometry(w,h,d,2,radius));
    return mesh(geometries.get(key),mat,name,x,y,z);
  }
  function surface(points, indices, mat, name) {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position',new THREE.Float32BufferAttribute(points.flat(),3));
    geometry.setIndex(indices); geometry.computeVertexNormals();
    return mesh(geometry,mat,name);
  }
  function polygon(points, mat, name, outward) {
    const a = new THREE.Vector3(...points[0]), b = new THREE.Vector3(...points[1]), c = new THREE.Vector3(...points[2]);
    if (b.sub(a).cross(c.sub(a)).dot(new THREE.Vector3(...outward)) < 0) points.reverse();
    return surface(points, Array.from({length:points.length-2},(_,i)=>[0,i+1,i+2]).flat(),mat,name);
  }
  function line(points, mat, name, radius = .006) {
    const curve = new THREE.CurvePath();
    for (let i=1;i<points.length;i++) curve.add(new THREE.LineCurve3(new THREE.Vector3(...points[i-1]),new THREE.Vector3(...points[i])));
    return mesh(new THREE.TubeGeometry(curve,Math.max(points.length*2,8),radius,4,false),mat,name);
  }
  const frontAxle = -1.43, rearAxle = 1.39, radius = .365, archRadius = .407;
  // The end caps taper in plan; intermediate stations round the bumper corners.
  const stations = [
    [-2.28,.69,.86],[-2.24,.79,.93],[-2.13,.87,.98],[-1.9,.91,1.015],
    [-1.13,.925,1.045],[-.65,.93,1.045],[.65,.93,1.045],
    [1.39,.92,1.035],[1.95,.89,1.005],[2.15,.83,.97],[2.25,.72,.9],
  ];
  function sample(z) {
    const i = Math.max(0,stations.findIndex((s,index)=>index<stations.length-1 && z>=s[0] && z<=stations[index+1][0]));
    const a=stations[i], b=stations[i+1], t=THREE.MathUtils.clamp((z-a[0])/(b[0]-a[0]),0,1);
    return [THREE.MathUtils.lerp(a[1],b[1],t),THREE.MathUtils.lerp(a[2],b[2],t)];
  }
  const zs = new Set(stations.map(s=>s[0]));
  for(const axle of [frontAxle,rearAxle]) for(let i=0;i<=20;i++) zs.add(axle-archRadius+2*archRadius*i/20);
  const bodyPoints=[], bodyIndices=[];
  for(const z of [...zs].sort((a,b)=>a-b)) {
    const [w,top]=sample(z);
    let bottom=.34;
    for(const axle of [frontAxle,rearAxle]) if(Math.abs(z-axle)<=archRadius) bottom=Math.max(bottom,radius+Math.sqrt(Math.max(0,archRadius**2-(z-axle)**2)));
    // Traverse clockwise when seen from the front, so the loft normals face out.
    bodyPoints.push([-w*.95,bottom,z],[-w,.83,z],[-w*.92,top-.025,z],[-w*.66,top+.018,z],
      [0,top+.027,z],[w*.66,top+.018,z],[w*.92,top-.025,z],[w,.83,z],[w*.95,bottom,z]);
  }
  const ring=9, count=bodyPoints.length/ring;
  for(let j=0;j<count-1;j++) for(let i=0;i<ring-1;i++) {
    const a=j*ring+i,b=a+ring;
    bodyIndices.push(a,b,a+1,b,b+1,a+1);
  }
  surface(bodyPoints,bodyIndices,paint,'body-shell');
  for(const [j,direction] of [[0,-1],[count-1,1]]) polygon(bodyPoints.slice(j*ring,(j+1)*ring),paint,'bumper-cap',[0,0,direction]);
  box(1.42,.07,3.95,trim,'underbody',0,.355,0,.025);

  // Cabin is a loft with a rounded roof cross section and sloping A/C pillars.
  const cabin=[[-1.12,1.055,.818],[-.97,1.18,.792],[-.57,1.455,.707],[-.34,1.515,.694],
    [.35,1.525,.694],[.67,1.47,.712],[.95,1.275,.77],[1.36,1.055,.818]];
  const cabinPoints=[], cabinIndices=[];
  for(const [z,y,w] of cabin) cabinPoints.push([-w,y-.035,z],[-w*.87,y+.005,z],[0,y+.025,z],[w*.87,y+.005,z],[w,y-.035,z]);
  for(let j=0;j<cabin.length-1;j++) for(let i=0;i<4;i++) {
    const a=j*5+i,b=a+5; cabinIndices.push(a,b,a+1,b,b+1,a+1);
  }
  surface(cabinPoints,cabinIndices,paint,'cabin-shell');
  const sideX = y => .847-(y-1.035)*.285;
  for(const sign of [-1,1]) {
    const side = yz=>yz.map(([y,z])=>[sign*sideX(y),y,z]);
    polygon(side([[1.04,-1.06],[1.42,-.55],[1.475,-.29],[1.485,.34],[1.435,.66],[1.25,.96],[1.04,1.28]]),paint,'cabin-side',[sign,0,0]);
    // Window borders leave painted A/C pillars and a black B pillar.
    const front=[[1.075,-.98],[1.397,-.535],[1.445,-.30],[1.449,.065],[1.075,.065]];
    const rear=[[1.075,.135],[1.449,.135],[1.451,.32],[1.405,.62],[1.238,.89],[1.075,1.17]];
    for(const outline of [front,rear]) {
      const points=side(outline).map(p=>[p[0]+sign*.009,p[1],p[2]]);
      polygon(points,glass,'window',[sign,0,0]);
      line([...points,points[0]],trim,'window-seal',.012);
    }
    polygon(side([[1.075,.065],[1.449,.065],[1.449,.135],[1.075,.135]]).map(p=>[p[0]+sign*.01,p[1],p[2]]),trim,'b-pillar',[sign,0,0]);
    line([[sign*.835,1.07,.10],[sign*.926,1.015,.11],[sign*.933,.91,.11],[sign*.933,.57,.15],[sign*.9,.43,.26]],seam,'door-seam',.004);
    line([[sign*.924,.43,-.91],[sign*.933,.415,-.7],[sign*.933,.415,.9]],seam,'door-sill',.005);
    for(const z of [-.25,.8]) box(.025,.034,.165,paint,'door-handle',sign*.931,.945,z,.012);
    box(.045,.028,2.0,paint,'rocker-panel',sign*.916,.362,-.025,.012);
    box(.18,.09,.19,paint,'mirror',sign*.976,1.09,-.85,.035);
    box(.016,.056,.128,glass,'mirror-glass',sign*1.069,1.095,-.83,.008);
    box(.013,.035,.055,amber,'side-indicator',sign*.928,.89,-1.02,.006);
    for(const axle of [frontAxle,rearAxle]) {
      const points=[];
      for(let i=0;i<=24;i++) {
        const theta=Math.PI*i/24,z=axle-archRadius*Math.cos(theta);
        points.push([sign*(sample(z)[0]*.963),radius+archRadius*Math.sin(theta),z]);
      }
      line(points,paint,'wheel-arch-lip',.018);
    }
  }
  // Curved windshield/rear glass: each strip matches a cabin station exactly.
  function glazing(zRows, rear=false) {
    const points=[],indices=[];
    for(const z of zRows) {
      const j=cabin.findIndex((row,index)=>index<cabin.length-1 && z>=row[0] && z<=cabin[index+1][0]);
      const a=cabin[j],b=cabin[j+1],t=(z-a[0])/(b[0]-a[0]);
      const y=THREE.MathUtils.lerp(a[1],b[1],t),w=THREE.MathUtils.lerp(a[2],b[2],t);
      for(const u of [-.97,-.87,-.72,-.54,-.36,-.18,0,.18,.36,.54,.72,.87,.97]) {
        const v=Math.abs(u);
        // Match the shell's piecewise roof crown, then lift clear of it.
        const crown=v<=.87 ? .025-.02*v/.87 : .005-.04*(v-.87)/.13;
        points.push([u*w,y+crown+.006,z]);
      }
    }
    for(let j=0;j<zRows.length-1;j++) for(let i=0;i<12;i++) {
      const a=j*13+i,b=a+13; indices.push(a,b,a+1,b,b+1,a+1);
    }
    const part=surface(points,indices,glass,'window');
    part.userData.glazing = rear ? 'rear' : 'front';
    const edge=[...points.slice(0,13),...zRows.slice(1).map((_,i)=>points[(i+2)*13-1]),
      ...points.slice(-13,-1).reverse(),...zRows.slice(1,-1).reverse().map((_,i)=>points[(zRows.length-2-i)*13])];
    line([...edge,edge[0]],trim,'window-seal',.012);
    return part;
  }
  glazing([-1.095,-.97,-.57]);
  glazing([.71,.95,1.315],true);
  // Panel gaps sit above the body crown, with no overlapping hood/trunk boxes.
  for(const [z,name] of [[-1.12,'hood-seam'],[1.39,'trunk-seam']]) {
    const [w,y]=sample(z);
    line([[-w*.87,y-.009,z],[-w*.65,y+.023,z],[0,y+.031,z],[w*.65,y+.023,z],[w*.87,y-.009,z]],seam,name,.004);
  }
  const wheels=[];
  const tireGeometry=new THREE.CylinderGeometry(radius,radius,.205,32);
  const rimGeometry=new THREE.CylinderGeometry(.279,.279,.012,24);
  const hubGeometry=new THREE.CylinderGeometry(.071,.071,.022,16);
  for(const sign of [-1,1]) for(const z of [frontAxle,rearAxle]) {
    const x=sign*.917;
    const tire=mesh(tireGeometry,rubber,'tire',x,radius,z); tire.rotation.z=Math.PI/2; wheels.push(tire);
    const face=sign*1.025;
    const rim=mesh(rimGeometry,trim,'rim-well',face,radius,z);rim.rotation.z=Math.PI/2;
    const ringMesh=mesh(new THREE.TorusGeometry(.261,.014,6,32),silver,'rim-lip',face+sign*.009,radius,z);ringMesh.rotation.y=Math.PI/2;
    const hub=mesh(hubGeometry,silver,'hub',face+sign*.018,radius,z);hub.rotation.z=Math.PI/2;
    for(let i=0;i<12;i++) {
      const angle=i*Math.PI/6;
      const spoke=box(.016,.204,.025,silver,'spoke',face+sign*.014,radius+Math.cos(angle)*.157,z+Math.sin(angle)*.157,.006);
      spoke.rotation.x=angle;
    }
  }
  // Shallow swept lamps and bumper inserts follow the tapered end faces.
  for(const sign of [-1,1]) {
    polygon([[sign*.405,.752,-2.294],[sign*.685,.772,-2.294],[sign*.69,.86,-2.294],[sign*.425,.85,-2.294]],lamp,'headlight',[0,0,-1]);
    polygon([[sign*.43,.78,2.269],[sign*.71,.8,2.269],[sign*.71,.89,2.269],[sign*.44,.885,2.269]],red,'taillight',[0,0,1]);
    box(.18,.024,.014,lamp,'reverse-light',sign*.575,.807,2.278,.005);
    box(.29,.026,.024,silver,'bumper-trim',sign*.56,.592,-2.27,.008);
  }
  box(.71,.15,.025,trim,'grille',0,.84,-2.289,.035);
  for(const y of [.79,.835,.88]) box(.64,.012,.012,silver,'grille-slat',0,y,-2.306,.004);
  box(.91,.105,.024,trim,'lower-intake',0,.495,-2.28,.025);
  box(.43,.112,.02,lamp,'front-plate',0,.63,-2.294,.01);
  box(.44,.115,.02,lamp,'rear-plate',0,.81,2.26,.01);
  box(1.28,.035,.018,seam,'rear-bumper-strip',0,.58,2.253,.008);
  car.scale.setScalar(Number.isFinite(scale)&&scale>0?scale:1);
  car.userData={bodyType:'sedan',paintMaterials:[paint],wheels,
    setPaintColor:next=>setCarColor(car,next),
    dispose() {
      const gs=new Set(),ms=new Set();
      car.traverse(p=>{if(p.isMesh){gs.add(p.geometry);ms.add(p.material);}});
      gs.forEach(g=>g.dispose());ms.forEach(m=>m.dispose());
    },
  };
  return car;
}
