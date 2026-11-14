# Brief — Views: field tablet + helmet HUD (branch `views`) — `codex-views` (Tonny's Codex B)

Assigned by the lead (`louis-claude`), 2026-11-14.

You are the views agent on Marswalk Budget (NASA Space Apps 2026, route planner for an astronaut
walking at Jezero Crater, Mars). Read `AGENTS.md`, `CONTRACTS.md` and `STATUS.md` first. Other
agents work in parallel; stay inside your files. These two pages are what the demo video will
show, so make them look good and read clearly at a glance.

**Branch:** `views`, from `origin/develop`.
**You own:** `tablet.html`, `hud.html`, `js/views/`, `css/views.css`, `tests/views.test.mjs`,
`docs/screenshots/views-*.png`.
**Do not edit:** the console (`index.html`, `css/app.css`, `js/app.js`, `js/render.js`),
`js/engine.js`, `js/config.js`, `js/photos.js`, `js/basemap.js`, `data/`.

## Goal

Two pages that show the console's plan during the walk. Both read the console's choices from the
URL (CONTRACTS §7: `?data=`, `?stops=`, `?dust=1`, `?solar=1`, `?kit=1`, `?p=`), load the data
set, and call `planWalk` from `js/engine.js` exactly as `js/app.js` does. **No route, oxygen or
dose maths of your own**: everything comes from the plan result (CONTRACTS §4).

1. **Field tablet** — `tablet.html`, mobile first (375 px wide).
   - A "simulate EVA progress" slider (0..1, start from `?p=`) moves the astronaut along `plan.path`.
   - Next stop: name, photo (`renderPhotos` from `js/photos.js`), bearing arrow, distance,
     elapsed and remaining time.
   - O2 left vs O2 needed to get home: use `plan.profile` when present (CONTRACTS §4,
     feature-detect); until then interpolate between `plan.stops[].arriveO2Kg`.
   - Turn-back warning once progress passes `plan.turnBack` (or `plan.turnBackLatest` when present).
   - Mini-map: Leaflet 1.9.4, same `<link>`/`<script>` tags (with SRI) as `index.html`,
     route + stops + astronaut dot.
2. **Helmet HUD** — `hud.html`, full screen, designed at 1280 × 720.
   - Background: the next stop's first photo (`stop.photos[0].url`, CONTRACTS §2), else a dark
     gradient placeholder.
   - SVG overlay: compass tape, chevron toward the next stop, distance, slope just ahead (from
     terrain elevation along the path), time left, O2 margin bar, dose so far, and a conditions
     badge if `js/conditions.js` exists (dynamic import inside try/catch; skip silently if not).
   - Same progress slider; the `H` key hides it for clean video shots. Large, high-contrast type.
     No NASA logos or mission insignia.

## Structure

- Put every calculation in `js/views/geometry.js` with **no DOM and no Leaflet**:
  `bearingDeg`, `distanceM`, `positionAt(plan, terrain, p)` → `{ pathIndex, x, y, lat, lon,
  elapsedS }`, `o2At(plan, p)`, `doseAt(plan, p)`, `slopeAheadDeg(terrain, plan, pathIndex,
  lookaheadM)`, `nextStop(plan, pathIndex)`. Use `cellToLatLon` from `js/engine.js`.
- Page code in `js/views/tablet.js` and `js/views/hud.js`, styles in `css/views.css`.
- Plain HTML + ES modules, no build step, no new dependencies.

## Tests — `tests/views.test.mjs` (node --test)

Must pass with no network and no `npm install`. Load `data/demo/terrain.json` and
`targets.json` from disk, run `planWalk`, then check: `positionAt` at 0 and 1 is the habitat;
progress is monotonic in `elapsedS`; `nextStop` order matches `plan.order`; bearing of due north
is 0° and due east is 90°; `o2At` never increases; the turn-back index is detected when all three
conditions are on. Run the whole suite (`npm test`).

## Hook into the console

You don't edit the console. Post one `REQUEST @ui` line in STATUS.md asking for "Open tablet" and
"Open HUD" links that carry the §7 parameters; `tonny-claude` adds them.

## Done when

Tests pass offline; both pages load under `npm run serve` on `?data=demo` with no console errors;
with `?dust=1&solar=1&kit=1` the turn-back warning fires; screenshots in `docs/screenshots/`
(if you can't take them, write `REQUEST @tonny-claude: screenshot tablet/HUD` in STATUS.md);
STATUS.md `DONE` line; branch `views` pushed (Tonny pushes for you if you can't). Commit prefix
`views:`. First line of every code file you create:
`// Generated with AI assistance for NASA Space Apps 2026; reviewed by the team`
(`<!-- ... -->` in HTML, `/* ... */` in CSS).
