# Brief — Real data pipeline in Node (branch `data`) — `tonny-claude`

Assigned by the lead (`louis-claude`), 2026-11-14. Replaces the Python brief (`codex-1-data.md`):
same output file, written in Node because Tonny's machine has no Python.

You are the data agent on Marswalk Budget (NASA Space Apps 2026, route planner for an astronaut
walking at Jezero Crater). Read `AGENTS.md`, `CONTRACTS.md` and `STATUS.md` first. Other agents
work in parallel; stay inside your files. This is the critical path: the real map has no terrain
until you finish.

**Branch:** `data`. `origin/data` only holds a commit that was reverted on `develop`, so start
with `git checkout data && git merge --ff-only origin/develop`.

**You own:** `scripts/prep_real_data.mjs`, `scripts/lib/prep.mjs`, `tests/prep.test.mjs`,
`data/real/terrain.json`, `docs/screenshots/data-*.png`. The lead lets you change one thing in
`package.json`: add `geotiff` (and `proj4` if you need it) as devDependencies, a `prep-real`
script, and the lock file.
**Do not edit:** `js/`, `index.html`, `css/`, `data/demo/`, `data/real/targets.json`,
`data/real/area.json`.

## Step 0 — find and test the inputs (record each in STATUS.md)

1. **Elevation:** USGS Astrogeology "Mars 2020 Terrain Relative Navigation HiRISE DTM Mosaic"
   (Jezero, about 1 m/px, about 1.8 GB GeoTIFF). Record: direct URL, whether the server answers
   range requests (`curl -sI -H 'Range: bytes=0-1023' <url>` gives `206`), tiled or striped,
   projection and Mars radius, pixel size, nodata value, vertical datum.
2. **Thermal inertia:** the Jezero THEMIS thermal-inertia GeoTIFF on Zenodo (about 1.7 MB,
   CC BY 4.0). Download it whole into `raw/` (git-ignored).

If range reads fail or are too slow, download the DTM once into `raw/` and read windows from the
local file. Never commit anything from `raw/`.

## Goal

```
node scripts/prep_real_data.mjs --dtm <url-or-path> --ti raw/ti.tif \
    [--area data/real/area.json] [--cell 5] --out data/real/terrain.json
```

1. Read `data/real/area.json`: bounds N 18.47040, S 18.43660, W 77.38717, E 77.42283, 5 m cells,
   so about 400 × 400.
2. For each output cell, project its centre into the DTM's coordinates (forward equations from
   the GeoTIFF keys; use `proj4` only if the projection is unusual) and read **only** the window
   you need with geotiff.js (`fromUrl` / `fromFile`, `readRasters({ window })`). Never load the
   whole file.
3. **Elevation** per cell = mean of the 1 m pixels inside it, rounded to 0.01 m; `null` when more
   than half are nodata (the engine treats `null` as blocked).
4. **Roughness 0..1** = standard deviation of the 1 m elevations in the cell after removing a
   best-fit plane, scaled so 0.3 m → 0.5 and ≥ 0.8 m → 1.0. Write the formula in the script
   header.
5. **Thermal inertia:** bilinear sample at each cell centre; fill gaps with the median and say
   so in `sources`.
6. Write JSON exactly per CONTRACTS §1 (open `data/demo/terrain.json` to compare): `origin` =
   lat/lon of the **north-west corner**, planetocentric, east-positive; row 0 = **north**;
   `synthetic: false`; `sources` with names, URLs, licences and the vertical datum.
7. Print: grid size, elevation range, % of cells steeper than **20°** (the new max walkable
   slope), % sand (TI < 200), output size (must be < 5 MB).

## Tests — `tests/prep.test.mjs` (node --test)

`npm test` must pass on a clean checkout **with no `node_modules` and no network** (the lead's
machine has neither, and runs the tests before every merge). So:

- Put all the maths in `scripts/lib/prep.mjs` with **no imports**.
- Import `geotiff` only inside `scripts/prep_real_data.mjs`, and only with `await import('geotiff')`.
- Test the pure functions on in-memory arrays: a tilted plane gives the expected slope; a spike
  raises roughness; a TI step lands on the right side after resampling; lat/lon → pixel → lat/lon
  round-trips within one cell; row 0 is north; nodata becomes `null`.

## Check it in the app

`npm run serve`, open `http://localhost:8080/?data=real`. The delta scarp should line up with
the HiRISE layer, the six real stops should be reachable or honestly flagged unreachable, and
`npm run plan-demo -- data/real` should run. Save a screenshot to `docs/screenshots/data-real.png`.

## Done when

Tests pass offline; `data/real/terrain.json` committed (< 5 MB); screenshot saved; STATUS.md
`DONE` line; `data` pushed; `DONE data` posted in `comms/tonny-claude.md`. Commit prefix `data:`.

## Your next jobs, in order (after `DONE data`)

1. **Console integration.** The UI lane is finished, so you now own `index.html`,
   `css/app.css`, `js/app.js`, `js/render.js`. On branch `integrate`, apply the `REQUEST @ui`
   lines from the conditions and views lanes (Go/No-Go card, "Open tablet" and "Open HUD" links
   carrying the CONTRACTS §7 parameters), and show `plan.profile` / `bestSubset` /
   `turnBackLatest` once the engine posts its `CONTRACT` line.
2. **Browser QA** of every merged build: `?data=demo` and `?data=real`, each condition,
   click-to-add, photos, tablet, HUD. Report bugs as `REQUEST @<lane>` in STATUS.md.
3. **Gale dataset** (`gale` lane, `data/gale/`) only after the lead posts `GO gale`.
