// Generated with AI assistance for NASA Space Apps 2026; reviewed by the team
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { planWalk } from '../js/engine.js';
import { buildSteps } from '../js/steps.js';
import { cameraAt, cameraKeyframes, decimateTerrain, elevationAt } from '../js/views/flyover-geometry.js';
import {
  bearingDeg, currentInstruction, deviceHeadingDeg, distanceM, doseAt, nextStop, o2At, passedTurnBack,
  positionAt, relativeBearingDeg, slopeAheadDeg, smoothHeadingDeg, stereoEyes, stormGuidance, walkSnapshot,
} from '../js/views/geometry.js';

test('fly-through mesh decimates both axes and covers the complete terrain extent', () => {
  const grid = { width: 4, height: 2, cellSize: 5, layers: { elevation: [0, 0, 5, 5, 0, 0, 5, 5] } };
  const mesh = decimateTerrain(grid, 3);
  assert.equal(mesh.columns, 3);
  assert.equal(mesh.rows, 3);
  assert.deepEqual([mesh.points[0].x, mesh.points[0].y], [-0.5, -0.5]);
  assert.deepEqual([mesh.points.at(-1).x, mesh.points.at(-1).y], [3.5, 1.5]);
  assert.equal(mesh.highest, 5);
  assert.equal(elevationAt(grid, 1.5, 0.5), 2.5);
  assert.ok(mesh.points.some(({ slope }) => slope > 20));
});

test('fly-through camera follows route endpoints and handles a stationary plan', () => {
  const frames = cameraKeyframes([[0, 0], [4, 0], [4, 4]], (x, z) => [x, 10, z]);
  assert.deepEqual(cameraAt(frames, 0).walker, [0, 10, 0]);
  assert.deepEqual(cameraAt(frames, 0.25).walker, [2, 10, 0]);
  assert.deepEqual(cameraAt(frames, 1).walker, [4, 10, 4]);
  assert.equal(cameraAt(frames, 0.25).eye[1], 110);
  const stationary = cameraKeyframes([[3, 7]], (x, z) => [x, 2, z]);
  assert.deepEqual(cameraAt(stationary, 0.5).walker, [3, 2, 7]);
  assert.ok(cameraAt(stationary, 0.5).eye.every(Number.isFinite));
});

test('compass smoothing takes the short path across north', () => {
  assert.equal(smoothHeadingDeg(359, 1, 0.5), 0);
  assert.equal(smoothHeadingDeg(1, 359, 0.5), 0);
  assert.equal(smoothHeadingDeg(null, -5, 0.5), 355);
  assert.equal(relativeBearingDeg(5, 355), 10);
  assert.equal(relativeBearingDeg(350, 0), -10);
});

test('absolute orientation projects the viewing direction in both landscape poses', () => {
  assert.equal(deviceHeadingDeg(90), 270);
  assert.equal(deviceHeadingDeg(270, 90, 0), 90);
  assert.equal(deviceHeadingDeg(270, 0, 90), 0);
  assert.equal(deviceHeadingDeg(90, 0, -90), 0);
  assert.equal(deviceHeadingDeg(null, 0, 90), null);
});

test('each stereo eye takes half the width and the readout offsets are symmetric', () => {
  const [left, right] = stereoEyes(844);
  assert.deepEqual([left.left, left.width, right.left, right.width], [0, 422, 422, 422]);
  assert.ok(left.offset > 0 && left.offset < 7);
  assert.equal(left.offset, -right.offset);
  assert.ok(stereoEyes(640)[0].offset < left.offset);
});

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
  assert.equal(passedTurnBack({ ...stressed, turnBackLatest: null }, 0.99), true);
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
  const frame = walkSnapshot(route, terrain, targets.habitat, 0.5);
  assert.equal(frame.o2ToHomeKg, 0.05);
  const reserve = route.totals.o2CapacityKg - route.totals.o2UsableKg;
  assert.equal(frame.o2MarginKg, 0.4 - reserve - 0.05);
});

test('dust-storm guidance distinguishes approaching, passed, and safe routes', () => {
  const route = {
    path: Array.from({ length: 41 }, (_, x) => [x, 0]),
    conditions: {},
    withinBudget: true,
    turnBack: null,
    turnBackLatest: { pathIndex: 30 },
    profile: [{ pathIndex: 0, distanceM: 0 }, { pathIndex: 40, distanceM: 200 }],
  };
  assert.equal(stormGuidance(route, { cellSize: 5 }, 19, false), null);
  assert.equal(stormGuidance(route, { cellSize: 5 }, 21, false), 'approaching');
  assert.equal(stormGuidance(route, { cellSize: 5 }, 31, false), 'past');
  assert.equal(stormGuidance({ ...route, turnBackLatest: null }, { cellSize: 5 }, 31, false), 'safe');
  assert.equal(stormGuidance({ ...route, conditions: { dustStorm: true } }, { cellSize: 5 }, 31, false), null);
  assert.equal(passedTurnBack(route, 0.9), false);
});

test('instructions advance through engine steps and end at the habitat', () => {
  const legs = buildSteps(plan, terrain);
  assert.equal(currentInstruction(legs, 0, plan).destination, plan.order[0]);
  for (const leg of legs) {
    for (const step of leg.steps) {
      const initial = currentInstruction(legs, step.startIndex, plan);
      const middle = currentInstruction(legs, (step.startIndex + step.endIndex) / 2, plan);
      assert.equal(initial.step, step);
      assert.ok(middle.remainingM < initial.remainingM);
    }
  }
  assert.equal(currentInstruction(legs, plan.path.length - 2, plan).destination, 'habitat');
  assert.equal(currentInstruction(legs, plan.path.length - 1, plan), null);
});

test('slope ahead uses signed rise over the requested path distance', () => {
  const grid = { width: 3, cellSize: 5, layers: { elevation: [0, 5, 0] } };
  const route = { path: [[0, 0], [1, 0], [2, 0]] };
  assert.equal(slopeAheadDeg(grid, route, 0, 2), 45);
  assert.equal(slopeAheadDeg(grid, route, 1, 2), -45);
  assert.equal(slopeAheadDeg(grid, route, 0, 10), 0);
  assert.equal(slopeAheadDeg(grid, route, 2, 2), null);
});
