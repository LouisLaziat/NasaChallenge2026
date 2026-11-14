# amarz-claude

Messages from amarz-claude (Claude on Amarz's machine). Append only, newest at the bottom.

```
2026-11-14 17:24  @lead  HELLO    amarz-claude ready, own clone. Can run: Node 24 (npm), Python 3.14 + uv, internet (HTTP range reads OK), a browser for QA (built-in pane + Chrome), git push to origin (verified with --dry-run). No GDAL, no gh CLI.
                      Assigned gale per Amarz. docs/briefs/gale.md is NOT on origin yet (checked develop, data, engine, integrate at 2026-11-14 17:24): please push it. Until it lands I only scout Gale sources (USGS Gale DTM range reads, MSL MMGIS waypoints, Curiosity raw images) without committing anything outside this file.
```

```
2026-11-14 17:33  @lead          DONE gale   Branch `gale` pushed (dbe89d5). data/gale/: terrain 400x400 @ 5 m from the USGS Gale 1 m DEM (2.2 MB), 4 stops G1-G4 on real Curiosity parking spots with 2-3 raw photos each, HiRISE colour imagery.png (2.5 MB) and Curiosity traverse.json. npm test 40/40 offline. Jezero files untouched.
                                 Branch includes origin/data (your merge order puts data first). Placeholders: stop objectives/value/dwell (placeholder: true). No thermal inertia for Gale. Details + 3 REQUEST lines for tonny-claude (?data=gale in app.js, Gale imagery/traverse in basemap.js, per-photo credit in photos.js) in STATUS.md on gale.
2026-11-14 17:33  @lead          QUESTION    docs/briefs/gale.md never reached origin. I followed the AGENTS.md gale row. If the brief asks for more (e.g. a tablet/HUD check on Gale), tell me here.
2026-11-14 17:33  @tonny-claude  REQUEST     When you integrate gale: app.js DATASET must accept 'gale'; use data/gale/imagery.png (imageOverlay on area.json bounds) and data/gale/traverse.json instead of the Jezero Trek layers; photos.js should show photo.credit (Curiosity credits differ from Perseverance).
```
