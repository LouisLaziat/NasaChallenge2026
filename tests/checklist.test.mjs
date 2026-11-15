// Generated with AI assistance for NASA Space Apps 2026; reviewed by the team
// EVA cuff checklist: the list builder is pure and built only from the plan result.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildChecklist, atPathIndex, mergeGaps, clock, duration } from '../js/checklist.js';
import { planRoute } from '../js/routes.js';

// A small hand-made plan: habitat -> A -> B -> habitat, 1 path cell = 10 m = 10 s.
function fixture(extra = {}) {
  const profile = [];
  for (let k = 0; k <= 60; k++) {
    const t = k * 10 + (k > 20 ? 600 : 0) + (k > 40 ? 900 : 0); // 10 min at A (k=20), 15 min at B (k=40)
    profile.push({ pathIndex: k, elapsedS: t, distanceM: k * 10 });
    if (k === 20 || k === 40) profile.push({ pathIndex: k, elapsedS: t + (k === 20 ? 600 : 900), distanceM: k * 10 });
  }
  return {
    mode: 'eco',
    order: ['A', 'B'],
    path: Array.from({ length: 61 }, (_, k) => [k, 0]),
    stops: [
      { id: 'A', name: 'Alpha ridge', dwellMin: 10, pathIndex: 20, arriveS: 200, arriveO2Kg: 0.05 },
      { id: 'B', dwellMin: 15, pathIndex: 40, arriveS: 1000, arriveO2Kg: 0.15 },
    ],
    legs: [
      { from: 'habitat', to: 'A', distanceM: 200, timeS: 200, o2Kg: 0.05 },
      { from: 'A', to: 'B', distanceM: 200, timeS: 200, o2Kg: 0.06 },
      { from: 'B', to: 'habitat', distanceM: 200, timeS: 200, o2Kg: 0.05 },
    ],
    totals: { o2CapacityKg: 0.5, o2UsableKg: 0.4, o2UsedKg: 0.25, totalTimeS: 2100, timeLimitS: 21600, doseMSv: 0.02, doseLimitMSv: 1, scienceValue: 9 },
    withinBudget: true, violations: [], turnBack: null, turnBackLatest: null,
    profile,
    lineOfSight: { outOfSightM: 80, gaps: [[25, 27], [30, 31], [57, 59]] },
    ...extra,
  };
}

test('clock and duration format like the console', () => {
  assert.equal(clock(0), 'T+0:00');
  assert.equal(clock(3 * 3600 + 29 * 60), 'T+3:29');
  assert.equal(duration(25 * 60), '25 min');
  assert.equal(duration(65 * 60), '1 h 05 min');
});

test('mergeGaps joins blind stretches a few cells apart', () => {
  assert.deepEqual(mergeGaps([[50, 52], [25, 27], [30, 31]], 10), [[25, 31], [50, 52]]);
  assert.deepEqual(mergeGaps([[200, 200], [220, 220], [222, 223], [256, 305]]), [[200, 200], [220, 223], [256, 305]]);
  assert.deepEqual(mergeGaps([[0, 1], [20, 21]], 5), [[0, 1], [20, 21]]);
  assert.deepEqual(mergeGaps(undefined), []);
});

test('atPathIndex reads time off the profile, after the dwell at a stop', () => {
  const p = fixture();
  assert.deepEqual(atPathIndex(p, 10), { elapsedS: 100, distanceM: 100 });
  assert.equal(atPathIndex(p, 20).elapsedS, 800); // leaving A, after 10 min of work
  assert.equal(atPathIndex({ profile: [] }, 3), null);
});

test('timed list: egress, walk, work, return, ingress in order with O2 on arrival', () => {
  const c = buildChecklist(fixture(), { names: new Map([['B', 'Bravo outcrop']]), level: 'GO' });
  const texts = c.items.map((i) => `${clock(i.t)} ${i.kind} ${i.text}`);
  assert.deepEqual(texts, [
    'T+0:00 egress Egress: leave the habitat',
    'T+0:00 walk Walk to Alpha ridge',
    'T+0:03 work Work 10 min at Alpha ridge',
    'T+0:13 walk Walk to Bravo outcrop',
    'T+0:14 comm Comm check: out of habitat’s sight',
    'T+0:17 work Work 15 min at Bravo outcrop',
    'T+0:32 return Walk back to the habitat',
    'T+0:35 comm Comm check: out of habitat’s sight',
    'T+0:35 ingress Ingress: back inside',
  ]);
  const work = c.items.find((i) => i.kind === 'work');
  assert.match(work.note, /O₂ left on arrival 0\.45 kg/);
  assert.equal(c.level, 'GO');
  assert.equal(c.fits, true);
  assert.equal(c.stormSafe, true);
});

test('comm checks come from lineOfSight.gaps, merged, with time and length', () => {
  const comms = buildChecklist(fixture()).items.filter((i) => i.kind === 'comm');
  assert.equal(comms.length, 2);              // [25..31] and [57..59], more than 10 cells apart
  assert.equal(clock(comms[0].t), 'T+0:14');  // index 25: 250 s walking + 10 min at A
  assert.match(comms[0].note, /until T\+0:15 · about 70 m/);
});

test('turn-back lines: point of no return when over budget, storm turn-back when it differs', () => {
  const over = buildChecklist(fixture({
    withinBudget: false, violations: ['oxygen'],
    turnBack: { pathIndex: 35, elapsedS: 1550 }, turnBackLatest: { pathIndex: 35, elapsedS: 1550 },
  }));
  const tb = over.items.filter((i) => i.kind === 'turnback' || i.kind === 'storm');
  assert.equal(tb.length, 1, 'same point is not listed twice');
  assert.equal(tb[0].text, 'TURN BACK BY T+0:26');
  assert.ok(tb[0].alert);
  assert.equal(over.fits, false);
  assert.equal(over.budgets.find((b) => b.key === 'oxygen').over, false); // fixture O2 is under; violations drive fits

  const storm = buildChecklist(fixture({ turnBackLatest: { pathIndex: 45, elapsedS: 1900 } }));
  const s = storm.items.find((i) => i.kind === 'storm');
  assert.equal(s.text, 'IF A DUST STORM STARTS, TURN BACK BY T+0:32');
  assert.equal(storm.stormSafe, false);
});

test('budgets: O2, EVA time against the 6 h limit, dose', () => {
  const c = buildChecklist(fixture({ totals: { ...fixture().totals, totalTimeS: 22000 } }));
  assert.deepEqual(c.budgets.map((b) => b.key), ['oxygen', 'time', 'radiation']);
  const time = c.budgets.find((b) => b.key === 'time');
  assert.equal(time.limit, '6 h limit');
  assert.equal(time.over, true);
  assert.equal(c.limitS, 21600);
});

test('real Gale plan: every stop walked and worked, comm checks, times never go backwards', () => {
  const dir = new URL('../data/gale/', import.meta.url);
  const terrain = JSON.parse(readFileSync(new URL('terrain.json', dir), 'utf8'));
  const targets = JSON.parse(readFileSync(new URL('targets.json', dir), 'utf8'));
  const plan = planRoute('eco', terrain, targets, {});
  const c = buildChecklist(plan);
  const n = plan.order.length;
  assert.equal(c.items.filter((i) => i.kind === 'walk').length, n);
  assert.equal(c.items.filter((i) => i.kind === 'work').length, n);
  assert.equal(c.items.at(-1).kind, 'ingress');
  assert.equal(c.items.at(-1).t, plan.totals.totalTimeS);
  for (let i = 1; i < c.items.length; i++) assert.ok(c.items[i].t >= c.items[i - 1].t);
  if (plan.lineOfSight?.gaps.length) assert.ok(c.items.some((i) => i.kind === 'comm'));
});

test('blind spots under 20 m stay off the wrist list but count in the total', () => {
  const c = buildChecklist(fixture({ lineOfSight: { outOfSightM: 10, gaps: [[10, 10]] } }));
  assert.equal(c.items.filter((i) => i.kind === 'comm').length, 0);
  assert.equal(c.outOfSightM, 10);
});

test('a turn-back at the same minute as a stop comes before starting work there', () => {
  const c = buildChecklist(fixture({ withinBudget: false, violations: ['oxygen'], turnBack: { pathIndex: 40, elapsedS: 1000 } }));
  const at = c.items.filter((i) => i.t === 1000).map((i) => i.kind);
  assert.deepEqual(at, ['turnback', 'work']);
});

test('O2 on arrival is never negative: "in the reserve", then "none: suit empty"', () => {
  const p = fixture({ withinBudget: false, violations: ['oxygen'] });
  p.stops[0].arriveO2Kg = 0.45;  // 0.05 left, under the 0.10 reserve
  p.stops[1].arriveO2Kg = 0.52;  // more than the suit holds
  p.totals = { ...p.totals, o2UsedKg: 0.6 };
  const c = buildChecklist(p);
  const work = c.items.filter((i) => i.kind === 'work');
  assert.equal(work[0].note, 'O₂ left on arrival 0.05 kg · in the reserve');
  assert.equal(work[1].note, 'O₂ left on arrival none: suit empty');
  assert.ok(work.every((w) => w.alert));
  assert.match(c.items.at(-1).note, /^O₂ left none: suit empty/);
  assert.ok(!c.items.some((i) => /-d/.test(i.note)));
});
