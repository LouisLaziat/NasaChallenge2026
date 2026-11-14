<!-- Generated with AI assistance for NASA Space Apps 2026; reviewed by the team -->
# Media kit — Marswalk Budget

Screenshots for the slides, the video and the submission page, taken from the `integrate` branch on
2026-11-14 with headless Chrome against `npm run serve`. Desktop shots are 1600 × 900; the
route-card and turn-by-turn crops are 2× pixels; phone shots are 414 × 896 at 2× (828 × 1792);
helmet-view shots are a phone held landscape, 896 × 414 at 2×.

Every map shows NASA Mars Trek imagery (MRO HiRISE / CTX, NASA/JPL-Caltech/UArizona/MSSS) and every
stop photo is a Perseverance or Curiosity raw image (NASA/JPL-Caltech, Curiosity also MSSS); the credit
is visible in each shot. Radiation dose is Curiosity RAD at Gale, used as a proxy at Jezero. The
"demo" conditions (`demo-quiet`, `demo-dusty`) and `data=demo` terrain are synthetic and labelled so on
screen. No NASA logos or mission insignia appear.

## Console (desktop)

| File | Caption |
|---|---|
| `desktop-01-console-real.png` | Jezero delta front, real HiRISE elevation: six science stops fit the suit budget (0.356 of 0.40 kg usable O₂, 4 h 22 min out and back), with the slope overlay, route options and budget bars. |
| `desktop-02-route-cards-real.png` | Same stops, three ways to walk them: least oxygen, safest (kept under 15°) and shortest, each priced in km, time, O₂, dose and metres on steep ground. |
| `desktop-03-console-real-all-hazards.png` | Dust storm, solar particle event and heavy sample kit all switched on: NO-GO, over budget on oxygen and radiation (0.61 kg O₂, 1.38 mSv). The red ↩ marks where to turn back (T+2:41), and the planner offers the best set of stops that still fits. |
| `desktop-04-route-cards-demo-kit.png` | Heavy sample kit on the synthetic demo terrain: the shortest route goes over budget and crosses 162 m of ground over 15°, while least oxygen and safest still fit. |
| `desktop-05-console-gale.png` | Second site, Gale Crater (Mount Sharp boxwork): real Curiosity stops and photos on the MSL DEM, with Curiosity REMS weather. |
| `desktop-06-turn-by-turn.png` | Turn-by-turn directions for the walk: heading, distance and slope for each leg, with the selected step highlighted on the map. |
| `desktop-07-about.png` | "About this model": how metabolic energy becomes suit oxygen, the 20° slope limit, and every data source with its credit and the AI-assistance note. |

## Presenter tour (`?tour=1`, real Jezero)

| File | Caption |
|---|---|
| `desktop-10-tour-step-1.png` | 1/7 — A quiet sol: the planned walk fits, Go. |
| `desktop-11-tour-step-2.png` | 2/7 — Dust storm forecast: slower walking and more effort, so the same stops now need 0.45 of 0.40 kg O₂. NO-GO, turn back by T+3:27. |
| `desktop-12-tour-step-3.png` | 3/7 — The point of no return: the last place on the route where turning back still leaves the O₂ reserve untouched. |
| `desktop-13-tour-step-4.png` | 4/7 — The planner proposes the best set of stops that still fits. |
| `desktop-14-tour-step-5.png` | 5/7 — Best set applied: fewer stops, back inside the budget, verdict from the conditions snapshot. |
| `desktop-15-tour-step-6.png` | 6/7 — Compare routes for the same stops: least oxygen, safest and shortest side by side. |
| `desktop-16-tour-step-7-hud.png` | 7/7 — The helmet HUD the tour opens, playing the walk back under dust-storm conditions. |

## Field tablet and helmet HUD (desktop)

| File | Caption |
|---|---|
| `desktop-20-tablet-real.png` | Field tablet at Jezero: the plan the astronaut carries, with stops, budget and conditions. |
| `desktop-21-hud-real.png` | Helmet HUD at Jezero: next stop, direction, O₂ margin, time left, slope and dose. |
| `desktop-22-tablet-gale.png` | Field tablet at Gale Crater. |
| `desktop-23-hud-gale.png` | Helmet HUD at Gale Crater, with Curiosity photos and RAD dose measured on site. |

## Phone (414 × 896)

| File | Caption |
|---|---|
| `phone-01-console-real.png` | The console on a phone, Jezero: map on top, verdict and route links below. |
| `phone-02-route-cards-real.png` | Route options stacked for a narrow screen. |
| `phone-03-console-gale.png` | The console on a phone, Gale Crater. |
| `phone-04-tablet-real.png` | Field tablet on a phone, Jezero. |
| `phone-05-hud-real.png` | Helmet HUD on a phone, Jezero. |

## Helmet view (VR, phone in a Cardboard-style headset)

| File | Caption |
|---|---|
| `vr-01-helmet-view-real.png` | Stereo helmet view at Jezero: compass, dust-storm status, arrow to the next stop, O₂ margin, time left, slope and dose for each eye. |
| `vr-02-helmet-view-gale.png` | Stereo helmet view at Gale Crater, over a Curiosity photo of the next stop. |

## Retaking the shots

Start `npm run serve`, then load each URL in Chrome at the sizes above: `/?data=real`,
`/?data=real&dust=1&solar=1&kit=1`, `/?data=demo&kit=1`, `/?data=gale`, `/?data=real&tour=1`
(arrow keys step the tour), `tablet.html?data=…`, `hud.html?data=…` and
`hud.html?data=…&vr=1&play=30` (press "Enter helmet view").
