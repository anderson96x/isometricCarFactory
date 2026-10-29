---
name: isometricCarFactory
description: Generate editable low-poly isometric Three.js cars, save each car as an independent artifact, and inspect saved generations in a testing showroom. Use for procedural car creation, body variants, paint changes, and game vehicle assets.
---

# isometricCarFactory

Create real, lightweight, editable 3D vehicle models for games using Three.js geometry and materials. Use supplied references to choose proportions and surface treatment; without references, default to a clean low-poly vehicle with solid colors and soft shadows. Do not produce a flat illustration or use an image as the car model.

## Reference-guided sedans

For a sedan request with image references, read [references/sedan-design.md](references/sedan-design.md) before shaping the body. The bundled sedan starter uses a continuous tapered shell with wheel openings, a curved cabin, separate hood and trunk, four side windows, and multi-spoke wheels. Adapt its geometry to the reference rather than only changing paint. Keep image watermarks, stock-site text, and sheet layouts out of the car asset.

## Deliverable and saved history

The skill and generated car assets are the product. The showroom is a testing utility. A generation is complete when its own folder has been written; replacing the currently displayed car alone is insufficient.

- In this repository, run `node scripts/generate-car.mjs --body-type=hatchback --color="#F5A623" --name="Orange Hatchback" --prompt="The user's car request"` after implementing and checking the requested model. The helper saves a unique folder under `cars/` and prints its path. Pass `--scale`, `--wheel-color`, or `--glass-color` as needed.
- Preserve every prior generation. New cars and requested revisions receive new folders. Do not edit historical factory snapshots to update all cars at once.
- Each folder contains `manifest.json` (identity, creation time, request notes, configuration), `car.js` (configured ES module), `factory.js` (independent source snapshot), and `model.json` (baked Three.js ObjectLoader asset). Source files import only Three.js, not the live repository factory. Reuse the whole folder or load `model.json` alone.
- The showroom automatically discovers completed `cars/*/manifest.json` entries, displays newest first, and loads the selected saved model. Keep it as a history browser with orbit, zoom and view controls; do not turn every generation request into a showroom redesign. Static builds include history as of their build; rebuild to include newer cars.
- The bundled factory currently implements `sedan` and `hatchback`. For another body type, implement its geometry first, then export it. The helper rejects silent body-type fallback. A self-contained alternate ES-module factory can be supplied with `--factory=path/to/factory.js`; it must export `createCar(config)` and set `userData.bodyType` and `userData.paintMaterials`.

When using this skill in another repository, copy [scripts/generate-car.mjs](scripts/generate-car.mjs) into that project's `scripts/` directory. Use the host's compatible Three.js factory, or copy [assets/createCar.js](assets/createCar.js) to `src/createCar.js` as a starting point. Install Three.js only if missing. Run the copied helper from the target project. It resolves `src/createCar.js` and `cars/` relative to its project root. Do not generate files inside the installed skill. Keep host scene integration optional; the testing showroom is not required to use an exported car.

## Workflow

1. **Inspect the project first.**
   - Read `package.json`, existing scene setup, renderer, camera, lighting, coordinate conventions, and code style.
   - Reuse the project's installed Three.js version and conventions. Do not replace the stack or create a second scene unnecessarily.
   - If there is no project yet, provide a minimal runnable example with a `createCar` factory and a scene preview.

2. **Clarify only essential choices.**
   - If the request does not specify them, use sensible defaults: body type `hatchback`, paint `#F5A623`, scale 1, front pointing toward local `-Z`.
   - If the user requests an interactive configurator, implement UI controls for body type and color. If they only request a model, expose these as parameters rather than adding UI.
   - If the requested body type is ambiguous, ask one concise question; otherwise proceed.

3. **Build the model from reusable parts.**
   - Return a `THREE.Group` from a factory such as `createCar({ bodyType, color, ... })`.
   - Use `BoxGeometry`, `CylinderGeometry`, `SphereGeometry` only where useful, and custom `BufferGeometry` for distinctive body silhouettes. Prefer low-poly, efficient meshes.
   - Use shared materials and helper functions for repeated components (wheels, windows, lights, bumpers, mirrors, trim).
   - Use separate materials for paint, glass, tires, wheel hubs, lights, and trim. Keep paint color configurable without recoloring glass, tires, lights, or interior.
   - Keep the model centered near the origin, with its wheels touching the ground plane `y = 0`. Use consistent dimensions and wheel placement across body types.
   - Give wheels recognizable rubber tires and simple hubs. Orient cylinder axes correctly for the chosen wheel placement.
   - Add front/rear lights, windows, bumpers, and mirrors when they improve silhouette recognition. Add door seams only as restrained geometry or line details; avoid visual clutter.
   - Prefer geometry over textures so the model remains crisp at game-camera distance. Avoid external assets, network dependencies, and heavy materials unless the project already uses them.

4. **Make body types visually distinct.**
   - Support the requested types; if unspecified, start with: `hatchback`, `sedan`, `sports`, `pickup`, `suv`, and `van`.
   - Differentiate types through proportions and geometry, not just labels:
     - `hatchback`: short rear, compact cabin, upright rear hatch.
     - `sedan`: distinct trunk, longer body, gently sloped cabin.
     - `sports`: low hood, low roof, wide stance, sloped windshield.
     - `pickup`: cabin plus visibly open cargo bed and side rails.
     - `suv`: taller cabin, higher ground clearance, robust proportions.
     - `van`: tall, boxier passenger/cargo body.
   - Keep a consistent design language across the family so different vehicles look like one game asset set.

5. **Expose safe customization.**
   - Provide a typed or documented configuration object, e.g. `{ bodyType, color, scale, wheelColor, glassColor }`.
   - Validate or safely normalize `bodyType` and `color`; use a documented fallback for unknown types or invalid colors.
   - Prefer a color string accepted by `THREE.Color` (hex strings such as `#E64B4B` are ideal).
   - Allow changing paint after creation through a helper or a clear material reference, without rebuilding unrelated parts.
   - Avoid mutating a shared global material when changing one car's color. Clone per-car paint materials or use per-instance materials.

6. **Integrate and demonstrate.**
   - Save the car using the export helper before changing the preview. Here, the history browser reads that artifact directly; no hardcoded current-car replacement is needed.
   - Export the factory in the project's module style (ES modules unless the project uses another convention).
   - Include a concise usage example showing how to add the group to a scene.
   - If requested, provide a preview scene with an orthographic camera, neutral background, ambient/key lighting, and soft shadows to showcase the isometric look. Do not force an orthographic camera into an existing gameplay camera unless asked.
   - If a UI is requested, make the color picker and body-type selector update the same car instance cleanly; avoid duplicate meshes and event-listener leaks.

7. **Verify the result.**
   - Run relevant project checks or build commands if available.
   - Check for missing imports, invalid Three.js APIs, incorrect wheel orientation, z-fighting, floating wheels, inverted normals, and materials unintentionally sharing paint color.
   - If visual preview tools are available, inspect the model from a three-quarter isometric angle and correct proportions before finishing.
   - Report the generated output folder, how to reuse it, and checks run. Be honest if rendering could not be visually verified.

## Visual acceptance criteria

- The car reads clearly from a three-quarter isometric view and from the game's intended camera distance.
- Silhouette and proportions matter more than tiny details.
- Surfaces use a restrained low-poly style: solid colors, limited material count, no photorealistic reflections, no excessive bevels, and no noisy textures.
- The car has four wheels unless the user requests a different vehicle.
- All wheels are attached to the body and meet the ground plane.
- Windows are distinct from body paint; tires are dark rubber; hubs, lights, and trim are visually legible.
- Body-type differences remain obvious at thumbnail size.
- Changing the selected color changes only painted body panels.
- Keep geometry and draw calls reasonable for real-time gameplay. Reuse geometry where possible, but avoid shared mutable paint materials between differently colored cars.

## Default design choices

- Style: clean low-poly game asset. Reference proportions take priority over toy-like exaggeration.
- Camera showcase: orthographic, three-quarter view; the car itself should be a normal 3D object and work with perspective cameras too.
- Lighting: soft ambient fill plus one directional key light; shadows only when supported by the host scene.
- Default paint: warm orange `#F5A623`.
- Default body type: `hatchback`.
- Local axes: Y up; front toward `-Z`; wheels along the left/right sides.
- Do not add branding, logos, license plates with real personal data, or unrelated scene elements unless requested.

For detailed implementation guidance and a suggested public API, read [references/car-factory-spec.md](references/car-factory-spec.md).
