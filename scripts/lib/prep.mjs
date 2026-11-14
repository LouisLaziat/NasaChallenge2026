// Pure maths for scripts/prep_real_data.mjs. NO IMPORTS: tests run offline with no node_modules.
// Owner: data lane (tonny-claude). Output shape: CONTRACTS.md §1.
//
// Coordinates
//   Output grid: north-up, square `cell`-metre cells on the engine's spherical Mars
//   (R = 3 389 500 m, same as js/engine.js cellToLatLon). origin = NW corner (lat, lon).
//   Inputs: equirectangular ("Eqc", lat_ts = 0, lon_0 = 0) GeoTIFFs on the IAU Mars 2000 sphere
//   (R = 3 396 190 m): x = R·lon, y = R·lat (radians). Pixel (col,row) has its top-left corner at
//   (originX + col·resX, originY + row·resY), resY < 0. Lat/lon are the shared reference, so the
//   two radii never mix: every cell centre goes grid -> lat/lon -> source pixel.
//
// Roughness (0..1)
//   For each output cell take the 1 m DTM pixels whose centres fall inside it, fit the plane
//   z = a + b·x + c·y by least squares, and take the standard deviation s (m) of the residuals.
//   Piecewise-linear scale: s = 0 -> 0, s = 0.3 m -> 0.5, s >= 0.8 m -> 1.0.
//   Rationale: a plane removes the regional slope (already handled by the slope cost) so what is
//   left is metre-scale relief — boulders, ledges, rubble — that makes walking slow or unsafe.
//   The engine blocks cells with roughness > 0.8, i.e. s > ~0.68 m.

export const ENGINE_RADIUS_M = 3389500;
export const MARS2000_RADIUS_M = 3396190;
const DEG = 180 / Math.PI;

/** Output grid from data/real/area.json. Uses the bounds when present (they define the square). */
export function gridFromArea(area, cellOverride) {
  const cell = cellOverride ?? area.cellSize ?? 5;
  const size = area.sizeM ?? 2000;
  const n = Math.round(size / cell);
  let north, west;
  if (area.bounds) {
    north = area.bounds.north;
    west = area.bounds.west;
  } else {
    const halfLat = (size / 2 / ENGINE_RADIUS_M) * DEG;
    const halfLon = (size / 2 / (ENGINE_RADIUS_M * Math.cos(area.centerLat / DEG))) * DEG;
    north = area.centerLat + halfLat;
    west = area.centerLon - halfLon;
  }
  return { width: n, height: n, cellSize: cell, origin: { lat: north, lon: west } };
}

/** Lat/lon of a point at fractional grid position (gx, gy) — gx east, gy south, in cells. */
export function gridToLatLon(grid, gx, gy) {
  const { lat, lon } = grid.origin;
  return {
    lat: lat - (gy * grid.cellSize / ENGINE_RADIUS_M) * DEG,
    lon: lon + (gx * grid.cellSize / (ENGINE_RADIUS_M * Math.cos(lat / DEG))) * DEG,
  };
}

/** Same as engine cellToLatLon: centre of cell (x, y). */
export function cellCentreLatLon(grid, x, y) {
  return gridToLatLon(grid, x + 0.5, y + 0.5);
}

/** Lat/lon -> fractional pixel coords (col, row) in an Eqc raster. Pixel i spans [i, i+1). */
export function latLonToPixel(geo, lat, lon) {
  const R = geo.radius ?? MARS2000_RADIUS_M;
  const x = R * (lon / DEG), y = R * (lat / DEG);
  return { col: (x - geo.originX) / geo.resX, row: (y - geo.originY) / geo.resY };
}

export function pixelToLatLon(geo, col, row) {
  const R = geo.radius ?? MARS2000_RADIUS_M;
  const x = geo.originX + col * geo.resX, y = geo.originY + row * geo.resY;
  return { lat: (y / R) * DEG, lon: (x / R) * DEG };
}

/** Pixel window (integer, inclusive-exclusive) covering the whole grid plus a margin. */
export function windowForGrid(grid, geo, marginPx = 2) {
  const corners = [[0, 0], [grid.width, 0], [0, grid.height], [grid.width, grid.height]]
    .map(([gx, gy]) => { const p = gridToLatLon(grid, gx, gy); return latLonToPixel(geo, p.lat, p.lon); });
  const cols = corners.map((c) => c.col), rows = corners.map((c) => c.row);
  return {
    col0: Math.max(0, Math.floor(Math.min(...cols)) - marginPx),
    row0: Math.max(0, Math.floor(Math.min(...rows)) - marginPx),
    col1: Math.min(geo.width, Math.ceil(Math.max(...cols)) + marginPx),
    row1: Math.min(geo.height, Math.ceil(Math.max(...rows)) + marginPx),
  };
}

export function isNoData(v, nodata) {
  return v == null || !Number.isFinite(v) || (nodata != null && (v === nodata || Math.abs(v - nodata) < 1e-6 * Math.abs(nodata))) || v < -1e30;
}

/**
 * Plane-fit residual standard deviation for points (xs, ys, zs). Returns 0 for < 4 points.
 * Solves the 3x3 normal equations directly (centred coordinates for stability).
 */
export function planeResidualStd(xs, ys, zs) {
  const n = zs.length;
  if (n < 4) return 0;
  let mx = 0, my = 0, mz = 0;
  for (let i = 0; i < n; i++) { mx += xs[i]; my += ys[i]; mz += zs[i]; }
  mx /= n; my /= n; mz /= n;
  let sxx = 0, syy = 0, sxy = 0, sxz = 0, syz = 0;
  for (let i = 0; i < n; i++) {
    const x = xs[i] - mx, y = ys[i] - my, z = zs[i] - mz;
    sxx += x * x; syy += y * y; sxy += x * y; sxz += x * z; syz += y * z;
  }
  const det = sxx * syy - sxy * sxy;
  let b = 0, c = 0;
  if (Math.abs(det) > 1e-12) {
    b = (sxz * syy - syz * sxy) / det;
    c = (syz * sxx - sxz * sxy) / det;
  }
  let ss = 0;
  for (let i = 0; i < n; i++) {
    const r = (zs[i] - mz) - b * (xs[i] - mx) - c * (ys[i] - my);
    ss += r * r;
  }
  return Math.sqrt(ss / n);
}

/** Residual std (m) -> roughness 0..1 (see header). */
export function roughnessFromStd(s) {
  if (!(s > 0)) return 0;
  if (s <= 0.3) return (s / 0.3) * 0.5;
  if (s >= 0.8) return 1;
  return 0.5 + ((s - 0.3) / 0.5) * 0.5;
}

/**
 * Aggregate a DTM window into the output grid.
 * win = { data: Float32Array|number[], col0, row0, cols, rows }  (row-major, row 0 = window top)
 * Returns { elevation: (number|null)[], roughness: number[], nodataCells }.
 */
export function aggregateDtm(grid, geo, win, nodata) {
  const N = grid.width * grid.height;
  const elevation = new Array(N);
  const roughness = new Array(N);
  let nodataCells = 0;
  const xs = [], ys = [], zs = [];
  for (let y = 0; y < grid.height; y++) {
    // Cell edges in pixel space (lat edges are the same for the whole row).
    const pN = gridToLatLon(grid, 0, y), pS = gridToLatLon(grid, 0, y + 1);
    const rTop = latLonToPixel(geo, pN.lat, pN.lon).row, rBot = latLonToPixel(geo, pS.lat, pS.lon).row;
    for (let x = 0; x < grid.width; x++) {
      const pW = gridToLatLon(grid, x, y), pE = gridToLatLon(grid, x + 1, y);
      const cL = latLonToPixel(geo, pW.lat, pW.lon).col, cR = latLonToPixel(geo, pE.lat, pE.lon).col;
      // Pixels whose centres (i + 0.5) fall in [edgeA, edgeB).
      const c0 = Math.ceil(cL - 0.5), c1 = Math.ceil(cR - 0.5);
      const r0 = Math.ceil(rTop - 0.5), r1 = Math.ceil(rBot - 0.5);
      xs.length = ys.length = zs.length = 0;
      let total = 0;
      for (let r = r0; r < r1; r++) {
        const wr = r - win.row0;
        for (let c = c0; c < c1; c++) {
          total++;
          const wc = c - win.col0;
          if (wr < 0 || wc < 0 || wr >= win.rows || wc >= win.cols) continue;
          const v = win.data[wr * win.cols + wc];
          if (isNoData(v, nodata)) continue;
          xs.push(c * Math.abs(geo.resX)); ys.push(r * Math.abs(geo.resY)); zs.push(v);
        }
      }
      const i = y * grid.width + x;
      if (total === 0 || zs.length * 2 < total) {
        elevation[i] = null; roughness[i] = 1; nodataCells++;
        continue;
      }
      let sum = 0;
      for (const z of zs) sum += z;
      elevation[i] = Math.round((sum / zs.length) * 100) / 100;
      roughness[i] = Math.round(roughnessFromStd(planeResidualStd(xs, ys, zs)) * 100) / 100;
    }
  }
  return { elevation, roughness, nodataCells };
}

/** Bilinear sample at fractional pixel coords (pixel centres at i + 0.5). NaN if any corner is nodata/outside. */
export function bilinear(raster, w, h, col, row, nodata) {
  const fx = col - 0.5, fy = row - 0.5;
  const x0 = Math.floor(fx), y0 = Math.floor(fy);
  const tx = fx - x0, ty = fy - y0;
  const get = (x, y) => {
    const cx = Math.min(w - 1, Math.max(0, x)), cy = Math.min(h - 1, Math.max(0, y));
    if (x < -1 || y < -1 || x > w || y > h) return NaN; // far outside
    const v = raster[cy * w + cx];
    return isNoData(v, nodata) ? NaN : v;
  };
  const a = get(x0, y0), b = get(x0 + 1, y0), c = get(x0, y0 + 1), d = get(x0 + 1, y0 + 1);
  return (a * (1 - tx) + b * tx) * (1 - ty) + (c * (1 - tx) + d * tx) * ty;
}

/** Sample a whole raster at every cell centre; gaps filled with the median. */
export function sampleToGrid(grid, geo, raster, nodata) {
  const N = grid.width * grid.height;
  const out = new Array(N);
  const good = [];
  for (let y = 0; y < grid.height; y++) {
    for (let x = 0; x < grid.width; x++) {
      const p = cellCentreLatLon(grid, x, y);
      const px = latLonToPixel(geo, p.lat, p.lon);
      const v = bilinear(raster, geo.width, geo.height, px.col, px.row, nodata);
      out[y * grid.width + x] = v;
      if (Number.isFinite(v)) good.push(v);
    }
  }
  good.sort((a, b) => a - b);
  const median = good.length ? good[good.length >> 1] : null;
  let filled = 0;
  for (let i = 0; i < N; i++) {
    if (!Number.isFinite(out[i])) { out[i] = median; filled++; } else out[i] = Math.round(out[i]);
  }
  return { values: out, filled, median };
}

/** Slope (deg) per cell, same central differences as js/engine.js. null elevation -> NaN. */
export function slopeDegrees(grid, elevation) {
  const { width: W, height: H, cellSize } = grid;
  const out = new Float64Array(W * H);
  const z = (x, y) => elevation[y * W + x];
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const xl = Math.max(0, x - 1), xr = Math.min(W - 1, x + 1);
      const yu = Math.max(0, y - 1), yd = Math.min(H - 1, y + 1);
      const a = z(xl, y), b = z(xr, y), c = z(x, yu), d = z(x, yd);
      if ([a, b, c, d].some((v) => v == null)) { out[y * W + x] = NaN; continue; }
      const gx = (b - a) / ((xr - xl) * cellSize), gy = (d - c) / ((yd - yu) * cellSize);
      out[y * W + x] = Math.atan(Math.hypot(gx, gy)) * DEG;
    }
  }
  return out;
}

/** Summary numbers printed by the script. */
export function summarize(grid, terrain, { maxSlopeDeg = 20, sandTI = 200 } = {}) {
  const e = terrain.layers.elevation.filter((v) => v != null);
  const slopes = slopeDegrees(grid, terrain.layers.elevation);
  let steep = 0, valid = 0;
  for (const s of slopes) if (Number.isFinite(s)) { valid++; if (s > maxSlopeDeg) steep++; }
  const ti = terrain.layers.thermalInertia;
  const sand = ti.filter((v) => v != null && v < sandTI).length;
  const rough = terrain.layers.roughness.filter((v) => v > 0.8).length;
  const N = grid.width * grid.height;
  let lo = Infinity, hi = -Infinity;
  for (const v of e) { if (v < lo) lo = v; if (v > hi) hi = v; }
  return {
    size: `${grid.width} x ${grid.height} cells @ ${grid.cellSize} m`,
    elevationRangeM: [lo, hi],
    nullElevationPct: (100 * (N - e.length)) / N,
    steeperThanPct: (100 * steep) / Math.max(1, valid),
    sandPct: (100 * sand) / N,
    roughBlockedPct: (100 * rough) / N,
  };
}
