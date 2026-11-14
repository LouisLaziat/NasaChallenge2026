# Brief — Gale dataset: Mount Sharp boxwork (branch `gale`) — `amarz-claude` (theamarz999-stack's Claude)

Assigned by the lead (`louis-claude`), 2026-11-14. `GO gale` is given: start now.

You are the Gale agent on Marswalk Budget (NASA Space Apps 2026, route planner for an astronaut
walking on Mars). Read `AGENTS.md`, `CONTRACTS.md` and `STATUS.md` first. Other agents work in
parallel; stay inside your files.

The app runs on Jezero Crater (Perseverance). Your job is a **second site**, loaded with
`?data=gale`: the **boxwork region on Mount Sharp, Gale Crater**, which Curiosity explored from
mid-2025 into 2026 and which the challenge itself uses as its example. Same file contracts as
Jezero, so the engine and the console work on it unchanged. Bonus for the pitch: Curiosity's RAD
measured radiation right there, so Gale needs no radiation proxy.

**Branch:** `gale`, from `origin/develop`.
**You own:** `data/gale/` (`area.json`, `targets.json`, later `terrain.json`),
`tests/gale.test.mjs`, `docs/gale-demo.html`, `docs/screenshots/gale-*.png`, and — handed over
from the finished photos lane — `js/photos.js`, `js/basemap.js`, `scripts/fetch_photos.mjs`,
`docs/photos-demo.html`. **Jezero must behave exactly as before**: `docs/photos-demo.html` and
`?data=real` must still work after your changes.
**Do not edit:** `js/engine.js`, `js/config.js`, the console (`index.html`, `css/app.css`,
`js/app.js`, `js/render.js`), `data/real/`, `data/demo/`, the data pipeline
(`scripts/prep_real_data.mjs`, `scripts/lib/`).

## Step 0 — verify the endpoints (record each in STATUS.md, working URL + CORS yes/no)

The Jezero versions of these work (STATUS.md, 11:20 lines); the Curiosity ones are UNVERIFIED.

1. **Curiosity traverse / waypoints** (MMGIS), by analogy with Perseverance's:
   `https://mars.nasa.gov/mmgis-maps/MSL/Layers/json/MSL_waypoints.json`. Fields for sol, lat, lon.
2. **Curiosity raw images.** Find the JSON API behind https://mars.nasa.gov/msl/multimedia/raw-images/
   (candidates: `https://mars.nasa.gov/api/v1/raw_image_items/?condition_1=msl:mission&...` or
   the `rss/api` feed with `category=msl`). mars.nasa.gov wants a browser `User-Agent` and
   rate-limits after ~150 quick requests: cache every response under `raw/` (git-ignored).
3. **Base imagery for Gale** on Mars Trek (https://trek.nasa.gov/mars/): a HiRISE or CTX mosaic
   layer that covers the boxwork, same WMTS scheme as the Jezero layers in `js/basemap.js`.
4. **Elevation:** USGS "MSL Gale Merged DEM 1 m" v3,
   `https://planetarymaps.usgs.gov/mosaic/Mars/MSL/MSL_Gale_DEM_Mosaic_1m_v3.tif` (3.6 GB;
   check range reads with `curl -sI -H 'Range: bytes=0-1023'`, expect 206). Its extent is about
   lat −5.10…−4.13, lon 137.12…137.68: **check the boxwork square falls inside it**. If not, find
   a HiRISE DTM that covers it, or move the square to the nearest covered part of the traverse,
   and tell the lead in STATUS.md.
5. **Thermal inertia** for Gale: look for a THEMIS-derived thermal-inertia raster covering the
   area (e.g. the MSL landing-site products). If none turns up within about an hour, use a
   constant value, label it `ASSUMPTION` in `sources`, and tell the lead.

## Goal

1. **`data/gale/area.json`** (CONTRACTS §3 shape): a 2 km square, 5 m cells, on Curiosity's
   traverse through the boxwork, chosen from the waypoints (sols about 4,550–4,800), with varied
   terrain and many Mastcam/Navcam images. Post it in STATUS.md as soon as it's decided.
2. **`data/gale/targets.json`** (CONTRACTS §2): a habitat on a flat spot and 4–6 real stops along
   the traverse inside the square: `lat`/`lon`, `sol`, `value` 1–10, `dwellMin`, one-sentence
   `note` citing NASA's Curiosity mission updates (science.nasa.gov blog), and 1–3 photos each
   from the rover positions nearest the stop. Photo credit goes in each photo's `credit`
   (CONTRACTS §2): Mastcam and MAHLI "NASA/JPL-Caltech/MSSS", Navcam "NASA/JPL-Caltech".
3. **Photos:** make `renderPhotos` show `photo.credit` when present (default stays
   "NASA/JPL-Caltech/ASU" for the Jezero photos). Extend `scripts/fetch_photos.mjs` with a
   `--site gale` option, or add a sibling script you own, whichever is cleaner.
4. **Base layers:** `addBaseLayers(map, terrain)` picks the Gale or Jezero layers from where the
   terrain is (`terrain.origin` lat/lon); no contract change. Add Curiosity's traverse as the
   dashed line on Gale.
5. **Terrain (after the `data` lane merges):** run the data lane's script on your area:
   `node scripts/prep_real_data.mjs --dtm <Gale DEM> --ti <TI file> --area data/gale/area.json
   --out data/gale/terrain.json` (< 5 MB). If the script can't handle Gale's projection, post
   `REQUEST @tonny-claude` with the details; don't edit the script.

## Tests — `tests/gale.test.mjs` (node --test)

Must pass with no network and no `npm install`. Check: `area.json` shape and that it lies inside
the DEM extent; `targets.json` ids unique, values 1–10, all stops inside the area bounds, every
photo has `url`, `sol`, `camera`, `credit`. When `data/gale/terrain.json` exists, also: every stop
resolves to a cell (`resolveTargets`) and `planWalk` returns `ok` under normal conditions. Run the
whole suite (`npm test`), not just yours.

## Hook into the console

You don't edit the console. Post in STATUS.md:
- `REQUEST @ui: accept ?data=gale` (today `js/app.js` only knows `demo` and `real`), and
- `REQUEST @ui: on Gale, the radiation note should say RAD measured in place (Hassler et al. 2014), not a proxy`.
`tonny-claude` applies them. Check the result in a browser at `?data=gale` and save
`docs/screenshots/gale-console.png`.

## Done when

Tests pass offline; `docs/gale-demo.html` shows the Gale stops, photos and base layers;
`data/gale/terrain.json` committed (or BLOCKED on the data lane, said in STATUS.md); Jezero
unchanged; STATUS.md `DONE` line; branch `gale` pushed; `DONE gale` posted in
`comms/amarz-claude.md`. Commit prefix `gale:`. First line of every code file you create:
`// Generated with AI assistance for NASA Space Apps 2026; reviewed by the team`.
