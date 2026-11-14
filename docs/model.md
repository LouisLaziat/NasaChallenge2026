<!-- Generated with AI assistance for NASA Space Apps 2026; reviewed by the team -->
# The model behind Marswalk Budget

Owner: engine lane (`louis-claude`). Every number the planner uses lives in `js/config.js`; this page says where each one comes from. Status **SOURCE** = published value; **ASSUMPTION** = our choice, to be cited or defended before the pitch (sources research in progress: `docs/model-sources.md`, conditions lane).

## How a walk is priced

The walk area is a grid of 5 m cells built from real elevation (USGS HiRISE DTM) and thermal inertia (THEMIS). Moving between neighbouring cells costs **metabolic energy** = power × time. **Speed** follows Tobler's hiking function on the local grade, slowed by loose sand (low thermal inertia) and rough ground; cells steeper than the suit limit (20°) are impassable. **Power** rises with uphill grade, with braking downhill, on sand and with load. Energy converts to **suit oxygen** (≈ 20.1 kJ per litre of O₂). The planner finds the least-energy path between every pair of stops (A*/Dijkstra), the best visiting order (exact up to 7 stops), then totals walking time, dwell time, oxygen and **radiation dose** (surface dose rate × time). It also reports the **point of no return** (last point you can still walk home without touching the O₂ reserve), the **turn-back-by point if a dust storm starts**, the **single stop to drop**, and the **best set of stops that fits** the budget.

## Parameters

| Parameter | Value | Status | Source or justification |
|---|---|---|---|
| `walk.vFlatMps` | 1.0 | ASSUMPTION | Apollo EVA traverses averaged roughly 0.7–1.1 m/s on foot. |
| `walk.toblerK` | 3.5 | SOURCE | Tobler (1993) hiking function exponent (Earth). |
| `walk.toblerG0` | 0.05 | SOURCE | Tobler (1993) optimum grade offset (Earth). |
| `walk.maxSlopeDeg` | 20 | SOURCE | NASA exploration EVA concept, suited walking limited to 20° slopes (NTRS 20210000827). Being re-checked in docs/model-sources.md. |
| `metabolic.baseW` | 300 | ASSUMPTION | Apollo lunar EVA averaged ~234 kcal/h (~272 W); rounded up for Mars gravity. |
| `metabolic.uphillPerGrade` | 3.0 | ASSUMPTION | +300% metabolic rate per unit grade uphill (i.e. +30% at 10%). |
| `metabolic.downhillPerGrade` | 0.5 | ASSUMPTION | downhill still costs extra for braking. |
| `metabolic.dwellW` | 200 | ASSUMPTION | metabolic rate while working at a stop (sampling, imaging). |
| `terrain.looseSandTI` | 200 | ASSUMPTION | below this, treat as loose fines/sand. |
| `terrain.bedrockTI` | 400 | ASSUMPTION | above this, treat as firm rock. |
| `terrain.sandSpeedFactor` | 0.6 | ASSUMPTION | walking speed multiplier on loose sand. |
| `terrain.sandMetabolicFactor` | 1.4 | ASSUMPTION | metabolic multiplier on loose sand. |
| `terrain.roughnessBlock` | 0.8 | ASSUMPTION | cells rougher than this are impassable. |
| `terrain.roughnessSpeedPenalty` | 0.5 | ASSUMPTION | speed *= 1 - penalty * roughness. |
| `suit.o2CapacityKg` | 0.5 | ASSUMPTION | usable primary O2 in a Mars EVA suit. |
| `suit.reserveFraction` | 0.2 | ASSUMPTION | keep 20% of O2 untouched for emergencies. |
| `suit.o2JoulesPerLitre` | 20100 | SOURCE | ~20.1 kJ released per litre of O2 consumed (respiratory physiology, RQ≈0.85). |
| `suit.o2KgPerLitre` | 0.001429 | SOURCE | O2 density at STP, 1.429 g/L. |
| `radiation.surfaceMSvPerDay` | 0.64 | SOURCE | Hassler et al. (2014), Science 343: Curiosity RAD dose equivalent on the surface at Gale Crater (proxy for Jezero). |
| `radiation.walkLimitMSv` | 1.0 | ASSUMPTION | per-EVA dose budget for this tool. |
| `conditions.dustStorm.speedFactor` | 0.7 | ASSUMPTION | reduced visibility slows walking. |
| `conditions.dustStorm.metabolicFactor` | 1.1 | ASSUMPTION |  |
| `conditions.dustStorm.maxSlopeDeg` | 20 | design | Same as the suit limit: tried 15°, but it cut off half the demo stops. Dust slows you instead. |
| `conditions.solarEvent.doseFactor` | 10 | ASSUMPTION | a moderate solar particle event raises surface dose ~10x. |
| `conditions.heavyKit.speedFactor` | 0.85 | ASSUMPTION | carrying a sample kit. |
| `conditions.heavyKit.metabolicFactor` | 1.25 | ASSUMPTION |  |
| `conditions.heavyKit.maxSlopeDeg` | 20 | design | Same as the suit limit (see dustStorm). |
| `planner.bruteForceMaxStops` | 7 | design | Exact best order up to this many stops; heuristic above. |
| `planner.subsetExactMaxStops` | 10 | design | bestSubset tries every subset up to this many stops; greedy above. |
| `planner.contingency` | ['dustStorm'] | ASSUMPTION | a dust storm is the likeliest surprise on foot. |
| `goNoGo.dustTauStorm` | 1.0 | ASSUMPTION | dust optical depth above which the dust-storm switch is suggested. |
| `goNoGo.o2MarginCaution` | 0.10 | ASSUMPTION | CAUTION when less than 10% of usable O2 is left at the end. |
| `goNoGo.doseCautionFraction` | 0.8 | ASSUMPTION | CAUTION above 80% of the per-walk dose budget. |
| `goNoGo.sepAlertDays` | 2 | ASSUMPTION | a solar particle event in the last 2 days = alert (NO-GO). |
| `goNoGo.sepWatchDays` | 7 | ASSUMPTION | within 7 days = watch (CAUTION). |

## Proxies and honesty notes

- **Radiation at Jezero** uses Curiosity RAD measurements from **Gale Crater** (Hassler et al. 2014, ~0.64 mSv/day): no surface dosimeter has flown at Jezero. On the Gale dataset the value is measured in place.
- **Solar particle events** come from NASA CCMC DONKI, which mostly reports events seen near Earth: used as a proxy for Mars.
- **Weather** (MEDA) is archival: the latest public sol is from 2024, so the real conditions card says so and shows CAUTION.
- **Roughness** comes from a 1 m DTM, which cannot see boulders smaller than ~2 m, so slope does most of the blocking.
- **Gale thermal inertia**: no raster found yet, so `data/gale/terrain.json` has no thermal-inertia layer and the engine treats all of Gale as firm ground (no sand penalty).

## Changes

- 2026-11-14: max walkable slope 25° → **20°** (NASA exploration EVA concept, NTRS 20210000827). Dust storm and heavy kit no longer lower it further: 15° cut off half the demo stops. Added `profile`, `bestSubset`, `turnBackLatest` (dust-storm contingency) and the Go/No-Go thresholds (`goNoGo`).
