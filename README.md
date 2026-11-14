# Marswalk Budget

NASA Space Apps Challenge 2026 — *Interplanetary Survival Guide: Martian Map*.

A route planner for an astronaut on foot at Jezero Crater. Pick science stops; the tool finds the
least-effort route over real Mars terrain and prices it in **walking time, suit oxygen, radiation
dose and science value**, marks the **point of no return**, and replans when conditions change
(dust storm, solar event, heavy sample kit). Each stop shows a Perseverance photo taken nearby.

## Run it

```bash
npm test               # engine tests
npm run plan-demo      # print the demo plan under each condition
npm run serve          # then open http://localhost:8080
```

Requires Node ≥ 20. No build step.

## How it decides the "best" route

1. The walk area is a grid of 5 m cells built from elevation, thermal inertia (sand vs bedrock)
   and roughness (boulders).
2. Each step costs metabolic energy: walking speed falls on slopes, sand and rough ground;
   power rises uphill, on sand and with a heavy kit. Slopes over 25° and boulder fields are
   impassable.
3. A* finds the least-energy path between every pair of stops; the planner picks the visiting
   order with the lowest total energy.
4. Energy → oxygen; time → radiation dose. A reverse search from the habitat gives the oxygen
   needed to get home from any point, which gives the **point of no return**.

Model numbers and their sources: `js/config.js` (and `docs/model.md` once written).

## Team workflow

Four agents work in parallel lanes. See [AGENTS.md](AGENTS.md) for lanes and rules,
[CONTRACTS.md](CONTRACTS.md) for the shared data shapes, [STATUS.md](STATUS.md) for the live log,
and [docs/briefs/](docs/briefs/) for each agent's brief.

## Data

| Layer | Source |
|---|---|
| Elevation | USGS Mars 2020 TRN HiRISE DTM mosaic (Jezero) |
| Imagery | NASA JPL Mars Trek |
| Thermal inertia | THEMIS-derived Jezero map (Zenodo, CC BY 4.0) |
| Ground photos | Perseverance raw images, NASA/JPL-Caltech/ASU |
| Radiation | Curiosity RAD, Hassler et al. 2014 — *Gale Crater, used as a proxy for Jezero* |

`data/demo/` is **synthetic** terrain for development, not Mars data.
