# Brief — Codex 1: Real data pipeline (branch `data`)

You are the data agent on Marswalk Budget, a NASA Space Apps 2026 route planner for an astronaut
walking at Jezero Crater, Mars. Read `AGENTS.md`, `CONTRACTS.md` and `STATUS.md` first. Three
other agents work in parallel; stay inside your files.

**Branch:** `data`, from `develop`. **You own:** `scripts/prep_real_data.py`,
`tests/test_prep.py`, `requirements.txt`, `data/real/terrain.json`.
**Do not edit:** anything under `js/`, `index.html`, `css/`, `data/demo/`, `data/real/targets.json`,
`data/real/area.json`.

## Goal

`scripts/prep_real_data.py` turns two public rasters into `data/real/terrain.json` in exactly the
format of CONTRACTS.md §1 (same as `data/demo/terrain.json` — open it to compare).

Inputs (download by hand into `raw/`, which is git-ignored; do not commit them):

- **Elevation:** USGS "Mars 2020 Terrain Relative Navigation HiRISE DTM Mosaic" (Jezero, ~1 m/px,
  ~1.8 GB GeoTIFF), from USGS Astrogeology.
- **Thermal inertia:** the Jezero THEMIS thermal-inertia GeoTIFF on Zenodo (~1.7 MB, CC BY 4.0).

Script behaviour:

```
python scripts/prep_real_data.py --dtm raw/dtm.tif --ti raw/ti.tif \
    [--area data/real/area.json | --center-lat 18.45 --center-lon 77.40 --size-m 2000] \
    [--cell 5] --out data/real/terrain.json
```

1. Read the area (default `data/real/area.json`, written by the photos lane; CLI flags override).
2. Window-read only the needed part of the DTM (rasterio windows — never load 1.8 GB), reproject
   or resample to a **north-up grid of square `--cell`-metre cells** centred on the area.
3. Resample thermal inertia onto the same grid (bilinear). Fill gaps with the median and note
   that in `sources`. Missing elevation stays `null` (the engine treats it as blocked).
4. **Roughness 0..1** from the full-resolution DTM: e.g. std-dev of detrended 1 m elevation
   inside each cell, scaled so ~0.3 m → 0.5 and ≥ 0.8 m → 1.0. Document the formula in the
   script header.
5. Write JSON: `origin` = lat/lon of the **north-west corner**, planetocentric, east-positive;
   elevation rounded to 0.01 m; `synthetic: false`; `sources` with names, URLs and licences.
6. Print a summary: size, elevation range, % blocked by slope > 25°, % sand (TI < 200).

Watch out for: the DTM's projection (likely equirectangular or polar-stereo with its own Mars
datum), planetocentric vs planetographic latitude, east- vs west-positive longitude, nodata
values, and that row 0 must be the **north** edge.

## Tests (`tests/test_prep.py`, pytest)

Build tiny synthetic GeoTIFFs in a temp dir (a tilted plane, a single spike, a TI step) with a
known CRS, run the script's functions, assert: output shape, north-up order, slope of the tilted
plane, roughness higher at the spike, TI resampled to the right side, origin lat/lon correct to
< 1 cell. Must run without the real files.

## Done when

Tests pass; if you have the real files, `data/real/terrain.json` is committed (< 5 MB, ~400 × 400
at 5 m) and `npm run plan-demo -- data/real` runs on it. If you can't reach USGS/Zenodo from your
sandbox, say so in `STATUS.md` with the exact command for a human to run.

## Coordination

Append to `STATUS.md` when you start and finish, and if `area.json` is missing (use
`--center-lat 18.45 --center-lon 77.40` until it appears). Commit small, prefix `data:`. You
merge first (with the engine lane); the coordinator does the merge.
