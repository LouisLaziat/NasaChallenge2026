// Generated with AI assistance for NASA Space Apps 2026; reviewed by the team
// Real Jezero terrain for Marswalk Budget -> data/real/terrain.json (CONTRACTS.md §1).
// Owner: data lane (tonny-claude). Maths lives in scripts/lib/prep.mjs (see its header for the
// coordinate conventions and the roughness formula).
//
//   npm run prep-real
//   node scripts/prep_real_data.mjs [--dtm <url|path>] [--ti <path>] [--area data/real/area.json]
//                                   [--cell 5] [--out data/real/terrain.json]
//
// Inputs (defaults):
//   DTM  USGS Astrogeology, Mars 2020 TRN HiRISE DTM mosaic, 1 m/px, 1.8 GB, read with HTTP range
//        requests: only the rows/columns of our 2 km square (~16 MB) are fetched, then cached in
//        raw/ (git-ignored).
//   TI   THEMIS-derived thermal inertia of Jezero (Zenodo 4931348, CC BY 4.0), 100 m/px, 1.7 MB.
//        Downloaded into raw/ if missing.
//
// geotiff is a devDependency and is imported dynamically here only, so `npm test` needs no
// node_modules.

import { readFileSync, writeFileSync, existsSync, mkdirSync, openSync, readSync, closeSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { createHash } from 'node:crypto';
import {
  gridFromArea, windowForGrid, aggregateDtm, sampleToGrid, summarize, MARS2000_RADIUS_M,
} from './lib/prep.mjs';

const DTM_URL = 'https://asc-pds-services.s3.us-west-2.amazonaws.com/mosaic/mars2020_trn/HiRISE/JEZ_hirise_soc_006_DTM_MOLAtopography_DeltaGeoid_1m_Eqc_latTs0_lon0_blend40.tif';
const TI_URL = 'https://zenodo.org/api/records/4931348/files/Jezero_Thermal_Inertia_v1.tiff/content';

function args() {
  const a = { dtm: DTM_URL, ti: 'raw/jezero_ti.tiff', area: 'data/real/area.json', cell: null, out: 'data/real/terrain.json' };
  const v = process.argv.slice(2);
  for (let i = 0; i < v.length; i += 2) {
    const k = v[i].replace(/^--/, '');
    if (!(k in a)) throw new Error(`unknown option ${v[i]}`);
    a[k] = k === 'cell' ? Number(v[i + 1]) : v[i + 1];
  }
  return a;
}

const isUrl = (s) => /^https?:\/\//.test(s);

/** Byte-range reader for a URL (HTTP Range) or a local file. */
function rangeReader(src) {
  if (isUrl(src)) {
    return async (start, len) => {
      for (let attempt = 1; ; attempt++) {
        try {
          const r = await fetch(src, { headers: { Range: `bytes=${start}-${start + len - 1}` } });
          if (r.status !== 206) throw new Error(`HTTP ${r.status} (expected 206)`);
          return Buffer.from(await r.arrayBuffer());
        } catch (e) {
          if (attempt >= 4) throw e;
          await new Promise((res) => setTimeout(res, 500 * attempt));
        }
      }
    };
  }
  const fd = openSync(src, 'r');
  process.on('exit', () => closeSync(fd));
  return async (start, len) => {
    const b = Buffer.alloc(len);
    readSync(fd, b, 0, len, start);
    return b;
  };
}

function geoFromImage(img) {
  const [originX, originY] = img.getOrigin();
  const [resX, resY] = img.getResolution();
  const keys = img.getGeoKeys();
  const radius = keys.GeogSemiMajorAxisGeoKey ?? MARS2000_RADIUS_M;
  if (keys.ProjCoordTransGeoKey !== 17 || (keys.ProjCenterLongGeoKey ?? 0) !== 0 || (keys.ProjStdParallel1GeoKey ?? 0) !== 0) {
    throw new Error(`expected Equirectangular lat_ts=0 lon_0=0, got ${JSON.stringify(keys)}`);
  }
  if (keys.GeogSemiMajorAxisGeoKey !== keys.GeogSemiMinorAxisGeoKey) throw new Error('expected a spherical Mars');
  return { originX, originY, resX, resY, width: img.getWidth(), height: img.getHeight(), radius };
}

/** Read a pixel window of the DTM. Fast path: uncompressed float32 strips -> exact byte ranges. */
async function readDtmWindow(GeoTIFF, src, grid) {
  const tiff = isUrl(src) ? await GeoTIFF.fromUrl(src) : await GeoTIFF.fromFile(src);
  const img = await tiff.getImage();
  const geo = geoFromImage(img);
  const nodata = img.getGDALNoData();
  const w = windowForGrid(grid, geo);
  const cols = w.col1 - w.col0, rows = w.row1 - w.row0;
  console.log(`DTM ${geo.width}x${geo.height} px @ ${geo.resX} m; window cols ${w.col0}-${w.col1}, rows ${w.row0}-${w.row1} (${cols}x${rows})`);

  const key = createHash('sha1').update(`${src}|${w.col0},${w.row0},${cols},${rows}`).digest('hex').slice(0, 12);
  const cache = join('raw', `dtm_window_${key}.f32`);
  let data;
  if (existsSync(cache) && statSync(cache).size === cols * rows * 4) {
    const b = readFileSync(cache);
    data = new Float32Array(b.buffer, b.byteOffset, cols * rows);
    console.log(`DTM window from cache ${cache}`);
  } else {
    const fd = img.getFileDirectory();
    const simpleStrips = fd.Compression === 1 && !img.isTiled && img.getTileHeight() === 1
      && fd.BitsPerSample[0] === 32 && fd.SampleFormat?.[0] === 3 && img.getSamplesPerPixel() === 1;
    if (simpleStrips) {
      const read = rangeReader(src);
      const offsets = fd.StripOffsets;
      const little = tiff.littleEndian;
      data = new Float32Array(cols * rows);
      let next = 0, done = 0;
      const t0 = Date.now();
      const worker = async () => {
        while (next < rows) {
          const r = next++;
          const buf = await read(Number(offsets[w.row0 + r]) + w.col0 * 4, cols * 4);
          const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
          for (let c = 0; c < cols; c++) data[r * cols + c] = dv.getFloat32(c * 4, little);
          if (++done % 250 === 0) console.log(`  ${done}/${rows} rows (${((Date.now() - t0) / 1000).toFixed(0)} s)`);
        }
      };
      await Promise.all(Array.from({ length: 24 }, worker));
    } else {
      console.log('DTM is compressed or tiled: falling back to geotiff readRasters');
      const [band] = await img.readRasters({ window: [w.col0, w.row0, w.col1, w.row1] });
      data = Float32Array.from(band);
    }
    mkdirSync('raw', { recursive: true });
    writeFileSync(cache, Buffer.from(data.buffer));
  }
  return { geo, nodata, win: { data, col0: w.col0, row0: w.row0, cols, rows } };
}

async function readTi(GeoTIFF, path) {
  if (!existsSync(path)) {
    console.log(`downloading thermal inertia -> ${path}`);
    const r = await fetch(TI_URL);
    if (!r.ok) throw new Error(`TI download HTTP ${r.status}`);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, Buffer.from(await r.arrayBuffer()));
  }
  const tiff = await GeoTIFF.fromFile(path);
  const img = await tiff.getImage();
  const geo = geoFromImage(img);
  const [band] = await img.readRasters();
  return { geo, raster: band, nodata: img.getGDALNoData() };
}

async function main() {
  const opt = args();
  let GeoTIFF;
  try {
    GeoTIFF = await import('geotiff');
  } catch {
    throw new Error('geotiff is not installed: run `npm install` first (it is a devDependency).');
  }
  const area = JSON.parse(readFileSync(opt.area, 'utf8'));
  const grid = gridFromArea(area, opt.cell ?? undefined);
  console.log(`grid ${grid.width}x${grid.height} @ ${grid.cellSize} m, NW corner ${grid.origin.lat}, ${grid.origin.lon}`);

  const dtm = await readDtmWindow(GeoTIFF, opt.dtm, grid);
  const agg = aggregateDtm(grid, dtm.geo, dtm.win, dtm.nodata);
  const ti = await readTi(GeoTIFF, opt.ti);
  const tiOut = sampleToGrid(grid, ti.geo, ti.raster, ti.nodata);

  const terrain = {
    name: 'Jezero delta front (Perseverance traverse), HiRISE DTM crop',
    synthetic: false,
    width: grid.width,
    height: grid.height,
    cellSize: grid.cellSize,
    origin: grid.origin,
    layers: {
      elevation: agg.elevation,
      thermalInertia: tiOut.values,
      roughness: agg.roughness,
    },
    sources: [
      {
        layer: 'elevation',
        name: 'USGS Astrogeology, Mars 2020 Terrain Relative Navigation HiRISE DTM mosaic (1 m/px)',
        url: 'https://astrogeology.usgs.gov/search/map/mars_2020_terrain_relative_navigation_hirise_dtm_mosaic',
        file: opt.dtm,
        licence: 'Public domain (USGS / NASA)',
        notes: `Mean of the 1 m pixels in each ${grid.cellSize} m cell, metres relative to the MOLA areoid with the USGS delta geoid correction ("MOLAtopography_DeltaGeoid"); IAU Mars 2000 sphere, Equirectangular. Cells more than half nodata are null (${agg.nodataCells} cells).`,
      },
      {
        layer: 'roughness',
        name: 'Derived from the same HiRISE DTM',
        notes: 'Std-dev of 1 m elevations after removing a best-fit plane per cell; 0.3 m -> 0.5, >=0.8 m -> 1.0 (scripts/lib/prep.mjs).',
      },
      {
        layer: 'thermalInertia',
        name: 'THEMIS-derived Thermal Inertia of Jezero Crater, Mars (Zenodo 4931348)',
        url: 'https://doi.org/10.5281/zenodo.4931348',
        licence: 'CC BY 4.0',
        notes: `100 m/px, bilinear-resampled to cell centres, J m^-2 K^-1 s^-1/2. ${tiOut.filled} gap cells filled with the median (${tiOut.median}).`,
      },
    ],
  };

  mkdirSync(dirname(opt.out), { recursive: true });
  const json = JSON.stringify(terrain);
  writeFileSync(opt.out, json);
  const s = summarize(grid, terrain);
  console.log(`\nwrote ${opt.out} (${(json.length / 1e6).toFixed(2)} MB)`);
  console.log(`  ${s.size}`);
  console.log(`  elevation ${s.elevationRangeM[0].toFixed(1)} .. ${s.elevationRangeM[1].toFixed(1)} m, null ${s.nullElevationPct.toFixed(2)} %`);
  console.log(`  steeper than 20 deg: ${s.steeperThanPct.toFixed(1)} %`);
  console.log(`  sand (TI < 200): ${s.sandPct.toFixed(1)} %`);
  console.log(`  roughness > 0.8 (blocked): ${s.roughBlockedPct.toFixed(1)} %`);
  if (json.length > 5e6) console.warn('  WARNING: over the 5 MB limit in AGENTS.md');
}

main().catch((e) => { console.error(e.message || e); process.exit(1); });
