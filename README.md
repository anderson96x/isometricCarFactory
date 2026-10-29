# isometricCarFactory

This project develops a skill for generating editable low-poly 3D cars. The showroom is a testing utility for inspecting saved generations.

The skill lives in [.agents/.skills/isometricCarFactory/SKILL.md](.agents/.skills/isometricCarFactory/SKILL.md), with a bundled starter factory and export helper for reuse in other projects. Ask the agent to use `$isometricCarFactory` to create a car; it should implement the model and save an independent output before previewing it.

## Generate and save

```sh
npm install
node scripts/generate-car.mjs --body-type=hatchback --color="#F5A623" --name="Orange Hatchback" --prompt="A compact orange hatchback"
```

Each invocation creates `cars/<timestamp>-<body-type>-<unique-id>/` containing:

- `manifest.json`: name, generation time, request notes and configuration.
- `car.js`: a configured ES module exporting `createGeneratedCar()`.
- `factory.js`: an independent snapshot of the factory source.
- `model.json`: baked geometry and materials loadable with core `THREE.ObjectLoader`.

Older outputs stay unchanged when the live factory changes. Generated folders belong in version control. The initial blue sedan and hatchback have been saved; their timestamps record this migration rather than their original creation times.

Optional flags: `--scale=1`, `--wheel-color="#232a2b"`, `--glass-color="#293f48"`, and `--factory=path/to/self-contained-factory.js`. The helper rejects unsupported body types and invalid configuration. Extend the geometry before exporting a new body type.

## Inspect saved history

Run `npm run dev` and open the printed Vite URL. The showroom discovers completed output folders, lists them newest first, and loads the selected saved model. Drag to orbit, scroll or use +/− to zoom, choose a camera preset, or enable auto-rotate. Artifact links download the selected model or source files; use both source files together.

New completed exports update the development preview through Vite. `npm run build` produces a static showroom including the current history; rebuild after adding cars. `npm run preview` serves that build.

## Reuse the car

```js
import { createGeneratedCar } from './cars/<generated-folder>/car.js';

const car = createGeneratedCar();
scene.add(car);
car.userData.setPaintColor('#285ca1');
```

Supported body types are `hatchback` and `sedan`. The hatchback has a shorter body and rear overhang, an upright rear window, and a liftgate with a rear wiper and roof lip. The sedan retains its separate trunk. Omitting `bodyType` or supplying an unknown type falls back to sedan for compatibility. Paint, wheel, and glass colors accept six-digit hex strings; invalid values fall back to their defaults. Front points toward local −Z, Y is up, and the four wheels touch Y=0. `wheelColor` and `glassColor` may also be supplied. Paint belongs to each car and can be changed without affecting other cars or nonpainted parts.

The sedan starter now uses a continuous tapered body shell with wheel openings, a curved cabin and glazing, and silver multi-spoke rims. For matching sedan image references, see the skill's [sedan design guide](.agents/.skills/isometricCarFactory/references/sedan-design.md).

Copy the generated folder into a project with Three.js installed. Alternatively, load `model.json` with `THREE.ObjectLoader`; no addon geometry registration is required. JSON models expose `userData.paintMaterialUUIDs` to identify painted materials and omit runtime callbacks.

After removing a source-created car, call `car.userData.dispose()` to release its resources. For JSON-loaded models, dispose geometry and materials yourself. `npm test` verifies grounding, material independence, window normals, independent output folders and ObjectLoader round trips. `npm run build` checks showroom bundling and artifact inclusion.
