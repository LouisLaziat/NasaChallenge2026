// Generated with AI assistance for NASA Space Apps 2026; reviewed by the team
//
// Mars Maps route alternatives (js/maps/route.js) on the synthetic demo terrain. Offline, no deps.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolveTargets } from '../js/engine.js';
import { prepareReal, planMode, viewshed, safetyScore, modeConfig } from '../js/maps/route.js';
import { CONFIG } from '../js/config.js';

const terrain = JSON.parse(readFileSync(new URL('../data/demo/terrain.json', import.meta.url)));
const targets = JSON.parse(readFileSync(new URL('../data/demo/targets.json', import.meta.url)));
const habitat = resolveTargets(terrain, targets).habitat;
const R = prepareReal(terrain, habitat, {});
const opts = { conditions: {}, expectStops: targets.targets.length };
const eco = planMode('eco', terrain, targets, opts, R);
const safe = planMode('safe', terrain, targets, opts, R);
const short = planMode('short', terrain, targets, opts, R);

test('eco re-measure matches the engine exactly (edgeCost stays in sync with engine.js)', () => {
  const a = eco.analysis.totals, e = eco.plan.totals;
  assert.ok(Math.abs(a.o2UsedKg - e.o2UsedKg) < 1e-9);
  assert.ok(Math.abs(a.distanceM - e.distanceM) < 1e-6);
  assert.ok(Math.abs(a.totalTimeMin * 60 - e.totalTimeS) < 1e-6);
  assert.ok(Math.abs(a.doseMSv - e.doseMSv) < 1e-12);
});

test('modes trade off as advertised', () => {
  assert.ok(short.analysis.totals.distanceM <= eco.analysis.totals.distanceM + 1e-6, 'short is not longer');
  assert.ok(eco.analysis.totals.o2UsedKg <= short.analysis.totals.o2UsedKg + 1e-9, 'eco uses least O2 of eco/short');
  assert.ok(safe.analysis.totals.maxSlopeDeg <= eco.analysis.totals.maxSlopeDeg + 1e-6, 'safe is not steeper');
  assert.equal(safe.plan.order.length, targets.targets.length, 'safe keeps every stop reachable');
});

test('modeConfig never mutates CONFIG', () => {
  const before = JSON.stringify(CONFIG);
  modeConfig('safe'); modeConfig('short');
  assert.equal(JSON.stringify(CONFIG), before);
});

test('profile arrays align with the path and steps cover each leg', () => {
  const n = eco.plan.path.length;
  for (const arr of Object.values(eco.analysis.profile)) assert.equal(arr.length, n);
  for (const leg of eco.steps) {
    const sum = leg.steps.filter((s) => s.kind !== 'arrive').reduce((a, s) => a + s.distM, 0);
    assert.ok(Math.abs(sum - leg.distM) < 1e-3);
  }
  assert.equal(eco.analysis.profile.walkback_min[0], 0);
});

test('viewshed sees the habitat cell; safety score is bounded', () => {
  const vs = viewshed(R.g, R.hCell);
  assert.equal(vs[R.hCell], 1);
  for (const r of [eco, safe, short]) {
    const s = r.analysis.totals.safetyScore;
    assert.ok(s >= 0 && s <= 100);
  }
  assert.equal(safetyScore({ slopeShare: {}, sandShare: 0, losShare: 1, minO2MarginKg: 1, maxRangeM: 0, maxSlopeDeg: 0 }), 100);
});
