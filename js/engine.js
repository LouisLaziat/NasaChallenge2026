// Marswalk Budget — route engine.
//
// Pure functions, no DOM, no network. Runs in the browser and in Node (tests).
// Owner: engine lane (Codex 2). See CONTRACTS.md for the data shapes.
//
// Model in one paragraph:
//   The walk area is a grid. Moving between neighbouring cells costs metabolic
//   energy (J) = metabolic power (W) x time (s). Speed comes from a Tobler hiking
//   function on the local grade, slowed by loose sand (low thermal inertia) and
//   rough ground. Power rises with grade, sand and load. Energy maps 1:1 onto
//   suit oxygen. The planner finds the least-energy path between every pair of
//   stops, picks the best visiting order, then totals time, oxygen and dose.

import { CONFIG } from './config.js';

const SQRT2 = Math.SQRT2;
const MARS_RADIUS_M = 3389500;
const DEG = 180 / Math.PI;

// 8-connected neighbourhood: [dx, dy, isDiagonal]
const NEIGHBOURS = [
  [1, 0, false], [-1, 0, false], [0, 1, false], [0, -1, false],
  [1, 1, true], [1, -1, true], [-1, 1, true], [-1, -1, true],
];

// ---------------------------------------------------------------------------
// Conditions and cost grid
// ---------------------------------------------------------------------------

/** Combine the base config with the toggled conditions into one parameter set. */
export function effectiveParams(config = CONFIG, conditions = {}) {
  let speedFactor = 1;
  let metabolicFactor = 1;
  let doseFactor = 1;
  let maxSlopeDeg = config.walk.maxSlopeDeg;
  for (const [name, on] of Object.entries(conditions)) {
    if (!on) continue;
    const c = config.conditions[name];
    if (!c) throw new Error(`Unknown condition: ${name}`);
    speedFactor *= c.speedFactor ?? 1;
    metabolicFactor *= c.metabolicFactor ?? 1;
    doseFactor *= c.doseFactor ?? 1;
    if (c.maxSlopeDeg != null) maxSlopeDeg = Math.min(maxSlopeDeg, c.maxSlopeDeg);
  }
  return { speedFactor, metabolicFactor, doseFactor, maxSlopeDeg };
}

export function validateTerrain(terrain) {
  const { width, height, cellSize, layers } = terrain ?? {};
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 2 || height < 2) {
    throw new Error('terrain.width and terrain.height must be integers >= 2');
  }
  if (!(cellSize > 0)) throw new Error('terrain.cellSize must be > 0 (metres)');
  if (!layers || !layers.elevation) throw new Error('terrain.layers.elevation is required');
  const n = width * height;
  for (const [name, arr] of Object.entries(layers)) {
    if (arr != null && arr.length !== n) {
      throw new Error(`terrain.layers.${name} has ${arr.length} values, expected ${n}`);
    }
  }
}

/**
 * Precompute per-cell multipliers and blocked flags for one set of conditions.
 * The returned grid is what the search functions consume.
 */
export function buildCostGrid(terrain, config = CONFIG, conditions = {}) {
  validateTerrain(terrain);
  const { width: W, height: H, cellSize } = terrain;
  const N = W * H;
  const p = effectiveParams(config, conditions);
  const t = config.terrain;
  const elev = terrain.layers.elevation;
  const ti = terrain.layers.thermalInertia;
  const rough = terrain.layers.roughness;

  const speedMul = new Float32Array(N);
  const metMul = new Float32Array(N);
  const slopeDeg = new Float32Array(N);
  const sandiness = new Float32Array(N);
  const blocked = new Uint8Array(N);

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = y * W + x;
      const xl = Math.max(0, x - 1), xr = Math.min(W - 1, x + 1);
      const yu = Math.max(0, y - 1), yd = Math.min(H - 1, y + 1);
      const dzdx = (elev[y * W + xr] - elev[y * W + xl]) / ((xr - xl) * cellSize);
      const dzdy = (elev[yd * W + x] - elev[yu * W + x]) / ((yd - yu) * cellSize);
      const s = Math.atan(Math.hypot(dzdx, dzdy)) * DEG;
      slopeDeg[i] = s;

      const tiv = ti ? ti[i] : t.bedrockTI;
      const f = tiv <= t.looseSandTI ? 1 : tiv >= t.bedrockTI ? 0
        : (t.bedrockTI - tiv) / (t.bedrockTI - t.looseSandTI);
      sandiness[i] = f;
      const r = rough ? rough[i] : 0;

      speedMul[i] = p.speedFactor
        * (1 - f * (1 - t.sandSpeedFactor))
        * (1 - t.roughnessSpeedPenalty * r);
      metMul[i] = p.metabolicFactor * (1 + f * (t.sandMetabolicFactor - 1));
      blocked[i] = (!Number.isFinite(elev[i]) || s > p.maxSlopeDeg || r > t.roughnessBlock) ? 1 : 0;
    }
  }

  const w = config.walk;
  const m = config.metabolic;
  const toblerNorm = Math.exp(w.toblerK * w.toblerG0); // so that tobler(0) === 1
  return {
    width: W, height: H, cellSize, elev,
    speedMul, metMul, slopeDeg, sandiness, blocked,
    params: p,
    vFlat: w.vFlatMps, k: w.toblerK, g0: w.toblerG0, toblerNorm,
    maxGrade: Math.tan(p.maxSlopeDeg / DEG),
    baseW: m.baseW, up: m.uphillPerGrade, down: m.downhillPerGrade,
    // Admissible A* bound: the cheapest any metre can possibly be.
    // Max speed: tobler peak (toblerNorm) x speedFactor; min power: baseW x metabolicFactor.
    minEnergyPerM: (m.baseW * p.metabolicFactor) / (w.vFlatMps * toblerNorm * p.speedFactor),
  };
}

// Scratch value written by edgeEnergy so callers can read the time without a second pass.
let lastEdgeTimeS = 0;
let lastEdgeDistM = 0;

/** Energy (J) to move from cell a to neighbouring cell b, or Infinity if not allowed. */
function edgeEnergy(g, a, b, diag) {
  const dist = diag ? g.cellSize * SQRT2 : g.cellSize;
  const grade = (g.elev[b] - g.elev[a]) / dist;
  if (Math.abs(grade) > g.maxGrade) return Infinity;
  const tob = Math.exp(-g.k * Math.abs(grade + g.g0)) * g.toblerNorm;
  const speed = g.vFlat * tob * 0.5 * (g.speedMul[a] + g.speedMul[b]);
  const time = dist / speed;
  const gradeFactor = 1 + (grade > 0 ? g.up * grade : -g.down * grade);
  const power = g.baseW * 0.5 * (g.metMul[a] + g.metMul[b]) * gradeFactor;
  lastEdgeTimeS = time;
  lastEdgeDistM = dist;
  return power * time;
}

/** Can we step from (x,y) by (dx,dy)? Blocks diagonal corner-cutting past blocked cells. */
function stepAllowed(g, x, y, dx, dy, diag) {
  const nx = x + dx, ny = y + dy;
  if (nx < 0 || ny < 0 || nx >= g.width || ny >= g.height) return false;
  if (g.blocked[ny * g.width + nx]) return false;
  if (diag && (g.blocked[y * g.width + nx] || g.blocked[ny * g.width + x])) return false;
  return true;
}

// ---------------------------------------------------------------------------
// Search
// ---------------------------------------------------------------------------

class MinHeap {
  constructor() { this.keys = []; this.vals = []; }
  get size() { return this.keys.length; }
  push(key, val) {
    const k = this.keys, v = this.vals;
    let i = k.length;
    k.push(key); v.push(val);
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (k[parent] <= key) break;
      k[i] = k[parent]; v[i] = v[parent];
      i = parent;
    }
    k[i] = key; v[i] = val;
  }
  pop() {
    const k = this.keys, v = this.vals;
    const topVal = v[0];
    const lastKey = k.pop(), lastVal = v.pop();
    const n = k.length;
    if (n > 0) {
      let i = 0;
      for (;;) {
        let c = 2 * i + 1;
        if (c >= n) break;
        if (c + 1 < n && k[c + 1] < k[c]) c++;
        if (k[c] >= lastKey) break;
        k[i] = k[c]; v[i] = v[c];
        i = c;
      }
      k[i] = lastKey; v[i] = lastVal;
    }
    return topVal;
  }
}

/**
 * Least-energy search over the grid.
 *   opts.goal     — stop as soon as this cell index is settled (enables A* heuristic)
 *   opts.targets  — stop once all these cell indices are settled
 *   opts.reverse  — compute cost FROM every cell TO source (for "cost to get home")
 * Returns { dist: Float64Array (J), prev: Int32Array }.
 */
export function search(g, source, opts = {}) {
  const { goal = -1, targets = null, reverse = false } = opts;
  const W = g.width, N = W * g.height;
  const dist = new Float64Array(N).fill(Infinity);
  const prev = new Int32Array(N).fill(-1);
  const done = new Uint8Array(N);
  const heap = new MinHeap();
  const useH = goal >= 0;
  const gx = goal % W, gy = Math.floor(goal / W);
  const h = (i) => {
    if (!useH) return 0;
    const dx = Math.abs((i % W) - gx), dy = Math.abs(Math.floor(i / W) - gy);
    // Octile distance in metres x cheapest energy per metre: admissible.
    return (Math.max(dx, dy) + (SQRT2 - 1) * Math.min(dx, dy)) * g.cellSize * g.minEnergyPerM;
  };
  let remaining = targets ? new Set(targets) : null;

  dist[source] = 0;
  heap.push(h(source), source);
  while (heap.size) {
    const u = heap.pop();
    if (done[u]) continue;
    done[u] = 1;
    if (u === goal) break;
    if (remaining) {
      remaining.delete(u);
      if (remaining.size === 0) break;
    }
    const ux = u % W, uy = (u - ux) / W;
    for (const [dx, dy, diag] of NEIGHBOURS) {
      if (!stepAllowed(g, ux, uy, dx, dy, diag)) continue;
      const v = u + dy * W + dx;
      if (done[v]) continue;
      // Forward: cost of u -> v. Reverse: cost of v -> u (we are growing paths into source).
      const e = reverse ? edgeEnergy(g, v, u, diag) : edgeEnergy(g, u, v, diag);
      if (e === Infinity) continue;
      const nd = dist[u] + e;
      if (nd < dist[v]) {
        dist[v] = nd;
        prev[v] = u;
        heap.push(nd + h(v), v);
      }
    }
  }
  return { dist, prev };
}

function rebuildPath(prev, source, target) {
  const out = [];
  for (let c = target; c !== -1; c = prev[c]) {
    out.push(c);
    if (c === source) break;
  }
  if (out[out.length - 1] !== source) return null;
  return out.reverse();
}

/** Walk a cell-index path and total its distance, time and energy. */
function measurePath(g, cells) {
  let distanceM = 0, timeS = 0, energyJ = 0;
  const W = g.width;
  for (let i = 1; i < cells.length; i++) {
    const a = cells[i - 1], b = cells[i];
    const diag = (a % W) !== (b % W) && Math.floor(a / W) !== Math.floor(b / W);
    energyJ += edgeEnergy(g, a, b, diag);
    timeS += lastEdgeTimeS;
    distanceM += lastEdgeDistM;
  }
  return { distanceM, timeS, energyJ };
}

/**
 * Cheapest path between two cells {x, y}. Returns null if unreachable.
 * Result: { path: [[x, y], ...], distanceM, timeS, energyJ }
 */
export function findPath(g, from, to) {
  const W = g.width;
  const s = from.y * W + from.x, t = to.y * W + to.x;
  if (g.blocked[s] || g.blocked[t]) return null;
  const { dist, prev } = search(g, s, { goal: t });
  if (dist[t] === Infinity) return null;
  const cells = rebuildPath(prev, s, t);
  return { path: cells.map((c) => [c % W, Math.floor(c / W)]), ...measurePath(g, cells) };
}

// ---------------------------------------------------------------------------
// Visiting order
// ---------------------------------------------------------------------------

/**
 * Best order to visit stops 1..n starting and ending at node 0, minimising cost[i][j].
 * Exact (permutations with pruning) up to maxExact stops, otherwise nearest-neighbour + 2-opt.
 * Returns stop node indices in visiting order (not including 0).
 */
export function bestOrder(cost, stops, maxExact = CONFIG.planner.bruteForceMaxStops) {
  if (stops.length <= 1) return stops.slice();
  const tourCost = (order) => {
    let c = cost[0][order[0]];
    for (let i = 1; i < order.length; i++) c += cost[order[i - 1]][order[i]];
    return c + cost[order[order.length - 1]][0];
  };

  if (stops.length <= maxExact) {
    let best = null, bestCost = Infinity;
    const used = new Array(stops.length).fill(false);
    const cur = [];
    const rec = (last, acc) => {
      if (acc >= bestCost) return;
      if (cur.length === stops.length) {
        const total = acc + cost[last][0];
        if (total < bestCost) { bestCost = total; best = cur.slice(); }
        return;
      }
      for (let i = 0; i < stops.length; i++) {
        if (used[i]) continue;
        used[i] = true; cur.push(stops[i]);
        rec(stops[i], acc + cost[last][stops[i]]);
        cur.pop(); used[i] = false;
      }
    };
    rec(0, 0);
    return best;
  }

  // Nearest neighbour
  const left = new Set(stops);
  const order = [];
  let last = 0;
  while (left.size) {
    let pick = null, pc = Infinity;
    for (const s of left) if (cost[last][s] < pc) { pc = cost[last][s]; pick = s; }
    order.push(pick); left.delete(pick); last = pick;
  }
  // 2-opt (full recompute: costs may be asymmetric)
  let improved = true, cur = tourCost(order);
  while (improved) {
    improved = false;
    for (let i = 0; i < order.length - 1; i++) {
      for (let j = i + 1; j < order.length; j++) {
        const cand = order.slice(0, i).concat(order.slice(i, j + 1).reverse(), order.slice(j + 1));
        const c = tourCost(cand);
        if (c < cur - 1e-9) { order.splice(0, order.length, ...cand); cur = c; improved = true; }
      }
    }
  }
  return order;
}

// ---------------------------------------------------------------------------
// Units
// ---------------------------------------------------------------------------

export function energyToO2Kg(energyJ, config = CONFIG) {
  return (energyJ / config.suit.o2JoulesPerLitre) * config.suit.o2KgPerLitre;
}

export function doseMSv(timeS, config = CONFIG, doseFactor = 1) {
  return (config.radiation.surfaceMSvPerDay / 86400) * timeS * doseFactor;
}

/** Centre of cell (x, y) in planetocentric degrees, east-positive longitude. */
export function cellToLatLon(terrain, x, y) {
  const { lat, lon } = terrain.origin;
  const dLat = ((y + 0.5) * terrain.cellSize / MARS_RADIUS_M) * DEG;
  const dLon = ((x + 0.5) * terrain.cellSize / (MARS_RADIUS_M * Math.cos(lat / DEG))) * DEG;
  return { lat: lat - dLat, lon: lon + dLon };
}

/** Inverse of cellToLatLon (floored to the containing cell). */
export function latLonToCell(terrain, lat, lon) {
  const o = terrain.origin;
  const y = Math.floor(((o.lat - lat) / DEG) * MARS_RADIUS_M / terrain.cellSize);
  const x = Math.floor(((lon - o.lon) / DEG) * MARS_RADIUS_M * Math.cos(o.lat / DEG) / terrain.cellSize);
  return { x, y };
}

/**
 * Return a copy of a targets file where every point has cell x/y.
 * Points may give { lat, lon } instead of { x, y }; x/y wins if both are present.
 */
export function resolveTargets(terrain, targetsFile) {
  const fix = (p) => {
    if (Number.isInteger(p.x) && Number.isInteger(p.y)) return { ...p };
    if (p.lat == null || p.lon == null) throw new Error(`target ${p.id ?? p.name} needs x/y or lat/lon`);
    return { ...p, ...latLonToCell(terrain, p.lat, p.lon) };
  };
  return { ...targetsFile, habitat: fix(targetsFile.habitat), targets: targetsFile.targets.map(fix) };
}

// ---------------------------------------------------------------------------
// The planner
// ---------------------------------------------------------------------------

/**
 * Plan a walk from the habitat through the chosen stops and back.
 *
 * @param terrain      Terrain file (CONTRACTS.md)
 * @param targetsFile  Targets file (CONTRACTS.md)
 * @param options      { stopIds?: string[], conditions?: {dustStorm, solarEvent, heavyKit}, config? }
 *
 * Returns a Plan result (also documented in CONTRACTS.md):
 * {
 *   ok,                 // true if a route was produced (possibly over budget)
 *   conditions,         // the conditions used
 *   order,              // stop ids in visiting order
 *   stops: [{ id, name, x, y, value, dwellMin, pathIndex, arriveS, arriveO2Kg }],
 *   unreachable,        // stop ids that cannot be reached and returned from
 *   legs: [{ from, to, path: [[x, y], ...], distanceM, timeS, energyJ, o2Kg }],
 *   path,               // full route [[x, y], ...], habitat -> stops -> habitat
 *   totals: { distanceM, walkTimeS, dwellTimeS, totalTimeS, energyJ, o2UsedKg,
 *             o2UsableKg, o2CapacityKg, doseMSv, doseLimitMSv, scienceValue },
 *   withinBudget,       // o2UsedKg <= o2UsableKg && doseMSv <= doseLimitMSv
 *   violations,         // subset of ['oxygen', 'radiation']
 *   turnBack,           // null if O2 is fine, else { pathIndex, x, y, elapsedS, o2UsedKg }:
 *                       //   the last point on the route from which you can still get home
 *   dropSuggestion,     // null if within budget, else { id, name, value, o2SavedKg, doseSavedMSv, makesFeasible }
 * }
 */
export function planWalk(terrain, targetsFile, options = {}) {
  const config = options.config ?? CONFIG;
  const conditions = options.conditions ?? {};
  const g = buildCostGrid(terrain, config, conditions);
  const p = g.params;
  const W = g.width;
  const resolved = resolveTargets(terrain, targetsFile);
  const habitat = resolved.habitat;
  const wanted = options.stopIds
    ? resolved.targets.filter((t) => options.stopIds.includes(t.id))
    : resolved.targets;

  const inGrid = (n) => n.x >= 0 && n.y >= 0 && n.x < W && n.y < g.height;
  if (!inGrid(habitat)) throw new Error('habitat is outside the terrain');
  const hCell = habitat.y * W + habitat.x;
  if (g.blocked[hCell]) throw new Error('habitat sits on impassable ground');

  const nodes = [habitat, ...wanted];
  const cells = nodes.map((n) => (inGrid(n) ? n.y * W + n.x : -1));

  // One forward search per node gives the full cost matrix.
  const n = nodes.length;
  const E = Array.from({ length: n }, () => new Array(n).fill(Infinity));
  const prevs = new Array(n);
  for (let i = 0; i < n; i++) {
    if (cells[i] < 0 || g.blocked[cells[i]]) continue;
    const targets = cells.filter((c, j) => j !== i && c >= 0 && !g.blocked[c]);
    const { dist, prev } = search(g, cells[i], { targets });
    prevs[i] = prev;
    for (let j = 0; j < n; j++) E[i][j] = i === j ? 0 : cells[j] >= 0 ? dist[cells[j]] : Infinity;
  }

  const reachable = [], unreachable = [];
  for (let j = 1; j < n; j++) {
    if (Number.isFinite(E[0][j]) && Number.isFinite(E[j][0])) reachable.push(j);
    else unreachable.push(nodes[j].id);
  }

  // Leg details (time, distance) along each least-energy path, computed lazily.
  const legCache = new Map();
  const leg = (i, j) => {
    const key = i * n + j;
    if (!legCache.has(key)) {
      const pathCells = rebuildPath(prevs[i], cells[i], cells[j]);
      legCache.set(key, { pathCells, ...measurePath(g, pathCells) });
    }
    return legCache.get(key);
  };

  const dwellPowerW = config.metabolic.dwellW * p.metabolicFactor;
  const usable = config.suit.o2CapacityKg * (1 - config.suit.reserveFraction);
  const doseLimit = config.radiation.walkLimitMSv;

  const evaluate = (order) => {
    let energyJ = 0, walkTimeS = 0, distanceM = 0, dwellTimeS = 0, scienceValue = 0;
    let last = 0;
    for (const j of [...order, 0]) {
      const l = leg(last, j);
      energyJ += l.energyJ; walkTimeS += l.timeS; distanceM += l.distanceM;
      if (j !== 0) {
        dwellTimeS += nodes[j].dwellMin * 60;
        scienceValue += nodes[j].value;
      }
      last = j;
    }
    energyJ += dwellTimeS * dwellPowerW;
    const totalTimeS = walkTimeS + dwellTimeS;
    const o2UsedKg = energyToO2Kg(energyJ, config);
    const dose = doseMSv(totalTimeS, config, p.doseFactor);
    return { distanceM, walkTimeS, dwellTimeS, totalTimeS, energyJ, o2UsedKg, doseMSv: dose, scienceValue };
  };

  const order = bestOrder(E, reachable, config.planner.bruteForceMaxStops);
  const sums = evaluate(order);
  const totals = {
    ...sums,
    o2UsableKg: usable,
    o2CapacityKg: config.suit.o2CapacityKg,
    doseLimitMSv: doseLimit,
  };
  const violations = [];
  if (totals.o2UsedKg > usable) violations.push('oxygen');
  if (totals.doseMSv > doseLimit) violations.push('radiation');
  const withinBudget = violations.length === 0;

  // Assemble legs and the full path.
  const legs = [];
  const path = [];
  const stops = [];
  let last = 0;
  for (const j of [...order, 0]) {
    const l = leg(last, j);
    legs.push({
      from: last === 0 ? 'habitat' : nodes[last].id,
      to: j === 0 ? 'habitat' : nodes[j].id,
      path: l.pathCells.map((c) => [c % W, Math.floor(c / W)]),
      distanceM: l.distanceM, timeS: l.timeS, energyJ: l.energyJ,
      o2Kg: energyToO2Kg(l.energyJ, config),
    });
    const start = path.length === 0 ? 0 : 1; // drop the shared joint point
    for (let k = start; k < l.pathCells.length; k++) path.push(l.pathCells[k]);
    if (j !== 0) {
      const s = nodes[j];
      stops.push({ id: s.id, name: s.name, x: s.x, y: s.y, value: s.value, dwellMin: s.dwellMin, pathIndex: path.length - 1 });
    }
    last = j;
  }

  // Timeline along the path, and the point of no return.
  const toHome = search(g, hCell, { reverse: true }).dist;
  const stopAt = new Map(stops.map((s) => [s.pathIndex, s]));
  let elapsedS = 0, energyJ = 0, turnBack = null, firstBad = -1;
  for (let k = 0; k < path.length; k++) {
    if (k > 0) {
      const a = path[k - 1], b = path[k];
      const diag = (a % W) !== (b % W) && Math.floor(a / W) !== Math.floor(b / W);
      energyJ += edgeEnergy(g, a, b, diag);
      elapsedS += lastEdgeTimeS;
    }
    const s = stopAt.get(k);
    if (s) { s.arriveS = elapsedS; s.arriveO2Kg = energyToO2Kg(energyJ, config); }
    if (firstBad < 0 && energyToO2Kg(energyJ + toHome[path[k]], config) > usable) firstBad = k;
    if (s) { energyJ += s.dwellMin * 60 * dwellPowerW; elapsedS += s.dwellMin * 60; }
    // Also check after the dwell: you can run out of air while working at a stop.
    if (firstBad < 0 && s && energyToO2Kg(energyJ + toHome[path[k]], config) > usable) firstBad = k + 1;
  }
  if (firstBad >= 0) {
    const k = Math.max(0, firstBad - 1);
    // Recompute elapsed/O2 at k by replaying (cheap; path is short).
    let e = 0, t = 0;
    for (let q = 1; q <= k; q++) {
      const a = path[q - 1], b = path[q];
      const diag = (a % W) !== (b % W) && Math.floor(a / W) !== Math.floor(b / W);
      e += edgeEnergy(g, a, b, diag); t += lastEdgeTimeS;
      const s = stopAt.get(q);
      if (s && q < k) { e += s.dwellMin * 60 * dwellPowerW; t += s.dwellMin * 60; }
    }
    turnBack = { pathIndex: k, x: path[k] % W, y: Math.floor(path[k] / W), elapsedS: t, o2UsedKg: energyToO2Kg(e, config) };
  }

  // If over budget, which single stop is best to drop?
  let dropSuggestion = null;
  if (!withinBudget && order.length > 0) {
    let best = null;
    for (const j of order) {
      const rest = order.filter((q) => q !== j);
      const restOrder = bestOrder(E, rest, config.planner.bruteForceMaxStops);
      const r = restOrder.length ? evaluate(restOrder) : evaluate([]);
      const feasible = r.o2UsedKg <= usable && r.doseMSv <= doseLimit;
      const cand = {
        id: nodes[j].id, name: nodes[j].name, value: nodes[j].value,
        o2SavedKg: totals.o2UsedKg - r.o2UsedKg,
        doseSavedMSv: totals.doseMSv - r.doseMSv,
        makesFeasible: feasible,
        _keep: r.scienceValue,
      };
      if (!best
        || (cand.makesFeasible && !best.makesFeasible)
        || (cand.makesFeasible === best.makesFeasible && (cand.makesFeasible
          ? cand._keep > best._keep || (cand._keep === best._keep && cand.o2SavedKg > best.o2SavedKg)
          : cand.o2SavedKg > best.o2SavedKg))) {
        best = cand;
      }
    }
    delete best._keep;
    dropSuggestion = best;
  }

  return {
    ok: true,
    conditions: { ...conditions },
    order: order.map((j) => nodes[j].id),
    stops,
    unreachable,
    legs,
    path: path.map((c) => [c % W, Math.floor(c / W)]),
    totals,
    withinBudget,
    violations,
    turnBack,
    dropSuggestion,
  };
}
