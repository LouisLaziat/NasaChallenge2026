DRAFT for the team to rewrite in their own words

# Project details

Marswalk Budget addresses NASA Space Apps 2026's “Interplanetary Survival Guide: Martian Map” challenge with an educational planner for an astronaut on foot. The central question is how much science a walk can collect while retaining enough oxygen to return to the habitat. The intended audience includes people exploring that planning problem through the challenge demonstration; this is a prototype with explicit model assumptions.

## What it does

The astronaut selects science stops. The console draws a route and visiting order, showing walking and working time, suit oxygen, radiation dose and a team-assigned science score. Nearby rover photos and cited mission notes explain the stops. Dust, solar-particle-event and heavy-kit switches change the scenario and trigger a new plan.

The route includes an oxygen profile, turn-by-turn steps and the point beyond which returning by the cheapest path would touch the oxygen reserve. A separate contingency marker asks when to turn back if a dust storm starts mid-walk. If the selected stops exceed the budget, the planner proposes a smaller set of stops that retains the highest modelled science value within its search limits. The same plan can open on a field tablet or helmet HUD; HUD playback can compress the walk into a video sequence.

The console compares least-oxygen, gentler-terrain “safest”, and shortest alternatives, all priced with the same model. Route cards show distance, time, oxygen, dose and steep-ground exposure; the chosen option also applies on the tablet, HUD and split-eye VR helmet view. The “safest” label describes the route's terrain preferences, rather than a validated safety assessment. VR has desktop drag/arrow controls and phone orientation support; physical Android/iOS checks await an HTTPS preview. See [status](../../STATUS.md) and [the route contract](../../CONTRACTS.md#8-route-options--jsroutesjs-engine-lane).

## How it works

Real elevation becomes a grid of 5 m cells. Jezero also has a thermal-inertia layer used as a proxy for loose versus firm ground; roughness is derived from the elevation data. Moving between neighbours costs metabolic energy: slopes, ground conditions and load change speed and power. A*/Dijkstra searches connect stops, and the planner chooses a visiting order. Energy converts to modelled metabolic oxygen demand; time outside becomes dose using a historical surface baseline. Work at stops contributes to both budgets.

The current slope limit is 20°, transferred from a lunar EVA concept. The suit scenario holds 20% of a 0.5 kg oxygen supply in reserve. These choices, the walking law and hazard multipliers are documented as published sources, proxies, assumptions or design choices. They do not establish Mars suit endurance or flight rules. Full reasoning and sensitivity comparisons are in [the model](../model.md) and [source audit](../model-sources.md).

## Two places to explore

- **Jezero delta front:** the primary site, six cited Perseverance stops, USGS HiRISE elevation, THEMIS-derived thermal inertia, Mars Trek imagery and rover photos.
- **Gale / Mount Sharp boxwork:** a second 2 km area, four cited Curiosity stops, USGS elevation and colour imagery, Curiosity traverse and photos. Gale has no thermal-inertia layer, so the model applies no sand penalty there. RAD was measured at Gale; Jezero uses that baseline as a geographic proxy.

Weather observations are archival, and DONKI events detected near Earth are used as a proxy for Mars. Missing or stale inputs produce CAUTION. The manual dust and EVA-window fields are unfilled in the real snapshots; the window is displayed rather than enforced. See [data and credits](data.md).

## Benefits and intended outcome

The prototype makes resource trade-offs visible: a short route can still cost more oxygen, a valuable stop also costs work time, and changing conditions can remove the margin for getting home. We hope the demonstration helps people question the assumptions behind a route and connect real Mars observations with exploration decisions. Science scores and dwell times are team choices; no measured improvement in astronaut performance is claimed.

## Tools and languages

Plain HTML, CSS, JavaScript ES modules, Leaflet and SVG form the browser interface. Node.js 20 or later runs the built-in test runner, local server and preparation scripts. There is no framework, bundler or build step. GeoTIFF preparation uses the optional `geotiff` development dependency; serving the committed data and running tests need no install. Map tiles, rover photos and CDN assets require internet at view time. [AI assistance and human authorship](ai-disclosure.md) are disclosed separately.
