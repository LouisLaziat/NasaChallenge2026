// Generated with AI assistance for NASA Space Apps 2026; reviewed by the team
//
// Gale stops + Curiosity photos -> data/gale/targets.json (CONTRACTS.md §2).
// Owner: gale lane (amarz-claude). No dependencies; needs the network.
//
//   node scripts/fetch_gale_photos.mjs [--out data/gale/targets.json]
//
// Every stop sits on a REAL Curiosity position (MMGIS waypoint at the end of that sol's drive).
// The science objective, value and dwell time are PLACEHOLDERS: the human team chooses them.
// Each stop is tagged `placeholder: true` and its note says so. Photos come from the Curiosity
// raw-image API for the same sol (Navcam = NASA/JPL-Caltech, Mastcam/MAHLI = NASA/JPL-Caltech/MSSS).

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';

const WAYPOINTS_URL = 'https://mars.nasa.gov/mmgis-maps/MSL/Layers/json/MSL_waypoints.json';
const RAW_API = 'https://mars.nasa.gov/api/v1/raw_image_items/';
const UA = { 'User-Agent': 'Mozilla/5.0 (Marswalk Budget data prep)' };

// Sols chosen along the boxwork campaign (sites 117-121). 4636 and 4722 are documented boxwork sols.
const HABITAT_SOL = 4548; // crater-floor approach, ~500 m north-east of the boxwork, before the climb
const STOP_SOLS = [
  { id: 'G1', sol: 4578, label: 'boxwork approach (site 117)' },
  { id: 'G2', sol: 4636, label: 'boxwork, documented boxwork sol (site 118)' },
  { id: 'G3', sol: 4722, label: 'boxwork, documented boxwork sol (site 120)' },
  { id: 'G4', sol: 4851, label: 'south exit of the boxwork (site 121)' },
];

const CAMERAS = {
  MAST_LEFT: { name: 'Mastcam left', credit: 'NASA/JPL-Caltech/MSSS', rank: 0 },
  MAST_RIGHT: { name: 'Mastcam right', credit: 'NASA/JPL-Caltech/MSSS', rank: 1 },
  NAV_LEFT_B: { name: 'Navcam left', credit: 'NASA/JPL-Caltech', rank: 2 },
  NAV_RIGHT_B: { name: 'Navcam right', credit: 'NASA/JPL-Caltech', rank: 3 },
  MAHLI: { name: 'MAHLI', credit: 'NASA/JPL-Caltech/MSSS', rank: 4 },
};

const out = (() => {
  const i = process.argv.indexOf('--out');
  return i > 0 ? process.argv[i + 1] : 'data/gale/targets.json';
})();

async function getJson(url) {
  for (let attempt = 1; ; attempt++) {
    try {
      const r = await fetch(url, { headers: UA });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return await r.json();
    } catch (e) {
      if (attempt >= 2) throw new Error(`${url}: ${e.message}`);
      console.warn(`retry ${url} (${e.message})`);
      await new Promise((res) => setTimeout(res, 2000));
    }
  }
}

/** Last waypoint at or before `sol` (the rover's parking spot that sol). */
function positionOnSol(features, sol) {
  let best = null;
  for (const f of features) {
    const p = f.properties;
    if (p.sol <= sol && (!best || p.sol > best.properties.sol || (p.sol === best.properties.sol && p.drive > best.properties.drive))) best = f;
  }
  if (!best) throw new Error(`no waypoint at or before sol ${sol}`);
  const p = best.properties;
  return { lat: +p.lat.toFixed(6), lon: +p.lon.toFixed(6), sol: p.sol, site: p.site, drive: p.drive, elevGeoidM: p.elev_geoid };
}

/** Sols during which the rover stayed parked at this waypoint: [sol, next waypoint sol - 1]. */
function parkedSols(features, pos) {
  let next = Infinity;
  for (const f of features) if (f.properties.sol > pos.sol) next = Math.min(next, f.properties.sol);
  return [pos.sol, Number.isFinite(next) ? Math.max(pos.sol, next - 1) : pos.sol];
}

/** Up to `max` real images taken while the rover was parked here: full frames first, then subframes. */
async function photosForSols([sol0, sol1], max = 3) {
  const found = [];
  for (const inst of ['MAST_LEFT', 'NAV_LEFT_B', 'NAV_RIGHT_B', 'MAHLI']) {
    const url = `${RAW_API}?order=sol%20asc&per_page=100&page=0&condition_1=msl:mission`
      + `&condition_2=${sol0}:sol:gte&condition_3=${sol1}:sol:lte&search=%7C${inst}`;
    const items = (await getJson(url)).items ?? [];
    const ok = items.filter((it) => !it.is_thumbnail && it.https_url && ['full', 'subframe'].includes(it.extended?.sample_type));
    ok.sort((a, b) => (a.extended.sample_type === 'full' ? 0 : 1) - (b.extended.sample_type === 'full' ? 0 : 1));
    found.push(...ok.slice(0, inst === 'MAST_LEFT' ? 2 : 1));
    await new Promise((res) => setTimeout(res, 400));
  }
  found.sort((a, b) => (a.extended.sample_type === 'full' ? 0 : 1) - (b.extended.sample_type === 'full' ? 0 : 1)
    || CAMERAS[a.instrument].rank - CAMERAS[b.instrument].rank);
  return found.slice(0, max).map((it) => ({
    url: it.https_url,
    sol: it.sol,
    camera: it.instrument,
    caption: `${it.title ?? `Sol ${it.sol}`}, ${it.date_taken?.slice(0, 10) ?? ''}${it.extended.sample_type === 'subframe' ? ' (subframe)' : ''}`,
    credit: it.image_credit || CAMERAS[it.instrument].credit,
    link: `https://mars.nasa.gov${it.link ?? ''}`,
    imageid: it.imageid,
  }));
}

async function main() {
  const wp = existsSync('raw/MSL_waypoints.json')
    ? JSON.parse(readFileSync('raw/MSL_waypoints.json', 'utf8'))
    : await getJson(WAYPOINTS_URL);
  const area = JSON.parse(readFileSync(join(dirname(out), 'area.json'), 'utf8'));
  const b = area.bounds;
  const inside = (p) => p.lat <= b.north && p.lat >= b.south && p.lon >= b.west && p.lon <= b.east;

  const hab = positionOnSol(wp.features, HABITAT_SOL);
  if (!inside(hab)) throw new Error('habitat outside the area');
  const targets = [];
  for (const s of STOP_SOLS) {
    const pos = positionOnSol(wp.features, s.sol);
    if (!inside(pos)) throw new Error(`${s.id} outside the area`);
    let photos = [];
    try { photos = await photosForSols(parkedSols(wp.features, pos)); } catch (e) { console.warn(`photos for sol ${s.sol} failed: ${e.message}`); }
    console.log(`${s.id} sols ${parkedSols(wp.features, pos).join('-')} site ${pos.site} drive ${pos.drive} -> ${pos.lat}, ${pos.lon}; ${photos.length} photos`);
    targets.push({
      id: s.id,
      name: `Curiosity sol ${s.sol} — ${s.label}`,
      lat: pos.lat,
      lon: pos.lon,
      sol: s.sol,
      value: 5,
      dwellMin: 30,
      placeholder: true,
      objective: 'TEAM TO DEFINE',
      note: `Curiosity's parking spot at the end of sol ${pos.sol} (site ${pos.site}, drive ${pos.drive}), Mount Sharp boxwork campaign. Science objective, value (5) and dwell (30 min) are placeholders for the team to set.`,
      source: WAYPOINTS_URL,
      photos,
    });
    await new Promise((res) => setTimeout(res, 800));
  }

  const file = {
    habitat: {
      name: `Habitat (Curiosity's path, sol ${hab.sol})`,
      lat: hab.lat,
      lon: hab.lon,
      note: `Crater-floor spot on Curiosity's path at the end of sol ${hab.sol} (site ${hab.site}, drive ${hab.drive}), about 500 m north-east of and 40 m below the boxwork.`,
    },
    targets,
    sources: [
      { name: 'NASA/JPL MMGIS MSL waypoints', url: WAYPOINTS_URL, retrieved: new Date().toISOString() },
      { name: 'Curiosity raw images (mars.nasa.gov)', url: RAW_API, retrieved: new Date().toISOString(),
        credit: 'Navcam NASA/JPL-Caltech; Mastcam and MAHLI NASA/JPL-Caltech/MSSS' },
    ],
  };
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, JSON.stringify(file, null, 2) + '\n');
  console.log(`wrote ${out}`);
}

main().catch((e) => { console.error(e.message || e); process.exit(1); });
