// Generated with AI assistance for NASA Space Apps 2026; reviewed by the team
//
// Mars Maps planner worker: keeps the terrain, computes the three route alternatives and the
// habitat viewshed off the main thread. Messages:
//   in  { type: 'init', id, terrainUrl, habitat }            -> { id, type: 'ready', viewshed }
//   in  { type: 'plan', id, targetsFile, options, modes }    -> { id, type: 'route', result } per mode,
//                                                               then { id, type: 'done' }

import { prepareReal, planMode, viewshed, MODE_IDS } from './route.js';
import { resolveTargets } from '../engine.js';

let terrain = null;
let habitat = null;
const realCache = new Map(); // conditions key -> prepared real grid

function real(conditions) {
  const key = JSON.stringify(Object.keys(conditions).sort().filter((k) => conditions[k]));
  if (!realCache.has(key)) {
    if (realCache.size > 6) realCache.clear();
    realCache.set(key, prepareReal(terrain, habitat, conditions));
  }
  return realCache.get(key);
}

self.onmessage = async (e) => {
  const m = e.data;
  try {
    if (m.type === 'init') {
      const r = await fetch(m.terrainUrl);
      if (!r.ok) throw new Error(`terrain.json: HTTP ${r.status}`);
      terrain = await r.json();
      habitat = resolveTargets(terrain, { habitat: m.habitat, targets: [] }).habitat;
      const R = real({});
      const vs = viewshed(R.g, R.hCell, terrain.width > 300 ? 2 : 1);
      self.postMessage({ id: m.id, type: 'ready', viewshed: vs }, [vs.buffer]);
      return;
    }
    if (m.type === 'plan') {
      const conditions = m.options.conditions ?? {};
      const R = real(conditions);
      for (const mode of m.modes ?? MODE_IDS) {
        const result = planMode(mode, terrain, m.targetsFile, m.options, R);
        self.postMessage({ id: m.id, type: 'route', result });
      }
      self.postMessage({ id: m.id, type: 'done' });
    }
  } catch (err) {
    self.postMessage({ id: m.id, type: 'error', error: String(err?.message ?? err) });
  }
};
