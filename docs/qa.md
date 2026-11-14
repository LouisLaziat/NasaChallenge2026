<!-- Generated with AI assistance for NASA Space Apps 2026; reviewed by the team -->
# QA matrix: release candidate

Owner: `tonny-claude` (release-candidate QA, lead's 15:41 ASSIGN). Run on 2026-11-14 at 15:57-16:03
(Toronto), on `integrate` at `24bb75d` (= `develop` + the route switch), served by `npm run serve`.

## How it was checked

Every page was loaded in a fresh iframe at the given width in the in-app Chromium browser. Error
hooks were attached before the page's modules ran (`console.error`, uncaught errors, unhandled
promise rejections, failed images/scripts/stylesheets). After the page settled (5–7 s, long enough
for the background route options), the harness recorded:
- failed same-origin requests (HTTP ≥ 400);
- horizontal page scroll;
- the error banner;
- for the console, the plan on screen: route mode against `?route=`, fits or not, O₂, dose,
  Go/No-Go badge, turn-back point, best set and turn-by-turn step count.

**Pass** = no errors, no failed requests, no horizontal scroll, no error banner.

## Summary

**84 checks, 84 pass, no console errors anywhere.**
- 45 console loads: 3 sites × 5 conditions × 3 routes.
- 36 others: 15 tablet/HUD loads, 18 phone-width loads (360 and 414 px for the console, tablet and HUD
  on every site), 3 docs pages.
- 3 presenter tours.

| # | Finding | Owner | Status |
|---|---|---|---|
| 1 | Tablet and HUD ignore `?route=safe` / `?route=short` and plan the least-oxygen route, so a link from the console on another route shows a different path. | views (`codex-views`) | **Fixed** by views (8a0e8c7). Rechecked 16:20: `tablet.html?data=real` 4 h 22 min, `&route=safe` 4 h 25 min with a different first stop, and the HUD matches |
| 2 | `npm run serve` sends `.md` as `application/octet-stream`, so the About panel's links to `docs/model.md` and `docs/model-sources.md` download a file instead of showing it. GitHub Pages sends Markdown as text, so this only affects the local server. | lead (`scripts/serve.mjs`) | REQUEST @lead filed: add `'.md': 'text/plain; charset=utf-8'` |
| 3 | Tour caption read "0.40 of 0.40 kg O₂: fits" on the demo best set (0.396 rounds up). | ui (me) | **Fixed**: shows 3 decimals when the two would round to the same value |
| 4 | A "403 Forbidden" seen earlier in the console. | — | **Not reproducible.** Left over from a temporary sub-path test server; none of the 84 checks saw it |
| 5 | Helmet view (VR) `hud.html?vr=1` not on `develop` yet. | views | **Landed.** Console now has "Open helmet view (VR)", carrying site, stops, conditions and route. Stereo view checked headless at 896 × 414 for Jezero and Gale (media kit `vr-01`, `vr-02`) |
| 6 | HUD and helmet view name the next stop by id ("toward R3", "R6 · 68 m direct"), while the tablet heading shows the name. `walk.js` calls `buildSteps(plan, terrain)` without the names map. | views | REQUEST @views filed: pass `new Map(targets.map(t => [t.id, t.name]))` |
| 7 | Helmet chevron vs "Head NW" text (lead's question): the chevron is the straight-line bearing to the next **stop**, shown relative to the current path heading; the text is the current path **step**. They differ wherever the path bends. | views | Answered in STATUS.md; suggest pointing the chevron along the step, or labelling it "stop" |

Things that work as designed, noted for the story:
- **Weather is old:** real Jezero and Gale show **CAUTION** even with no hazard, because both weather
  snapshots are months old (the 7-sol freshness rule).
- **Gale and single hazards:** each hazard alone still fits at Gale (solar: 0.976 of 1.0 mSv). Only
  all three together go over. The tour handles this by adding hazards until the walk breaks.
- **Demo:** "Shortest" with a heavy kit goes over budget (0.41 kg) while "Least oxygen" and "Safest"
  fit. That's a good example for the route cards.
- **Slow background route:** under a dust storm on real Jezero, one background route option took
  longer than 6 s. The page never waits for it; its card shows "planning…" until it is ready.

## Results

### Console: site x conditions x route (1280 px)

| Check | Result | Route shown | Fits | O₂ kg | Dose mSv | Badge | Turn-back | Best set | Steps |
|---|---|---|---|---|---|---|---|---|---|
| `/?data=demo` | pass | eco | yes | 0.297 | 0.105 | GO | — | — | 24 steps |
| `/?data=demo&route=safe` | pass | safe | yes | 0.3 | 0.106 | GO | — | — | 26 steps |
| `/?data=demo&route=short` | pass | short | yes | 0.311 | 0.106 | GO | — | — | 18 steps |
| `/?data=demo&dust=1` | pass | eco | yes | 0.365 | 0.115 | CAUTION | — | — | 24 steps |
| `/?data=demo&dust=1&route=safe` | pass | safe | yes | 0.369 | 0.117 | CAUTION | — | — | 26 steps |
| `/?data=demo&dust=1&route=short` | pass | short | yes | 0.387 | 0.118 | CAUTION | — | — | 17 steps |
| `/?data=demo&solar=1` | pass | eco | no (radiation) | 0.297 | 1.047 | NO-GO | — | 5 | 24 steps |
| `/?data=demo&solar=1&route=safe` | pass | safe | no (radiation) | 0.3 | 1.059 | NO-GO | — | 5 | 26 steps |
| `/?data=demo&solar=1&route=short` | pass | short | no (radiation) | 0.311 | 1.064 | NO-GO | — | 5 | 18 steps |
| `/?data=demo&kit=1` | pass | eco | yes | 0.389 | 0.109 | CAUTION | — | — | 24 steps |
| `/?data=demo&kit=1&route=safe` | pass | safe | yes | 0.393 | 0.111 | CAUTION | — | — | 26 steps |
| `/?data=demo&kit=1&route=short` | pass | short | no (oxygen) | 0.41 | 0.111 | NO-GO | yes | 5 | 18 steps |
| `/?data=demo&dust=1&solar=1&kit=1` | pass | eco | no (oxygen, radiation) | 0.483 | 1.215 | NO-GO | yes | 4 | 24 steps |
| `/?data=demo&dust=1&solar=1&kit=1&route=safe` | pass | safe | no (oxygen, radiation) | 0.49 | 1.236 | NO-GO | yes | 5 | 26 steps |
| `/?data=demo&dust=1&solar=1&kit=1&route=short` | pass | short | no (oxygen, radiation) | 0.515 | 1.245 | NO-GO | yes | 4 | 19 steps |
| `/?data=real` | pass | eco | yes | 0.356 | 0.117 | CAUTION | — | — | 19 steps |
| `/?data=real&route=safe` | pass | safe | yes | 0.359 | 0.118 | CAUTION | — | — | 13 steps |
| `/?data=real&route=short` | pass | short | yes | 0.364 | 0.118 | CAUTION | — | — | 20 steps |
| `/?data=real&dust=1` | pass | eco | no (oxygen) | 0.451 | 0.13 | NO-GO | yes | 5 | 19 steps |
| `/?data=real&dust=1&route=safe` | pass | safe | no (oxygen) | 0.455 | 0.132 | NO-GO | yes | 5 | 13 steps |
| `/?data=real&dust=1&route=short` | pass | short | no (oxygen) | 0.46 | 0.132 | NO-GO | yes | 5 | 20 steps |
| `/?data=real&solar=1` | pass | eco | no (radiation) | 0.356 | 1.165 | NO-GO | — | 5 | 19 steps |
| `/?data=real&solar=1&route=safe` | pass | safe | no (radiation) | 0.359 | 1.176 | NO-GO | — | 5 | 13 steps |
| `/?data=real&solar=1&route=short` | pass | short | no (radiation) | 0.364 | 1.178 | NO-GO | — | 5 | 20 steps |
| `/?data=real&kit=1` | pass | eco | no (oxygen) | 0.473 | 0.122 | NO-GO | yes | 5 | 19 steps |
| `/?data=real&kit=1&route=safe` | pass | safe | no (oxygen) | 0.477 | 0.123 | NO-GO | yes | 5 | 13 steps |
| `/?data=real&kit=1&route=short` | pass | short | no (oxygen) | 0.481 | 0.123 | NO-GO | yes | 4 | 19 steps |
| `/?data=real&dust=1&solar=1&kit=1` | pass | eco | no (oxygen, radiation) | 0.607 | 1.384 | NO-GO | yes | 3 | 19 steps |
| `/?data=real&dust=1&solar=1&kit=1&route=safe` | pass | safe | no (oxygen, radiation) | 0.614 | 1.401 | NO-GO | yes | 3 | 13 steps |
| `/?data=real&dust=1&solar=1&kit=1&route=short` | pass | short | no (oxygen, radiation) | 0.621 | 1.4 | NO-GO | yes | 3 | 18 steps |
| `/?data=gale` | pass | eco | yes | 0.271 | 0.098 | CAUTION | — | — | 14 steps |
| `/?data=gale&route=safe` | pass | safe | yes | 0.272 | 0.098 | CAUTION | — | — | 20 steps |
| `/?data=gale&route=short` | pass | short | yes | 0.278 | 0.099 | CAUTION | — | — | 13 steps |
| `/?data=gale&dust=1` | pass | eco | yes | 0.323 | 0.105 | CAUTION | — | — | 14 steps |
| `/?data=gale&dust=1&route=safe` | pass | safe | yes | 0.324 | 0.106 | CAUTION | — | — | 20 steps |
| `/?data=gale&dust=1&route=short` | pass | short | yes | 0.339 | 0.107 | CAUTION | — | — | 14 steps |
| `/?data=gale&solar=1` | pass | eco | yes | 0.271 | 0.976 | CAUTION | — | — | 14 steps |
| `/?data=gale&solar=1&route=safe` | pass | safe | yes | 0.272 | 0.979 | CAUTION | — | — | 20 steps |
| `/?data=gale&solar=1&route=short` | pass | short | yes | 0.278 | 0.986 | CAUTION | — | — | 13 steps |
| `/?data=gale&kit=1` | pass | eco | yes | 0.351 | 0.101 | CAUTION | — | — | 14 steps |
| `/?data=gale&kit=1&route=safe` | pass | safe | yes | 0.352 | 0.101 | CAUTION | — | — | 20 steps |
| `/?data=gale&kit=1&route=short` | pass | short | yes | 0.365 | 0.103 | CAUTION | — | — | 11 steps |
| `/?data=gale&dust=1&solar=1&kit=1` | pass | eco | no (oxygen, radiation) | 0.423 | 1.096 | NO-GO | yes | 3 | 14 steps |
| `/?data=gale&dust=1&solar=1&kit=1&route=safe` | pass | safe | no (oxygen, radiation) | 0.424 | 1.101 | NO-GO | yes | 3 | 20 steps |
| `/?data=gale&dust=1&solar=1&kit=1&route=short` | pass | short | no (oxygen, radiation) | 0.441 | 1.118 | NO-GO | yes | 3 | 11 steps |

### Tablet, HUD, phone widths, docs pages

| Check | Width | Result | First text on the page |
|---|---|---|---|
| `/tablet.html?data=demo` | 1280 px | pass | Marswalk Budget Synthetic demo terrain Field tablet Simulate EVA progr |
| `/tablet.html?data=demo&dust=1&solar=1&kit=1` | 1280 px | pass | Marswalk Budget Synthetic demo terrain Field tablet Simulate EVA progr |
| `/hud.html?data=demo` | 1280 px | pass | Helmet HUD Marswalk Budget SYNTHETIC DEMO TERRAIN GO Simulated conditi |
| `/hud.html?data=demo&dust=1&solar=1&kit=1` | 1280 px | pass | Helmet HUD Marswalk Budget SYNTHETIC DEMO TERRAIN NO-GO Simulated cond |
| `/tablet.html?data=real` | 1280 px | pass | Marswalk Budget Jezero Crater Field tablet Simulate EVA progress 0% De |
| `/tablet.html?data=real&dust=1&solar=1&kit=1` | 1280 px | pass | Marswalk Budget Jezero Crater Field tablet Simulate EVA progress 0% De |
| `/hud.html?data=real` | 1280 px | pass | Helmet HUD Marswalk Budget JEZERO CRATER CAUTION Jezero · MEDA ROUTE H |
| `/hud.html?data=real&dust=1&solar=1&kit=1` | 1280 px | pass | Helmet HUD Marswalk Budget JEZERO CRATER NO-GO Jezero · MEDA ROUTE HEA |
| `/tablet.html?data=gale` | 1280 px | pass | Marswalk Budget Gale Crater Field tablet Simulate EVA progress 0% Depa |
| `/tablet.html?data=gale&dust=1&solar=1&kit=1` | 1280 px | pass | Marswalk Budget Gale Crater Field tablet Simulate EVA progress 0% Depa |
| `/hud.html?data=gale` | 1280 px | pass | Helmet HUD Marswalk Budget GALE CRATER CAUTION Gale · REMS ROUTE HEADI |
| `/hud.html?data=gale&dust=1&solar=1&kit=1` | 1280 px | pass | Helmet HUD Marswalk Budget GALE CRATER NO-GO Gale · REMS ROUTE HEADING |
| `/tablet.html?data=real&route=safe` | 1280 px | pass (plans the safe route; finding 1 fixed) | Marswalk Budget Jezero Crater Field tablet Simulate EVA progress 0% De |
| `/hud.html?data=real&route=safe` | 1280 px | pass (plans the safe route; finding 1 fixed) | Helmet HUD Marswalk Budget JEZERO CRATER CAUTION Jezero · MEDA ROUTE H |
| `/hud.html?data=real&play=10` | 1280 px | pass | Helmet HUD Marswalk Budget JEZERO CRATER CAUTION Jezero · MEDA ROUTE H |
| `/?data=demo` | 360 px | pass | plan eco, GO |
| `/tablet.html?data=demo` | 360 px | pass | Marswalk Budget Synthetic demo terrain Field tablet Simulate EVA progr |
| `/hud.html?data=demo` | 360 px | pass | Helmet HUD Marswalk Budget SYNTHETIC DEMO TERRAIN GO Simulated conditi |
| `/?data=demo` | 414 px | pass | plan eco, GO |
| `/tablet.html?data=demo` | 414 px | pass | Marswalk Budget Synthetic demo terrain Field tablet Simulate EVA progr |
| `/hud.html?data=demo` | 414 px | pass | Helmet HUD Marswalk Budget SYNTHETIC DEMO TERRAIN GO Simulated conditi |
| `/?data=real` | 360 px | pass | plan eco, CAUTION |
| `/tablet.html?data=real` | 360 px | pass | Marswalk Budget Jezero Crater Field tablet Simulate EVA progress 0% De |
| `/hud.html?data=real` | 360 px | pass | Helmet HUD Marswalk Budget JEZERO CRATER CAUTION Jezero · MEDA ROUTE H |
| `/?data=real` | 414 px | pass | plan eco, CAUTION |
| `/tablet.html?data=real` | 414 px | pass | Marswalk Budget Jezero Crater Field tablet Simulate EVA progress 0% De |
| `/hud.html?data=real` | 414 px | pass | Helmet HUD Marswalk Budget JEZERO CRATER CAUTION Jezero · MEDA ROUTE H |
| `/?data=gale` | 360 px | pass | plan eco, CAUTION |
| `/tablet.html?data=gale` | 360 px | pass | Marswalk Budget Gale Crater Field tablet Simulate EVA progress 0% Depa |
| `/hud.html?data=gale` | 360 px | pass | Helmet HUD Marswalk Budget GALE CRATER CAUTION Gale · REMS ROUTE HEADI |
| `/?data=gale` | 414 px | pass | plan eco, CAUTION |
| `/tablet.html?data=gale` | 414 px | pass | Marswalk Budget Gale Crater Field tablet Simulate EVA progress 0% Depa |
| `/hud.html?data=gale` | 414 px | pass | Helmet HUD Marswalk Budget GALE CRATER CAUTION Gale · REMS ROUTE HEADI |
| `/docs/conditions-demo.html` | 1280 px | pass | MARSWALK BUDGET / JEZERO CRATER Before you step outside. Three saved,  |
| `/docs/photos-demo.html` | 1280 px | pass | Marswalk Budget — photos & NASA layers test page Real stops on HiRISE  |
| `/docs/photos-demo.html?data=gale` | 1280 px | pass | Marswalk Budget — photos & NASA layers test page Real stops on HiRISE  |

### Presenter tour (?tour=1), steps 1-6 (step 7 opens the HUD; checked by hand)

- `/?data=demo&tour=1`: pass
  - 1/7 A quiet sol: 6 stops, 3 h 56 min out and back, 0.30 of 0.40 kg O₂. The walk fits.
  - 2/7 Dust storm plus a heavy sample kit: slower, harder walking. Same stops now need 0.48 of 0.40 kg O₂: over budget.
  - 3/7 Point of no return at T+3:13: past the red marker, the suit can't get home without the O₂ reserve.
  - 4/7 The planner searches every set of stops for the most science that still fits: 4 stops, value 30.
  - 5/7 Best set, dust storm + heavy kit: 4 stops, science 30, 0.396 of 0.400 kg O₂: fits, CAUTION.
  - 6/7 Compare routes for the same stops: Least oxygen 0.396 kg, 32 m over 15° · Safest 0.405 kg, 27 m over 15° · Shortest 0.421 kg, 133 m over 15°.
- `/?data=gale&tour=1`: pass
  - 1/7 A quiet sol: 4 stops, 3 h 40 min out and back, 0.27 of 0.40 kg O₂. The walk fits.
  - 2/7 Dust storm plus a heavy sample kit: slower, harder walking. Same stops now need 0.42 of 0.40 kg O₂: over budget.
  - 3/7 Point of no return at T+3:29: past the red marker, the suit can't get home without the O₂ reserve.
  - 4/7 The planner searches every set of stops for the most science that still fits: 3 stops, value 23.
  - 5/7 Best set, dust storm + heavy kit: 3 stops, science 23, 0.37 of 0.40 kg O₂: fits, CAUTION.
  - 6/7 Compare routes for the same stops: Least oxygen 0.372 kg, 10 m over 15° · Safest 0.373 kg, 7 m over 15° · Shortest 0.393 kg, 74 m over 15°.
- `/?data=real&tour=1`: pass
  - 1/7 A quiet sol: 6 stops, 4 h 22 min out and back, 0.36 of 0.40 kg O₂. The walk fits.
  - 2/7 Dust storm forecast: slower walking, more effort. Same stops now need 0.45 of 0.40 kg O₂: over budget.
  - 3/7 Point of no return at T+3:27: past the red marker, the suit can't get home without the O₂ reserve.
  - 4/7 The planner searches every set of stops for the most science that still fits: 5 stops, value 36.
  - 5/7 Best set, dust storm on: 5 stops, science 36, 0.38 of 0.40 kg O₂: fits, CAUTION.
  - 6/7 Compare routes for the same stops: Least oxygen 0.378 kg, 0 m over 15° · Safest 0.380 kg, 0 m over 15° · Shortest 0.390 kg, 7 m over 15°.

## Not covered yet

- **Helmet view (VR) on a real headset:** checked only in headless Chrome (stereo layout and numbers); head tracking needs a phone over https.
- **Real phones:** compass and fullscreen need https, so they wait until the site is online.
- **Other browsers:** Firefox and Safari not tested; only the in-app Chromium.
- **Tour step 7:** it opens `hud.html` with `&play=30`. Checked by hand, not by the harness.

To re-run: serve with `npm run serve`. The harness is a short script that loads each URL in a
hidden iframe; ask tonny-claude for it.
