// Generated with AI assistance for NASA Space Apps 2026; reviewed by the team
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { bearing, compass, turnAngle, turnWord, simplify, buildSteps } from '../js/steps.js';
import { planWalk } from '../js/engine.js';

function flat(w, h, { ti = () => 500, elev = () => 0 } = {}) {
  const E = [], T = [], R = [];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { E.push(elev(x, y)); T.push(ti(x, y)); R.push(0); }
  return { width: w, height: h, cellSize: 5, origin: { lat: 18.45, lon: 77.4 }, layers: { elevation: E, thermalInertia: T, roughness: R } };
}
const leg = (path, extra = {}) => ({ from: 'habitat', to: 'A', path, distanceM: 0, timeS: 100, ...extra });

test('bearing and compass: x is east, y is south', () => {
  assert.equal(bearing([0, 0], [0, -1]), 0);
  assert.equal(bearing([0, 0], [1, 0]), 90);
  assert.equal(bearing([0, 0], [0, 1]), 180);
  assert.equal(compass(bearing([0, 0], [1, -1])), 'NE');
  assert.equal(turnAngle(90, 180), 90);
  assert.equal(turnAngle(350, 10), 20);
  assert.equal(turnWord(90), 'Turn right');
  assert.equal(turnWord(-40), 'Bear left');
  assert.equal(turnWord(5), 'Continue');
});

test('simplify keeps the corner of an L and drops collinear points', () => {
  const pts = [];
  for (let x = 0; x <= 10; x++) pts.push([x, 0]);
  for (let y = 1; y <= 10; y++) pts.push([10, y]);
  assert.deepEqual(simplify(pts, 1), [0, 10, 20]);
});

test('L-shaped leg: head E, then turn right to S; times add up to the leg time', () => {
  const t = flat(20, 20, { elev: (x, y) => y * 0.5 });
  const pts = [];
  for (let x = 0; x <= 10; x++) pts.push([x, 0]);
  for (let y = 1; y <= 10; y++) pts.push([10, y]);
  const [l] = buildSteps({ legs: [leg(pts)], stops: [{ id: 'A', dwellMin: 15 }] }, t, new Map([['A', 'Outcrop']]));
  assert.equal(l.toName, 'Outcrop');
  assert.equal(l.dwellMin, 15);
  assert.equal(l.steps.length, 2);
  assert.equal(l.steps[0].text, 'Head E');
  assert.equal(l.steps[1].text, 'Turn right to S');
  assert.equal(l.steps[0].distanceM, 50);
  assert.ok(Math.abs(l.steps[1].climbM - 5) < 1e-9);
  assert.ok(Math.abs(l.steps.reduce((a, s) => a + s.timeS, 0) - 100) < 1e-9);
});

test('sand is flagged when most of a stretch is loose', () => {
  const t = flat(30, 3, { ti: (x) => (x < 20 ? 120 : 500) });
  const pts = [];
  for (let x = 0; x <= 15; x++) pts.push([x, 1]);
  const [l] = buildSteps({ legs: [leg(pts)] }, t);
  assert.equal(l.steps.length, 1);
  assert.equal(l.steps[0].sandy, true);
});

test('demo plan: steps cover every leg and index into plan.path in order', () => {
  const terrain = JSON.parse(readFileSync(new URL('../data/demo/terrain.json', import.meta.url)));
  const targets = JSON.parse(readFileSync(new URL('../data/demo/targets.json', import.meta.url)));
  const plan = planWalk(terrain, targets);
  const legs = buildSteps(plan, terrain, new Map(targets.targets.map((x) => [x.id, x.name])));
  assert.equal(legs.length, plan.legs.length);
  assert.equal(legs.at(-1).toName, 'the habitat');
  let prevEnd = 0;
  for (const l of legs) {
    assert.ok(l.steps.length >= 1);
    assert.equal(l.steps[0].startIndex, prevEnd);
    for (const s of l.steps) { assert.ok(s.endIndex > s.startIndex); assert.ok(s.distanceM > 0); }
    prevEnd = l.steps.at(-1).endIndex;
  }
  assert.equal(prevEnd, plan.path.length - 1);
  const total = legs.reduce((a, l) => a + l.steps.reduce((b, s) => b + s.timeS, 0), 0);
  assert.ok(Math.abs(total - plan.totals.walkTimeS) < 1e-6);
});
