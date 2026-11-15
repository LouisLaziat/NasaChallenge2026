// Generated with AI assistance for NASA Space Apps 2026; reviewed by the team
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { planWalk } from '../js/engine.js';
import { CONFIG } from '../js/config.js';
import { planAlternatives, routeConfig, slopeProfile, ROUTE_MODES } from '../js/routes.js';

const site = (s) => ({
  t: JSON.parse(readFileSync(new URL(`../data/${s}/terrain.json`, import.meta.url))),
  g: JSON.parse(readFileSync(new URL(`../data/${s}/targets.json`, import.meta.url))),
});

for (const name of ['demo', 'real']) {
  test(`route options on ${name}: eco is the engine, short is shortest, eco is cheapest, safe avoids steep ground`, () => {
    const { t, g } = site(name);
    const A = planAlternatives(t, g);
    assert.deepEqual(Object.keys(A), ROUTE_MODES);
    for (const m of ROUTE_MODES) assert.equal(A[m].mode, m);
    // eco is planWalk exactly.
    assert.deepEqual(A.eco.totals, planWalk(t, g).totals);
    // Same stops in every option.
    for (const m of ['safe', 'short']) assert.deepEqual([...A[m].order].sort(), [...A.eco.order].sort());
    // Shortest is never longer; least-oxygen is never more expensive (both measured with the real model).
    assert.ok(A.short.totals.distanceM <= A.eco.totals.distanceM + 1e-6);
    for (const m of ['safe', 'short']) assert.ok(A.eco.totals.o2UsedKg <= A[m].totals.o2UsedKg + 1e-12, `${m} cheaper than eco`);
    // Safest spends no more distance on 15-20 deg ground than eco.
    const steep = (p) => { const s = slopeProfile(t, p); return s[2] + s[3]; };
    assert.ok(steep(A.safe) <= steep(A.eco) + 1e-6);
    // Re-measured totals stay consistent: legs add up to the walking part.
    for (const m of ROUTE_MODES) {
      const legs = A[m].legs.reduce((a, l) => a + l.distanceM, 0);
      assert.ok(Math.abs(legs - A[m].totals.distanceM) < 1e-6);
    }
  });
}

test('a route model may not loosen the slope limit', () => {
  const { t, g } = site('demo');
  const loose = structuredClone(CONFIG);
  loose.walk.maxSlopeDeg = 30;
  assert.throws(() => planWalk(t, g, { routeConfig: loose }), /slope limit/);
  assert.ok(routeConfig('safe').walk.maxSlopeDeg <= CONFIG.walk.maxSlopeDeg);
  assert.equal(routeConfig('eco'), CONFIG);
});
