<!-- Generated with AI assistance for NASA Space Apps 2026; reviewed by the team -->
# Proposed CONTRACTS.md additions: safe havens and rover sorties

Status: **proposal from `tonny-claude` (2026-11-15), waiting for the lead.** The engine code below is
already in `js/engine.js` / `js/rover.js` and is purely additive: with no `options.havens` the plan result is
unchanged except for two new empty fields (`havens: []`, `refills: []`) and two totals that equal existing
values (`o2RefilledKg: 0`, `o2MaxDrawKg === o2UsedKg`). Only the engine lane may edit `CONTRACTS.md`; this
file holds the text to paste into §4 and §7 when the lead agrees.

## §4 addition: safe havens (`planWalk`)

`options.havens = [{ id, name, kind: 'cache' | 'shelter', lat, lon | x, y }]` (default `[]`) and
`options.useCaches = false` to ignore caches. Site files: `data/<set>/havens.json` =
`{ hypothetical: true, note, havens: [...] }`.

```jsonc
"havens":  [{ "id": "cache-1", "name": "Supply cache (spare O₂)", "kind": "cache", "x": 175, "y": 281 }],
"refills": [{ "id": "cache-1", "name": "...", "x": 175, "y": 281, "pathIndex": 174, "arriveS": 6300, "refillKg": 0.186 }],
"totals":  { "o2RefilledKg": 0.186,   // 0 without a refill
             "o2MaxDrawKg": 0.253,    // most O2 drawn from one fill; the oxygen violation tests this
             "o2UsableKg": 0.586 },   // usable + o2RefilledKg, so o2UsedKg <= o2UsableKg still means "fits"
"turnBack": { "...": "...", "refuge": "habitat" },   // or a haven id; also on turnBackLatest
"profile":  [{ "...": "...", "o2ToSafetyKg": 0.04 }] // O2 to the nearest safe place (o2ToHomeKg unchanged)
```

`order` and `stops` stay science stops only; a cache visit appears in `legs` (`to: "cache-1"`) and in
`refills`. `profile[].o2RemainingKg` jumps back up after a refill.

## §4c (new): rover sortie, `planRover(terrain, targets, options)` in `js/rover.js`

Same inputs as `planWalk` (`stopIds`, `conditions`, `havens`, `config`). Returns the Plan fields the
console draws, plus `vehicle: "rover"` and:

```jsonc
"totals":   { "driveTimeS": 1680, "walkTimeS": 1680, "dwellTimeS": 11400,
              "o2UsedKg": 0.06,        // the longest single suited EVA (one per stop, fresh suit)
              "evaO2TotalKg": 0.23, "timeLimitS": 28800 },
"stops":    [{ "...": "...", "evaO2Kg": 0.02 }],
"walkback": { "o2LimitKg": 0.4, "maxO2Kg": 0.02, "maxAtPathIndex": 210,
              "beyond": [],            // path index ranges out of walk-back range
              "beyondM": 0, "limitPoint": null, "note": "..." },
"profile":  [{ "pathIndex": 0, "elapsedS": 0, "distanceM": 0, "doseMSv": 0, "elevationM": -4400,
               "walkbackO2Kg": 0, "refuge": "habitat", "o2RemainingKg": 0.5 }]   // one per path point
```

`violations` may include `"walkback"`. `turnBack`, `turnBackLatest`, `dropSuggestion` and `bestSubset` are
`null`; `lineOfSight` is absent.

## §7 addition: page URL parameters

| Param | Values | Meaning |
|---|---|---|
| `vehicle` | `rover` | console only: plan a pressurized-rover sortie (§4c); tablet and HUD still plan the walk |
| `havens` | `1` | console only: use the site's hypothetical supply cache and storm shelter (§4) |

Model and sources: `docs/model.md` ("Check against NASA's figures", "Safe havens and supply caches",
"Pressurized rover and the walk-back limit"). Tests: `tests/havens.test.mjs`, `tests/rover.test.mjs`.
