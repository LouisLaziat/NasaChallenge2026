<!-- Generated with AI assistance for NASA Space Apps 2026; reviewed by the team -->
# QA matrix: release candidate

Owner: `tonny-claude` (release-candidate QA). **Run 2 (final): 2026-11-14 19:44–19:52 Toronto**, on a
local-only merge of `integrate` ec8ed6f + `apxs` 846007e + `views` 4a4ef8f (= everything waiting for the
lead's merge), served by `npm run serve`. Run 1 (15:57–16:03, before the Gale default) is summarised at
the end.

## How it was checked

Each page was loaded in headless Chrome over the DevTools protocol at the given width. Error hooks
were installed before any page script ran (`console.error`, uncaught errors, unhandled promise
rejections, failed images/scripts/stylesheets) and every HTTP response ≥ 400 was recorded. For the
console the harness waited for the plan and all three route options. It then recorded:
- errors, failed requests, horizontal page scroll and the error banner;
- console: route against `?route=`, fits or not, violations, O₂, dose, EVA time against the 6 h
  limit, metres out of the habitat's sight, the out-of-sight legend, turn-back, best set, Go/No-Go
  badge, site name and the five view links;
- checklist: site, Go/No-Go, item count, comm checks, turn-back lines, and that no O₂ is negative;
- chemistry: the APXS card for every stop on Gale and on Jezero.

**Pass** = no errors, no failed requests, no horizontal scroll, no error banner, and the page shows
what it should. Also run: `npm test` offline with no `node_modules` (**96/96** on the merge) and the
checklist printed to PDF (**one page** on A4 and Letter, including Jezero with all hazards).

## Summary

**89 checks, 89 pass, no console errors anywhere.**
- 45 console loads: 3 sites × 5 conditions × 3 routes, with `/` = Gale.
- 22 view pages: tablet, HUD, VR entry, fly-through and checklist on Gale and Jezero; route = safe
  and all-hazards checklist variants; each page with no `?data=` (Gale default).
- 14 phone-width loads: console (3 sites), tablet, HUD, checklist and fly-through at 360 and 414 px.
- 3 docs pages (served as text now), 2 chemistry sweeps, 3 presenter tours.

Not counted as failures (explained in the findings): the browser's automatic `/favicon.ico` request
(404), and the Perseverance traverse request from headless Chrome (finding 9).

| # | Finding | Owner | Status |
|---|---|---|---|
| 1 | Tablet and HUD ignored `?route=`. | views | **Fixed** (8a0e8c7), rechecked in run 2: every `route=safe` view page plans the safe route |
| 2 | `npm run serve` sent `.md` as a download. | lead | **Fixed** (eaf2ac7): docs pages open as text |
| 3 | Tour caption read "0.40 of 0.40 kg O₂: fits". | ui | **Fixed**: 3 decimals at the limit ("0.396 of 0.400") |
| 4 | A "403 Forbidden" seen once. | — | **Not reproducible** in either run |
| 5 | Helmet view (VR). | views | **Landed**; entry screen loads on both sites, stereo view in the media kit |
| 6 | HUD/VR named the next stop by id. | views | **Fixed** (d4cdd71): names everywhere |
| 7 | VR chevron vs "Head …" text. | views | **Fixed** by views: the chevron follows the next path point |
| 8 | Gale stop details said "Perseverance sol". | ui | **Fixed** (8edeefe): "Curiosity sol" at Gale |
| 9 | Headless Chrome fails CORS on `mars.nasa.gov/.../M20_traverse.json` (Jezero rover path); the in-app browser and curl get `Access-Control-Allow-Origin: *` and HTTP 200. | — | **Not an app bug.** The console catches it; if the traverse ever fails live, Jezero simply has no rover line |
| 10 | The checklist printed negative O₂ when over budget. | ui | **Fixed** before this run: "in the reserve" / "none: suit empty" |

Things that work as designed, noted for the story:
- **Weather is old:** real Gale and Jezero show **CAUTION** with no hazard; both snapshots are past the
  7-sol freshness rule.
- **Gale is forgiving:** each hazard alone still fits (solar 0.976 of 1.0 mSv); all three together go
  over. The Gale tour adds dust and the sample kit until the walk breaks.
- **Line of sight differs a lot by site:** Gale 348 m out of the habitat's sight (behind boxwork
  ridges), Jezero 22 m, and on two Jezero "shortest" routes 0 m (no legend shown, correctly).
- **EVA time never binds today:** the longest walk is 5.26 h (Jezero, all hazards, safest), under 6 h.
- **Demo:** "Shortest" with a heavy kit goes over budget (0.41 kg) while the other two fit.

## Results

### Console: site × conditions × route (1280 px)

| URL | Result | Route | Fits | O₂ kg | Dose mSv | EVA h / 6 | Out of sight m | Badge | Turn-back | Best set |
|---|---|---|---|---|---|---|---|---|---|---|
| `/` | pass | eco | yes | 0.271 | 0.098 | 3.66 | 348 | CAUTION | — | — |
| `/?route=safe` | pass | safe | yes | 0.272 | 0.098 | 3.67 | 419 | CAUTION | — | — |
| `/?route=short` | pass | short | yes | 0.278 | 0.099 | 3.7 | 447 | CAUTION | — | — |
| `/?dust=1` | pass | eco | yes | 0.323 | 0.105 | 3.94 | 348 | CAUTION | — | — |
| `/?dust=1&route=safe` | pass | safe | yes | 0.324 | 0.106 | 3.96 | 419 | CAUTION | — | — |
| `/?dust=1&route=short` | pass | short | yes | 0.339 | 0.107 | 4.03 | 593 | CAUTION | — | — |
| `/?solar=1` | pass | eco | yes | 0.271 | 0.976 | 3.66 | 348 | CAUTION | — | — |
| `/?solar=1&route=safe` | pass | safe | yes | 0.272 | 0.979 | 3.67 | 419 | CAUTION | — | — |
| `/?solar=1&route=short` | pass | short | yes | 0.278 | 0.986 | 3.7 | 447 | CAUTION | — | — |
| `/?kit=1` | pass | eco | yes | 0.351 | 0.101 | 3.78 | 348 | CAUTION | — | — |
| `/?kit=1&route=safe` | pass | safe | yes | 0.352 | 0.101 | 3.79 | 419 | CAUTION | — | — |
| `/?kit=1&route=short` | pass | short | yes | 0.365 | 0.103 | 3.85 | 490 | CAUTION | — | — |
| `/?dust=1&solar=1&kit=1` | pass | eco | no (oxygen, radiation) | 0.423 | 1.096 | 4.11 | 348 | NO-GO | yes | 3 |
| `/?dust=1&solar=1&kit=1&route=safe` | pass | safe | no (oxygen, radiation) | 0.424 | 1.101 | 4.13 | 419 | NO-GO | yes | 3 |
| `/?dust=1&solar=1&kit=1&route=short` | pass | short | no (oxygen, radiation) | 0.441 | 1.118 | 4.19 | 596 | NO-GO | yes | 3 |
| `/?data=real` | pass | eco | yes | 0.356 | 0.117 | 4.37 | 22 | CAUTION | — | — |
| `/?data=real&route=safe` | pass | safe | yes | 0.359 | 0.118 | 4.41 | 10 | CAUTION | — | — |
| `/?data=real&route=short` | pass | short | yes | 0.364 | 0.118 | 4.42 | 5 | CAUTION | — | — |
| `/?data=real&dust=1` | pass | eco | no (oxygen) | 0.451 | 0.13 | 4.89 | 22 | NO-GO | yes | 5 |
| `/?data=real&dust=1&route=safe` | pass | safe | no (oxygen) | 0.455 | 0.132 | 4.94 | 10 | NO-GO | yes | 5 |
| `/?data=real&dust=1&route=short` | pass | short | no (oxygen) | 0.46 | 0.132 | 4.94 | 12 | NO-GO | yes | 5 |
| `/?data=real&solar=1` | pass | eco | no (radiation) | 0.356 | 1.165 | 4.37 | 22 | NO-GO | — | 5 |
| `/?data=real&solar=1&route=safe` | pass | safe | no (radiation) | 0.359 | 1.176 | 4.41 | 10 | NO-GO | — | 5 |
| `/?data=real&solar=1&route=short` | pass | short | no (radiation) | 0.364 | 1.178 | 4.42 | 5 | NO-GO | — | 5 |
| `/?data=real&kit=1` | pass | eco | no (oxygen) | 0.473 | 0.122 | 4.58 | 22 | NO-GO | yes | 5 |
| `/?data=real&kit=1&route=safe` | pass | safe | no (oxygen) | 0.477 | 0.123 | 4.63 | 10 | NO-GO | yes | 5 |
| `/?data=real&kit=1&route=short` | pass | short | no (oxygen) | 0.481 | 0.123 | 4.63 | 0 (no legend) | NO-GO | yes | 4 |
| `/?data=real&dust=1&solar=1&kit=1` | pass | eco | no (oxygen, radiation) | 0.607 | 1.384 | 5.19 | 22 | NO-GO | yes | 3 |
| `/?data=real&dust=1&solar=1&kit=1&route=safe` | pass | safe | no (oxygen, radiation) | 0.614 | 1.401 | 5.26 | 10 | NO-GO | yes | 3 |
| `/?data=real&dust=1&solar=1&kit=1&route=short` | pass | short | no (oxygen, radiation) | 0.621 | 1.4 | 5.25 | 0 (no legend) | NO-GO | yes | 3 |
| `/?data=demo` | pass | eco | yes | 0.297 | 0.105 | 3.93 | 1166 | GO | — | — |
| `/?data=demo&route=safe` | pass | safe | yes | 0.3 | 0.106 | 3.97 | 1115 | GO | — | — |
| `/?data=demo&route=short` | pass | short | yes | 0.311 | 0.106 | 3.99 | 1141 | GO | — | — |
| `/?data=demo&dust=1` | pass | eco | yes | 0.365 | 0.115 | 4.32 | 1166 | CAUTION | — | — |
| `/?data=demo&dust=1&route=safe` | pass | safe | yes | 0.369 | 0.117 | 4.39 | 1115 | CAUTION | — | — |
| `/?data=demo&dust=1&route=short` | pass | short | yes | 0.387 | 0.118 | 4.43 | 1090 | CAUTION | — | — |
| `/?data=demo&solar=1` | pass | eco | no (radiation) | 0.297 | 1.047 | 3.93 | 1166 | NO-GO | — | 5 |
| `/?data=demo&solar=1&route=safe` | pass | safe | no (radiation) | 0.3 | 1.059 | 3.97 | 1115 | NO-GO | — | 5 |
| `/?data=demo&solar=1&route=short` | pass | short | no (radiation) | 0.311 | 1.064 | 3.99 | 1141 | NO-GO | — | 5 |
| `/?data=demo&kit=1` | pass | eco | yes | 0.389 | 0.109 | 4.09 | 1166 | CAUTION | — | — |
| `/?data=demo&kit=1&route=safe` | pass | safe | yes | 0.393 | 0.111 | 4.14 | 1115 | CAUTION | — | — |
| `/?data=demo&kit=1&route=short` | pass | short | no (oxygen) | 0.41 | 0.111 | 4.18 | 1170 | NO-GO | yes | 5 |
| `/?data=demo&dust=1&solar=1&kit=1` | pass | eco | no (oxygen, radiation) | 0.483 | 1.215 | 4.56 | 1166 | NO-GO | yes | 4 |
| `/?data=demo&dust=1&solar=1&kit=1&route=safe` | pass | safe | no (oxygen, radiation) | 0.49 | 1.236 | 4.63 | 1115 | NO-GO | yes | 5 |
| `/?data=demo&dust=1&solar=1&kit=1&route=short` | pass | short | no (oxygen, radiation) | 0.515 | 1.245 | 4.67 | 1111 | NO-GO | yes | 4 |

Every console load also showed the right site name, the three route options and the five view links
(tablet, HUD, VR, fly-through, checklist).

### View pages, phone widths, docs

| Check | URL | Width | Result | What it showed |
|---|---|---|---|---|
| tablet.html gale | `/tablet.html?data=gale` | 1280 px | pass | Marswalk Budget Gale Crater Field tablet Simulate EVA progress 0% Departure Habi |
| hud.html gale | `/hud.html?data=gale` | 1280 px | pass | Helmet HUD Marswalk Budget GALE CRATER Out of habitat’s sight CAUTION Gale · REM |
| hud.html?vr=1 gale | `/hud.html?vr=1&data=gale` | 1280 px | pass | Helmet HUD Cardboard helmet Turn your phone to look around. On desktop, drag or  |
| flyover.html gale | `/flyover.html?data=gale` | 1280 px | pass | H · Habitat G3 · Nevado Sajama / Valle de la Luna drill pair (sol 4722) G4 · Box (3D canvas) |
| checklist.html gale | `/checklist.html?data=gale` | 1280 px | pass | Gale Crater, CAUTION, fits, 14 items, 3 comm checks |
| tablet.html gale safe | `/tablet.html?data=gale&route=safe` | 1280 px | pass | Marswalk Budget Gale Crater Field tablet Simulate EVA progress 0% Departure Habi |
| hud.html gale safe | `/hud.html?data=gale&route=safe` | 1280 px | pass | Helmet HUD Marswalk Budget GALE CRATER Out of habitat’s sight CAUTION Gale · REM |
| checklist.html gale safe | `/checklist.html?data=gale&route=safe` | 1280 px | pass | Gale Crater, CAUTION, fits, 15 items, 4 comm checks |
| checklist gale all hazards | `/checklist.html?data=gale&dust=1&solar=1&kit=1` | 1280 px | pass | Gale Crater, NO-GO, over budget, 15 items, 3 comm checks, TURN BACK BY T+3:29 |
| tablet.html real | `/tablet.html?data=real` | 1280 px | pass | Marswalk Budget Jezero Crater Field tablet Simulate EVA progress 0% Departure Ha |
| hud.html real | `/hud.html?data=real` | 1280 px | pass | Helmet HUD Marswalk Budget JEZERO CRATER Out of habitat’s sight CAUTION Jezero · |
| hud.html?vr=1 real | `/hud.html?vr=1&data=real` | 1280 px | pass | Helmet HUD Cardboard helmet Turn your phone to look around. On desktop, drag or  |
| flyover.html real | `/flyover.html?data=real` | 1280 px | pass | H · Habitat R3 · Hawksbill Gap (foot of the climb) R4 · Skinner Ridge and Wildca (3D canvas) |
| checklist.html real | `/checklist.html?data=real` | 1280 px | pass | Jezero Crater, CAUTION, fits, 16 items, 1 comm checks |
| tablet.html real safe | `/tablet.html?data=real&route=safe` | 1280 px | pass | Marswalk Budget Jezero Crater Field tablet Simulate EVA progress 0% Departure Ha |
| hud.html real safe | `/hud.html?data=real&route=safe` | 1280 px | pass | Helmet HUD Marswalk Budget JEZERO CRATER Out of habitat’s sight CAUTION Jezero · |
| checklist.html real safe | `/checklist.html?data=real&route=safe` | 1280 px | pass | Jezero Crater, CAUTION, fits, 15 items, 0 comm checks |
| checklist real all hazards | `/checklist.html?data=real&dust=1&solar=1&kit=1` | 1280 px | pass | Jezero Crater, NO-GO, over budget, 17 items, 1 comm checks, TURN BACK BY T+2:41 |
| tablet.html default | `/tablet.html` | 1280 px | pass | Marswalk Budget Gale Crater Field tablet Simulate EVA progress 0% Departure Habi |
| hud.html default | `/hud.html` | 1280 px | pass | Helmet HUD Marswalk Budget GALE CRATER Out of habitat’s sight CAUTION Gale · REM |
| flyover.html default | `/flyover.html` | 1280 px | pass | H · Habitat G3 · Nevado Sajama / Valle de la Luna drill pair (sol 4722) G4 · Box (3D canvas) |
| checklist.html default | `/checklist.html` | 1280 px | pass | Gale Crater, CAUTION, fits, 14 items, 3 comm checks |
| phone 360 / | `/` | 360 px | pass | Gale Crater, Fits the budget · 4 stops, CAUTION |
| phone 360 /?data=real | `/?data=real` | 360 px | pass | Jezero Crater, Fits the budget · 6 stops, CAUTION |
| phone 360 /?data=demo | `/?data=demo` | 360 px | pass | Demo terrain, Fits the budget · 6 stops, GO |
| phone 360 /tablet.html | `/tablet.html` | 360 px | pass | Marswalk Budget Gale Crater Field tablet Simulate EVA progress 0% Departure Habi |
| phone 360 /hud.html | `/hud.html` | 360 px | pass | Helmet HUD Marswalk Budget GALE CRATER Out of habitat’s sight CAUTION Gale · REM |
| phone 360 /checklist.html | `/checklist.html` | 360 px | pass | Gale Crater, CAUTION, fits, 14 items, 3 comm checks |
| phone 360 /flyover.html | `/flyover.html` | 360 px | pass | G3 · Nevado Sajama / Valle de la Luna drill pair (sol 4722) G2 · Río Frío ridge  (3D canvas) |
| phone 414 / | `/` | 414 px | pass | Gale Crater, Fits the budget · 4 stops, CAUTION |
| phone 414 /?data=real | `/?data=real` | 414 px | pass | Jezero Crater, Fits the budget · 6 stops, CAUTION |
| phone 414 /?data=demo | `/?data=demo` | 414 px | pass | Demo terrain, Fits the budget · 6 stops, GO |
| phone 414 /tablet.html | `/tablet.html` | 414 px | pass | Marswalk Budget Gale Crater Field tablet Simulate EVA progress 0% Departure Habi |
| phone 414 /hud.html | `/hud.html` | 414 px | pass | Helmet HUD Marswalk Budget GALE CRATER Out of habitat’s sight CAUTION Gale · REM |
| phone 414 /checklist.html | `/checklist.html` | 414 px | pass | Gale Crater, CAUTION, fits, 14 items, 3 comm checks |
| phone 414 /flyover.html | `/flyover.html` | 414 px | pass | G3 · Nevado Sajama / Valle de la Luna drill pair (sol 4722) G2 · Río Frío ridge  (3D canvas) |
| doc /docs/model.md | `/docs/model.md` | 1280 px | pass | <!-- Generated with AI assistance for NASA Space Apps 2026; reviewed by the team |
| doc /docs/model-sources.md | `/docs/model-sources.md` | 1280 px | pass | <!-- Generated with AI assistance for NASA Space Apps 2026; reviewed by the team |
| doc /README.md | `/README.md` | 1280 px | pass | # Marswalk Budget NASA Space Apps 2026 — *Interplanetary Survival Guide: Martian |

### APXS chemistry (needs `apxs` merged)

| Site | Result | Card per stop, in list order |
|---|---|---|
| gale | pass | Tesoro del Pangal DRT · Challapata DRT · Tartagalita DRT · Hornitos DRT |
| jezero | pass | hidden · hidden · hidden · hidden · hidden · hidden |

Gale shows the nearest APXS target for every stop (G4 with the "nearby context only" note); Jezero never
shows the card and never requests the file. Without the `apxs` files the card stays hidden and the
page has no errors (checked on `integrate`).

### Presenter tours (?tour=1)

Gale (`/?tour=1`) and Jezero (`/?data=real&tour=1`) were stepped one key at a time, because the
harness's own probe lost the page when step 7 navigates; both run 1–7 with no errors:
- **Gale:** 1/7 a quiet sol, 4 stops, 0.27 of 0.40 kg O₂ · 2/7 dust storm plus heavy kit, 0.42 kg, over
  budget · 3/7 point of no return T+3:29 · 4/7 best set 3 stops, value 23 · 5/7 0.37 kg, fits, CAUTION ·
  6/7 least oxygen 0.372 / safest 0.373 / shortest 0.393 kg · 7/7 opens `hud.html` with stops G2,G3,G4 and `play=30`.
- **Jezero:** 1/7 6 stops, 0.36 kg · 2/7 dust storm, 0.45 kg, over budget · 3/7 T+3:27 · 4/7 best set 5
  stops, value 36 · 5/7 0.38 kg, fits, CAUTION · 6/7 0.378 / 0.380 / 0.390 kg · 7/7 opens the HUD with R1–R5.
- **Demo** (harness): pass. 6 captions, ending "6/7 Compare routes for the same stops: Least oxygen 0.396 kg…".

## Run 1 (15:57–16:03, before the Gale default)

84 checks on `integrate` 24bb75d: 45 console loads, 15 tablet/HUD, 18 phone-width, 3 docs, 3 tours;
84 pass. Its findings 1–7 are carried in the table above with their current status.

## Not covered

- **Real phones and headsets:** compass, fullscreen, VR head tracking and installing the offline tablet
  need https, so they wait until the site is online.
- **Other browsers:** Firefox and Safari not tested; Chromium only.
- **GPU speed of the fly-through:** checked with software WebGL only.

To re-run: `npm run serve`, then the headless harness (ask tonny-claude); it writes one JSON row per check.
