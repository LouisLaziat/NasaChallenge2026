// Prints the plan for a terrain + targets pair under each condition. Handy sanity check.
//   node scripts/plan_demo.mjs [data/demo]

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { planWalk } from '../js/engine.js';

const dir = process.argv[2] ?? 'data/demo';
const terrain = JSON.parse(readFileSync(join(dir, 'terrain.json'), 'utf8'));
const targets = JSON.parse(readFileSync(join(dir, 'targets.json'), 'utf8'));

const cases = {
  normal: {},
  dustStorm: { dustStorm: true },
  heavyKit: { heavyKit: true },
  solarEvent: { solarEvent: true },
  everything: { dustStorm: true, heavyKit: true, solarEvent: true },
};

for (const [label, conditions] of Object.entries(cases)) {
  const t0 = performance.now();
  const r = planWalk(terrain, targets, { conditions });
  const ms = (performance.now() - t0).toFixed(0);
  const T = r.totals;
  console.log(`\n== ${label} (${ms} ms)`);
  console.log(`order      ${r.order.join(' -> ')}${r.unreachable.length ? `   unreachable: ${r.unreachable.join(', ')}` : ''}`);
  console.log(`distance   ${(T.distanceM / 1000).toFixed(2)} km   walk ${(T.walkTimeS / 3600).toFixed(2)} h   total ${(T.totalTimeS / 3600).toFixed(2)} h`);
  console.log(`oxygen     ${T.o2UsedKg.toFixed(3)} / ${T.o2UsableKg.toFixed(3)} kg usable`);
  console.log(`dose       ${T.doseMSv.toFixed(3)} / ${T.doseLimitMSv} mSv`);
  console.log(`budget     ${r.withinBudget ? 'OK' : 'OVER: ' + r.violations.join(', ')}`);
  if (r.turnBack) console.log(`turn back  at path point ${r.turnBack.pathIndex} (${r.turnBack.x}, ${r.turnBack.y}) after ${(r.turnBack.elapsedS / 60).toFixed(0)} min`);
  if (r.dropSuggestion) console.log(`drop       ${r.dropSuggestion.id} ${r.dropSuggestion.name} (saves ${r.dropSuggestion.o2SavedKg.toFixed(3)} kg O2${r.dropSuggestion.makesFeasible ? ', then fits' : ''})`);
}
