#!/usr/bin/env node
// Fill the `photos` array of every stop in data/real/targets.json with 1-3 real Perseverance
// images taken from rover positions nearest that stop (CONTRACTS.md §2).
//
// How: rover positions come from the NASA/JPL MMGIS waypoint file (site/drive -> lat/lon).
// Every raw image carries the rover's site and drive when it was taken, so each image gets an
// exact rover position. For each stop we look at the sols when the rover was nearby, pull the
// Mastcam-Z left and Navcam left images for those sols, and keep the closest ones.
//
// Usage:  node scripts/fetch_photos.mjs [--radius 80] [--max 3] [--dry]
// Needs network access to mars.nasa.gov. Run once; the result is committed, so the app never
// depends on the live feed.

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TARGETS = path.join(ROOT, 'data/real/targets.json');
const CACHE = path.join(ROOT, 'raw/photo-cache');   // git-ignored; delete to refetch

const WAYPOINTS_URL = 'https://mars.nasa.gov/mmgis-maps/M20/Layers/json/M20_waypoints.json';
const RAW_API = 'https://mars.nasa.gov/rss/api/';
const CAMERAS = ['MCZ_LEFT', 'NAVCAM_LEFT'];
// The feed rejects requests without a browser-like User-Agent (HTTP 400).
const HEADERS = { 'User-Agent': 'Mozilla/5.0 (marswalk-budget photo fetcher)', Accept: 'application/json' };
const MARS_RADIUS_M = 3389500;

const args = process.argv.slice(2);
const opt = (name, dflt) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? Number(args[i + 1]) : dflt;
};
const RADIUS_M = opt('radius', 80);   // rover positions this close to a stop count as "nearby"
const MAX_PHOTOS = opt('max', 3);
const MAX_SOLS = 8;                   // sols queried per stop
const DRY = args.includes('--dry');

// The feed starts answering 403 after a few hundred quick requests, so every response is cached
// on disk and requests are spaced out.
async function getJson(url, cacheName) {
  const file = cacheName && path.join(CACHE, cacheName);
  if (file) {
    try { return JSON.parse(await readFile(file, 'utf8')); } catch { /* not cached yet */ }
  }
  for (let attempt = 1; ; attempt++) {
    const res = await fetch(url, { headers: HEADERS });
    if (res.ok) {
      const j = await res.json();
      if (file) {
        await mkdir(CACHE, { recursive: true });
        await writeFile(file, JSON.stringify(j));
      }
      await new Promise((r) => setTimeout(r, 300));
      return j;
    }
    if (attempt >= 3) throw new Error(`HTTP ${res.status} for ${url}${res.status === 403 ? ' (rate-limited: wait ~30 min and rerun; cached sols are kept)' : ''}`);
    await new Promise((r) => setTimeout(r, 3000 * attempt));
  }
}

function distanceM(a, b) {
  const rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad;
  const dLon = (b.lon - a.lon) * rad * Math.cos(((a.lat + b.lat) / 2) * rad);
  return Math.hypot(dLat, dLon) * MARS_RADIUS_M;
}

function rawUrl(sol, page) {
  const q = new URLSearchParams({
    feed: 'raw_images', category: 'mars2020', feedtype: 'json', ver: '1.2',
    num: '100', page: String(page), order: 'sol desc',
  });
  // Built by hand: the API wants literal ':' and '|' handling of its own.
  return `${RAW_API}?${q}&search=${encodeURIComponent('|' + CAMERAS.join('|'))}` +
    `&condition_2=${sol}:sol:gte&condition_3=${sol}:sol:lte`;
}

async function imagesForSol(sol) {
  const out = [];
  for (let page = 0; page < 5; page++) {
    const j = await getJson(rawUrl(sol, page), `sol${sol}_p${page}.json`);
    out.push(...(j.images || []));
    if (!j.images || j.images.length < 100) break;
  }
  return out;
}

/** Rover position for an image: the last waypoint at or before (site, drive). */
function positionOf(img, bySite) {
  const list = bySite.get(Number(img.site));
  if (!list) return null;
  const drive = Number(img.drive);
  let best = list[0];
  for (const w of list) if (w.drive <= drive) best = w;
  return best;
}

const sequenceOf = (img) => (img.imageid.match(/N\d{7}([A-Z]{4}\d{5})/) || [])[1] || img.imageid;

const dims = (img) => (String(img.extended?.dimension || '').match(/\d+/g) || []).map(Number);

/**
 * Keep pictures of the landscape: the mast must point near the horizon (drops sun/sky shots,
 * the calibration target and the rover deck, which are all far above or below it) and the
 * frame must be a full-size image, not a subframe or thumbnail.
 */
function isLandscape(img) {
  const el = Number(img.extended?.mastEl);
  if (!Number.isFinite(el) || el < -16 || el > 6) return false;
  const [w, h] = dims(img);
  if (img.camera.instrument.startsWith('MCZ')) return w >= 1600 && h >= 1100 && /RGB/.test(img.camera.filter_name || '');
  return w >= 1280 && h >= 960;
}

function score(img, dist, stop) {
  const el = Number(img.extended.mastEl);
  // mastAz is relative to the rover body (0 = straight ahead). The robotic arm works in front of
  // the rover, so at sampling stops forward views are mostly arm and drill; prefer side/back views.
  const az = ((Number(img.extended.mastAz) % 360) + 540) % 360 - 180; // -180..180
  const forward = Math.abs(az) < 60 ? 40 : 0;
  // ECM products are the un-debayered/companion versions of EBY colour frames.
  const ecm = /_d{3}ECM_/.test(img.imageid) ? 10 : 0;
  // Distance first; then the stop's own sol and views a little below the horizon,
  // where the ground the astronaut will walk on fills the frame.
  return dist + forward + ecm + Math.abs(img.sol - stop.sol) * 0.5 + Math.abs(el + 7) * 0.3;
}

function toPhoto(img, dist) {
  const f = img.image_files;
  const cam = img.camera.instrument;
  const camName = cam.startsWith('MCZ') ? 'Left Mastcam-Z' : 'Left Navigation Camera (Navcam)';
  return {
    url: f.medium || f.large || f.full_res,   // 800 px: plenty for a side panel, loads fast
    large: f.large,
    thumb: f.small || f.medium,
    full: f.full_res,
    sol: img.sol,
    camera: cam,
    caption: `${camName}, sol ${img.sol} (${img.date_taken_utc.slice(0, 10)}), rover ${Math.round(dist)} m from this stop.`,
    credit: img.credit || 'NASA/JPL-Caltech/ASU',
    link: img.link,
    imageid: img.imageid,
    distanceM: Math.round(dist),
  };
}

async function main() {
  const targetsFile = JSON.parse(await readFile(TARGETS, 'utf8'));
  console.log(`waypoints: ${WAYPOINTS_URL}`);
  const wp = (await getJson(WAYPOINTS_URL, 'M20_waypoints.json')).features.map((f) => f.properties);
  const bySite = new Map();
  for (const w of wp) {
    if (!bySite.has(w.site)) bySite.set(w.site, []);
    bySite.get(w.site).push(w);
  }
  for (const list of bySite.values()) list.sort((a, b) => a.drive - b.drive);

  const solCache = new Map();
  for (const stop of targetsFile.targets) {
    const near = wp.filter((w) => distanceM(stop, w) <= RADIUS_M);
    const sols = [...new Set([stop.sol, ...near.map((w) => w.sol)].filter(Number.isFinite))]
      .sort((a, b) => Math.abs(a - stop.sol) - Math.abs(b - stop.sol))
      .slice(0, MAX_SOLS);

    const candidates = [];
    for (const sol of sols) {
      if (!solCache.has(sol)) solCache.set(sol, await imagesForSol(sol));
      for (const img of solCache.get(sol)) {
        if (img.sample_type !== 'Full' || !CAMERAS.includes(img.camera.instrument)) continue;
        if (!isLandscape(img)) continue;
        const pos = positionOf(img, bySite);
        if (!pos) continue;
        const d = distanceM(stop, pos);
        if (d <= RADIUS_M) candidates.push({ img, d, s: score(img, d, stop) });
      }
    }
    candidates.sort((a, b) => a.s - b.s);

    // Mastcam-Z colour first, then one Navcam for wide context, then another Mastcam-Z;
    // one image per camera sequence so the photos show different things.
    const seen = new Set();
    const take = (pred) => {
      const c = candidates.find((x) => pred(x) && !seen.has(`${x.img.sol}:${sequenceOf(x.img)}`));
      if (c) seen.add(`${c.img.sol}:${sequenceOf(c.img)}`);
      return c;
    };
    const isMcz = (c) => c.img.camera.instrument.startsWith('MCZ');
    const picked = [take(isMcz), take((c) => !isMcz(c)), take(isMcz)].filter(Boolean);
    while (picked.length < MAX_PHOTOS) {
      const c = take(() => true);
      if (!c) break;
      picked.push(c);
    }
    picked.length = Math.min(picked.length, MAX_PHOTOS);
    stop.photos = picked.map((c) => toPhoto(c.img, c.d));
    console.log(`${stop.id} ${stop.name}: sols [${sols.join(', ')}], ${candidates.length} candidates -> ` +
      (picked.map((c) => `${c.img.camera.instrument}@sol${c.img.sol} ${Math.round(c.d)}m`).join(', ') || 'none'));
  }

  targetsFile.photosFetched = {
    date: new Date().toISOString().slice(0, 10),
    method: `Mastcam-Z/Navcam left images taken within ${RADIUS_M} m of each stop (rover site/drive -> MMGIS waypoint)`,
    feed: `${RAW_API}?feed=raw_images&category=mars2020&feedtype=json&ver=1.2`,
  };
  if (DRY) console.log(JSON.stringify(targetsFile.targets.map((t) => t.photos), null, 2));
  else {
    await writeFile(TARGETS, JSON.stringify(targetsFile, null, 2) + '\n');
    console.log(`wrote ${path.relative(ROOT, TARGETS)}`);
  }
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
