// Generated with AI assistance for NASA Space Apps 2026; reviewed by the team
// Safe havens and supply caches (planWalk options.havens, CONTRACTS §4).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { planWalk, latLonToCell, buildCostGrid } from '../js/engine.js';
import { CONFIG } from '../js/config.js';

const load = (s, f) => JSON.parse(readFileSync(new URL(`../data/${s}/${f}`, import.meta.url)));
const site = (s) => ({ t: load(s, 'terrain.json'), g: load(s, 'targets.json'), h: load(s, 'havens.json').havens });
const HARD = { dustStorm: true, heavyKit: true };

test('without havens the plan is unchanged and reports none', () => {
  const { t, g } = site('demo');
  const a = planWalk(t, g, { conditions: HARD });
  const b = planWalk(t, g, { conditions: HARD, havens: [] });
  assert.deepEqual(a.totals, b.totals);
  assert.deepEqual(a.havens, []);
  assert.deepEqual(a.refills, []);
  assert.equal(a.totals.o2RefilledKg, 0);
  assert.equal(a.totals.o2MaxDrawKg, a.totals.o2UsedKg);
});

for (const name of ['demo', 'real', 'gale']) {
  test(`${name}: havens.json is hypothetical and every haven sits on walkable ground`, () => {
    const { t } = site(name);
    const file = load(name, 'havens.json');
    assert.equal(file.hypothetical, true);
    const g = buildCostGrid(t, CONFIG, {});
    for (const h of file.havens) {
      assert.ok(['cache', 'shelter'].includes(h.kind), h.id);
      const { x, y } = latLonToCell(t, h.lat, h.lon);
      assert.ok(x >= 0 && y >= 0 && x < t.width && y < t.height, `${h.id} inside the grid`);
      assert.equal(g.blocked[y * t.width + x], 0, `${h.id} not blocked`);
    }
  });

  test(`${name}: a supply cache turns an over-budget walk into one that fits`, () => {
    const { t, g, h } = site(name);
    const over = planWalk(t, g, { conditions: HARD });
    assert.ok(over.violations.includes('oxygen'), 'scenario must start over budget on O2');
    const p = planWalk(t, g, { conditions: HARD, havens: h });
    assert.equal(p.refills.length, 1);
    assert.equal(p.refills[0].id, 'cache-1');
    assert.ok(!p.violations.includes('oxygen'));
    const usable = CONFIG.suit.o2CapacityKg * (1 - CONFIG.suit.reserveFraction);
    assert.ok(p.totals.o2MaxDrawKg <= usable + 1e-12);
    assert.ok(Math.abs(p.totals.o2UsableKg - (usable + p.totals.o2RefilledKg)) < 1e-12);
    assert.ok(p.totals.o2UsedKg <= p.totals.o2UsableKg + 1e-12, 'the console\'s used <= usable test still means "fits"');
    assert.ok(Math.abs(p.refills[0].refillKg - p.totals.o2RefilledKg) < 1e-9);
    // Same science stops; the cache is not a stop.
    assert.deepEqual([...p.order].sort(), [...over.order].sort());
    assert.ok(!p.stops.some((s) => s.id === 'cache-1'));
    // The O2 curve jumps back up at the cache.
    const jumps = p.profile.filter((q, i) => i > 0 && q.o2RemainingKg > p.profile[i - 1].o2RemainingKg + 0.01);
    assert.equal(jumps.length, 1);
    assert.equal(jumps[0].pathIndex, p.refills[0].pathIndex);
    // With caches switched off, the same walk is still over.
    assert.ok(planWalk(t, g, { conditions: HARD, havens: h, useCaches: false }).violations.includes('oxygen'));
  });

  test(`${name}: a shelter never moves the point of no return earlier`, () => {
    const { t, g, h } = site(name);
    const shelters = h.filter((x) => x.kind === 'shelter');
    const a = planWalk(t, g, { conditions: HARD });
    const b = planWalk(t, g, { conditions: HARD, havens: shelters });
    assert.ok(a.turnBack, 'scenario has a point of no return');
    assert.equal(a.turnBack.refuge, 'habitat');
    if (b.turnBack) {
      assert.ok(b.turnBack.pathIndex >= a.turnBack.pathIndex);
      assert.ok(['habitat', 'shelter-1'].includes(b.turnBack.refuge));
    }
    for (let i = 0; i < b.profile.length; i++) assert.ok(b.profile[i].o2ToSafetyKg <= b.profile[i].o2ToHomeKg + 1e-12);
  });
}
