// Generated with AI assistance for NASA Space Apps 2026; reviewed by the team
// Pressurized-rover sorties with the walk-back limit (js/rover.js, CONTRACTS §4).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { planWalk } from '../js/engine.js';
import { planRover } from '../js/rover.js';
import { CONFIG } from '../js/config.js';

const load = (s, f) => JSON.parse(readFileSync(new URL(`../data/${s}/${f}`, import.meta.url)));
const site = (s) => ({ t: load(s, 'terrain.json'), g: load(s, 'targets.json'), h: load(s, 'havens.json').havens });

test('rover sortie: same stops as walking, out and back, faster, one profile point per path point', () => {
  const { t, g } = site('demo');
  const r = planRover(t, g);
  const w = planWalk(t, g);
  assert.equal(r.vehicle, 'rover');
  assert.deepEqual([...r.order].sort(), [...w.order].sort());
  assert.deepEqual(r.path[0], r.path[r.path.length - 1]);
  assert.equal(r.profile.length, r.path.length);
  assert.ok(r.totals.driveTimeS < w.totals.walkTimeS);
  assert.equal(r.totals.walkTimeS, r.totals.driveTimeS);
  assert.equal(r.totals.timeLimitS, CONFIG.rover.maxHours * 3600);
  // Each stop is its own suited EVA; o2UsedKg is the longest one.
  assert.ok(Math.abs(r.totals.o2UsedKg - Math.max(...r.stops.map((s) => s.evaO2Kg))) < 1e-12);
  assert.ok(r.withinBudget);
  assert.deepEqual(r.walkback.beyond, []);
  assert.equal(r.walkback.limitPoint, null);
});

test('rover cabin cuts the dose of a solar particle event compared with walking', () => {
  const { t, g } = site('real');
  const r = planRover(t, g, { conditions: { solarEvent: true } });
  const w = planWalk(t, g, { conditions: { solarEvent: true } });
  assert.ok(r.totals.doseMSv < w.totals.doseMSv);
  assert.ok(w.violations.includes('radiation'));
  assert.ok(!r.violations.includes('radiation'));
});

test('the sample kit rides in the rover: it does not slow the drive, but makes stop work harder', () => {
  const { t, g } = site('demo');
  const a = planRover(t, g);
  const b = planRover(t, g, { conditions: { heavyKit: true } });
  assert.ok(Math.abs(a.totals.driveTimeS - b.totals.driveTimeS) < 1e-6);
  assert.ok(b.totals.o2UsedKg > a.totals.o2UsedKg);
});

test('walk-back limit: a tiny suit supply puts parts of the drive out of walk-back range', () => {
  const { t, g } = site('demo');
  const config = { ...CONFIG, suit: { ...CONFIG.suit, o2CapacityKg: 0.02 } };
  const r = planRover(t, g, { config });
  assert.ok(r.violations.includes('walkback'));
  assert.ok(r.walkback.beyond.length > 0);
  assert.ok(r.walkback.beyondM > 0);
  const lp = r.walkback.limitPoint;
  assert.ok(lp && lp.pathIndex < r.walkback.beyond[0][0]);
  assert.ok(r.profile[lp.pathIndex].walkbackO2Kg <= r.walkback.o2LimitKg);
  assert.ok(r.walkback.maxO2Kg > r.walkback.o2LimitKg);
});

test('a haven shortens the walk-back', () => {
  const { t, g, h } = site('demo');
  const a = planRover(t, g);
  const b = planRover(t, g, { havens: h });
  assert.ok(b.walkback.maxO2Kg < a.walkback.maxO2Kg);
  assert.ok(b.profile.some((q) => q.refuge !== 'habitat'));
});
