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
Node ≥ 20 for everything, data pipeline included (`geotiff` is the only devDependency).
`npm test` must pass on a clean checkout with no `node_modules` and no network.

```
index.html, css/app.css, js/app.js, js/render.js
                                            Console UI   (tonny-claude, integration)
js/photos.js, js/basemap.js, scripts/fetch_photos.mjs, docs/photos-demo.html
                                            Photos/NASA layers (louis-claude)
data/gale/, tests/gale.test.mjs, scripts/*gale*
                                            Gale data (louis-claude)
data/real/targets.json, data/real/area.json Jezero site  (merged; changes via the lead)
scripts/prep_real_data.mjs, scripts/lib/prep.mjs, tests/prep.test.mjs,
  data/real/terrain.json                    Real data    (tonny-claude)
js/engine.js, js/config.js, tests/engine.test.mjs,
  CONTRACTS.md, docs/model.md               Engine/model (louis-claude)
js/conditions.js, scripts/fetch_conditions.mjs, data/conditions/,
  tests/conditions.test.mjs, docs/conditions-demo.html
                                            Conditions   (codex-conditions)
tablet.html, hud.html, flyover.html, js/views/, css/views.css, tests/views.test.mjs
                                            Views        (codex-views)
data/demo/, scripts/make_demo.mjs, scripts/plan_demo.mjs, scripts/serve.mjs,
  package.json, AGENTS.md, CLAUDE.md, README.md, docs/briefs/,
  .claude/launch.json                       Lead         (louis-claude)
js/routes.js, tests/routes.test.mjs        Route options (louis-claude, engine lane)
docs/submission/, README.md               Submission drafts + README (codex-conditions)
docs/qa.md, docs/screenshots/kit/        QA + media kit (tonny-claude)
STATUS.md                                   everyone (append only)
comms/<agent>.md                            that agent only (cross-machine messages)
```

## Roles (2026-11-14, decided by Tonny)

- **Lead: `louis-claude`** (Claude on Louis's machine). Decides the plan, assigns lanes, owns
  `AGENTS.md`, `CONTRACTS.md` and `docs/briefs/`, and does every merge into `develop`. It also
  runs the engine lane. It has no GitHub access: it merges locally and Louis pushes, so expect
  some lag between your `DONE` and the merge.
- **Workers:** `tonny-claude` (Claude on Tonny's machine), `codex-conditions` (Louis's Codex
  agent; Louis passes its messages and pushes for it if needed) and `codex-views` (Lewl's Codex
  agent; Lewl passes its messages and pushes for it if needed) and `amarz-claude`
  (theamarz999-stack's Claude).
- **Humans** own the science and creative calls, the story, the demo video or slides and the
  submission. `main` only changes when a human merges a pull request from `develop`.
- The old coordinator is retired: read "coordinator" in older lines as "lead".

## Site decision (2026-11-14)

**Jezero Crater (delta front) is the primary site.** Gale Crater (Mount Sharp boxwork) is a
**second dataset added later**, in `data/gale/` with the same contracts, loaded with `?data=gale`.
Nothing about Gale may change the Jezero files or the contracts.

## The lanes

| Lane | Who | Branch | Owns | Status / done when |
|---|---|---|---|---|
| UI (console) | Claude 1 (Tonny) → now `tonny-claude` | `integrate` | `index.html`, `css/app.css`, `js/app.js`, `js/render.js` | **MERGED.** `tonny-claude` now owns these files for integration: conditions card, tablet/HUD links, new plan fields. |
| Photos & NASA layers | Claude 2 (Tonny) → now `amarz-claude` | merged | `js/photos.js`, `js/basemap.js`, `scripts/fetch_photos.mjs`, `data/real/targets.json`, `data/real/area.json`, `docs/photos-demo.html` | **MERGED.** Jezero area, 6 real stops with Perseverance photos, Mars Trek HiRISE/CTX + traverse. `amarz-claude` now owns these files to add Gale; Jezero must not change. |
| Real data | **`tonny-claude`** | `data` | `scripts/prep_real_data.mjs`, `scripts/lib/prep.mjs`, `tests/prep.test.mjs`, `data/real/terrain.json` | Jezero DTM + thermal inertia → `data/real/terrain.json`, in Node. Brief: `docs/briefs/data.md`. **Critical path.** |
| Engine & model | **`louis-claude`** | `engine` | `js/engine.js`, `js/config.js`, `tests/engine.test.mjs`, `CONTRACTS.md`, `docs/model.md` | Cite every `ASSUMPTION`, max slope 20° (NTRS 20210000827), add `profile`, `bestSubset`, `turnBackLatest`. Brief: `docs/briefs/engine.md`. |
| Conditions (Go/No-Go) | **`codex-conditions`** (Louis's Codex) | `conditions` | see brief | MEDA / DONKI / RAD / MCD → condition switches + GO/CAUTION/NO-GO. Brief: `docs/briefs/conditions.md`. |
| Views (tablet + helmet HUD) | **`codex-views`** (Lewl's Codex) | `views` | see brief | Field tablet and helmet HUD from the plan result. Brief: `docs/briefs/views.md`. |
| Gale dataset | **`louis-claude`** (stops, map layers, photo credits); data by `amarz-claude` | `gale` | `data/gale/`, `tests/gale.test.mjs`, `docs/gale-demo.html` + the photos files above | Mount Sharp boxwork: area, real Curiosity stops and photos, Trek layers, terrain via the data lane's script. Brief: `docs/briefs/gale.md`. |

Partner-agency data is credited where used (ESA HRSC / Mars Climate Database, CSA APXS,
Spain REMS, UAE Emirates Mars Mission).

## Hard rules

1. **Only edit files your lane owns.** Need a change in someone else's file? Write a request in
   `STATUS.md` (`REQUEST @lane: ...`) and work around it until it lands.
2. **Contracts are frozen** except by the engine lane, and only additively unless every lane
   agrees in `STATUS.md`. Never rename or remove a field another lane reads.
3. **Branch from `develop`, merge back into `develop`.** Rebase or merge `develop` into your
   branch at least every couple of hours and before you open a merge. Never push to `main`.
4. **Merge order (from now):** `engine` and `data`, then `conditions`, then `views`, then
   `integrate`, then `gale`. The lead merges and re-runs all tests after every merge.
5. **Tests must pass before merging:** `npm test`, on a clean checkout with no `node_modules` and
   no network. Import optional packages (`geotiff`) only inside scripts, with `await import()`.
6. **No secrets or large files in git.** Raw GeoTIFFs and downloads go in `raw/` (git-ignored).
   Anything committed under `data/` stays under ~5 MB per file.
7. **Be honest about data.** Synthetic data is labelled `synthetic: true`. Numbers we invented
   are tagged `ASSUMPTION` in `js/config.js`. Curiosity RAD dose rates are from Gale Crater, used
   as a proxy for Jezero — say so wherever dose is shown.
8. **Unverified endpoints.** Mars Trek tiles, the Perseverance raw-image feed and the MMGIS
   traverse are verified (STATUS.md, 11:20 lines). Anything else (the DTM download, MEDA weather,
   DONKI) is unverified until someone loads it by hand and records the working URL in `STATUS.md`.
9. **One working copy per agent.** Never run two agents in the same folder: a branch switch by
   one breaks the other. Each agent works in its own clone or `git worktree`, and never touches
   another agent's folder (e.g. `_louis-claude/`).
10. **Real clock times.** Stamp `STATUS.md` and `comms/` lines from the clock, in Toronto time
   (the Local Event's zone): `TZ=America/Toronto date '+%Y-%m-%d %H:%M'`. Never type a time.
11. **AI disclosure.** First line of every code file you create:
    `// Generated with AI assistance for NASA Space Apps 2026; reviewed by the team`
    (`<!-- -->` in HTML, `/* */` in CSS). Space Apps requires it. No NASA logos or mission
    insignia in anything we make.

## STATUS.md protocol

Append a line (newest at the bottom), never rewrite others' lines:

```
2026-11-14 14:05  [engine]  DONE   profile[] added to plan result (additive, see CONTRACTS §4)
2026-11-14 14:20  [ui]      BLOCKED need turnBack even when within budget? -> REQUEST @engine
2026-11-14 14:30  [photos]  NOTE   raw image feed works: https://... (CORS: no, use manifest)
```

Tags: `START`, `DONE`, `NOTE`, `QUESTION`, `REQUEST @lane`, `BLOCKED`, `CONTRACT` (engine lane
only), `MERGED` (lead only).

## Talking across machines (`comms/`)

Agents on different computers or accounts cannot message each other directly. They talk
through git, on the `develop` branch:

- Every agent has **one file it alone writes**: `comms/<agent-name>.md` (e.g. `comms/louis-claude.md`,
  `comms/tonny-claude.md`). Nobody edits anyone else's file, so these never conflict.
- Append messages at the bottom, newest last:
  `2026-11-14 15:02  @lead  QUESTION  Can the tablet show dose as % of the limit?`
  Address with `@lead` (= `@louis-claude`), `@tonny-claude`, `@codex-conditions`,
  `@codex-views`, `@amarz-claude`, `@all`.
  Tags: `HELLO`, `ASSIGN`, `QUESTION`, `ANSWER`, `DONE`, `BLOCKED`, `REQUEST`, `CONTRACT`, `GO`.
- **Comms commits are the one exception to the merge rule:** commit only your own
  `comms/` file directly on `develop` and push:
  `git checkout develop && git pull --rebase origin develop && git add comms/<you>.md && git commit -m "comms: <you>" && git push origin develop`
  Then switch back to your lane branch.
- **Read all of `comms/`** (`git fetch origin && git show origin/develop:comms/<file>`) when you
  start, before you commit, and every ~30 minutes. Answer anything addressed to you or `@all`.
- The lead (`louis-claude`) does all merges into `develop`. Each human relays for their own agents:
  Tonny for `tonny-claude`, Louis for `codex-conditions`, Lewl for `codex-views`,
  theamarz999-stack for `amarz-claude`. To get a lane
  merged, push your lane branch and post `DONE <branch>` in your comms file (Codex agents: a
  `DONE` line in `STATUS.md` on your branch; your human tells Louis, who tells the lead).

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
