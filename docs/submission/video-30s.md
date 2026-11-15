DRAFT for the team to rewrite in their own words

# Two 30-second video storyboards

Both are editing plans for features present in the repo. Times below are video time, not astronaut mission time. Read values from the recording's live plan; numbers below are baseline examples, not captions to hard-code. Keep NASA/photo credits and synthetic-scenario labels legible. No NASA logos or mission insignia should be added to the edit.

## A. The decision: science, surprise, return

Record the console at `http://localhost:8080/index.html?data=real&tour=1`. The existing seven-step presenter mode advances with Right Arrow / PageDown / Space, and goes back with Left Arrow / PageUp. It is manually advanced, not a timed 30-second movie; record each step after planning settles, then cut to this schedule. Step 6 compares routes; the final step opens the selected plan in `hud.html` with `play=30` after a short delay. Tablet, HUD and VR now follow the selected route option.

| Video time | Existing shot / action | Suggested voice-over |
|---|---|---|
| 0–5 s | Tour step 1: Jezero route, all six science stops, budget. Baseline: 0.36 of 0.40 kg usable O₂. | “Six science stops on real Mars terrain. How much exploration can the oxygen budget support?” |
| 5–10 s | Step 2: dust scenario, same stops now over budget; keep the synthetic conditions label visible. Baseline: 0.45 kg O₂. | “Change the conditions, and the same walk can cost more than the suit's planned allowance.” |
| 10–15 s | Step 3: zoom to the red point-of-no-return marker and its actual mission time. | “This marker shows where returning home would start using the oxygen reserve.” |
| 15–20 s | Step 4: highlighted best-set suggestion. Baseline: five stops, science value 36. | “The planner searches for the most science that still fits.” |
| 20–25 s | Step 5: reduced plan and budget (baseline: 0.38 kg, CAUTION), then a quick cut to step 6's three route cards. | “Keep the dust storm. Change the stops. Compare what each route costs.” |
| 25–30 s | Step 7 / same-plan HUD: next stop, oxygen and return guidance. End on “Marswalk Budget”. | “One plan, from mission console to helmet. Explore the trade-off, then get home.” |

Use “synthetic dust scenario” on screen; the tour's wording is a demonstration, not an observed forecast. Its weather scenarios are synthetic even though the Jezero terrain and photos are real. The live real-data conditions card uses archival weather and can show CAUTION before any hazard is switched on.

Gale is an alternate cut at `index.html?data=gale&tour=1`: the tour adds hazards until the plan breaks. In the recorded baseline, dust alone still fits; dust plus heavy kit goes over. Do not label that cut “dust alone”. See [the status log](../../STATUS.md) for the current tour results.

## B. The walk: information in the helmet

Start the server, then record `http://localhost:8080/hud.html?data=gale&cond=real-gale&play=30`. The existing playback advances the full planned EVA in 30 seconds; it is a route visualisation, not real-time astronaut footage. Use the recorded HUD and the existing tablet page as source shots; edit them to this 30-second sequence.

| Video time | Existing shot / action | Suggested voice-over |
|---|---|---|
| 0–5 s | Establish the Curiosity background, site label and visible photo credit. Add small edit text: “Route playback · time compressed”. | “At Gale Crater, Curiosity's observations give our walk a real setting.” |
| 5–10 s | HUD destination and turn guidance during playback. | “The helmet display follows the planned route and points to the next science stop.” |
| 10–15 s | Oxygen remaining and oxygen needed to return; choose a readable playback frame. | “It keeps the oxygen budget and the cost of getting home in view.” |
| 15–20 s | Dose and conditions indicator, with the real-Gale snapshot's CAUTION label. | “Radiation uses a historical baseline. Archival weather stays visibly marked as uncertain.” |
| 20–25 s | Brief tablet cut from `tablet.html?data=gale&cond=real-gale`, preserving any selected stop/hazard parameters. | “The field tablet carries the same stops, route and resource estimates.” |
| 25–30 s | Return to the HUD near the end of playback, with habitat guidance; title end card. | “Marswalk Budget makes the trade-off between science and return visible.” |

The normal Gale plan fits, so its playback need not show a turn-back warning. To film that warning, make a separate over-budget run using `hud.html?data=gale&cond=demo-quiet&dust=1&kit=1&solar=1&play=30` and label it as a synthetic hazard scenario. Do not imply that the actual route has been walked by an astronaut.

**Optional VR insert:** the merged `hud.html?vr=1` can replace the tablet cut with a split-eye helmet shot using the same site and plan parameters. The [VR screenshot](../screenshots/views-vr.png) is a layout reference; resolve the lead's chevron-versus-next-step QA question in STATUS.md before treating it as navigation evidence. Physical Android/iOS checks still await an HTTPS preview; do not claim tested headset hardware.

Repo basis: [tour and playback status](../../STATUS.md), [views assignment](../../comms/louis-claude.md), [data caveats](data.md), [existing screenshots](readme-draft.md#screenshots-already-in-the-repo).
