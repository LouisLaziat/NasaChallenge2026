# Brief — Engine and model (branch `engine`) — `louis-claude` (also the lead)

You are the engine agent on Marswalk Budget, a NASA Space Apps 2026 route planner for an
astronaut walking at Jezero Crater, Mars. Read `AGENTS.md`, `CONTRACTS.md`, `STATUS.md` first.
Three other agents build on your output in parallel; you are the only one allowed to change the
contracts.

**Branch:** `engine`, from `develop`. **You own:** `js/engine.js`, `js/config.js`,
`tests/engine.test.mjs`, `CONTRACTS.md`, `docs/model.md`.
**Do not edit:** UI, photos, data-pipeline files, `data/`.

## What exists

`js/engine.js` already works: cost grid (Tobler speed × sand × roughness, metabolic power with
grade), A*/Dijkstra least-energy search, exact best visiting order (≤ 7 stops, else NN + 2-opt),
totals (time, O2, dose), point of no return via a reverse Dijkstra from the habitat, and a
single-stop drop suggestion. 13 tests pass (`npm test`). `npm run plan-demo` prints plans.

## Tasks, in order

1. **Cite or defend every `ASSUMPTION` in `js/config.js`.** For each number find a published
   source (Apollo EVA metabolic data, NASA EVA walkback studies, xEMU/Mars suit O2 capacity,
   Curiosity RAD Hassler et al. 2014, Tobler 1993, Mars regolith trafficability, NASA career dose
   limits). Replace with the cited value or keep it with a one-line justification. Add a
   `docs/model.md` table: parameter, value, source, link. Mark Gale-Crater-as-Jezero proxy clearly.
   Keep the demo interesting: normal conditions fit; all three conditions together go over.
   **Max walkable slope: 20°** (accepted 2026-11-14), cited to NASA's exploration EVA concept,
   NTRS 20210000827. Re-check the demo still behaves as above after the change.
2. **`profile` in the plan result** (additive): per path point `{ elapsedS, o2RemainingKg,
   o2ToHomeKg, doseMSv, elevationM }`, downsampled to ≤ 300 points, for the UI chart.
3. **`bestSubset`** (additive): when over budget, the highest total-`value` set of stops whose
   route fits (exact for ≤ 10 stops via subsets × cached order search; greedy above). Return
   `{ ids, scienceValue, o2UsedKg, doseMSv }`. Keep `dropSuggestion` as is.
4. **Turn-back when within budget:** UI wants a marker even on a feasible route. Add
   `turnBackLatest` = last point where turning home still leaves the full reserve — if that is
   different from end-of-route. Additive; keep `turnBack` semantics.
5. **Speed:** a plan on a 400 × 400 grid (real data) must stay under ~1 s in Node. Measure with a
   synthetic 400 × 400 grid; optimise the search if needed (typed-array heap, precomputed edge
   costs per condition set).
6. Tests for each addition. All existing tests must keep passing.

## Contract changes

Additive only. Update `CONTRACTS.md` §4 *in the same commit*, and add a `CONTRACT` line to
`STATUS.md` describing the new field. Never rename or remove a field.

## Done when

`npm test` passes; `npm run plan-demo` shows the new outputs; `docs/model.md` cites every number.
Commit small, prefix `engine:`. Merges first (with the data lane); the lead merges.
