import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createCar, setCarColor } from './createCar.js';

for (const bodyType of ['sedan', 'hatchback']) {
test(`${bodyType}: four horizontal tires touch the ground`, () => {
  const car = createCar({ bodyType });
  assert.equal(car.userData.wheels.length, 4);
  car.updateMatrixWorld(true);
  for (const tire of car.userData.wheels) {
    const bounds = new THREE.Box3().setFromObject(tire);
    assert.ok(Math.abs(bounds.min.y) < 1e-6);
    assert.ok(bounds.max.x - bounds.min.x < .23);
  }
  car.userData.dispose();
});
}

test('repaint only changes one car’s painted panels', () => {
  const car = createCar({ bodyType: 'hatchback' }), other = createCar();
  const before = new Map();
  car.traverse(part => { if(part.isMesh) before.set(part.material, part.material.color.getHexString()); });
  setCarColor(car, '#ee5522');
  assert.equal(car.userData.paintMaterials[0].color.getHexString(), 'ee5522');
  assert.equal(other.userData.paintMaterials[0].color.getHexString(), '387fc4');
  for (const [mat, hex] of before) if (!car.userData.paintMaterials.includes(mat)) assert.equal(mat.color.getHexString(), hex);
  car.userData.dispose(); other.userData.dispose();
});

test('invalid configuration falls back safely', () => {
  const car = createCar({ bodyType:'unknown',color:'bad',scale:-2 });
  assert.equal(car.userData.bodyType,'sedan');
  assert.equal(car.userData.paintMaterials[0].color.getHexString(),'387fc4');
  assert.equal(car.scale.x,1);
  car.userData.dispose();
});

for (const bodyType of ['sedan', 'hatchback']) {
test(`${bodyType}: cabin windows face outside the car`, () => {
  const car = createCar({ bodyType });
  const windows = car.children.filter(part => part.isMesh && part.geometry.attributes.position.count === 4);
  assert.equal(windows.length,4);
  for(const window of windows) {
    const positions=window.geometry.attributes.position, normals=window.geometry.attributes.normal;
    const center=new THREE.Vector3();
    for(let i=0;i<positions.count;i++)center.add(new THREE.Vector3().fromBufferAttribute(positions,i));
    center.divideScalar(positions.count); center.y=0;
    const normal=new THREE.Vector3().fromBufferAttribute(normals,0);
    assert.ok(normal.dot(center)>0);
  }
  car.userData.dispose();
});
}

test('hatchback has a shorter body and a more upright rear window than sedan', () => {
  const sedan = createCar({ bodyType: 'sedan' });
  const hatchback = createCar({ bodyType: 'hatchback' });
  assert.equal(hatchback.userData.bodyType, 'hatchback');
  const sedanSize = new THREE.Box3().setFromObject(sedan).getSize(new THREE.Vector3());
  const hatchSize = new THREE.Box3().setFromObject(hatchback).getSize(new THREE.Vector3());
  assert.ok(hatchSize.z < sedanSize.z - .5);
  const slope = car => {
    const rearWindow = car.children.filter(part => part.isMesh && part.geometry.attributes.position.count === 4)[1];
    const position = rearWindow.geometry.attributes.position;
    return Math.abs((position.getZ(2) - position.getZ(0)) / (position.getY(2) - position.getY(0)));
  };
  assert.ok(slope(hatchback) < slope(sedan) * .6);
  sedan.userData.dispose(); hatchback.userData.dispose();
});
