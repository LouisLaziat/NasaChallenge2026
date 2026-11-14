# Brief — Claude 2: Photos and live NASA layers (branch `photos`)

You are the photos/NASA-data agent on Marswalk Budget, a NASA Space Apps 2026 route planner for
an astronaut walking at Jezero Crater. Read `AGENTS.md`, `CONTRACTS.md`, `STATUS.md` first.
Three other agents work in parallel; stay inside your files.

**Branch:** `photos`, from `develop`. **You own:** `js/photos.js`, `js/basemap.js`,
`scripts/fetch_photos.mjs`, `data/real/targets.json`, `data/real/area.json`.
**Do not edit:** engine, config, UI files (`index.html`, `css/`, `js/app.js`, `js/render.js`).

## Step 0 — verify the endpoints (do this first, record results in STATUS.md)

Nobody has tested these yet. Use the browser or `curl`:

1. **Mars Trek tiles** (NASA JPL, https://trek.nasa.gov/mars/). Find a WMTS/XYZ tile URL for a
   HiRISE or CTX mosaic covering Jezero and load one tile. Record the URL template, tile scheme
   (zoom/row/col order, TMS vs XYZ), projection (Leaflet needs EPSG:3857-style or a custom CRS),
   and whether it sends CORS headers.
2. **Perseverance raw images feed** (https://mars.nasa.gov/mars2020/multimedia/raw-images/). Find
   the JSON API behind the gallery, request one sol filtered to Mastcam-Z, and record the URL,
   the JSON fields for image URL / sol / camera / caption, and whether it sends CORS headers.
3. **Rover traverse/waypoints GeoJSON** behind NASA's "Where is Perseverance" map. Record the
   URL and the fields (sol, lat, lon).

If an API lacks CORS, don't fight it in the browser: `scripts/fetch_photos.mjs` (Node) fetches
once and writes the image URLs into `data/real/targets.json` (`photos` array, CONTRACTS §2).
`<img>` tags load cross-origin images fine.

## Goal

1. **Choose the real walk area** and write `data/real/area.json` (CONTRACTS §3): a ~2 km square
   on Perseverance's delta-front traverse with many Mastcam-Z images and varied terrain. Commit
   this **early** and post it in `STATUS.md` — the data lane crops to it.
2. **Choose 4–6 real science stops** along the traverse inside that square, with `lat`/`lon`,
   `sol`, a one-sentence `note` on why it matters (cite NASA/JPL mission pages), `value`, and
   `dwellMin`. Habitat: a flat spot in the square. Write `data/real/targets.json` using lat/lon
   (the engine resolves them to cells once the data lane's terrain exists).
3. **Photos:** for each stop, 1–3 Mastcam-Z (or Navcam) images taken from rover positions
   nearest that stop, stored in its `photos` array. `renderPhotos(container, stop)` shows them
   with sol, camera and credit "NASA/JPL-Caltech/ASU". Handle missing photos gracefully.
4. **Base layers:** `addBaseLayers(map, terrain)` adds Mars Trek imagery (and, if easy, the rover
   traverse as a dashed line) and returns `{ layers, control }`. If the tile CRS doesn't fit
   Leaflet's default, use a georeferenced image overlay for the 2 km square instead.

## How to check your work

On your branch, a tiny test page `docs/photos-demo.html` that calls `renderPhotos` for each real
stop and shows a Leaflet map with your base layers. Screenshot it for your final message.

## Coordination

Append to `STATUS.md` when you start, when `area.json` is decided, for every endpoint verified,
and when done. Commit small, prefix `photos:`. Merge `develop` into `photos` before reporting
done. You merge last; the coordinator does the merge.
