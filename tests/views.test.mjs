// Generated with AI assistance for NASA Space Apps 2026; reviewed by the team
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { planWalk } from '../js/engine.js';
import {
  bearingDeg, distanceM, doseAt, nextStop, o2At, passedTurnBack,
  positionAt, slopeAheadDeg, walkSnapshot,
} from '../js/views/geometry.js';

const readDemo = (file) => JSON.parse(readFileSync(new URL(`../data/demo/${file}.json`, import.meta.url), 'utf8'));
const terrain = readDemo('terrain');
const targets = readDemo('targets');
const plan = planWalk(terrain, targets);

test('EVA progress starts and finishes at the habitat', () => {
  const start = positionAt(plan, terrain, 0);
  const end = positionAt(plan, terrain, 1);
  for (const { x, y } of [start, end]) assert.deepEqual({ x, y }, { x: targets.habitat.x, y: targets.habitat.y });
  assert.equal(start.elapsedS, 0);
  assert.equal(end.elapsedS, plan.totals.totalTimeS);
});

test('progress never reduces elapsed time or increases oxygen left', () => {
  let elapsed = 0;
  let lastO2 = plan.totals.o2CapacityKg;
  for (let i = 0; i <= 1000; i++) {
    const p = i / 1000;
    const { elapsedS } = positionAt(plan, terrain, p);
    const o2 = o2At(plan, p);
    assert.ok(elapsedS >= elapsed);
    assert.ok(o2 <= lastO2);
    elapsed = elapsedS;
    lastO2 = o2;
  }
  assert.equal(lastO2, plan.totals.o2CapacityKg - plan.totals.o2UsedKg);
  assert.equal(doseAt(plan, 1), plan.totals.doseMSv);
});

test('next stop follows the planner visiting order and then hands off to the habitat', () => {
  const ids = [];
  for (let index = 0; index < plan.path.length; index++) {
    const id = nextStop(plan, index)?.id;
    if (id && id !== ids.at(-1)) ids.push(id);
  }
  assert.deepEqual(ids, plan.order);
  const p = (plan.stops.at(-1).pathIndex + 1) / (plan.path.length - 1);
  const frame = walkSnapshot(plan, terrain, targets.habitat, p);
  assert.equal(frame.returning, true);
  assert.equal(frame.destination, targets.habitat);
  assert.ok(frame.o2ToHomeKg > 0);
  if (!plan.profile) {
    assert.ok(Math.abs(frame.o2LeftKg - frame.o2ToHomeKg - o2At(plan, 1)) < 1e-9);
  }
  assert.equal(nextStop(plan, plan.path.length - 1), null);
});

test('Mars bearings are north and east in degrees and range is in metres', () => {
  const from = { lat: 0, lon: 0 };
  assert.equal(bearingDeg(from, { lat: 1, lon: 0 }), 0);
  assert.equal(bearingDeg(from, { lat: 0, lon: 1 }), 90);
  assert.equal(distanceM(from, from), 0);
  assert.ok(Math.abs(distanceM(from, { lat: 0, lon: 1 }) - 59_158) < 2);
});

test('turn-back fires just past the plan marker with all three toggles on', () => {
  const stressed = planWalk(terrain, targets, {
    conditions: { dustStorm: true, solarEvent: true, heavyKit: true },
  });
  assert.ok(stressed.turnBack);
  const end = stressed.path.length - 1;
  const { pathIndex } = stressed.turnBack;
  assert.equal(passedTurnBack(stressed, (pathIndex - 0.5) / end), false);
  assert.equal(passedTurnBack(stressed, (pathIndex + 0.5) / end), true);
  assert.equal(passedTurnBack({ ...stressed, turnBackLatest: null }, 0.99), false);
  assert.equal(walkSnapshot(stressed, terrain, targets.habitat, (pathIndex + 1) / end).turnBack, true);
});

test('sparse profile is interpolated by path index, including walkback oxygen', () => {
  const profile = [
    { pathIndex: 0, elapsedS: 0, o2RemainingKg: 0.5, o2ToHomeKg: 0, doseMSv: 0 },
    { pathIndex: 2, elapsedS: 120, o2RemainingKg: 0.3, o2ToHomeKg: 0.1, doseMSv: 0.04 },
  ];
  const route = { ...plan, path: plan.path.slice(0, 3), stops: [], profile };
  assert.equal(positionAt(route, terrain, 0.5).elapsedS, 60);
  assert.equal(o2At(route, 0.5), 0.4);
  assert.equal(doseAt(route, 0.5), 0.02);
  assert.equal(walkSnapshot(route, terrain, targets.habitat, 0.5).o2ToHomeKg, 0.05);
});

test('slope ahead uses signed rise over the requested path distance', () => {
  const grid = { width: 3, cellSize: 5, layers: { elevation: [0, 5, 0] } };
  const route = { path: [[0, 0], [1, 0], [2, 0]] };
  assert.equal(slopeAheadDeg(grid, route, 0, 2), 45);
  assert.equal(slopeAheadDeg(grid, route, 1, 2), -45);
  assert.equal(slopeAheadDeg(grid, route, 0, 10), 0);
  assert.equal(slopeAheadDeg(grid, route, 2, 2), null);
});
