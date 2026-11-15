DRAFT for the team to rewrite in their own words

# Marswalk Budget

NASA Space Apps Challenge 2026 — *Interplanetary Survival Guide: Martian Map*.

Pick science stops on real Mars terrain and see the route's walking time, suit oxygen, radiation dose and science value. Marswalk Budget replans for dust, a solar event or a heavy sample kit, marks the point of no return, and suggests the most science that fits the modelled resource budget. It is an educational prototype with explicit assumptions. Jezero's delta front is the primary site; Curiosity's Mount Sharp boxwork at Gale is the second.

## Run locally

From the repository root, with Node.js 20 or later:

```bash
npm test
npm run serve
```

Open [the console](http://localhost:8080/). No build step, framework, bundler or `npm install` is needed to run tests or serve the committed datasets. Use HTTP through the server, since browser modules fetch JSON data. The interface's CDN assets, Jezero tiles and rover photos need an internet connection at view time; the tests require none. Rebuilding source GeoTIFF data is a separate preparation workflow with the optional `geotiff` dependency.

## Try these pages

| Page | Local URL / purpose |
|---|---|
| Synthetic console | [index.html](http://localhost:8080/) — invented terrain and labelled demo conditions |
| Jezero console | [index.html?data=real](http://localhost:8080/index.html?data=real) — six Perseverance stops |
| Gale console | [index.html?data=gale](http://localhost:8080/index.html?data=gale) — four Curiosity stops |
| Guided demonstration | [index.html?data=real&tour=1](http://localhost:8080/index.html?data=real&tour=1) — seven manually advanced presenter steps; Right Arrow to continue |
| Field tablet | [tablet.html?data=real](http://localhost:8080/tablet.html?data=real) — route and progress in a field view |
| Helmet HUD | [hud.html?data=gale&cond=real-gale&play=30](http://localhost:8080/hud.html?data=gale&cond=real-gale&play=30) — time-compressed route playback |
| Split-eye VR helmet | [hud.html?data=real&vr=1](http://localhost:8080/hud.html?data=real&vr=1) — stereo view with drag/arrow fallback controls |
| Conditions example | [docs/conditions-demo.html](http://localhost:8080/docs/conditions-demo.html) — labelled GO / CAUTION / NO-GO cases |
| Photos and map layers | [docs/photos-demo.html?data=gale](http://localhost:8080/docs/photos-demo.html?data=gale) — site selector, imagery, rover drive and photo credits |

Open the views from the console to carry the selected stops, hazards and route option. The About panel links the model, source audit, credits and AI note. The console compares three route alternatives; tablet, HUD and VR follow the same choice. Phone compass and fullscreen require supported browser permissions and HTTPS; physical Android/iOS checks await a preview.

## How the plan is calculated

The engine finds paths between stops over a 5 m grid, using terrain-dependent speed and metabolic energy. It chooses a visiting order, adds work time at each stop, converts energy to oxygen and time to dose, then checks the scenario's limits. It reports an oxygen profile, return costs, a dust-storm contingency and the best set of stops within its search limits. The current walkable slope limit is 20°, a lunar proxy; the 1 mSv per-walk allocation is a team design choice. [Model explanation](../model.md) · [parameter source audit](../model-sources.md).

## Data and credits

| Input | Credit / qualification |
|---|---|
| Jezero elevation and imagery | USGS Mars 2020 TRN HiRISE DTM; NASA Mars Trek MRO HiRISE/CTX |
| Jezero ground proxy | THEMIS-derived thermal inertia, [Zenodo 4931348](https://doi.org/10.5281/zenodo.4931348), CC BY 4.0 |
| Gale elevation and imagery | USGS MSL Gale DEM v3 and HiRISE LRGB mosaic; NASA/JPL-Caltech/UArizona, USGS |
| Rover positions and photos | NASA/JPL MMGIS, Perseverance and Curiosity; per-image NASA/JPL-Caltech/ASU, MSSS or NASA/JPL-Caltech credits |
| Weather | NASA/JPL and CAB, Spain: MEDA at Jezero and REMS at Gale; archival snapshots |
| Solar events | NASA CCMC DONKI, near-Earth detections used as a Mars proxy |
| Radiation | Curiosity RAD, [Hassler et al. 2014](https://doi.org/10.1126/science.1244797) ([paper copy](https://www.scienceintheclassroom.org/sites/default/files/research-papers/1244797.full_.pdf)); historical Gale baseline, geographic proxy at Jezero |
| Optional manual fields | Mars Climate Database, LMD / ESA / CNES; no values retrieved in the real snapshots |

[Full linked data register and stop citations](data.md) · [Gale dataset notes](../../data/gale/README.md).

The synthetic dataset is labelled as invented. Gale has no thermal-inertia layer and no sand penalty. Historical observations, Earth/lunar proxies and team-assigned thresholds do not validate a real EVA: GO is the prototype's planning verdict. The manual EVA window is displayed rather than enforced. Read the source notes and timestamps on the conditions card.

## Screenshots already in the repo

- [Jezero console / real terrain](../screenshots/data-real.png)
- [Jezero field tablet](../screenshots/views-tablet-real.png)
- [Gale field tablet](../screenshots/views-tablet-gale.png)
- [Jezero helmet HUD](../screenshots/views-hud-real.png)
- [Gale helmet HUD](../screenshots/views-hud-gale.png)
- [Split-eye helmet layout](../screenshots/views-vr.png)

These are existing captures, not a claim that every screenshot matches the latest UI. The VR screenshot is a layout reference; the lead has asked QA to review its chevron versus next-step direction before using it as navigation evidence.

## AI assistance

Anthropic Claude and OpenAI Codex agents assisted with the code, data preparation, source audit, tests and these drafts. The team owns the ideas, science decisions, story, presentation, review and final submission. [Contribution disclosure](ai-disclosure.md).

## For the lead folding this draft into README.md

Links here resolve from `docs/submission/`. Adjust them for the root README: `../model.md` becomes `docs/model.md`, `../screenshots/` becomes `docs/screenshots/`, `../../data/` becomes `data/`, and sibling drafts become `docs/submission/…`. Add a hosted project URL only after a human has published and checked it; the repo's [deployment notes](../deploy.md) describe the handoff. No public deployment is asserted here.
