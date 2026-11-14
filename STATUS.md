# Status log

Append only, newest at the bottom. Format and tags: see `AGENTS.md`.

```
2026-11-14 11:30  [coord]   DONE   develop seeded: engine + 13 passing tests, demo terrain, contracts, briefs
2026-11-14 11:30  [coord]   NOTE   demo: normal fits (0.24/0.40 kg O2); solar event -> over on dose; all 3 conditions -> over on both with turn-back point
2026-11-14 11:30  [coord]   NOTE   js/photos.js and js/basemap.js are stubs on develop; photos lane replaces them
```
2026-11-14 10:55  [photos]  START  photos lane: endpoints, area, real stops, photos, Mars Trek base layer
2026-11-14 11:05  [photos]  DONE   data/real/area.json decided: centre 18.4535N 77.4050E, 2000 m, 5 m cells (bounds N18.47040 S18.43660 W77.38717 E77.42283) -> @data crop to this
2026-11-14 11:20  [photos]  NOTE   Mars Trek tiles WORK: https://trek.nasa.gov/tiles/Mars/EQ/JEZ_hirise_soc_006_orthoMosaic_25cm_Eqc_latTs0_lon0_first_dd/1.0.0/default/default028mm/{z}/{y}/{x}.png  (HiRISE 25 cm Jezero, zoom <=17; CTX 6 m: JEZ_ctx_B_soc_008_orthoMosaic_6m_Eqc_latTs0_lon0, zoom <=12). WMTS equirectangular (EPSG:104905), z/ROW/COL, zoom 0 = 2x1 tiles from (-180,90) = Leaflet L.CRS.EPSG4326 grid, NOT web-mercator. CORS: yes (*)
2026-11-14 11:20  [photos]  NOTE   Perseverance raw images WORK: https://mars.nasa.gov/rss/api/?feed=raw_images&category=mars2020&feedtype=json&ver=1.2&num=50&page=0&order=sol+desc&search=%7CMCZ_LEFT&condition_2=420:sol:gte&condition_3=420:sol:lte  (ver=1.2 required, `|` must be %7C, curl needs a browser User-Agent). Fields: images[].image_files.{small,medium,large,full_res}, sol, camera.instrument, caption, credit, site, drive, imageid, link. CORS: yes (*)
2026-11-14 11:20  [photos]  NOTE   Rover traverse WORKS: https://mars.nasa.gov/mmgis-maps/M20/Layers/json/M20_waypoints.json (props sol, site, drive, lat, lon, elev_geoid, Note) and .../M20_traverse.json (LineStrings per sol, [lon,lat,elev]). CORS: yes (*). Image site+drive matches waypoint site+drive -> exact rover position per photo
2026-11-14 12:10  [photos]  NOTE   raw-image API answers 403 after ~150 quick requests (rate limit, clears in minutes); scripts/fetch_photos.mjs caches every response in raw/photo-cache/ and spaces requests
2026-11-14 12:10  [photos]  DONE   data/real/targets.json: habitat + 6 real stops R1-R6 (Enchanted Lake, Amalik, Hawksbill Gap, Skinner/Wildcat Ridge, Three Forks depot, delta top) with lat/lon, sol, value, dwellMin, cited note + 1-3 Perseverance photos each (R6 has 1). All resolve inside the 400x400 area grid
2026-11-14 12:10  [photos]  DONE   js/photos.js renderPhotos (main photo + thumbs, sol/camera/credit NASA/JPL-Caltech/ASU, graceful no-photo + broken-link fallback) and photoMarkerIcon; js/basemap.js addBaseLayers -> { layers: {hirise, ctx, traverse}, control } on any CRS; docs/photos-demo.html test page
2026-11-14 12:10  [photos]  NOTE   @ui addBaseLayers adds a pane 'pbBasemap' (z 250, under overlayPane) and its own L.control.layers; on synthetic terrain the layers are offered but left off. Call it after the map has a size/view (fitBounds before a sized container gives zoom 0)
