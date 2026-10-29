# Project purpose

This repository develops the `isometricCarFactory` skill in `.agents/.skills/isometricCarFactory/`. The showroom is a testing utility for saved car artifacts.

- For car generation requests, follow the local skill. Implement the requested geometry, then run `scripts/generate-car.mjs` to save a unique folder under `cars/`. Report that folder.
- Preserve prior car outputs. A revision is a new generation; do not overwrite previous snapshots or replace the showroom's history with a hardcoded current car.
- The showroom loads saved `model.json` assets discovered through `manifest.json`. Keep generation independent of the preview UI.
- When modifying the export helper or starter factory, update its bundled copy in the skill's `scripts/` or `assets/` directory. Do not update historical `cars/*/factory.js` files.
- Run `npm test` and `npm run build` for generator or preview changes. Validate skill changes with the skill-creator validator when available.
