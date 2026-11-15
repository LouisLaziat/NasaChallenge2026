// Generated with AI assistance for NASA Space Apps 2026; reviewed by the team
// Data-lane tests. Offline, no node_modules: only the pure library and the engine are imported.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  gridFromArea, cellCentreLatLon, latLonToPixel, pixelToLatLon, windowForGrid,
  aggregateDtm, sampleToGrid, planeResidualStd, roughnessFromStd, slopeDegrees,
  MARS2000_RADIUS_M,
} from '../scripts/lib/prep.mjs';
import { cellToLatLon } from '../js/engine.js';

const DEG = 180 / Math.PI;

// A small output grid and a 1 m Eqc source raster that covers it with a margin.
function fixture({ cells = 10, cell = 5, margin = 6 } = {}) {
  const grid = { width: cells, height: cells, cellSize: cell, origin: { lat: 18.45, lon: 77.40 } };
  const R = MARS2000_RADIUS_M;
  const originX = Math.floor(R * (grid.origin.lon / DEG)) - margin;
  const originY = Math.ceil(R * (grid.origin.lat / DEG)) + margin;
  const size = cells * cell + 2 * margin + 4;
  const geo = { originX, originY, resX: 1, resY: -1, width: size, height: size, radius: R };
  const makeWin = (fn) => {
    const data = new Float32Array(size * size);
    for (let r = 0; r < size; r++) for (let c = 0; c < size; c++) data[r * size + c] = fn(c, r);
    return { data, col0: 0, row0: 0, cols: size, rows: size };
  };
  return { grid, geo, makeWin };
}

test('grid from the real area.json: 400 x 400, NW-corner origin, matches engine cellToLatLon', () => {
  const area = JSON.parse(readFileSync(new URL('../data/real/area.json', import.meta.url)));
  const g = gridFromArea(area);
  assert.equal(g.width, 400);
  assert.equal(g.height, 400);
  assert.deepEqual(g.origin, { lat: area.bounds.north, lon: area.bounds.west });
  for (const [x, y] of [[0, 0], [123, 321], [399, 399]]) {
    const a = cellCentreLatLon(g, x, y), b = cellToLatLon(g, x, y);
    assert.ok(Math.abs(a.lat - b.lat) < 1e-12 && Math.abs(a.lon - b.lon) < 1e-12);
  }
  // The square's south-east corner lands on the area's SE bound (within a cell).
  const se = cellCentreLatLon(g, 399.5, 399.5);
  assert.ok(Math.abs(se.lat - area.bounds.south) < 5 / 3389500 * DEG);
  assert.ok(Math.abs(se.lon - area.bounds.east) < 5 / 3389500 * DEG / Math.cos(18.45 / DEG) * 1.01);
});

test('lat/lon -> pixel -> lat/lon round-trips; USGS DTM corner maps to pixel (0,0)', () => {
  const dtm = { originX: 4577366, originY: 1106618, resX: 1, resY: -1 };
  const p = latLonToPixel(dtm, 18.6693150068777456, 77.2229330769714153);
  assert.ok(Math.abs(p.col) < 0.6 && Math.abs(p.row) < 0.6, JSON.stringify(p));
  const ll = pixelToLatLon(dtm, 1234.5, 5678.5);
  const back = latLonToPixel(dtm, ll.lat, ll.lon);
  assert.ok(Math.abs(back.col - 1234.5) < 1e-6 && Math.abs(back.row - 5678.5) < 1e-6);
});

test('window covers the grid and stays inside the raster', () => {
  const { grid, geo } = fixture();
  const w = windowForGrid(grid, geo);
  assert.ok(w.col0 >= 0 && w.row0 >= 0 && w.col1 <= geo.width && w.row1 <= geo.height);
  assert.ok(w.col1 - w.col0 >= 50 && w.row1 - w.row0 >= 50);
});

test('tilted plane: elevation rises east with the right slope and near-zero roughness', () => {
  const { grid, geo, makeWin } = fixture();
  const out = aggregateDtm(grid, geo, makeWin((c) => 0.2 * c), -3.4e38);
  assert.equal(out.nodataCells, 0);
  const s = slopeDegrees(grid, out.elevation);
  const mid = s[5 * grid.width + 5];
  assert.ok(Math.abs(mid - Math.atan(0.2) * DEG) < 0.6, `slope ${mid}`);
  assert.ok(out.roughness.every((r) => r < 0.05));
  assert.ok(out.elevation[0 * 10 + 9] > out.elevation[0 * 10 + 0]);
});

test('row 0 is north: elevation rising southward shows up as rising with y', () => {
  const { grid, geo, makeWin } = fixture();
  const out = aggregateDtm(grid, geo, makeWin((c, r) => r * 0.1), null);
  for (let y = 1; y < grid.height; y++) assert.ok(out.elevation[y * 10] > out.elevation[(y - 1) * 10]);
});

test('a boulder spike raises roughness in its cell only', () => {
  const { grid, geo, makeWin } = fixture();
  // Find the pixel at the centre of cell (4, 6) and put a 3 m spike there.
  const ctr = cellCentreLatLon(grid, 4, 6);
  const px = latLonToPixel(geo, ctr.lat, ctr.lon);
  const sc = Math.floor(px.col), sr = Math.floor(px.row);
  const out = aggregateDtm(grid, geo, makeWin((c, r) => (c === sc && r === sr ? 3 : 0)), null);
  const i = 6 * 10 + 4;
  assert.ok(out.roughness[i] > 0.5, `spike cell roughness ${out.roughness[i]}`);
  assert.equal(out.roughness.filter((r) => r > 0.1).length, 1);
});

test('nodata: a mostly-empty cell becomes null elevation and blocked roughness', () => {
  const { grid, geo, makeWin } = fixture();
  const ND = -3.4028226550889045e38;
  const ctr = cellCentreLatLon(grid, 2, 3);
  const px = latLonToPixel(geo, ctr.lat, ctr.lon);
  const out = aggregateDtm(grid, geo,
    makeWin((c, r) => (Math.abs(c - px.col) < 4 && Math.abs(r - px.row) < 4 ? ND : 10)), ND);
  assert.equal(out.elevation[3 * 10 + 2], null);
  assert.equal(out.roughness[3 * 10 + 2], 1);
  assert.equal(out.elevation[0], 10);
});

test('thermal inertia step lands on the right side after bilinear resampling', () => {
  const { grid } = fixture({ cells: 40, cell: 5 });
  // Coarse 100 m raster: west of the step 120 (sand), east 480 (rock); step at the grid's middle.
  const R = MARS2000_RADIUS_M;
  const midLon = cellCentreLatLon(grid, 20, 0).lon;
  const originX = Math.round(R * (midLon / DEG)) - 500, originY = Math.round(R * (grid.origin.lat / DEG)) + 300;
  const geo = { originX, originY, resX: 100, resY: -100, width: 10, height: 6, radius: R };
  const raster = [];
  for (let r = 0; r < 6; r++) for (let c = 0; c < 10; c++) raster.push(c < 5 ? 120 : 480);
  const { values, filled } = sampleToGrid(grid, geo, raster, 0);
  assert.equal(filled, 0);
  assert.ok(values[10 * 40 + 2] < 200, 'west is sand');
  assert.ok(values[10 * 40 + 38] > 400, 'east is rock');
});

test('plane fit and roughness scale', () => {
  const xs = [0, 1, 0, 1, 2], ys = [0, 0, 1, 1, 2], zs = xs.map((x, i) => 3 + 2 * x - ys[i]);
  assert.ok(planeResidualStd(xs, ys, zs) < 1e-9);
  assert.equal(roughnessFromStd(0), 0);
  assert.ok(Math.abs(roughnessFromStd(0.3) - 0.5) < 1e-12);
  assert.equal(roughnessFromStd(0.8), 1);
  assert.equal(roughnessFromStd(5), 1);
});
