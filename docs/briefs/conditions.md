# Brief — Conditions: Go/No-Go (branch `conditions`) — `codex-conditions` (Louis's Codex)

Assigned by the lead (`louis-claude`), 2026-11-14.

You are the conditions agent on Marswalk Budget (NASA Space Apps 2026, route planner for an
astronaut walking at Jezero Crater, Mars). Read `AGENTS.md`, `CONTRACTS.md` and `STATUS.md`
first. Other agents work in parallel; stay inside your files. Science calls (thresholds, which
data to trust) belong to the humans: when unsure, write a `QUESTION` line in STATUS.md, pick the
safer option, and tag it `ASSUMPTION`.

**Branch:** `conditions`, from `origin/develop`.
**You own:** `js/conditions.js`, `scripts/fetch_conditions.mjs`, `data/conditions/`,
`tests/conditions.test.mjs`, `tests/fixtures/conditions/`, `docs/conditions-demo.html`.
**Do not edit:** `js/engine.js`, `js/config.js`, the console (`index.html`, `css/app.css`,
`js/app.js`, `js/render.js`), photos, data-pipeline files, other `data/` folders.

## Goal

Turn real Mars weather and space-weather data into the conditions the engine already understands
(`dustStorm`, `solarEvent`; `heavyKit` stays the astronaut's choice) and a **GO / CAUTION /
NO-GO** call with reasons and sources. File shape: CONTRACTS §6 (already written; follow it).

1. **`scripts/fetch_conditions.mjs`** (Node ≥ 20, no dependencies) writes
   `data/conditions/real.json`:
   - **Weather at Jezero:** Perseverance **MEDA** (instrument led by Spain's Centro de
     Astrobiología). Candidate feed, UNVERIFIED:
     `https://mars.nasa.gov/rss/api/?feed=weather&category=mars2020&feedtype=json`.
     mars.nasa.gov needs a browser `User-Agent` from curl/Node (see STATUS.md 11:20). Keep the
     latest sol's min/max air temperature, pressure and sol number. If the feed doesn't exist,
     leave those fields `null`, list them under `manual`, and say so in STATUS.md.
   - **Solar particle events:** NASA CCMC DONKI, last 30 days, no key needed:
     `https://kauai.ccmc.gsfc.nasa.gov/DONKI/WS/get/SEP?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD`.
     `sep.status` = `alert` if an event started in the last 2 days, `watch` if in the last 7,
     else `quiet` (thresholds at the top of the file, tagged `ASSUMPTION`). DONKI mostly reports
     events seen near Earth; say "Earth-side detection used as a proxy for Mars" in `sources`.
   - **Radiation baseline:** read `CONFIG.radiation.surfaceMSvPerDay` from `js/config.js`
     (Curiosity RAD, measured at Gale, used as a proxy for Jezero). Don't copy the number.
   - **Dust and EVA window:** the Mars Climate Database (LMD with ESA and CNES,
     https://www-mars.lmd.jussieu.fr) has no API. `dustTau` and `evaWindowLocal` stay manual
     fields a human fills from its web interface; list them under `manual`.
   - Every value carries its source name, URL and retrieval time in `sources`.
   - **No network in your sandbox?** Write the script anyway, test it on fixtures, and put the
     exact command in STATUS.md as `REQUEST @tonny-claude: run node scripts/fetch_conditions.mjs`.
2. **Demo files** (hand-made): `data/conditions/demo-quiet.json` (GO), `demo-dusty.json`
   (CAUTION, dustTau 1.5), `demo-solar.json` (NO-GO, SEP alert). Label them `"synthetic": true`.
3. **`js/conditions.js`** (browser ES module, also importable from Node; no DOM access at import
   time) exports:
   - `loadConditions(name)` → fetches `data/conditions/<name>.json` (`real`, `demo-quiet`, ...).
   - `toToggles(cond)` → `{ dustStorm, solarEvent }`: dust when `dustTau > 1.0`, solar when
     `sep.status === 'alert'`.
   - `verdict(cond, plan)` → `{ level: 'GO' | 'CAUTION' | 'NO-GO', reasons: [{ code, text, source }] }`.
     NO-GO: SEP alert, or `plan.withinBudget === false`. CAUTION: SEP watch, `dustTau > 1.0`,
     O2 margin under 10 % (`1 - totals.o2UsedKg / totals.o2UsableKg`), or dose over 80 % of
     `totals.doseLimitMSv`. Otherwise GO. `plan` may be `null` (conditions only).
   - `renderConditions(container, cond, plan)` → draws a card: big level, reasons, the values
     with units, sources with links, "manual" badge on hand-filled values.
4. **`docs/conditions-demo.html`**: loads the three demo files and the demo plan and renders all
   three cards side by side. This is how a human checks your work in a browser.

## Tests — `tests/conditions.test.mjs` (node --test)

Must pass with no network and no `npm install`. Cover: thresholds, every verdict rule (including
`plan === null`), `toToggles`, DONKI parsing on a saved response in
`tests/fixtures/conditions/`, MEDA parsing on a fixture (if the feed exists). Run the whole
suite (`npm test`), not just yours.

## Hook into the console

You don't edit the console. When your card works, post in STATUS.md one
`REQUEST @ui` line pointing to a short snippet you write in `docs/conditions-demo.html` (an HTML
comment is fine): where to mount the card, how to call `toToggles` to pre-set the console's
condition switches, and `?cond=` (CONTRACTS §7). `tonny-claude` applies it.

## Done when

Tests pass offline; the demo page shows GO, CAUTION and NO-GO; `real.json` is fetched, or the
exact command is in STATUS.md; STATUS.md `DONE` line; branch `conditions` pushed (Louis pushes
for you if you can't). Commit prefix `conditions:`. First line of every code file you create:
`// Generated with AI assistance for NASA Space Apps 2026; reviewed by the team`.
