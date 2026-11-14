# Brief — Claude 1: Map interface (branch `ui`)

You are the UI agent on Marswalk Budget, a NASA Space Apps 2026 project: a route planner for an
astronaut walking at Jezero Crater, Mars. Read `AGENTS.md`, `CONTRACTS.md` and `STATUS.md` first.
Three other agents work in parallel on other branches; stay inside your files.

**Branch:** `ui`, from `develop`. **You own:** `index.html`, `css/`, `js/app.js`, `js/render.js`.
**Do not edit:** `js/engine.js`, `js/config.js`, `js/photos.js`, `js/basemap.js`, anything in `data/`.

## Goal

A single-page app that loads `data/demo/terrain.json` + `data/demo/targets.json`, calls
`planWalk()` from `js/engine.js`, and shows the result so a judge understands it in 10 seconds.

## Must have

1. **Map** (Leaflet 1.9.4 from `https://unpkg.com/leaflet@1.9.4/dist/`, with SRI hashes, or a
   vendored copy in `vendor/leaflet/` — your call, no build step either way).
   - Terrain drawn from the grid as a canvas image overlay placed with `cellToLatLon` bounds.
     Layer toggles: hillshade/elevation, slope (red where blocked), thermal inertia (sand vs
     rock), roughness. Hillshade on by default.
   - Also call `addBaseLayers(map, terrain)` from `js/basemap.js` and add whatever it returns
     (empty on develop; the photos lane fills it with Mars Trek imagery).
   - Route polyline, numbered stop markers in visiting order, habitat marker, **turn-back
     marker** when `plan.turnBack` is set, greyed markers for unselected and unreachable stops.
2. **Side panel**
   - Budget bars: O2 used vs usable (with the reserve shown), total time, radiation dose vs
     limit. Bars turn amber > 80 %, red when over.
   - Stop list in visiting order with arrival time; checkbox to include/exclude each stop.
   - If `dropSuggestion`: a one-click "Drop <name> to fit the budget" button.
   - Selecting a stop calls `renderPhotos(container, stop)` from `js/photos.js`.
3. **Conditions:** toggles for dust storm, solar event, heavy kit. Any change replans.
4. **Click the map to add a stop** (value 5, dwell 20 min, editable inline is a bonus).
5. **Honesty labels:** banner when `terrain.synthetic` is true; small note that radiation uses
   Curiosity RAD data from Gale Crater as a proxy.
6. Planning takes ~0.3 s on the demo grid: run it so the UI never freezes (a Web Worker that
   imports `js/engine.js` is ideal; at minimum show a "planning…" state).
7. Dataset switch: `?data=real` loads `data/real/` instead of `data/demo/` (for later).

## Nice to have

O2-remaining-along-route mini chart (the engine lane is adding `plan.profile`; feature-detect it),
elevation profile of the route, hover a path point to see elapsed time and O2.

## Look

Dark, Mars-ops feel, legible: rust/ochre accents, one sans font, big numbers for the budget.
Works at 1280 × 720 (projector) and stays usable on a phone.

## How to check your work

`npm run serve` then open http://localhost:8080. Confirm: normal conditions fit; turning on all
three conditions turns bars red and shows a turn-back marker and a drop suggestion; clicking
"drop" makes it fit. Take screenshots and attach them to your final message.

## Coordination

Append to `STATUS.md` when you start, when you finish, and whenever you need something from
another lane (`REQUEST @engine: ...`). Commit small, prefix `ui:`. Merge `develop` into `ui`
before you report done. Do not merge into `develop` yourself — the coordinator does.
