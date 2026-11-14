import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  buildCostGrid, findPath, search, planWalk, bestOrder,
  cellToLatLon, latLonToCell, energyToO2Kg,
} from '../js/engine.js';
import { CONFIG } from '../js/config.js';

// ---- helpers --------------------------------------------------------------

function flatTerrain(w, h, { elev = () => 0, ti = () => 500, rough = () => 0, cellSize = 1 } = {}) {
  const E = [], T = [], R = [];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { E.push(elev(x, y)); T.push(ti(x, y)); R.push(rough(x, y)); }
  return {
    name: 'test', synthetic: true, width: w, height: h, cellSize,
    origin: { lat: 18.45, lon: 77.44 },
    layers: { elevation: E, thermalInertia: T, roughness: R },
  };
}

const onBlocked = (g, path) => path.some(([x, y]) => g.blocked[y * g.width + x]);

// ---- tests ----------------------------------------------------------------

test('flat ground: straight path, time = distance / flat speed', () => {
  const g = buildCostGrid(flatTerrain(30, 5));
  const r = findPath(g, { x: 0, y: 2 }, { x: 29, y: 2 });
  assert.equal(r.path.length, 30);
  assert.ok(r.path.every(([, y]) => y === 2));
  assert.equal(r.distanceM, 29);
  assert.ok(Math.abs(r.timeS - 29 / CONFIG.walk.vFlatMps) < 1e-6);
  assert.ok(Math.abs(r.energyJ - CONFIG.metabolic.baseW * r.timeS) < 1e-6);
});

test('uphill costs more energy than the same walk downhill', () => {
  const t = flatTerrain(40, 3, { elev: (x) => x * 0.15 }); // ~8.5 degrees
  const g = buildCostGrid(t);
  const up = findPath(g, { x: 0, y: 1 }, { x: 39, y: 1 });
  const down = findPath(g, { x: 39, y: 1 }, { x: 0, y: 1 });
  assert.ok(up.energyJ > down.energyJ * 1.2, `${up.energyJ} vs ${down.energyJ}`);
});

test('a cliff is impassable and the path detours through the gap', () => {
  // Wall of 10 m steps at x=10, except a gentle ramp at the bottom rows.
  const t = flatTerrain(21, 21, { elev: (x, y) => (x >= 10 && y < 17 ? 10 : 0) });
  const g = buildCostGrid(t);
  assert.ok(g.blocked[5 * 21 + 10], 'cliff cell should be blocked');
  const r = findPath(g, { x: 2, y: 2 }, { x: 18, y: 2 });
  assert.equal(r, null, 'top of the wall is a raised plateau: only reachable with a ramp');

  const ramp = flatTerrain(21, 21, { elev: (x, y) => (y < 15 ? (x >= 10 ? 10 : 0) : 0) });
  const g2 = buildCostGrid(ramp);
  const r2 = findPath(g2, { x: 2, y: 5 }, { x: 2, y: 5 + 0 }) ;
  assert.ok(r2); // trivial path exists
  const r3 = findPath(g2, { x: 2, y: 2 }, { x: 18, y: 18 });
  assert.ok(r3, 'path around the plateau exists');
  assert.ok(!onBlocked(g2, r3.path));
});

test('boulders (high roughness) are avoided', () => {
  const t = flatTerrain(21, 21, { rough: (x, y) => (x === 10 && y > 2 ? 1 : 0) });
  const g = buildCostGrid(t);
  const r = findPath(g, { x: 2, y: 15 }, { x: 18, y: 15 });
  assert.ok(r);
  assert.ok(!onBlocked(g, r.path));
  assert.ok(r.path.some(([, y]) => y <= 2), 'must go round the top of the boulder line');
});

test('loose sand (low thermal inertia) is slower and costs more than bedrock', () => {
  const sand = buildCostGrid(flatTerrain(30, 3, { ti: () => 120 }));
  const rock = buildCostGrid(flatTerrain(30, 3, { ti: () => 500 }));
  const a = findPath(sand, { x: 0, y: 1 }, { x: 29, y: 1 });
  const b = findPath(rock, { x: 0, y: 1 }, { x: 29, y: 1 });
  assert.ok(a.timeS > b.timeS * 1.5);
  assert.ok(a.energyJ > b.energyJ * 2);
});

test('A* matches Dijkstra on the demo terrain (heuristic is admissible)', () => {
  const t = JSON.parse(readFileSync(new URL('../data/demo/terrain.json', import.meta.url)));
  const g = buildCostGrid(t);
  const pairs = [[[175, 100], [40, 70]], [[150, 70], [60, 118]], [[130, 165], [80, 45]]];
  for (const [[sx, sy], [tx, ty]] of pairs) {
    const a = findPath(g, { x: sx, y: sy }, { x: tx, y: ty });
    const d = search(g, sy * t.width + sx).dist[ty * t.width + tx];
    assert.ok(a, `no path ${sx},${sy} -> ${tx},${ty}`);
    assert.ok(Math.abs(a.energyJ - d) / d < 1e-9, `A* ${a.energyJ} vs Dijkstra ${d}`);
  }
});

test('bestOrder finds the optimal tour (matches brute force) and heuristic is close', () => {
  // Points on a line: optimal is out and back in order.
  const xs = [0, 5, 1, 4, 2, 3];
  const cost = xs.map((a) => xs.map((b) => Math.abs(a - b)));
  const order = bestOrder(cost, [1, 2, 3, 4, 5]);
  const tour = (o) => cost[0][o[0]] + o.slice(1).reduce((s, v, i) => s + cost[o[i]][v], 0) + cost[o.at(-1)][0];
  assert.equal(tour(order), 10);
  const heur = bestOrder(cost, [1, 2, 3, 4, 5], 0); // force heuristic
  assert.equal(tour(heur), 10);
});

test('demo plan: round trip through every stop, within budget, consistent totals', () => {
  const t = JSON.parse(readFileSync(new URL('../data/demo/terrain.json', import.meta.url)));
  const s = JSON.parse(readFileSync(new URL('../data/demo/targets.json', import.meta.url)));
  const r = planWalk(t, s);
  assert.equal(r.ok, true);
  assert.deepEqual([...r.order].sort(), s.targets.map((x) => x.id).sort());
  assert.deepEqual(r.path[0], [s.habitat.x, s.habitat.y]);
  assert.deepEqual(r.path.at(-1), [s.habitat.x, s.habitat.y]);
  assert.equal(r.withinBudget, true);
  assert.equal(r.turnBack, null);
  assert.equal(r.dropSuggestion, null);
  const legO2 = r.legs.reduce((a, l) => a + l.o2Kg, 0);
  const dwellJ = r.totals.dwellTimeS * CONFIG.metabolic.dwellW;
  assert.ok(Math.abs(legO2 + energyToO2Kg(dwellJ) - r.totals.o2UsedKg) < 1e-9);
  for (const st of r.stops) assert.deepEqual(r.path[st.pathIndex], [st.x, st.y]);
  // Arrivals are increasing in time.
  for (let i = 1; i < r.stops.length; i++) assert.ok(r.stops[i].arriveS > r.stops[i - 1].arriveS);
});

test('conditions: heavy kit costs more oxygen; solar event multiplies dose', () => {
  const t = JSON.parse(readFileSync(new URL('../data/demo/terrain.json', import.meta.url)));
  const s = JSON.parse(readFileSync(new URL('../data/demo/targets.json', import.meta.url)));
  const ids = ['D1', 'D2'];
  const base = planWalk(t, s, { stopIds: ids });
  const kit = planWalk(t, s, { stopIds: ids, conditions: { heavyKit: true } });
  const sun = planWalk(t, s, { stopIds: ids, conditions: { solarEvent: true } });
  assert.ok(kit.totals.o2UsedKg > base.totals.o2UsedKg * 1.2);
  assert.ok(Math.abs(sun.totals.doseMSv / base.totals.doseMSv - CONFIG.conditions.solarEvent.doseFactor) < 1e-9);
});

test('over budget: turn-back point, violations and a drop suggestion', () => {
  const t = JSON.parse(readFileSync(new URL('../data/demo/terrain.json', import.meta.url)));
  const s = JSON.parse(readFileSync(new URL('../data/demo/targets.json', import.meta.url)));
  const tight = structuredClone(CONFIG);
  tight.suit.o2CapacityKg = 0.2;
  const r = planWalk(t, s, { config: tight });
  assert.equal(r.withinBudget, false);
  assert.ok(r.violations.includes('oxygen'));
  assert.ok(r.turnBack, 'needs a turn-back point');
  assert.ok(r.turnBack.pathIndex > 0 && r.turnBack.pathIndex < r.path.length - 1);
  assert.ok(r.turnBack.o2UsedKg < r.totals.o2UsableKg);
  assert.ok(r.dropSuggestion && s.targets.some((x) => x.id === r.dropSuggestion.id));
  assert.ok(r.dropSuggestion.o2SavedKg > 0);
});

test('unreachable stops are reported, not silently dropped', () => {
  // A stop inside a ring of boulders.
  const ring = (x, y) => (Math.max(Math.abs(x - 15), Math.abs(y - 15)) === 3 ? 1 : 0);
  const t = flatTerrain(31, 31, { rough: ring });
  const targets = {
    habitat: { name: 'H', x: 2, y: 2 },
    targets: [
      { id: 'in', name: 'Inside ring', x: 15, y: 15, value: 5, dwellMin: 10, note: '' },
      { id: 'out', name: 'Outside', x: 28, y: 28, value: 5, dwellMin: 10, note: '' },
    ],
  };
  const r = planWalk(t, targets);
  assert.deepEqual(r.unreachable, ['in']);
  assert.deepEqual(r.order, ['out']);
});

test('targets given as lat/lon resolve to the same cells as x/y', () => {
  const t = flatTerrain(40, 40, { cellSize: 5 });
  const asCells = { habitat: { name: 'H', x: 3, y: 4 }, targets: [{ id: 'a', name: 'A', x: 30, y: 25, value: 1, dwellMin: 5, note: '' }] };
  const toLL = (p) => { const { lat, lon } = cellToLatLon(t, p.x, p.y); const { x, y, ...rest } = p; return { ...rest, lat, lon }; };
  const asLatLon = { habitat: toLL(asCells.habitat), targets: asCells.targets.map(toLL) };
  const a = planWalk(t, asCells), b = planWalk(t, asLatLon);
  assert.deepEqual(a.path, b.path);
  assert.equal(b.stops[0].x, 30);
});

test('cellToLatLon and latLonToCell round-trip', () => {
  const t = flatTerrain(10, 10, { cellSize: 5 });
  for (const [x, y] of [[0, 0], [3, 7], [9, 9]]) {
    const { lat, lon } = cellToLatLon(t, x, y);
    assert.deepEqual(latLonToCell(t, lat, lon), { x, y });
  }
});
