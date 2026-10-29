# Sedans from isometric references

Use this guide for rounded passenger sedans like the supplied silver, white, and blue four-door references. These are full-size passenger-car proportions with restrained shading; avoid turning them into tall toy cars. The bundled `assets/createCar.js` implements a starting sedan in real 3D, not a projection of a reference image.

## Read the silhouette first

Separate the three volumes: low hood, raised passenger cabin, and a trunk deck extending behind the rear windshield. Compare wheel diameter, wheelbase, overhangs, roof length, and cabin height before adding details. For this reference family, useful starting dimensions are roughly 4.5 long, 1.85 wide, 1.5 high, with a 2.8 wheelbase and .73 tire diameter. Adapt these ratios when a different sedan reference calls for it.

The roof arches gently in side view and crowns slightly across its width. The windshield slopes back, the rear glass slopes down into a distinct trunk, and the roof is narrower than the shoulder. Four doors, two side windows per side separated by a dark B pillar, painted A/C pillars, and small mirrors distinguish the passenger cabin. A continuous dark side window that fills the entire cabin loses these cues.

## Shape surfaces instead of stacking boxes

- Define longitudinal stations with body half-width and shoulder height. Narrow the nose and tail in plan and lower the hood toward the front. Loft connected cross sections into one shell so highlights flow along the body. Reserve rounded boxes for small trim pieces and mirrors.
- Cut the lower side silhouette around each wheel. A tire pasted onto a solid slab does not create a wheel opening. Keep a narrow painted lip around the opening and clearance above the tire; use a narrower underbody to close the underside without filling the wells.
- Build a separate tapered cabin loft. Use several roof stations and a shallow crosswise crown instead of a flat rectangular roof plate. Keep front and rear glass on the actual cabin surface. If overlaying glass on a painted shell, interpolate the same cross section and offset slightly outward; approximate planes can become buried or flicker.
- Fit side glazing to the cabin taper and leave visible painted pillars. Add black seals and a B pillar. Keep door gaps thin and close to the surface; geometry floating outside the shell casts distracting shadows.
- Place lights relative to the finished bumper surface. With tapered ends, a lamp positioned using only the overall car length can disappear inside the shell. Use swept front lamps, restrained grille slats, red rear lamps, and plain plate recesses appropriate to the reference.
- Use dark tires and silver rims with repeated radial spokes. Cylinder axles run along X. Wheel detail should support the silhouette at the intended camera distance, not dominate the mesh budget.

## Check the four views

Inspect front-left, front-right, rear-left, and rear-right views of the same model using an orthographic camera. Check the hood/trunk distinction, the roof arc, symmetric lamp placement, window borders, wheel-well clearance, and ground contact. A single flattering view can hide buried lights, inverted faces, gaps between the roof and glazing, or an overly short trunk. Also inspect a side view if the cabin reads as a hatchback or coupe.

Use a neutral light background, soft shadows, dark opaque blue-gray glass, and moderately rough paint for the clean illustrated look. Slight window color variation can suggest reflection; textures, logos, and photorealistic paint are unnecessary. Preserve configurable paint independently from glass, tires, rims, trim, and lamps.

After checking the geometry, synchronize the working factory with the skill's bundled starter, then run the generation helper to save a new independent car folder. Do not revise previous snapshots to make history look consistent with the new design.
