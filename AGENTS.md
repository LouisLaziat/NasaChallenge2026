# Marswalk Budget — rules for every agent

Read this whole file, then `CONTRACTS.md` and `STATUS.md`, before you change anything.
(Codex reads this file automatically; Claude reads it through `CLAUDE.md`.)

## What we are building

A route planner for an astronaut on foot at Jezero Crater, Mars (NASA Space Apps 2026,
"Interplanetary Survival Guide: Martian Map"). The astronaut picks science stops; the tool finds
the least-effort route and prices it in **walking time, suit oxygen, radiation dose and science
value**, marks the **point of no return**, and replans when conditions change (dust storm, solar
event, heavy sample kit). Each stop shows a real Perseverance photo taken nearby.

Stack: plain HTML + ES modules + Leaflet. **No build step, no framework, no bundler.**
Node ≥ 20 for everything, including the data pipeline (no Python needed).

```
index.html, css/, js/app.js, js/render.js   UI           (Claude 1)
js/photos.js, js/basemap.js, data/real/targets.json, data/real/area.json,
  scripts/fetch_photos.mjs                  Photos/NASA  (Claude 2)
scripts/prep_real_data.mjs, tests/prep.test.mjs,
  data/real/terrain.json                    Real data    (Claude 3)
js/engine.js, js/config.js, tests/engine.test.mjs,
  CONTRACTS.md                              Engine/model (Codex 2)
data/demo/, scripts/make_demo.mjs, scripts/plan_demo.mjs, package.json,
  AGENTS.md, CLAUDE.md, README.md,
  .claude/launch.json                       Coordinator  (main Claude session)
STATUS.md                                   everyone (append only)
comms/<agent>.md                            that agent only (cross-machine messages)
```

## Site decision (2026-11-14)

**Jezero Crater (delta front) is the primary site.** Gale Crater (Mount Sharp boxwork) is a
**second dataset added later**, in `data/gale/` with the same contracts, loaded with `?data=gale`.
Nothing about Gale may change the Jezero files or the contracts.

## The lanes

| Lane | Who (machine) | Branch | Owns | Status / done when |
|---|---|---|---|---|
| UI | Claude 1 (Tonny) | merged | `index.html`, `css/`, `js/app.js`, `js/render.js` | **MERGED.** Map, route, turn-back, budget bars, conditions, click-to-add, `?data=` switch. |
| Photos & NASA layers | Claude 2 (Tonny) | merged | `js/photos.js`, `js/basemap.js`, `scripts/fetch_photos.mjs`, `data/real/targets.json`, `data/real/area.json`, `docs/photos-demo.html` | **MERGED.** Jezero area, 6 real stops with Perseverance photos, Mars Trek HiRISE/CTX + traverse. |
| Real data | Claude 3 (Tonny) | `data` | `scripts/prep_real_data.mjs`, `tests/prep.test.mjs`, `data/real/terrain.json`, `geotiff` devDependency in `package.json` | Crop USGS HiRISE DTM + Zenodo thermal inertia to `data/real/area.json` → `data/real/terrain.json`, in Node (HTTP range reads, no 1.8 GB download). Brief: `docs/briefs/codex-1-data.md`, with Node in place of Python. |
| Engine & model | louis-claude (Louis) | `engine` | `js/engine.js`, `js/config.js`, `tests/engine.test.mjs`, `CONTRACTS.md`, `docs/model.md` | Cite every `ASSUMPTION` (incl. 20° max slope, NTRS 20210000827); add `profile`, `bestSubset`, `turnBackLatest`. Brief: `docs/briefs/codex-2-engine.md`. |
| Views (tablet + helmet HUD) | Louis's machine | `views` | new files only (listed in `docs/briefs/louis-views.md`) | Reads the plan result; no route/budget maths of its own. |
| Conditions (Go/No-Go) | Louis's machine | `conditions` | new files only (listed in `docs/briefs/louis-conditions.md`) | Turns REMS / DONKI / MCD / RAD data into the existing condition toggles and config factors; no duplicate budget logic. Contracts added by the engine lane. |
| Gale dataset | TBD, after the above | `gale` | `data/gale/*`, its fetch/prep scripts | Same terrain/targets contracts for Mount Sharp boxwork, Curiosity photos. Only if time allows. |

Partner-agency data is credited where used (ESA HRSC / Mars Climate Database, CSA APXS,
Spain REMS, UAE Emirates Mars Mission).

## Hard rules

1. **Only edit files your lane owns.** Need a change in someone else's file? Write a request in
   `STATUS.md` (`REQUEST @lane: ...`) and work around it until it lands.
2. **Contracts are frozen** except by the engine lane, and only additively unless every lane
   agrees in `STATUS.md`. Never rename or remove a field another lane reads.
3. **Branch from `develop`, merge back into `develop`.** Rebase or merge `develop` into your
   branch at least every couple of hours and before you open a merge. Never push to `main`.
4. **Merge order (from now):** `engine` and `data`, then `conditions`, then `views`, then `gale`.
   The coordinator merges; whoever merges after a contract change re-runs all tests.
5. **Tests must pass before merging:** `npm test` (and `python -m pytest tests/` once it exists).
6. **No secrets or large files in git.** Raw GeoTIFFs and downloads go in `raw/` (git-ignored).
   Anything committed under `data/` stays under ~5 MB per file.
7. **Be honest about data.** Synthetic data is labelled `synthetic: true`. Numbers we invented
   are tagged `ASSUMPTION` in `js/config.js`. Curiosity RAD dose rates are from Gale Crater, used
   as a proxy for Jezero — say so wherever dose is shown.
8. **Unverified endpoints.** Mars Trek tile URLs and the Perseverance raw-image feed have not been
   tested by anyone yet. Load one of each by hand before building on it, and record the working
   URL in `STATUS.md`.

## STATUS.md protocol

Append a line (newest at the bottom), never rewrite others' lines:

```
2026-11-14 14:05  [engine]  DONE   profile[] added to plan result (additive, see CONTRACTS §4)
2026-11-14 14:20  [ui]      BLOCKED need turnBack even when within budget? -> REQUEST @engine
2026-11-14 14:30  [photos]  NOTE   raw image feed works: https://... (CORS: no, use manifest)
```

Tags: `START`, `DONE`, `NOTE`, `REQUEST @lane`, `BLOCKED`, `CONTRACT` (engine lane only),
`MERGED`.

## Talking across machines (`comms/`)

Agents on different computers or accounts cannot message each other directly. They talk
through git, on the `develop` branch:

- Every agent has **one file it alone writes**: `comms/<agent-name>.md` (e.g. `comms/coordinator.md`,
  `comms/louis-claude.md`). Nobody edits anyone else's file, so these never conflict.
- Append messages at the bottom, newest last:
  `2026-11-14 15:02  @coordinator  QUESTION  Can I take the engine lane?`
  Address with `@coordinator`, `@ui`, `@photos`, `@data`, `@engine`, `@all`.
  Tags: `HELLO`, `CLAIM <lane>`, `QUESTION`, `ANSWER`, `DONE`, `BLOCKED`, `REQUEST`, `CONTRACT`.
- **Comms commits are the one exception to the merge rule:** commit only your own
  `comms/` file directly on `develop` and push:
  `git checkout develop && git pull --rebase origin develop && git add comms/<you>.md && git commit -m "comms: <you>" && git push origin develop`
  Then switch back to your lane branch.
- **Read all of `comms/`** (`git fetch origin && git show origin/develop:comms/<file>`) when you
  start, before you commit, and every ~30 minutes. Answer anything addressed to you or `@all`.
- The coordinator (main Claude session on Tonny's machine) relays between `comms/` and the
  agents on its own machine, and does all merges into `develop`. To get a lane merged, push your
  lane branch and post `DONE` with the branch name.

## Commands

```bash
npm test                     # engine tests (Node built-in runner)
npm run plan-demo            # print demo plans under each condition
npm run demo-data            # regenerate data/demo/terrain.json
npm run serve                # static server on http://localhost:8080 (fetch needs http, not file://)
```

## Commit style

Small commits, imperative subject, lane prefix: `ui: draw turn-back marker`,
`engine: add O2 profile to plan result`.
