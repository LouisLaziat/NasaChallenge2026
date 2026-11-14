// Generated with AI assistance for NASA Space Apps 2026; reviewed by the team
//
// Gale dataset checks (gale lane, amarz-claude). Offline, no node_modules: reads data/gale/ only.
// Skips cleanly if data/gale/terrain.json has not been generated yet.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { planWalk, resolveTargets, buildCostGrid } from '../js/engine.js';

const dir = new URL('../data/gale/', import.meta.url);
const has = existsSync(new URL('terrain.json', dir));
const load = (f) => JSON.parse(readFileSync(new URL(f, dir), 'utf8'));

test('gale area sits inside the USGS 1 m DEM footprint', () => {
  const a = load('area.json');
  const b = a.bounds;
  assert.ok(b.north > b.south && b.east > b.west);
  assert.ok(b.south >= -5.10 && b.north <= -4.13, 'latitude inside -5.10..-4.13');
  assert.ok(b.west >= 137.12 && b.east <= 137.68, 'longitude inside 137.12..137.68');
});

test('gale targets follow CONTRACTS §2 and every stop is cited', () => {
  const t = load('targets.json');
  assert.ok(t.habitat && Number.isFinite(t.habitat.lat) && Number.isFinite(t.habitat.lon));
  assert.ok(t.targets.length >= 3);
  const ids = new Set();
  for (const s of t.targets) {
    assert.ok(!ids.has(s.id), `duplicate id ${s.id}`); ids.add(s.id);
    assert.ok(Number.isFinite(s.lat) && Number.isFinite(s.lon));
    assert.ok(s.value >= 1 && s.value <= 10);
    assert.ok(s.dwellMin > 0);
    assert.ok(!s.placeholder, `${s.id} is still a placeholder`);
    assert.match(s.source ?? '', /^https:\/\/science\.nasa\.gov\//, `${s.id} cites a NASA mission update`);
    assert.ok(s.note && s.note.length > 40);
    for (const p of s.photos ?? []) {
      assert.match(p.url, /^https:\/\/mars\.nasa\.gov\//);
      assert.ok(Number.isInteger(p.sol) && p.camera && p.credit);
      assert.match(p.credit, /^NASA\/JPL-Caltech/);
    }
  }
});

test('gale terrain follows CONTRACTS §1', { skip: !has && 'data/gale/terrain.json not generated' }, () => {
  const terrain = load('terrain.json');
  assert.equal(terrain.synthetic, false);
  const n = terrain.width * terrain.height;
  assert.equal(terrain.layers.elevation.length, n);
  assert.equal(terrain.layers.roughness.length, n);
  assert.ok(terrain.sources.some((s) => s.layer === 'elevation'));
});

test('gale stops resolve inside the grid and the walk plans', { skip: !has && 'data/gale/terrain.json not generated' }, () => {
  const terrain = load('terrain.json');
  const targets = load('targets.json');
  const r = resolveTargets(terrain, targets);
  for (const p of [r.habitat, ...r.targets]) {
    assert.ok(p.x >= 0 && p.y >= 0 && p.x < terrain.width && p.y < terrain.height, `${p.id ?? 'habitat'} inside grid`);
  }
  const g = buildCostGrid(terrain);
  assert.equal(g.blocked[r.habitat.y * terrain.width + r.habitat.x], 0, 'habitat on walkable ground');
  const plan = planWalk(terrain, targets);
  assert.ok(plan.ok);
  assert.ok(plan.order.length >= 3, `at least 3 stops reachable (unreachable: ${plan.unreachable.join(', ')})`);
  assert.ok(plan.totals.distanceM > 500);
});

test('gale demo story: every stop reachable at 20°, a normal walk fits, all three hazards go over', { skip: !has && 'data/gale/terrain.json not generated' }, () => {
  const terrain = load('terrain.json');
  const targets = load('targets.json');
  const normal = planWalk(terrain, targets);
  assert.deepEqual(normal.unreachable, []);
  assert.equal(normal.withinBudget, true);
  const all = planWalk(terrain, targets, { conditions: { dustStorm: true, heavyKit: true, solarEvent: true } });
  assert.equal(all.withinBudget, false);
  assert.ok(all.bestSubset, 'over budget offers a best set');
});

test('gale photos: Curiosity camera names and per-photo credits', async () => {
  const { roverOf, captionText } = await import('../js/photos.js');
  const { isGale } = await import('../js/basemap.js');
  const targets = load('targets.json');
  for (const s of targets.targets) {
    for (const p of s.photos ?? []) {
      assert.equal(roverOf(p), 'Curiosity');
      assert.doesNotMatch(captionText(p), /Perseverance|undefined/);
    }
  }
  assert.equal(roverOf({ url: 'https://mars.nasa.gov/mars2020-raw-images/x.png' }), 'Perseverance');
  if (has) assert.equal(isGale(load('terrain.json')), true);
  assert.equal(isGale(JSON.parse(readFileSync(new URL('../data/real/terrain.json', import.meta.url)))), false);
});
