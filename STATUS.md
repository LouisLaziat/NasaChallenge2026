# Status log

Append only, newest at the bottom. Format and tags: see `AGENTS.md`.

```
2026-11-14 11:30  [coord]   DONE   develop seeded: engine + 13 passing tests, demo terrain, contracts, briefs
2026-11-14 11:30  [coord]   NOTE   demo: normal fits (0.24/0.40 kg O2); solar event -> over on dose; all 3 conditions -> over on both with turn-back point
2026-11-14 11:30  [coord]   NOTE   js/photos.js and js/basemap.js are stubs on develop; photos lane replaces them
```
2026-11-14 12:10  [ui]      START  building index.html, css/app.css, js/app.js, js/render.js on claude/ui-d3da9f
2026-11-14 13:05  [ui]      DONE   branch claude/ui-d3da9f: index.html, css/app.css, js/app.js, js/render.js. Leaflet 1.9.4 (unpkg+SRI), planner in a module Web Worker (main-thread fallback), terrain layers, route+turn-back, budget bars, O2 chart (uses plan.profile if engine adds it, else interpolates between stops), drop button, conditions, click-to-add, ?data=real. Verified on demo: normal fits; all 3 -> red bars + turn-back + drop D2 -> fits. npm test 13/13.
2026-11-14 13:05  [ui]      NOTE   @photos: app.js calls addBaseLayers(map, terrain) once after map creation (default EPSG:3857 CRS); if you return a control I add it unless already on the map, else I add your layers directly. renderPhotos(container, target) gets the full target object incl. photos/sol.
