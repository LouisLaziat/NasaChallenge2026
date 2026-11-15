// Generated with AI assistance for NASA Space Apps 2026; reviewed by the team
//
// Gale Crater (Mount Sharp boxwork) terrain for Marswalk Budget -> data/gale/ (CONTRACTS.md §1).
// Owner: gale lane (amarz-claude). Same maths as the Jezero prep (scripts/lib/prep.mjs, read only).
//
//   npm install            # geotiff is a devDependency; npm test does not need it
//   node scripts/prep_gale.mjs [--area data/gale/area.json] [--cell 5] [--skip-imagery]
//
// Writes
//   data/gale/terrain.json   elevation + roughness, 400 x 400 cells @ 5 m (no thermal inertia: see sources)
//   data/gale/imagery.png    HiRISE colour mosaic crop, north-up, exactly the area bounds, 2 m/px
//   data/gale/traverse.json  Curiosity's drive path clipped to the area (GeoJSON, [lon, lat])
//
// Inputs (HTTP range reads, nothing is downloaded whole; window caches go in raw/, git-ignored)
//   DEM   USGS Astrogeology MSL Gale DEM mosaic v3, 1 m/px, Eqc clon 0, Mars 2000 sphere, 3.9 GB
//   RGB   USGS MSL Gale HiRISE LRGB 78-quad colour mosaic, 25 cm/px, Cloud-Optimised GeoTIFF
//   Path  NASA/JPL MMGIS MSL traverse

import { readFileSync, writeFileSync, existsSync, mkdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { createHash } from 'node:crypto';
import { deflateSync, crc32 } from 'node:zlib';
import {
  gridFromArea, windowForGrid, aggregateDtm, summarize, latLonToPixel, MARS2000_RADIUS_M,
} from './lib/prep.mjs';

const DEM_URL = 'https://asc-pds-services.s3.us-west-2.amazonaws.com/mosaic/Mars/MSL/MSL_Gale_DEM_Mosaic_1m_v3.tif';
const RGB_URL = 'https://asc-pds-services.s3.us-west-2.amazonaws.com/mosaic/Mars/MSL/MSL_Gale_HiRISE-LRGB_78quads_sharp_cog.tif';
const TRAVERSE_URL = 'https://mars.nasa.gov/mmgis-maps/MSL/Layers/json/MSL_traverse.json';
const UA = { 'User-Agent': 'Mozilla/5.0 (Marswalk Budget data prep)' };

function args() {
  const a = { area: 'data/gale/area.json', cell: null, out: 'data/gale', 'skip-imagery': false };
  const v = process.argv.slice(2);
  for (let i = 0; i < v.length; i++) {
    const k = v[i].replace(/^--/, '');
    if (!(k in a)) throw new Error(`unknown option ${v[i]}`);
    if (k === 'skip-imagery') { a[k] = true; continue; }
    a[k] = k === 'cell' ? Number(v[++i]) : v[++i];
  }
  return a;
}

function geoOf(img) {
  const [originX, originY] = img.getOrigin();
  const [resX, resY] = img.getResolution();
  const k = img.getGeoKeys();
  if (k.ProjCoordTransGeoKey !== 17 || (k.ProjCenterLongGeoKey ?? 0) !== 0 || (k.ProjStdParallel1GeoKey ?? 0) !== 0) {
    throw new Error(`expected Equirectangular lat_ts=0 lon_0=0, got ${JSON.stringify(k)}`);
  }
  return { originX, originY, resX, resY, width: img.getWidth(), height: img.getHeight(), radius: k.GeogSemiMajorAxisGeoKey ?? MARS2000_RADIUS_M };
}

async function withRetry(label, fn) {
  try { return await fn(); } catch (e) {
    console.warn(`${label} failed (${e.message}); retrying once`);
    return fn();
  }
}

async function readDem(GeoTIFF, grid) {
  const tiff = await GeoTIFF.fromUrl(DEM_URL, { headers: UA });
  const img = await tiff.getImage();
  const geo = geoOf(img);
  const nodata = img.getGDALNoData();
  const w = windowForGrid(grid, geo);
  const cols = w.col1 - w.col0, rows = w.row1 - w.row0;
  console.log(`DEM ${geo.width}x${geo.height} px @ ${geo.resX} m, nodata ${nodata}; window ${cols}x${rows} at col ${w.col0}, row ${w.row0}`);
  const key = createHash('sha1').update(`${DEM_URL}|${w.col0},${w.row0},${cols},${rows}`).digest('hex').slice(0, 12);
  const cache = join('raw', `gale_dem_${key}.f32`);
  let data;
  if (existsSync(cache) && statSync(cache).size === cols * rows * 4) {
    const b = readFileSync(cache);
    data = new Float32Array(b.buffer, b.byteOffset, cols * rows);
    console.log(`DEM window from cache ${cache}`);
  } else {
    // LZW, one row per strip: geotiff fetches only the strips of our rows.
    const t0 = Date.now();
    const [band] = await withRetry('DEM read', () => img.readRasters({ window: [w.col0, w.row0, w.col1, w.row1] }));
    data = Float32Array.from(band);
    console.log(`DEM window read in ${((Date.now() - t0) / 1000).toFixed(0)} s`);
    mkdirSync('raw', { recursive: true });
    writeFileSync(cache, Buffer.from(data.buffer));
  }
  return { geo, nodata, win: { data, col0: w.col0, row0: w.row0, cols, rows } };
}

/** Minimal RGB PNG encoder (filter 0 per row). */
function encodePng(width, height, rgb) {
  const raw = Buffer.alloc((width * 3 + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (width * 3 + 1)] = 0;
    for (let i = 0; i < width * 3; i++) raw[y * (width * 3 + 1) + 1 + i] = rgb[y * width * 3 + i];
  }
  const chunk = (type, data) => {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
    const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
    const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td) >>> 0);
    return Buffer.concat([len, td, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0); ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0)),
  ]);
}

/** HiRISE colour crop at ~2 m/px, resampled (nearest) onto exact lat/lon bounds. */
async function readImagery(GeoTIFF, bounds, outPx) {
  const tiff = await GeoTIFF.fromUrl(RGB_URL, { headers: UA });
  const full = await tiff.getImage(0);
  const geo = geoOf(full);
  const n = await tiff.getImageCount();
  // Pick the overview whose pixel is closest to (but not coarser than) the target.
  const spanM = (bounds.north - bounds.south) / 180 * Math.PI * geo.radius;
  const wantRes = spanM / outPx;
  let level = 0, img = full;
  for (let i = 1; i < n; i++) {
    const im = await tiff.getImage(i);
    if (im.getSamplesPerPixel() !== 3) continue; // COG mask IFDs sit between the overviews
    const res = geo.resX * (geo.width / im.getWidth());
    if (res <= wantRes * 1.01) { level = i; img = im; }
  }
  const scale = geo.width / img.getWidth();
  const g = { ...geo, resX: geo.resX * scale, resY: geo.resY * scale, width: img.getWidth(), height: img.getHeight() };
  const nw = latLonToPixel(g, bounds.north, bounds.west), se = latLonToPixel(g, bounds.south, bounds.east);
  const c0 = Math.floor(nw.col), r0 = Math.floor(nw.row), c1 = Math.ceil(se.col), r1 = Math.ceil(se.row);
  console.log(`RGB overview ${level}: ${g.resX.toFixed(2)} m/px, window ${c1 - c0}x${r1 - r0}`);
  const src = await withRetry('RGB read', () => img.readRGB({ window: [c0, r0, c1, r1], interleave: true }));
  const sw = c1 - c0;
  const W = outPx, H = Math.round(outPx * (se.row - nw.row) / (se.col - nw.col));
  const out = new Uint8Array(W * H * 3);
  for (let y = 0; y < H; y++) {
    const row = Math.min(r1 - r0 - 1, Math.floor(nw.row - r0 + (y + 0.5) * (se.row - nw.row) / H));
    for (let x = 0; x < W; x++) {
      const col = Math.min(sw - 1, Math.floor(nw.col - c0 + (x + 0.5) * (se.col - nw.col) / W));
      const s = (row * sw + col) * 3, d = (y * W + x) * 3;
      out[d] = src[s]; out[d + 1] = src[s + 1]; out[d + 2] = src[s + 2];
    }
  }
  return { png: encodePng(W, H, out), width: W, height: H, resM: g.resX };
}

async function clipTraverse(bounds) {
  const r = await withRetry('traverse', () => fetch(TRAVERSE_URL, { headers: UA }).then((x) => {
    if (!x.ok) throw new Error(`HTTP ${x.status}`);
    return x.json();
  }));
  const inside = ([lon, lat]) => lat <= bounds.north && lat >= bounds.south && lon >= bounds.west && lon <= bounds.east;
  const features = [];
  for (const f of r.features ?? []) {
    const g = f.geometry;
    const lines = g?.type === 'LineString' ? [g.coordinates] : g?.type === 'MultiLineString' ? g.coordinates : [];
    for (const line of lines) {
      let run = [];
      const flush = () => {
        if (run.length > 1) features.push({ type: 'Feature', properties: { sol: f.properties?.sol ?? null }, geometry: { type: 'LineString', coordinates: run } });
        run = [];
      };
      for (const p of line) {
        if (inside(p)) run.push([+p[0].toFixed(6), +p[1].toFixed(6)]);
        else flush();
      }
      flush();
    }
  }
  return {
    type: 'FeatureCollection',
    name: 'Curiosity traverse inside the Gale area',
    source: { name: 'NASA/JPL MMGIS MSL traverse', url: TRAVERSE_URL, retrieved: new Date().toISOString() },
    features,
  };
}

async function main() {
  const opt = args();
  let GeoTIFF;
  try { GeoTIFF = await import('geotiff'); } catch {
    throw new Error('geotiff is not installed: run `npm install` first (it is a devDependency).');
  }
  const area = JSON.parse(readFileSync(opt.area, 'utf8'));
  const grid = gridFromArea(area, opt.cell ?? undefined);
  console.log(`grid ${grid.width}x${grid.height} @ ${grid.cellSize} m, NW corner ${grid.origin.lat}, ${grid.origin.lon}`);
  mkdirSync(opt.out, { recursive: true });

  const dem = await readDem(GeoTIFF, grid);
  const agg = aggregateDtm(grid, dem.geo, dem.win, dem.nodata);
  const terrain = {
    name: 'Gale Crater, Mount Sharp boxwork (Curiosity traverse), USGS 1 m DEM crop',
    synthetic: false,
    width: grid.width,
    height: grid.height,
    cellSize: grid.cellSize,
    origin: grid.origin,
    layers: { elevation: agg.elevation, roughness: agg.roughness },
    sources: [
      {
        layer: 'elevation',
        name: 'USGS Astrogeology, MSL Gale DEM mosaic v3 (1 m/px, from HiRISE stereo)',
        url: 'https://astrogeology.usgs.gov/search/map/mars_msl_gale_merged_dem_1m',
        file: DEM_URL,
        licence: 'Public domain (USGS / NASA)',
        notes: `Mean of the 1 m pixels in each ${grid.cellSize} m cell, metres relative to the MOLA areoid; IAU Mars 2000 sphere, Equirectangular clon 0. Cells more than half nodata are null (${agg.nodataCells} cells).`,
      },
      {
        layer: 'roughness',
        name: 'Derived from the same DEM',
        notes: 'Std-dev of 1 m elevations after removing a best-fit plane per cell; 0.3 m -> 0.5, >=0.8 m -> 1.0 (scripts/lib/prep.mjs).',
      },
      {
        layer: 'thermalInertia',
        name: 'Not included for Gale',
        notes: 'No thermal-inertia map of the boxwork area was prepared, so the engine treats every cell as firm ground (no sand penalty). Ripples and sand patches on Mount Sharp are therefore NOT priced in this dataset.',
      },
      { layer: 'imagery', name: 'USGS MSL Gale HiRISE LRGB colour mosaic (78 quads, 25 cm/px)', url: RGB_URL, credit: 'NASA/JPL-Caltech/UArizona, USGS' },
      { layer: 'traverse', name: 'NASA/JPL MMGIS MSL traverse and waypoints', url: TRAVERSE_URL },
    ],
  };
  const tPath = join(opt.out, 'terrain.json');
  const json = JSON.stringify(terrain);
  writeFileSync(tPath, json);
  // summarize() also reports sand from thermal inertia, which Gale lacks: give it firm ground.
  const s = summarize(grid, { ...terrain, layers: { ...terrain.layers, thermalInertia: new Array(grid.width * grid.height).fill(400) } });
  console.log(`\nwrote ${tPath} (${(json.length / 1e6).toFixed(2)} MB)`);
  console.log(`  elevation ${s.elevationRangeM[0].toFixed(1)} .. ${s.elevationRangeM[1].toFixed(1)} m, null ${s.nullElevationPct.toFixed(2)} %`);
  console.log(`  steeper than 20 deg: ${s.steeperThanPct.toFixed(1)} %`);
  console.log(`  roughness > 0.8 (blocked): ${s.roughBlockedPct.toFixed(1)} %`);
  if (json.length > 5e6) console.warn('  WARNING: over the 5 MB limit in AGENTS.md');

  const trav = await clipTraverse(area.bounds);
  writeFileSync(join(opt.out, 'traverse.json'), JSON.stringify(trav));
  console.log(`wrote traverse.json (${trav.features.length} segments)`);

  if (!opt['skip-imagery']) {
    const im = await readImagery(GeoTIFF, area.bounds, 1000);
    writeFileSync(join(opt.out, 'imagery.png'), im.png);
    console.log(`wrote imagery.png ${im.width}x${im.height} (${(im.png.length / 1e6).toFixed(2)} MB, source ${im.resM.toFixed(2)} m/px)`);
  }
}

main().catch((e) => { console.error(e.message || e); process.exit(1); });
