import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ObjectLoader, Box3, Vector3 } from 'three';
import { generateCar } from './generate-car.mjs';
import { createCar } from '../src/createCar.js';

test('each generation is preserved independently and can be loaded with core Three.js', async () => {
  const root = await mkdtemp(join(tmpdir(), 'car-history-'));
  try {
    const first = await generateCar({ bodyType: 'sedan', color: '#387fc4', prompt: 'A blue sedan' }, root);
    const before = await readFile(join(first.directory, 'model.json'), 'utf8');
    const sourceBefore = await readFile(join(first.directory, 'factory.js'), 'utf8');
    const second = await generateCar({ bodyType: 'hatchback', color: '#F5A623' }, root);
    assert.notEqual(first.manifest.id, second.manifest.id);
    assert.equal((await readdir(root)).length, 2);
    assert.equal(await readFile(join(first.directory, 'model.json'), 'utf8'), before);
    assert.equal(await readFile(join(first.directory, 'factory.js'), 'utf8'), sourceBefore);
    for (const result of [first, second]) {
      const json = JSON.parse(await readFile(join(result.directory, 'model.json'), 'utf8'));
      assert.ok(json.geometries.every(geometry => geometry.type === 'BufferGeometry'));
      const loaded = new ObjectLoader().parse(json);
      const original = createCar(result.manifest.config);
      const actual = new Box3().setFromObject(loaded);
      const expected = new Box3().setFromObject(original);
      assert.ok(actual.min.distanceTo(expected.min) < 1e-6);
      assert.ok(actual.max.distanceTo(expected.max) < 1e-6);
      assert.ok(Math.abs(actual.min.y) < 1e-6);
      assert.equal(loaded.userData.bodyType, result.manifest.config.bodyType);
      assert.ok(actual.getSize(new Vector3()).z > 3);
      for (const file of ['car.js', 'factory.js', 'manifest.json']) assert.ok((await readFile(join(result.directory, file), 'utf8')).length > 0);
      original.userData.dispose();
    }
    await assert.rejects(generateCar({ bodyType: 'van' }, root), /does not support/);
    await assert.rejects(generateCar({ color: 'blue' }, root), /#RRGGBB/);
    await assert.rejects(generateCar({ scale: -1 }, root), /positive/);
    assert.equal((await readdir(root)).length, 2);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('bundled skill resources match the working generator and starter', async () => {
  for (const [working, bundled] of [
    ['scripts/generate-car.mjs', '.agents/.skills/isometricCarFactory/scripts/generate-car.mjs'],
    ['src/createCar.js', '.agents/.skills/isometricCarFactory/assets/createCar.js'],
  ]) {
    assert.equal(await readFile(new URL(`../${working}`, import.meta.url), 'utf8'),
      await readFile(new URL(`../${bundled}`, import.meta.url), 'utf8'));
  }
});
