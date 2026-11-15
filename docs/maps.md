<!-- Generated with AI assistance for NASA Space Apps 2026; reviewed by the team -->
# Mars Maps (`maps.html`) — change log and guide

Branch `maps`, built on `origin/integrate` (908b29c). Author: Claude session on Amarz's machine
(`amarz-maps`, separate from `amarz-claude`, which owns the Gale data lane).

## What changed

**New files only.** No file owned by another lane was edited; `STATUS.md` got append-only lines.

| File | What |
|---|---|
| `maps.html` | The page: map, glass side panel, GO chip, layer menu, place card, profile sheet |
| `css/maps.css` | Space/glass theme, mobile bottom-sheet layout |
| `js/maps/app.js` | UI: map, routes, steps, profile chart, search, layers, place cards, URL state |
| `js/maps/route.js` | Pure logic: the 3 route modes, re-measuring with the real model, profile, steps, viewshed, safety score |
| `js/maps/worker.js` | Runs `route.js` off the main thread |
| `js/maps/i18n.js` | English / French strings |
| `tests/maps.test.mjs` | 5 offline tests on the demo terrain (part of `npm test`) |
| `docs/maps.md` | This file |

Read-only reuse: `js/engine.js` (`planWalk`, `buildCostGrid`, `search`), `js/config.js`,
`js/basemap.js` (`addBaseLayers`), `js/photos.js` (`renderPhotos`), `js/render.js` (`paintHillshade`).

## Run

```bash
npm test          # 27/27 on integrate + maps
npm run serve     # then http://localhost:8080/maps.html
```

`?data=real` (default) · `?data=demo` · `?data=gale` (needs `data/gale/` from the `gale` branch) ·
`?lang=fr|en` · plus the CONTRACTS §7 parameters (`stops`, `dust`, `solar`, `kit`) and two of its
own: `mode=eco|safe|short`, `leave=HH:MM` (LMST).

## How the three routes are made

1. **Least oxygen** (`eco`): `planWalk` exactly as the engine lane ships it.
2. **Safest** (`safe`): `planWalk` with a copied config — max slope 15°, relaxed to 18° then the
   engine's own limit if a chosen stop becomes unreachable; grade, downhill braking, sand and
   roughness made much costlier. A routing preference, not physics.
3. **Shortest** (`short`): a copied config where every metre costs the same (no Tobler grade term,
   no sand/roughness penalty), so the cheapest path is the shortest walkable one.

Every route is then **re-measured with the real model** (`CONFIG` + conditions), so time, O₂ and
dose are comparable across the three cards. `tests/maps.test.mjs` checks that the re-measure of
the `eco` route equals the engine's own totals, so `edgeCost` in `route.js` stays in sync with
`edgeEnergy` in `engine.js`.

## Model choices and assumptions (shown in the UI)

- **Safety score 0–100**: heuristic (distance share on 10–15°, 15–20°, >20°; loose sand; out of
  sight of the habitat; negative O₂ margin; >2 km from habitat; steepest cell above 15°).
- **Line of sight**: 3 m habitat antenna to a 2 m suited astronaut, straight line over the DTM.
- **EVA window 08:00–16:00 LMST**: team assumption; returning later gives CAUTION.
- **GO / CAUTION / NO-GO**: NO-GO if O₂ or dose is over budget or a solar event is on; CAUTION for a
  dust storm, < 10 % O₂ margin, safety score < 50 or a late return. To be replaced or joined by
  `js/conditions.js` once that lane is merged.
- **Mars clock**: elapsed Earth seconds converted to LMST minutes (1 sol = 88 775 s).
- **Loose sand** = thermal inertia ≤ `CONFIG.terrain.looseSandTI` (none on Gale: no TI layer).
- Until the engine lane lowers `CONFIG.walk.maxSlopeDeg` to 20°, real routes can cross > 20° cells;
  Mars Maps paints those segments red on the map and in the profile.
