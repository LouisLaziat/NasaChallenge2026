# Shared contracts

These shapes let the four lanes work in parallel. **Only the engine lane (Codex 2) may change
them.** Any change must be written here and announced in `STATUS.md` *before* it is merged.

Conventions used everywhere:

- Grid cells are addressed as `x` (column, 0 = west edge) and `y` (row, 0 = **north** edge).
- Lat/lon are planetocentric degrees, longitude **east-positive** (Jezero ≈ 18.4° N, 77.4° E).
- Distances in metres, times in seconds, oxygen in kg, dose in mSv, energy in joules.

## 1. Terrain file — `data/<set>/terrain.json`

```jsonc
{
  "name": "Jezero delta front, HiRISE DTM crop",
  "synthetic": false,          // true for invented demo terrain; the UI must say so
  "width": 400,                // cells, west -> east
  "height": 400,               // cells, north -> south
  "cellSize": 5,               // metres per cell (square cells)
  "origin": { "lat": 18.47, "lon": 77.38 },   // NORTH-WEST CORNER of the grid
  "layers": {
    "elevation":      [ ... ], // metres, length width*height, row by row, north row first
    "thermalInertia": [ ... ], // J m^-2 K^-1 s^-1/2; low = loose sand, high = bedrock
    "roughness":      [ ... ], // 0..1; >0.8 is impassable (boulders, cliffs)
    "science":        [ ... ]  // OPTIONAL 0..1 science interest, for colouring only
  },
  "sources": [                 // OPTIONAL, shown in the UI credits
    { "layer": "elevation", "name": "USGS HiRISE DTM mosaic, Jezero", "url": "..." }
  ]
}
```

All layers are flat arrays (not nested). Missing values: use `null` in elevation (cell becomes
blocked). Cell centre ↔ lat/lon: use `cellToLatLon` / `latLonToCell` from `js/engine.js`
(spherical Mars, radius 3 389 500 m). Keep files under ~5 MB: 400 × 400 at 5 m (2 km square)
is the target for real data.

## 2. Targets file — `data/<set>/targets.json`

```jsonc
{
  "habitat": { "name": "Habitat", "x": 175, "y": 100 },
  "targets": [
    {
      "id": "T1",                  // unique, short
      "name": "Delta front layers",
      "x": 112, "y": 98,           // cell position ... OR ...
      "lat": 18.45, "lon": 77.40,  // ... lat/lon (resolved to x/y by resolveTargets); x/y wins
      "value": 9,                  // science value 1..10
      "dwellMin": 45,              // minutes spent working at the stop
      "note": "Why it matters, one sentence.",
      "sol": 420,                  // OPTIONAL rover day; used to find nearby Perseverance photos
      "photos": [                  // OPTIONAL, filled by the photos lane
        { "url": "https://...", "sol": 420, "camera": "MCZ_LEFT", "caption": "..." }
      ]
    }
  ]
}
```

## 3. Area file — `data/real/area.json` (owned by the photos lane)

The one shared decision about *where* the real walk happens. The data lane crops to it.

```jsonc
{ "centerLat": 18.45, "centerLon": 77.40, "sizeM": 2000, "cellSize": 5,
  "why": "Along Perseverance's delta-front traverse, sols ~420–600, many Mastcam-Z images." }
```

## 4. Plan result — what `planWalk(terrain, targets, options)` returns

`options = { stopIds?: string[], conditions?: { dustStorm?, solarEvent?, heavyKit? }, config? }`

```jsonc
{
  "ok": true,
  "conditions": { "dustStorm": true },
  "order": ["D2", "D6", "D4"],                 // stop ids in visiting order
  "stops": [{ "id", "name", "x", "y", "value", "dwellMin",
              "pathIndex",                     // index into `path` where the stop is
              "arriveS", "arriveO2Kg" }],      // elapsed time / O2 used on arrival
  "unreachable": ["D9"],                       // stops you can't reach AND return from
  "legs": [{ "from": "habitat", "to": "D2", "path": [[x, y], ...],
             "distanceM", "timeS", "energyJ", "o2Kg" }],
  "path": [[x, y], ...],                       // full route, habitat -> ... -> habitat
  "totals": { "distanceM", "walkTimeS", "dwellTimeS", "totalTimeS", "energyJ",
              "o2UsedKg", "o2UsableKg", "o2CapacityKg",
              "doseMSv", "doseLimitMSv", "scienceValue" },
  "withinBudget": false,
  "violations": ["oxygen", "radiation"],
  "turnBack": { "pathIndex", "x", "y", "elapsedS", "o2UsedKg" },   // or null when O2 is fine
  "dropSuggestion": { "id", "name", "value", "o2SavedKg", "doseSavedMSv", "makesFeasible" } // or null
}
```

`turnBack` is the last point on the route from which the astronaut can still walk home on the
cheapest path without dipping into the O2 reserve. It is `null` when the whole route fits.

**Planned additions (engine lane, additive only):** `profile` — O2 remaining and dose along the
path for a chart; `bestSubset` — the highest-value set of stops that fits the budget.

## 5. UI ↔ photos hook

`js/photos.js` exports:

```js
export function renderPhotos(container /* HTMLElement */, stop /* a target object */) {}
export function photoMarkerIcon(stop) {}   // OPTIONAL: thumbnail icon for the map marker
```

`js/app.js` calls `renderPhotos` whenever a stop is selected. Until the photos lane merges,
`js/photos.js` on `develop` is a stub that renders the stop's `note`.

`js/basemap.js` exports:

```js
export function addBaseLayers(map /* L.Map */, terrain) {}  // returns { layers, control }
```
