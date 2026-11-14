DRAFT for the team to rewrite in their own words

# Seven-slide fallback outline

Each slide has a title, three suggested bullets and one screenshot source. Use existing captures as placeholders; Tonny's upcoming media kit can replace them after it lands. Values are examples from the committed model and status log, not observations of a real EVA. Keep provider credits and synthetic-scenario labels visible. The team chooses the final wording and story.

## 1. Marswalk Budget: how much science can we bring home?

- An educational walking-route planner for the Mars Space Apps challenge.
- Choose science stops and see oxygen, time, dose and science together.
- One plan links the mission console, field tablet and helmet display.

Screenshot: [Jezero console](../screenshots/data-real.png). This existing capture predates the route cards; replace it with a current console capture from the media kit when available.

## 2. Real places, real rover context

- Jezero delta front: six cited Perseverance stops on a 2 km terrain grid.
- Mount Sharp boxwork at Gale: four cited Curiosity stops on a second grid.
- Nearby rover photos and mission notes explain the science context; scores and work times are team choices.

Screenshot: [Gale field tablet](../screenshots/views-tablet-gale.png), showing the second site's terrain and rover photo.

## 3. Terrain becomes a resource budget

- Elevation, roughness and Jezero's thermal-inertia proxy influence route cost.
- Terrain-dependent walking effort becomes metabolic oxygen demand; time outside becomes baseline dose.
- The 20° slope cutoff is a lunar proxy, and suit capacity, reserves and thresholds are documented planning choices.

Screenshot: [Jezero console terrain and budget](../screenshots/data-real.png). Add a small original text annotation “terrain → effort → O₂; time → dose”, without presenting it as a measured Mars physiology law.

## 4. Same stops, changing conditions

- The switches model dust, a solar particle event and a heavier sample kit.
- In the Jezero demo baseline, dust changes oxygen use from about 0.36 to 0.45 kg against a 0.40 kg usable allowance.
- A point-of-no-return marker shows where the cheapest return would touch the reserve.

Screenshot to capture from the existing seven-step tour: [Jezero tour](http://localhost:8080/?data=real&tour=1), step 3. No matching current screenshot is committed yet; use Tonny's media-kit capture when it lands. Label it “synthetic dust scenario”.

## 5. Replan for the science that fits

- The best-set search trades a stop for a route inside the modelled resource budget.
- Jezero's dust example retains five stops, science value 36, at about 0.38 kg O₂; CAUTION remains visible.
- Compare least oxygen, gentler-terrain “safest” and shortest routes, all priced with the same model.

Screenshot to capture: [Jezero tour](http://localhost:8080/?data=real&tour=1), step 6, “Compare routes”. Use the upcoming media kit; the existing older console screenshot does not show these cards.

## 6. Carry the plan into the field

- The tablet shows the route, progress and oxygen needed to get home.
- The HUD carries destination, next-turn, oxygen, dose and return guidance.
- Thirty-second playback compresses the planned EVA; the merged split-eye VR view adds a helmet layout with drag/arrow fallback controls.

Screenshot: [Gale helmet HUD](../screenshots/views-hud-gale.png). An alternate [VR layout capture](../screenshots/views-vr.png) is available; resolve the lead's chevron QA question before using it as navigation evidence. Physical phone checks await an HTTPS preview.

## 7. Evidence, limits and what we hope to achieve

- NASA/USGS terrain and rover context are credited; archival weather, near-Earth DONKI and Jezero's Gale RAD proxy are explicit.
- No MCD values were retrieved, Gale has no sand layer, and the prototype's GO verdict does not validate a real EVA.
- We hope to make the science-versus-return trade-off understandable; the human team owns the story, with Claude/Codex assistance disclosed.

Screenshot: [Jezero field tablet](../screenshots/views-tablet-real.png), paired with small text links to [data and credits](data.md), [model](../model.md) and [AI disclosure](ai-disclosure.md).

Repo basis: [current README](../../README.md), [model and sensitivity](../model.md), [Gale dataset](../../data/gale/README.md) and [status](../../STATUS.md). Do not add a public project URL, tested phone/headset claim or performance benefit that the repo has not established.
