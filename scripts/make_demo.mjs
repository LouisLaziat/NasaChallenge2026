// Generates data/demo/terrain.json — SYNTHETIC terrain shaped loosely like a delta
// front, for building and testing the app before real data is ready. Not Mars data.
//
//   node scripts/make_demo.mjs
//
// Deterministic: the same seed always gives the same file.

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const W = 200, H = 200, CELL = 5; // 1 km x 1 km at 5 m per cell
const ORIGIN = { lat: 18.4520, lon: 77.4400 }; // NW corner, near Perseverance's landing site in Jezero

function mulberry32(seed) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function valueNoise(seed, gridStep) {
  const rnd = mulberry32(seed);
  const gw = Math.ceil(W / gridStep) + 2, gh = Math.ceil(H / gridStep) + 2;
  const lattice = Array.from({ length: gw * gh }, () => rnd());
  const smooth = (t) => t * t * (3 - 2 * t);
  return (x, y) => {
    const fx = x / gridStep, fy = y / gridStep;
    const x0 = Math.floor(fx), y0 = Math.floor(fy);
    const tx = smooth(fx - x0), ty = smooth(fy - y0);
    const v = (i, j) => lattice[j * gw + i];
    const a = v(x0, y0) * (1 - tx) + v(x0 + 1, y0) * tx;
    const b = v(x0, y0 + 1) * (1 - tx) + v(x0 + 1, y0 + 1) * tx;
    return a * (1 - ty) + b * ty; // 0..1
  };
}

const n1 = valueNoise(11, 40), n2 = valueNoise(12, 14), n3 = valueNoise(13, 5);
const sandNoise = valueNoise(21, 25), roughNoise = valueNoise(31, 8);

const elevation = new Array(W * H);
const thermalInertia = new Array(W * H);
const roughness = new Array(W * H);

const crater = { x: 60, y: 140, r: 16 };
const ramps = [{ y: 45, half: 10 }, { y: 150, half: 8 }]; // gentle passes up the scarp

for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    const i = y * W + x;
    // Crater floor dips gently east; delta top (west) is higher.
    let z = -2560 + (W - x) * 0.04;
    z += (n1(x, y) - 0.5) * 12 + (n2(x, y) - 0.5) * 4 + (n3(x, y) - 0.5) * 0.8;

    // Delta front scarp: a 35 m rise running north-south with a wobble.
    const scarpX = 105 + Math.sin(y / 23) * 8;
    let width = 5; // cells: steep (blocked)
    for (const r of ramps) {
      const d = Math.abs(y - r.y);
      if (d < r.half) width = Math.max(width, 5 + (1 - d / r.half) * 35);
    }
    const s = (scarpX - x) / width; // >0 west of scarp
    z += 35 * (1 / (1 + Math.exp(-6 * s)));

    // Small impact crater on the delta top.
    const dc = Math.hypot(x - crater.x, y - crater.y) / crater.r;
    if (dc < 1) z -= 14 * (1 - dc * dc);
    if (dc >= 0.85 && dc < 1.4) z += 4 * Math.exp(-((dc - 1) ** 2) / 0.02);

    elevation[i] = Math.round(z * 100) / 100;

    // Thermal inertia: firm bedrock on the scarp and delta, sand sheets on the floor.
    let ti = 330 + (n2(x, y) - 0.5) * 80;
    if (x > scarpX + 6 && sandNoise(x, y) > 0.6) ti = 140 + (n3(x, y)) * 60; // sand
    if (Math.abs(x - scarpX) < 8) ti = 480; // exposed layers
    thermalInertia[i] = Math.round(ti);

    // Roughness: boulders around the crater rim and a rocky band along the scarp foot.
    let r = roughNoise(x, y) * 0.35;
    if (dc >= 0.8 && dc < 1.5) r = Math.max(r, 0.9 - Math.abs(dc - 1.1) * 1.2);
    if (x > scarpX + 3 && x < scarpX + 9 && roughNoise(x, y) > 0.55) r = Math.max(r, 0.85);
    roughness[i] = Math.round(Math.min(1, Math.max(0, r)) * 100) / 100;
  }
}

const terrain = {
  name: 'Demo delta front (synthetic)',
  synthetic: true,
  width: W, height: H, cellSize: CELL,
  origin: ORIGIN,
  layers: { elevation, thermalInertia, roughness },
};

const here = dirname(fileURLToPath(import.meta.url));
const out = join(here, '..', 'data', 'demo', 'terrain.json');
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify(terrain));
console.log(`wrote ${out}`);
