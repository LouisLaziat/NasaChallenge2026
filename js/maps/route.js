// Generated with AI assistance for NASA Space Apps 2026; reviewed by the team
//
// Mars Maps — route alternatives on top of the shared engine (js/engine.js).
//
// The engine finds the least-ENERGY route (= least suit oxygen). Mars Maps offers three
// alternatives, Google-Maps style:
//   eco   — the engine as is: least oxygen.
//   safe  — same engine, but steep ground, braking downhill and loose sand are made much more
//           "expensive" and slopes above 15° are avoided when the stops allow it.
//   short — distance only (flat speed, no grade or sand penalty): the shortest walkable line.
// Each route is then RE-MEASURED with the real model (CONFIG + conditions), so time, oxygen and
// dose are always comparable between the three cards. Pure functions: runs in a worker and in Node.

import { CONFIG } from '../config.js';
import { planWalk, buildCostGrid, search, energyToO2Kg, doseMSv, resolveTargets } from '../engine.js';

const DEG = 180 / Math.PI;
const SQRT2 = Math.SQRT2;

export const MODE_IDS = ['eco', 'safe', 'short'];

// Loose sand = thermal inertia at or below CONFIG.terrain.looseSandTI (engine sandiness 1).
export const LOOSE_SAND = 0.999;

// Slope classes used everywhere in Mars Maps (NASA xEVA concept: 20° max walkable, 10° soft limit).
export const SLOPE_CLASSES = [
  { id: '0-5', lo: 0, hi: 5 },
  { id: '5-10', lo: 5, hi: 10 },
  { id: '10-15', lo: 10, hi: 15 },
  { id: '15-20', lo: 15, hi: 20 },
  { id: '>20', lo: 20, hi: 90 },
];

// MODEL CHOICE (Mars Maps): weights of the "safe" cost. Not physics — a routing preference.
const SAFE = {
  slopeCaps: [15, 18, null],   // try 15° first, relax if a chosen stop becomes unreachable
  uphillMul: 3, downhillMul: 6,
  sandMetabolicFactor: 2.2, sandSpeedFactor: 0.45, roughnessSpeedPenalty: 0.9,
};

/** Engine config for one routing mode (a deep copy; CONFIG itself is never touched). */
export function modeConfig(mode, base = CONFIG, slopeCap = null) {
  const c = structuredClone(base);
  if (mode === 'safe') {
    if (slopeCap != null) c.walk.maxSlopeDeg = Math.min(c.walk.maxSlopeDeg, slopeCap);
    c.metabolic.uphillPerGrade *= SAFE.uphillMul;
    c.metabolic.downhillPerGrade *= SAFE.downhillMul;
    c.terrain.sandMetabolicFactor = SAFE.sandMetabolicFactor;
    c.terrain.sandSpeedFactor = SAFE.sandSpeedFactor;
    c.terrain.roughnessSpeedPenalty = SAFE.roughnessSpeedPenalty;
  } else if (mode === 'short') {
    c.walk.toblerK = 0;
    c.metabolic.uphillPerGrade = 0;
    c.metabolic.downhillPerGrade = 0;
    c.terrain.sandSpeedFactor = 1;
    c.terrain.sandMetabolicFactor = 1;
    c.terrain.roughnessSpeedPenalty = 0;
  }
  return c;
}

// ---------------------------------------------------------------------------
// Real-model helpers
// ---------------------------------------------------------------------------

/** Same formula as engine.js edgeEnergy (kept in sync by tests/maps.test.mjs). */
export function edgeCost(g, a, b) {
  const W = g.width;
  const diag = (a % W) !== (b % W) && Math.floor(a / W) !== Math.floor(b / W);
  const dist = diag ? g.cellSize * SQRT2 : g.cellSize;
  const grade = (g.elev[b] - g.elev[a]) / dist;
  const tob = Math.exp(-g.k * Math.abs(grade + g.g0)) * g.toblerNorm;
  const speed = g.vFlat * tob * 0.5 * (g.speedMul[a] + g.speedMul[b]);
  const time = dist / speed;
  const gradeFactor = 1 + (grade > 0 ? g.up * grade : -g.down * grade);
  const power = g.baseW * 0.5 * (g.metMul[a] + g.metMul[b]) * gradeFactor;
  return { dist, time, energy: power * time, grade };
}

/**
 * Everything that depends only on terrain + conditions: the real cost grid and the
 * reverse search from the habitat (O2 and time to get home from any cell).
 */
export function prepareReal(terrain, habitat, conditions = {}, config = CONFIG) {
  const g = buildCostGrid(terrain, config, conditions);
  const hCell = habitat.y * terrain.width + habitat.x;
  const { dist, prev } = search(g, hCell, { reverse: true });
  const timeHome = new Float64Array(g.width * g.height).fill(NaN);
  timeHome[hCell] = 0;
  return { g, config, conditions, hCell, toHomeJ: dist, prevHome: prev, timeHome };
}

/** Walking time (s) home from cell c on the least-O2 path; memoised. */
export function homeTimeS(R, c) {
  if (!Number.isNaN(R.timeHome[c])) return R.timeHome[c];
  const chain = [];
  let cur = c;
  while (cur !== -1 && Number.isNaN(R.timeHome[cur])) { chain.push(cur); cur = R.prevHome[cur]; }
  if (cur === -1) { for (const q of chain) R.timeHome[q] = Infinity; return Infinity; }
  let t = R.timeHome[cur];
  for (let i = chain.length - 1; i >= 0; i--) {
    const a = chain[i], b = i === chain.length - 1 ? cur : chain[i + 1];
    t += edgeCost(R.g, a, b).time;
    R.timeHome[a] = t;
  }
  return R.timeHome[c];
}

/** Line of sight between two cells, antenna/eye heights in metres. */
export function lineOfSight(g, a, b, hA = 3, hB = 2) {
  const W = g.width;
  const ax = a % W, ay = (a - ax) / W, bx = b % W, by = (b - bx) / W;
  const za = g.elev[a] + hA, zb = g.elev[b] + hB;
  const n = Math.max(Math.abs(bx - ax), Math.abs(by - ay));
  for (let s = 1; s < n; s++) {
    const u = s / n;
    const x = Math.round(ax + (bx - ax) * u), y = Math.round(ay + (by - ay) * u);
    const z = g.elev[y * W + x];
    if (Number.isFinite(z) && z > za + (zb - za) * u) return false;
  }
  return true;
}

/** 1 where the habitat antenna (3 m) sees a suited astronaut (2 m), 0 elsewhere. */
export function viewshed(g, hCell, step = 1) {
  const W = g.width, H = g.height;
  const out = new Uint8Array(W * H);
  for (let y = 0; y < H; y += step) {
    for (let x = 0; x < W; x += step) {
      const v = lineOfSight(g, hCell, y * W + x) ? 1 : 0;
      for (let yy = y; yy < Math.min(H, y + step); yy++) for (let xx = x; xx < Math.min(W, x + step); xx++) out[yy * W + xx] = v;
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Route analysis
// ---------------------------------------------------------------------------

/**
 * Re-measure a plan's path with the real model and build the per-vertex profile.
 * `nodes` maps stop id -> target (for dwell minutes / value / name).
 */
export function analyseRoute(R, plan, nodes, habitatCell) {
  const { g, config } = R;
  const W = g.width;
  const p = g.params;
  const cells = plan.path.map(([x, y]) => y * W + x);
  const n = cells.length;
  const stopAt = new Map(plan.stops.map((s) => [s.pathIndex, s]));
  const dwellW = config.metabolic.dwellW * p.metabolicFactor;
  const usable = config.suit.o2CapacityKg * (1 - config.suit.reserveFraction);
  const capacity = config.suit.o2CapacityKg;

  const prof = {
    d_m: new Float32Array(n), elev_m: new Float32Array(n), slope_deg: new Float32Array(n),
    t_min: new Float32Array(n), walk_min: new Float32Array(n),
    o2_left_kg: new Float32Array(n), o2_home_kg: new Float32Array(n),
    walkback_min: new Float32Array(n), dose_msv: new Float32Array(n), los: new Uint8Array(n),
  };
  const share = Object.fromEntries(SLOPE_CLASSES.map((c) => [c.id, 0]));
  let d = 0, t = 0, tw = 0, e = 0, sandM = 0, losM = 0, maxSlope = 0, maxRange = 0, minMargin = Infinity;
  let firstBad = -1;
  const hx = habitatCell % W, hy = (habitatCell - hx) / W;
  const stopsOut = [];

  for (let k = 0; k < n; k++) {
    const c = cells[k];
    if (k > 0) {
      const ec = edgeCost(g, cells[k - 1], c);
      d += ec.dist; t += ec.time; tw += ec.time; e += ec.energy;
      const sl = g.slopeDeg[c];
      const cls = SLOPE_CLASSES.find((q) => sl < q.hi) ?? SLOPE_CLASSES[SLOPE_CLASSES.length - 1];
      share[cls.id] += ec.dist;
      if (g.sandiness[c] >= LOOSE_SAND) sandM += ec.dist;
    }
    const los = lineOfSight(g, habitatCell, c);
    if (k > 0 && los) losM += edgeCost(g, cells[k - 1], c).dist;
    maxSlope = Math.max(maxSlope, g.slopeDeg[c]);
    const cx = c % W, cy = (c - cx) / W;
    maxRange = Math.max(maxRange, Math.hypot(cx - hx, cy - hy) * g.cellSize);

    const o2Used = energyToO2Kg(e, config);
    const o2Home = energyToO2Kg(R.toHomeJ[c], config);
    let margin = usable - (o2Used + o2Home);
    if (firstBad < 0 && margin < 0) firstBad = k;

    prof.d_m[k] = d; prof.elev_m[k] = g.elev[c]; prof.slope_deg[k] = g.slopeDeg[c];
    prof.t_min[k] = t / 60; prof.walk_min[k] = tw / 60;
    prof.o2_left_kg[k] = capacity - o2Used; prof.o2_home_kg[k] = o2Home;
    prof.walkback_min[k] = homeTimeS(R, c) / 60;
    prof.dose_msv[k] = doseMSv(t, config, p.doseFactor);
    prof.los[k] = los ? 1 : 0;

    const s = stopAt.get(k);
    if (s) {
      const node = nodes[s.id] ?? s;
      stopsOut.push({ id: s.id, name: node.name ?? s.id, pathIndex: k, arriveMin: t / 60,
        arriveO2LeftKg: capacity - o2Used, dwellMin: node.dwellMin ?? 0, value: node.value ?? 0 });
      e += (node.dwellMin ?? 0) * 60 * dwellW;
      t += (node.dwellMin ?? 0) * 60;
      margin = usable - (energyToO2Kg(e, config) + o2Home);
      if (firstBad < 0 && margin < 0) firstBad = k + 1;
    }
    minMargin = Math.min(minMargin, margin);
  }

  const turnBackIndex = firstBad >= 0 ? Math.max(0, Math.min(n - 1, firstBad - 1)) : null;
  const o2UsedKg = energyToO2Kg(e, config);
  const dose = doseMSv(t, config, p.doseFactor);
  const doseLimit = config.radiation.walkLimitMSv;
  const violations = [];
  if (o2UsedKg > usable) violations.push('oxygen');
  if (dose > doseLimit) violations.push('radiation');
  const shareFrac = Object.fromEntries(Object.entries(share).map(([k, v]) => [k, d > 0 ? v / d : 0]));
  const sandShare = d > 0 ? sandM / d : 0;
  const losShare = d > 0 ? losM / d : 1;

  const totals = {
    distanceM: d, walkTimeMin: tw / 60, totalTimeMin: t / 60, dwellTimeMin: (t - tw) / 60,
    o2UsedKg, o2UsableKg: usable, o2CapacityKg: capacity, doseMSv: dose, doseLimitMSv: doseLimit,
    maxSlopeDeg: maxSlope, slopeShare: shareFrac, sandShare, losShare, maxRangeM: maxRange,
    minO2MarginKg: minMargin, maxWalkbackMin: Math.max(...prof.walkback_min),
    climbM: climb(prof.elev_m), scienceValue: stopsOut.reduce((a, s) => a + s.value, 0),
  };
  totals.safetyScore = safetyScore(totals);
  return {
    totals, profile: prof, stops: stopsOut, turnBackIndex,
    withinBudget: violations.length === 0, violations,
  };
}

function climb(elev) {
  let up = 0;
  for (let i = 1; i < elev.length; i++) if (elev[i] > elev[i - 1]) up += elev[i] - elev[i - 1];
  return up;
}

/**
 * MODEL CHOICE (Mars Maps): a 0–100 heuristic, higher = safer. Penalises distance share on
 * 10–15°, 15–20° and >20° ground, loose sand, walking out of sight of the habitat, a negative
 * O2 margin, the steepest cell above 15° and going beyond the 2 km xEVA radius. A ranking aid, not a certified safety rating.
 */
export function safetyScore(t) {
  const s = t.slopeShare;
  let risk = 100 * (0.6 * (s['10-15'] ?? 0) + 1.2 * (s['15-20'] ?? 0) + 2 * (s['>20'] ?? 0));
  risk += 25 * t.sandShare;
  risk += 30 * (1 - t.losShare);
  if (t.minO2MarginKg < 0) risk += 30;
  if (t.maxRangeM > 2000) risk += 15;
  if (t.maxSlopeDeg > 15) risk += 2 * (t.maxSlopeDeg - 15);
  return Math.max(0, Math.min(100, Math.round(100 - risk)));
}

// ---------------------------------------------------------------------------
// Turn-by-turn steps
// ---------------------------------------------------------------------------

function rdp(pts, i0, i1, eps, keep) {
  let best = -1, bestD = 0;
  const [x0, y0] = pts[i0], [x1, y1] = pts[i1];
  const L = Math.hypot(x1 - x0, y1 - y0) || 1;
  for (let i = i0 + 1; i < i1; i++) {
    const [x, y] = pts[i];
    const dd = Math.abs((y1 - y0) * x - (x1 - x0) * y + x1 * y0 - y1 * x0) / L;
    if (dd > bestD) { bestD = dd; best = i; }
  }
  if (best >= 0 && bestD > eps) { rdp(pts, i0, best, eps, keep); keep.add(best); rdp(pts, best, i1, eps, keep); }
}

/** Bearing in degrees clockwise from north for a grid move (y grows south). */
const bearing = (a, b) => (Math.atan2(b[0] - a[0], -(b[1] - a[1])) * DEG + 360) % 360;

/**
 * Turn-by-turn instructions per leg. Each step:
 * { kind: 'depart'|'turn'|'arrive', turn: 'left'|'right'|'slight-left'|'slight-right'|'straight'|'uturn',
 *   heading, distM, climbM, descentM, maxSlopeDeg, walkMin, fromIndex, toIndex }
 */
export function buildSteps(plan, prof, minStepM = 60) {
  const legs = [];
  let offset = 0;
  for (const leg of plan.legs) {
    const pts = leg.path;
    const keep = new Set([0, pts.length - 1]);
    if (pts.length > 2) rdp(pts, 0, pts.length - 1, 2.5, keep);
    let idx = [...keep].sort((a, b) => a - b);
    // Merge steps shorter than minStepM into the previous one.
    const dAt = (i) => prof.d_m[offset + i];
    const merged = [idx[0]];
    for (let q = 1; q < idx.length; q++) {
      const last = merged[merged.length - 1];
      if (q < idx.length - 1 && dAt(idx[q]) - dAt(last) < minStepM) continue;
      merged.push(idx[q]);
    }
    idx = merged;
    const steps = [];
    let prevHeading = null;
    for (let q = 1; q < idx.length; q++) {
      const a = idx[q - 1], b = idx[q];
      const heading = bearing(pts[a], pts[b]);
      let up = 0, down = 0, ms = 0;
      for (let i = offset + a + 1; i <= offset + b; i++) {
        const dz = prof.elev_m[i] - prof.elev_m[i - 1];
        if (dz > 0) up += dz; else down -= dz;
        ms = Math.max(ms, prof.slope_deg[i]);
      }
      let turn = 'straight';
      if (prevHeading != null) {
        const dh = ((heading - prevHeading + 540) % 360) - 180;
        const ad = Math.abs(dh);
        turn = ad < 20 ? 'straight' : ad < 50 ? (dh > 0 ? 'slight-right' : 'slight-left') : ad < 150 ? (dh > 0 ? 'right' : 'left') : 'uturn';
      }
      steps.push({
        kind: q === 1 ? 'depart' : 'turn', turn, heading: Math.round(heading),
        distM: dAt(b) - dAt(a), climbM: up, descentM: down, maxSlopeDeg: ms,
        walkMin: prof.walk_min[offset + b] - prof.walk_min[offset + a],
        fromIndex: offset + a, toIndex: offset + b,
      });
      prevHeading = heading;
    }
    steps.push({ kind: 'arrive', to: leg.to, toIndex: offset + pts.length - 1 });
    legs.push({ from: leg.from, to: leg.to, steps,
      distM: dAt(pts.length - 1) - dAt(0),
      walkMin: prof.walk_min[offset + pts.length - 1] - prof.walk_min[offset] });
    offset += pts.length - 1;
  }
  return legs;
}

// ---------------------------------------------------------------------------
// One call: all three alternatives
// ---------------------------------------------------------------------------

/**
 * Plan one mode and analyse it with the real model.
 * Returns { mode, plan, analysis, steps, note } or { mode, error }.
 */
export function planMode(mode, terrain, targetsFile, options, R) {
  const resolved = resolveTargets(terrain, targetsFile);
  const nodes = Object.fromEntries(resolved.targets.map((t) => [t.id, t]));
  const hCell = resolved.habitat.y * terrain.width + resolved.habitat.x;
  const base = options.config ?? CONFIG;
  const caps = mode === 'safe' ? SAFE.slopeCaps : [null];
  let plan = null, cap = null, lastErr = null, wantCount = options.expectStops ?? null;
  for (const c of caps) {
    try {
      const p = planWalk(terrain, targetsFile, { ...options, config: modeConfig(mode, base, c) });
      plan = p; cap = c;
      if (wantCount == null || p.order.length >= wantCount) break;
    } catch (err) { lastErr = err; }
  }
  if (!plan) return { mode, error: String(lastErr?.message ?? lastErr) };
  const analysis = analyseRoute(R, plan, nodes, hCell);
  const steps = buildSteps(plan, analysis.profile);
  return { mode, plan, analysis, steps, slopeCapDeg: cap };
}
