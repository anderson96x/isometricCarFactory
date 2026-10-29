import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { randomUUID } from 'node:crypto';
import { parseArgs } from 'node:util';
import { BufferGeometry } from 'three';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

export function serializeCar(car, config) {
  const runtimeData = car.userData;
  const originalGeometry = new Map();
  const bakedGeometry = new Map();
  try {
    car.updateMatrixWorld(true);
    car.userData = { bodyType: config.bodyType, color: config.color, paintMaterialUUIDs: runtimeData.paintMaterials.map(material => material.uuid) };
    // Bake addon/parametric geometry so ObjectLoader needs only core Three.js.
    car.traverse(part => {
      if (!part.isMesh) return;
      originalGeometry.set(part, part.geometry);
      if (!bakedGeometry.has(part.geometry)) bakedGeometry.set(part.geometry, new BufferGeometry().copy(part.geometry));
      part.geometry = bakedGeometry.get(part.geometry);
    });
    return car.toJSON();
  } finally {
    car.userData = runtimeData;
    for (const [part, geometry] of originalGeometry) part.geometry = geometry;
    for (const geometry of bakedGeometry.values()) geometry.dispose();
  }
}

/** Save an independent source snapshot and geometry artifact for one generation. */
export async function generateCar({ bodyType = 'hatchback', color = '#F5A623', scale = 1,
  wheelColor = '#232a2b', glassColor = '#293f48', name, prompt = '', factoryPath = join(projectRoot, 'src/createCar.js') } = {},
  outputRoot = join(projectRoot, 'cars')) {
  if (![color, wheelColor, glassColor].every(value => /^#[0-9a-f]{6}$/i.test(value))) throw new Error('Colors must use #RRGGBB format.');
  if (!Number.isFinite(scale) || scale <= 0) throw new Error('Scale must be a positive number.');
  if (!/^[a-z][a-z0-9-]*$/.test(bodyType)) throw new Error('Body type must be a lowercase identifier.');
  const sourcePath = resolve(factoryPath);
  const source = await readFile(sourcePath, 'utf8');
  const { createCar } = await import(pathToFileURL(sourcePath).href);
  const config = { bodyType, color, scale, wheelColor, glassColor };
  const car = createCar(config);
  try {
    if (car.userData.bodyType !== bodyType) throw new Error(`Factory does not support ${bodyType}. Implement that body type before exporting it.`);
    const createdAt = new Date().toISOString();
    const id = `${createdAt.replace(/[:.]/g, '-')}-${bodyType}-${randomUUID().slice(0, 8)}`;
    const manifest = { schemaVersion: 1, id, name: name || `${bodyType[0].toUpperCase()}${bodyType.slice(1)}`,
      createdAt, prompt, config, files: { model: 'model.json', source: 'car.js', factory: 'factory.js' } };
    const model = serializeCar(car, config);
    const directory = join(outputRoot, id);
    await mkdir(outputRoot, { recursive: true });
    await mkdir(directory);
    const moduleSource = `// Generated car. Install Three.js in the consuming project.\nimport { createCar } from './factory.js';\n\nexport const config = ${JSON.stringify(config, null, 2)};\nexport const createGeneratedCar = (overrides = {}) => createCar({ ...config, ...overrides });\nexport default createGeneratedCar;\n`;
    await Promise.all([
      writeFile(join(directory, 'factory.js'), source),
      writeFile(join(directory, 'car.js'), moduleSource),
      writeFile(join(directory, 'model.json'), JSON.stringify(model)),
    ]);
    // Publish the manifest last: history only discovers completed exports.
    await writeFile(join(directory, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
    return { directory, manifest };
  } finally { car.userData.dispose?.(); }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const { values } = parseArgs({ options: {
      'body-type': { type: 'string', default: 'hatchback' }, color: { type: 'string', default: '#F5A623' },
      scale: { type: 'string', default: '1' }, name: { type: 'string' }, prompt: { type: 'string' },
      'wheel-color': { type: 'string' }, 'glass-color': { type: 'string' }, factory: { type: 'string' },
    } });
    const result = await generateCar({ bodyType: values['body-type'], color: values.color, scale: Number(values.scale),
      name: values.name, prompt: values.prompt, wheelColor: values['wheel-color'], glassColor: values['glass-color'], factoryPath: values.factory });
    console.log(`Saved ${result.manifest.name}\n${result.directory}`);
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
