import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const BLUE = '#387fc4';
const validColor = (value, fallback) => typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value) ? value : fallback;

const profiles = {
  sedan: { length: 4.3, hoodLength: 1.5, hoodZ: -1.35, rearDeckLength: .95, rearDeckZ: 1.65,
    bottomFront: -1.04, roofFront: -.51, roofBack: .65, bottomBack: 1.23, upperY: 1.62,
    frontAxle: -1.36, rearAxle: 1.34, mirrorZ: -.87, rearHandleZ: .72 },
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
  const car = new THREE.Group();
  const type = Object.hasOwn(profiles, bodyType) ? bodyType : 'sedan';
  const profile = profiles[type];
  const isHatchback = type === 'hatchback';
  car.name = isHatchback ? 'Hatchback' : 'Sedan';
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
    return mesh(geometry, mat, 0, 0, 0);
  }
  function bar(a, b, width, mat) {
    const start = new THREE.Vector3(...a), end = new THREE.Vector3(...b);
    const part = box(width, start.distanceTo(end), width, mat, ...start.clone().add(end).multiplyScalar(.5).toArray(), .008);
    part.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), end.sub(start).normalize());
    return part;
  }

  // Sedan has a distinct trunk; hatchback ends directly behind its upright cabin.
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
  if (isHatchback) {
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
    box(isHatchback ? .25 : .38,isHatchback ? .23 : .17,.055,tailLight,x,.85,rear-.005,.025);
  }
  box(1.65,.13,.08,trim,0,.52,rear-.007,.025);
  box(.46,.15,.02,silver,0,.75,rear+.01,.015);
  car.scale.setScalar(Number.isFinite(scale) && scale > 0 ? scale : 1);
  car.userData = {
    bodyType: type, paintMaterials: [paint], wheels: wheelGroups,
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
