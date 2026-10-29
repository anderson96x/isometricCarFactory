// Manifests are the append-only catalog. Vite discovers additions in dev and build.
const manifests = import.meta.glob('../cars/*/manifest.json', { eager: true, import: 'default' });
const assets = import.meta.glob('../cars/*/{model.json,car.js,factory.js}', { eager: true, query: '?url', import: 'default' });

export const history = Object.entries(manifests).map(([path, manifest]) => {
  const directory = path.slice(0, path.lastIndexOf('/'));
  return { ...manifest, modelUrl: assets[`${directory}/model.json`],
    sourceUrl: assets[`${directory}/car.js`], factoryUrl: assets[`${directory}/factory.js`] };
}).sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id));

export function disposeModel(model) {
  const geometries = new Set(), materials = new Set();
  model.traverse(part => {
    if (part.isMesh) {
      geometries.add(part.geometry);
      for (const material of Array.isArray(part.material) ? part.material : [part.material]) materials.add(material);
    }
  });
  geometries.forEach(geometry => geometry.dispose());
  materials.forEach(material => material.dispose());
}
