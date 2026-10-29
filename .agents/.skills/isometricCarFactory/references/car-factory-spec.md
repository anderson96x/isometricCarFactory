# Car factory implementation spec

This document is a practical reference for implementing the skill in an existing Three.js codebase.

## Export contract

Copy the generator helper into the target project's `scripts/` directory before execution. It reads `src/createCar.js` (or `--factory`) and creates `cars/<UTC timestamp>-<body type>-<unique suffix>/` containing:

- `manifest.json`: schema version 1, unique `id`, display `name`, UTC `createdAt`, request `prompt`, configuration `config`, and artifact filenames under `files`.
- `factory.js`: complete factory source at generation time. Keep imports self-contained except for `three` and its addons.
- `car.js`: exports `config`, named `createGeneratedCar(overrides)` and the same function as default; uses the adjacent factory snapshot.
- `model.json`: core Three.js ObjectLoader JSON with baked BufferGeometry. Runtime callbacks and mesh references are excluded from serialized userData. Paint UUIDs identify materials for repainting.

Write the manifest after all artifacts succeed. The showroom discovers manifests without a manually maintained index, loads each saved model, and disposes the previous model when changing selection. Snapshot files must not import the current shared project factory. Earlier generations remain unchanged when new profiles are implemented. Generation requires a factory that declares the requested `userData.bodyType`; unsupported body types must not be saved as a different shape.

Import `createGeneratedCar` from an output's `car.js` to create a runtime group, or load its `model.json` using `new THREE.ObjectLoader().load(url, car => scene.add(car))`. The JSON asset needs no addon geometry registration.

## Suggested public API

```js
createCar({
  bodyType: "hatchback", // hatchback | sedan | sports | pickup | suv | van
  color: "#F5A623",
  scale: 1,
  wheelColor: "#24262B",
  hubColor: "#B9C0C8",
  glassColor: "#9CB8D2",
});
```

Return a `THREE.Group` with useful `userData`, for example:
- `group.userData.bodyType`
- `group.userData.paintMaterials` (the materials that should change when repainting)
- `group.userData.setPaintColor(hex)` or an exported `setCarColor(group, hex)` helper

Document whether the factory uses `dispose()` ownership conventions. Do not dispose shared geometries while other cars still use them.

## Suggested structure

- `createCar()` — validates options, creates group, selects a body profile, adds shared parts.
- `createBodyShell()` — builds type-specific lower body and upper cabin.
- `createCabin()` — makes cabin and windows distinct, with stylized sloped or upright shapes as appropriate.
- `createWheels()` — creates four wheels with consistent axle positions and correctly oriented cylinders.
- `createDetails()` — adds bumpers, headlights, taillights, mirrors, hubs, and optional restrained seams.
- `setCarColor()` — changes only the car's paint materials.

Use helper functions and a small number of reusable geometries. If the project creates many cars, cache immutable geometry and non-paint materials. Keep each car's paint material independent or clone it per instance.

## Geometry and proportion guidelines

Use one consistent unit scale across body types. A reasonable starting envelope for a compact car is approximately:
- length: 3.8–4.4 units
- width: 1.7–2.0 units
- total height: 1.3–1.7 units
- wheel radius: 0.32–0.42 units

These are starting proportions, not rigid requirements. Tune the silhouette for the requested style. Put the bottom of the tires at `y = 0`; position the body above the axle line.

### Silhouette cues

- Hatchback: compact rear volume; steep rear window/hatch.
- Sedan: longer rear deck/trunk; cabin ends before the rear bumper.
- Sports: lower roof and cabin; longer, low hood; wider stance.
- Pickup: cabin separated visually from an open bed; visible bed floor and side walls.
- SUV: taller body, higher ride height, taller cabin.
- Van: tall rectangular cargo/passenger volume and short hood.

### Wheels

Three.js `CylinderGeometry` cylinders are created along the Y axis by default. Rotate each wheel so its axle runs across the car's width (local X axis). Check this explicitly in the preview; a wheel that faces upward is a common bug. Use tire and hub meshes with restrained detail.

### Materials

Use `MeshStandardMaterial` or the project's existing material convention. Keep paint, glass, tire, hubs, lights, and trim separate. A slightly rough paint material typically suits this style better than mirror-like car paint. Avoid `MeshPhysicalMaterial` clearcoat unless the project's art direction calls for it.

## Minimal integration example

```js
import * as THREE from "three";
import { createCar } from "./createCar.js";

const car = createCar({
  bodyType: "pickup",
  color: "#3B82F6",
});

scene.add(car);
```

If the project needs live recoloring, use the factory's documented repaint helper rather than traversing every mesh and recoloring all materials indiscriminately.

## Configurator UI (only when requested)

- Body type: native `<select>` or existing component library select.
- Color: `<input type="color">` or existing design-system color control.
- Updates should change the existing car instance, not add a new group on every input event.
- Keep UI state synchronized with the actual selected body type and paint.
- If changing body type requires rebuilding geometry, remove the previous group, dispose only instance-owned resources, and add the replacement.
- Ensure listeners are removed when the UI/component unmounts.

## Verification checklist

- [ ] The module imports in the target project.
- [ ] Every supported body type has a distinct silhouette.
- [ ] Wheels rotate around the correct axis and touch the ground.
- [ ] The front/rear orientation is documented and consistent.
- [ ] Repainting does not recolor glass, tires, hubs, or lights.
- [ ] Two cars with different paint colors do not affect each other.
- [ ] The model works under the host game's camera and lights.
- [ ] No unexpected dependencies or network-loaded assets were added.
