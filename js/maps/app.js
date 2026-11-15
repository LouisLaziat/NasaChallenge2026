// Generated with AI assistance for NASA Space Apps 2026; reviewed by the team
//
// Mars Maps — Google-Maps-style walking directions over real Jezero terrain.
// Reuses the shared engine (js/engine.js), NASA layers (js/basemap.js) and rover photos
// (js/photos.js); adds route alternatives, turn-by-turn steps and an elevation/O2 profile.

import { CONFIG } from '../config.js';
import { cellToLatLon, latLonToCell, buildCostGrid } from '../engine.js';
import { addBaseLayers } from '../basemap.js';
import { renderPhotos } from '../photos.js';
import { paintHillshade } from '../render.js';
import { t, setLang, getLang, dirName, num } from './i18n.js';
import { MODE_IDS, SLOPE_CLASSES, LOOSE_SAND } from './route.js';

const L = window.L;
const $ = (id) => document.getElementById(id);
const params = new URLSearchParams(location.search);
const DATASET = ['demo', 'gale'].includes(params.get('data')) ? params.get('data') : 'real';
const DATA_DIR = new URL(`../../data/${DATASET}/`, import.meta.url);

const MARS_MINUTE_S = 88775.244 / 1440;         // one LMST minute in seconds (1 sol = 88 775 s)
const EVA_WINDOW = { start: 8 * 60, end: 16 * 60 }; // ASSUMPTION (team): daylight EVA window, LMST
const MAX_WALK_SLOPE = 20;                        // NASA xEVA concept (NTRS 20210000827)
const COND_IDS = ['dustStorm', 'solarEvent', 'heavyKit'];
const COND_ICON = { dustStorm: '🌪️', solarEvent: '☀️', heavyKit: '🎒' };
const SLOPE_COLORS = ['#7ee08a', '#7ee08a', '#ffe066', '#ff9f43', '#ff3b4e']; // per SLOPE_CLASSES
const MODE_ICON = {
  eco: '<svg viewBox="0 0 24 24"><path d="M12 3c3 4 6 6.5 6 10a6 6 0 0 1-12 0c0-3.5 3-6 6-10Z"/><path d="M9.5 14.5a2.5 2.5 0 0 0 2.5 2.5"/></svg>',
  safe: '<svg viewBox="0 0 24 24"><path d="M12 3 5 6v5c0 4.5 3 8 7 10 4-2 7-5.5 7-10V6l-7-3Z"/><path d="m9 12 2 2 4-4"/></svg>',
  short: '<svg viewBox="0 0 24 24"><path d="M4 20 20 4"/><path d="M12 4h8v8"/></svg>',
};

const state = {
  terrain: null, grid: null, habitat: null, targets: [], included: new Set(),
  conditions: { dustStorm: false, solarEvent: false, heavyKit: false },
  results: {}, selected: null, userPicked: false, reqId: 0, planning: false,
  viewshed: null, place: null, customN: 0, leaveMin: 9 * 60, hoverIdx: null,
  base: 'hirise', layersOn: {},
};
window.__marsMaps = state; // handy in the console

let map, baseLayers = {}, overlays = {}, routeLayer, markerLayer, fxLayer, scrubMarker = null;

// ---------------------------------------------------------------------------
// Worker
// ---------------------------------------------------------------------------

const worker = new Worker(new URL('./worker.js', import.meta.url), { type: 'module' });
let readyResolve, readyReject;
const ready = new Promise((res, rej) => { readyResolve = res; readyReject = rej; });
worker.onmessage = (e) => {
  const m = e.data;
  if (m.type === 'ready') { state.viewshed = m.viewshed; readyResolve(); return; }
  if (m.type === 'error' && m.id === 0) { readyReject(new Error(m.error)); return; }
  if (m.id !== state.reqId) return; // stale answer
  if (m.type === 'route') {
    const r = m.result;
    if (!r.error) r.latlngs = r.plan.path.map(([x, y]) => cellLL(x, y));
    state.results[r.mode] = r;
    if (!state.userPicked) state.selected = pickDefault();
    if (!state.fitted && !r.error && r.latlngs.length > 1) { state.fitted = true; map.flyToBounds(L.latLngBounds(r.latlngs).pad(0.15), { ...fitPadding(), duration: 0.8 }); }
    renderPlan();
  } else if (m.type === 'done') {
    state.planning = false;
    renderPlan();
  } else if (m.type === 'error') {
    state.planning = false;
    showBanner(t('error', { msg: m.error }), true);
    renderPlan();
  }
};
worker.onerror = (e) => { showBanner(t('error', { msg: e.message || 'worker' }), true); readyReject(new Error(e.message)); };

let planTimer = null;
function replan() {
  clearTimeout(planTimer);
  planTimer = setTimeout(() => {
    state.reqId++;
    state.results = {};
    syncUrl();
    if (!state.included.size) { state.planning = false; renderPlan(); return; }
    state.planning = true;
    renderPlan();
    worker.postMessage({
      type: 'plan', id: state.reqId,
      targetsFile: { habitat: state.habitat, targets: state.targets.map(stripTarget) },
      options: { stopIds: [...state.included], conditions: { ...state.conditions }, expectStops: state.included.size },
    });
  }, 90);
}
const stripTarget = ({ id, name, x, y, lat, lon, value, dwellMin }) => ({ id, name, x, y, lat, lon, value, dwellMin });

function pickDefault() {
  const rs = MODE_IDS.map((m) => state.results[m]).filter((r) => r && !r.error);
  if (!rs.length) return state.selected ?? 'eco';
  const ok = rs.filter((r) => r.analysis.withinBudget);
  if (ok.length) return ok.sort((a, b) => b.analysis.totals.safetyScore - a.analysis.totals.safetyScore || a.analysis.totals.o2UsedKg - b.analysis.totals.o2UsedKg)[0].mode;
  return rs.sort((a, b) => a.analysis.totals.o2UsedKg - b.analysis.totals.o2UsedKg)[0].mode;
}

// ---------------------------------------------------------------------------
// Boot
// ---------------------------------------------------------------------------

async function boot() {
  setLang(getLang());
  applyStaticText();
  drawStars();
  try {
    const terrainUrl = new URL('terrain.json', DATA_DIR).href;
    const [terrain, targetsFile] = await Promise.all([
      fetchJson(terrainUrl), fetchJson(new URL('targets.json', DATA_DIR).href),
    ]);
    state.terrain = terrain;
    state.habitat = { ...targetsFile.habitat };
    state.targets = targetsFile.targets.map((x) => ({ ...x }));
    for (const p of [state.habitat, ...state.targets]) {
      if (!(Number.isInteger(p.x) && Number.isInteger(p.y))) Object.assign(p, latLonToCell(terrain, p.lat, p.lon));
      if (p.lat == null) { const ll = cellToLatLon(terrain, p.x, p.y); p.lat = ll.lat; p.lon = ll.lon; }
    }
    state.grid = buildCostGrid(terrain, CONFIG, {});
    worker.postMessage({ type: 'init', id: 0, terrainUrl, habitat: { name: state.habitat.name, x: state.habitat.x, y: state.habitat.y } });
  } catch (err) {
    hideLoader();
    showBanner(t('error', { msg: `${err.message}${location.protocol === 'file:' ? ' — open over http (npm run serve)' : ''}` }), true);
    return;
  }
  readUrl();
  initMap();
  renderConds();
  renderSources();
  wireUi();
  try { await ready; } catch (err) { showBanner(t('error', { msg: err.message }), true); }
  buildOverlays();
  hideLoader();
  replan();
}

async function fetchJson(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${url.split('/').slice(-2).join('/')}: HTTP ${r.status}`);
  return r.json();
}

function readUrl() {
  const stops = params.get('stops');
  const ids = new Set(state.targets.map((x) => x.id));
  if (stops) for (const id of stops.split(',')) { if (ids.has(id)) state.included.add(id); }
  else for (const x of state.targets) state.included.add(x.id);
  if (params.get('dust') === '1') state.conditions.dustStorm = true;
  if (params.get('solar') === '1') state.conditions.solarEvent = true;
  if (params.get('kit') === '1') state.conditions.heavyKit = true;
  const mode = params.get('mode');
  if (MODE_IDS.includes(mode)) { state.selected = mode; state.userPicked = true; }
  const leave = params.get('leave');
  if (/^\d\d:\d\d$/.test(leave ?? '')) { state.leaveMin = toMin(leave); $('leave').value = leave; }
}

function syncUrl() {
  const p = new URLSearchParams();
  if (DATASET !== 'real') p.set('data', DATASET);
  const custom = state.targets.filter((x) => x.custom).map((x) => x.id);
  const ids = [...state.included].filter((id) => !custom.includes(id));
  p.set('stops', ids.join(','));
  if (state.conditions.dustStorm) p.set('dust', '1');
  if (state.conditions.solarEvent) p.set('solar', '1');
  if (state.conditions.heavyKit) p.set('kit', '1');
  if (state.userPicked && state.selected) p.set('mode', state.selected);
  if (state.leaveMin !== 9 * 60) p.set('leave', fmtClock(state.leaveMin));
  if (params.get('lang')) p.set('lang', getLang());
  history.replaceState(null, '', `${location.pathname}?${p}`);
}

// ---------------------------------------------------------------------------
// Map
// ---------------------------------------------------------------------------

const cellLL = (x, y) => { const c = cellToLatLon(state.terrain, x, y); return [c.lat, c.lon]; };
function areaBounds() {
  const T = state.terrain;
  const nw = cellToLatLon(T, -0.5, -0.5), se = cellToLatLon(T, T.width - 0.5, T.height - 0.5);
  return L.latLngBounds([se.lat, nw.lon], [nw.lat, se.lon]);
}
function fitPadding() {
  const small = matchMedia('(max-width: 820px)').matches;
  return small
    ? { paddingTopLeft: [20, 70], paddingBottomRight: [20, innerHeight * 0.45] }
    : { paddingTopLeft: [panelW() + 40, 70], paddingBottomRight: [70, sheetH() + 40] };
}
const panelW = () => $('panel').getBoundingClientRect().width;
const sheetH = () => $('sheet').getBoundingClientRect().height;

function initMap() {
  const bounds = areaBounds();
  map = L.map('map', { zoomControl: false, zoomSnap: 0.25, zoomDelta: 0.5, maxZoom: 20, attributionControl: true, worldCopyJump: false });
  map.attributionControl.setPrefix(false);
  map.fitBounds(bounds, fitPadding());
  map.setMaxBounds(bounds.pad(1.5));
  map.setMinZoom(Math.max(1, map.getZoom() - 3));

  map.createPane('terrain'); map.getPane('terrain').style.zIndex = 300;
  map.createPane('routeAlt'); map.getPane('routeAlt').style.zIndex = 410;
  map.createPane('route'); map.getPane('route').style.zIndex = 420;

  if (DATASET === 'gale') baseLayers = galeLayers(bounds);
  else {
    try {
      const base = addBaseLayers(map, state.terrain) || {};
      base.control?.remove();
      baseLayers = base.layers || {};
    } catch (err) { console.warn('[maps] base layers failed', err); }
  }
  state.base = state.terrain.synthetic ? 'none' : 'hirise';
  state.layersOn = { hillshade: !!state.terrain.synthetic, slope: false, hazard: false, sand: false, viewshed: false, traverse: !state.terrain.synthetic };
  applyBase();
  if (baseLayers.traverse && !state.layersOn.traverse) baseLayers.traverse.remove();

  L.rectangle(bounds, { color: '#5ee7ff', weight: 1, opacity: 0.5, fill: false, dashArray: '2 6', interactive: false, pane: 'terrain' }).addTo(map);
  routeLayer = L.layerGroup().addTo(map);
  fxLayer = L.layerGroup().addTo(map);
  markerLayer = L.layerGroup().addTo(map);

  map.on('click', onMapClick);
  map.on('mousemove', onMapMove);
  map.on('zoomend moveend resize', updateScale);
  updateScale();
  new ResizeObserver(() => map.invalidateSize()).observe($('map'));
  drawMarkers();
}

/** Gale (second site, data/gale/): HiRISE colour mosaic + Curiosity traverse shipped with the data set. */
function galeLayers(bounds) {
  if (!map.getPane('pbBasemap')) { map.createPane('pbBasemap'); map.getPane('pbBasemap').style.zIndex = 250; }
  const hirise = L.imageOverlay(new URL('imagery.png', DATA_DIR).href, bounds, { pane: 'pbBasemap', interactive: false,
    attribution: 'HiRISE colour mosaic: NASA/JPL-Caltech/UArizona, USGS Astrogeology' });
  const traverse = L.layerGroup();
  fetchJson(new URL('traverse.json', DATA_DIR).href).then((geo) => {
    L.geoJSON(geo, { style: { color: '#7fd3ff', weight: 2, opacity: 0.9, dashArray: '6 5' },
      onEachFeature: (f, l) => l.bindTooltip(`Curiosity drive${f.properties?.sol != null ? `, sol ${f.properties.sol}` : ''}`, { className: 'mm-tip', sticky: true }) }).addTo(traverse);
  }).catch((err) => console.warn('[maps] Gale traverse not loaded', err.message));
  return { hirise, traverse };
}

function applyBase() {
  const { hirise, ctx } = baseLayers;
  for (const l of [hirise, ctx]) l?.remove();
  if (state.base === 'hirise') { ctx?.addTo(map); hirise?.addTo(map); }
  else if (state.base === 'ctx') ctx?.addTo(map);
}

// Terrain overlays painted from the grid (north-up, one pixel per cell).
function buildOverlays() {
  const T = state.terrain, g = state.grid, b = areaBounds();
  const N = T.width * T.height;
  const make = (paint, opacity) => {
    const c = document.createElement('canvas');
    c.width = T.width; c.height = T.height;
    const ctx = c.getContext('2d');
    const img = ctx.createImageData(T.width, T.height);
    for (let i = 0; i < N; i++) {
      const p = paint(i);
      if (p) img.data.set(p, i * 4);
    }
    ctx.putImageData(img, 0, 0);
    return L.imageOverlay(c.toDataURL(), b, { opacity, pane: 'terrain', interactive: false, className: 'mm-raster' });
  };
  const rough = T.layers.roughness;
  const blockedFixed = (i) => !Number.isFinite(g.elev[i]) || g.slopeDeg[i] > MAX_WALK_SLOPE || (rough && rough[i] > CONFIG.terrain.roughnessBlock);
  overlays.hillshade = L.imageOverlay(paintHillshade(T).toDataURL(), b, { opacity: 1, pane: 'terrain', interactive: false });
  overlays.slope = make((i) => {
    const s = g.slopeDeg[i];
    if (!Number.isFinite(g.elev[i]) || s > 20) return [255, 59, 78, 210];
    if (s > 15) return [255, 159, 67, 190];
    if (s > 10) return [255, 224, 102, 150];
    return [126, 224, 138, 45];
  }, 0.8);
  overlays.hazard = make((i) => {
    if (blockedFixed(i)) return [255, 59, 78, 215];
    if (g.slopeDeg[i] > 15) return [255, 159, 67, 170];
    if (T.layers.thermalInertia && g.sandiness[i] >= LOOSE_SAND) return [255, 214, 120, 85];
    return null;
  }, 0.85);
  if (T.layers.thermalInertia) overlays.sand = make((i) => (g.sandiness[i] >= LOOSE_SAND ? [255, 214, 120, 150] : null), 0.8);
  if (state.viewshed) {
    const vs = state.viewshed;
    overlays.viewshed = make((i) => (vs[i] ? [94, 231, 255, 55] : [40, 10, 70, 150]), 0.9);
  }
  if (baseLayers.traverse) overlays.traverse = baseLayers.traverse;
  for (const [k, on] of Object.entries(state.layersOn)) if (on && overlays[k] && !map.hasLayer(overlays[k])) overlays[k].addTo(map);
}

function setOverlay(k, on) {
  state.layersOn[k] = on;
  const l = overlays[k];
  if (!l) return;
  if (on) l.addTo(map); else l.remove();
}

// ---------------------------------------------------------------------------
// Drawing: routes, markers, profile scrub
// ---------------------------------------------------------------------------

function drawRoutes() {
  routeLayer.clearLayers();
  const sel = state.selected;
  MODE_IDS.forEach((mode, mi) => {
    const r = state.results[mode];
    if (!r || r.error || mode === sel || r.latlngs.length < 2) return;
    const pick = () => selectMode(mode, true);
    L.polyline(r.latlngs, { pane: 'routeAlt', color: '#060914', weight: 10, opacity: 0.55, interactive: false }).addTo(routeLayer);
    L.polyline(r.latlngs, { pane: 'routeAlt', color: '#a9b4d6', weight: 5, opacity: 0.85 })
      .on('click', (e) => { L.DomEvent.stop(e); pick(); }).addTo(routeLayer);
    bubble(r, mi, false).on('click', pick).addTo(routeLayer);
  });
  const r = state.results[sel];
  if (!r || r.error || r.latlngs.length < 2) return;
  L.polyline(r.latlngs, { pane: 'route', color: '#03050c', weight: 12, opacity: 0.8, interactive: false }).addTo(routeLayer);
  L.polyline(r.latlngs, { pane: 'route', color: '#5ee7ff', weight: 14, opacity: 0.16, interactive: false }).addTo(routeLayer);
  L.polyline(r.latlngs, { pane: 'route', color: '#3fd2ff', weight: 6, opacity: 1, interactive: false }).addTo(routeLayer);
  // Steep sections on top, so the walker sees where to be careful.
  const sl = r.analysis.profile.slope_deg;
  let run = null;
  const flush = () => { if (run && run.pts.length > 1) L.polyline(run.pts, { pane: 'route', color: run.c, weight: 6, opacity: 1, interactive: false }).addTo(routeLayer); run = null; };
  for (let i = 0; i < r.latlngs.length; i++) {
    const c = sl[i] > 20 ? '#ff3b4e' : sl[i] > 15 ? '#ff9f43' : null;
    if (c !== run?.c) { const last = run?.pts.at(-1); flush(); if (c) run = { c, pts: last ? [last] : [] }; }
    if (run) run.pts.push(r.latlngs[i]);
  }
  flush();
  bubble(r, MODE_IDS.indexOf(sel), true).on('click', () => openPlaceRoute()).addTo(routeLayer);
  const tb = r.analysis.turnBackIndex;
  if (tb != null) {
    L.marker(r.latlngs[tb], { pane: 'route', icon: L.divIcon({ className: '', iconSize: [34, 34], iconAnchor: [17, 17], html: '<div class="mm-turn"><span>↩</span></div>' }) })
      .bindTooltip(`${t('turnBack')} · ${fmtClock(clockAt(r, tb))}`, { className: 'mm-tip', direction: 'top', offset: [0, -16] })
      .addTo(routeLayer);
  }
}

function bubble(r, mi, sel) {
  const n = r.latlngs.length;
  const at = r.latlngs[Math.floor(n * [0.3, 0.5, 0.7][mi])];
  const T = r.analysis.totals;
  return L.marker(at, {
    pane: sel ? 'route' : 'routeAlt', keyboard: false,
    icon: L.divIcon({ className: '', iconSize: [0, 0], iconAnchor: [0, 0], html: `<div class="mm-bubble${sel ? ' sel' : ''}">${fmtDur(T.totalTimeMin)}<small>${fmtKm(T.distanceM)}</small></div>` }),
  });
}

const HAB_SVG = '<svg viewBox="0 0 24 24"><path d="M4 18a8 8 0 0 1 16 0"/><path d="M2.5 18h19"/><path d="M12 6V3"/><path d="M10 18v-3h4v3"/></svg>';

function drawMarkers() {
  markerLayer.clearLayers();
  const h = state.habitat;
  L.marker([h.lat, h.lon], { icon: L.divIcon({ className: '', iconSize: [38, 38], iconAnchor: [19, 19], html: `<div class="mm-hab">${HAB_SVG}</div>` }), zIndexOffset: 1000 })
    .bindTooltip(t('habitat'), { className: 'mm-tip', direction: 'top', offset: [0, -18] })
    .on('click', () => openPlace('habitat')).addTo(markerLayer);
  const r = state.results[state.selected];
  const order = r && !r.error ? r.plan.order : [];
  const unreach = new Set(r && !r.error ? r.plan.unreachable : []);
  for (const x of state.targets) {
    const inc = state.included.has(x.id);
    const sel = state.place === x.id;
    let icon;
    if (inc) {
      const k = order.indexOf(x.id);
      const label = k >= 0 ? k + 1 : unreach.has(x.id) ? '!' : '·';
      icon = L.divIcon({ className: '', iconSize: [34, 44], iconAnchor: [17, 41], html: `<div class="mm-pin${sel ? ' sel' : ''}${unreach.has(x.id) ? ' bad' : ''}"><div class="pin"></div><b>${label}</b></div>` });
    } else {
      icon = L.divIcon({ className: '', iconSize: [18, 18], iconAnchor: [9, 9], html: '<div class="mm-dot"></div>' });
    }
    L.marker([x.lat, x.lon], { icon, zIndexOffset: inc ? 500 : 0 })
      .bindTooltip(esc(x.name), { className: 'mm-tip', direction: 'top', offset: [0, inc ? -38 : -10] })
      .on('click', () => openPlace(x.id)).addTo(markerLayer);
  }
}

function setScrub(idx) {
  state.hoverIdx = idx;
  const r = state.results[state.selected];
  if (idx == null || !r || r.error) { scrubMarker?.remove(); scrubMarker = null; return; }
  const ll = r.latlngs[idx];
  if (!scrubMarker) {
    scrubMarker = L.marker(ll, { interactive: false, keyboard: false, zIndexOffset: 2000,
      icon: L.divIcon({ className: '', iconSize: [16, 16], iconAnchor: [8, 8], html: '<div class="mm-scrub"></div>' }) }).addTo(map);
  } else scrubMarker.setLatLng(ll);
}

function highlightSpan(from, to) {
  fxLayer.clearLayers();
  const r = state.results[state.selected];
  if (!r || r.error) return;
  const pts = r.latlngs.slice(from, to + 1);
  if (pts.length < 2) return;
  L.polyline(pts, { pane: 'route', color: '#ffffff', weight: 9, opacity: 0.9, interactive: false }).addTo(fxLayer);
  L.polyline(pts, { pane: 'route', color: '#3fd2ff', weight: 5, opacity: 1, interactive: false }).addTo(fxLayer);
  map.flyToBounds(L.latLngBounds(pts), { ...fitPadding(), maxZoom: 18, duration: 0.6 });
  setTimeout(() => fxLayer.clearLayers(), 3500);
}

// ---------------------------------------------------------------------------
// Map interaction
// ---------------------------------------------------------------------------

function cellInfo(latlng) {
  const T = state.terrain;
  const { x, y } = latLonToCell(T, latlng.lat, latlng.lng);
  if (x < 0 || y < 0 || x >= T.width || y >= T.height) return null;
  const i = y * T.width + x, g = state.grid;
  return { x, y, i, elev: g.elev[i], slope: g.slopeDeg[i], sand: g.sandiness[i] >= LOOSE_SAND, los: state.viewshed ? !!state.viewshed[i] : null };
}

function onMapMove(e) {
  const c = cellInfo(e.latlng);
  const ll = `${num(Math.abs(e.latlng.lat), 5)}°${e.latlng.lat >= 0 ? 'N' : 'S'} ${num(Math.abs(e.latlng.lng), 5)}°E`;
  $('coords').textContent = c ? `${ll} · ${num(c.elev)} m · ${num(c.slope, 1)}°` : ll;
}

function onMapClick(e) {
  if (!state.terrain) return;
  closePops();
  const c = cellInfo(e.latlng);
  if (!c) return;
  const blocked = !Number.isFinite(c.elev) || c.slope > MAX_WALK_SLOPE;
  const div = document.createElement('div');
  div.innerHTML = `
    <div class="pp-t">${num(Math.abs(e.latlng.lat), 5)}°N, ${num(e.latlng.lng, 5)}°E</div>
    <div class="pp-m">
      <span>${t('pElev')} : ${num(c.elev, 1)} m</span>
      <span class="${blocked ? 'bad' : ''}">${t('maxSlope').replace(' max', '')} : ${num(c.slope, 1)}°${blocked ? ' — ' + t('lg_slope')[3] : ''}</span>
      ${c.sand ? `<span>${t('sand')}</span>` : ''}
      ${c.los != null ? `<span>${c.los ? '📡 ' + t('lg_view')[0] : '⚠ ' + t('lg_view')[1]}</span>` : ''}
    </div>`;
  const btn = document.createElement('button');
  btn.className = 'btn primary';
  btn.textContent = `＋ ${t('addStop')}`;
  btn.disabled = blocked;
  if (blocked) btn.style.opacity = 0.5;
  btn.onclick = () => { map.closePopup(); addCustomStop(c, e.latlng); };
  div.append(btn);
  L.popup({ className: 'mm-pop', closeButton: true, autoPanPaddingTopLeft: [panelW() + 30, 80] }).setLatLng(e.latlng).setContent(div).openOn(map);
}

function addCustomStop(c, latlng) {
  state.customN++;
  const id = `C${state.customN}`;
  state.targets.push({
    id, name: t('customStop', { n: state.customN }), x: c.x, y: c.y, lat: latlng.lat, lon: latlng.lng,
    value: 3, dwellMin: 15, custom: true, note: t('customNote'),
  });
  state.included.add(id);
  drawMarkers();
  replan();
}

// ---------------------------------------------------------------------------
// Panel rendering
// ---------------------------------------------------------------------------

function applyStaticText() {
  document.querySelectorAll('[data-i]').forEach((n) => { n.textContent = t(n.dataset.i); });
  $('tagline').textContent = t('appTagline');
  $('search').placeholder = t('search');
  $('lang').textContent = t('lang');
  $('btn-layers').setAttribute('aria-label', t('layers'));
  $('btn-in').setAttribute('aria-label', t('zoomIn'));
  $('btn-out').setAttribute('aria-label', t('zoomOut'));
  $('btn-fit').setAttribute('aria-label', t('recenter'));
  if (state.terrain) {
    const tag = $('dataset');
    tag.textContent = state.terrain.synthetic ? t('syntheticBanner') : t(DATASET === 'gale' ? 'realGale' : 'realData');
    tag.classList.toggle('synthetic', !!state.terrain.synthetic);
    tag.title = state.terrain.name || '';
  }
}

function renderPlan() {
  drawRoutes();
  drawMarkers();
  renderWaypoints();
  renderRoutes();
  renderSummary();
  renderSteps();
  renderGo();
  drawChart();
  if (state.place) openPlace(state.place, false);
}

function renderWaypoints() {
  const ol = $('waypoints');
  ol.replaceChildren();
  const r = cur();
  const order = r ? r.plan.order : [];
  const unreach = new Set(r ? r.plan.unreachable : []);
  const arrive = new Map((r?.analysis.stops ?? []).map((s) => [s.id, s]));
  const ids = [...order, ...[...state.included].filter((id) => !order.includes(id))];
  const row = (dot, dotCls, name, meta, opts = {}) => {
    const li = document.createElement('li');
    li.className = `wp ${opts.cls ?? ''}`;
    li.innerHTML = `<span class="wp-dot ${dotCls}">${dot}</span><div class="wp-body" tabindex="0"><span class="wp-name">${esc(name)}</span><span class="wp-meta">${meta ?? ''}</span></div>`;
    const body = li.querySelector('.wp-body');
    if (opts.onclick) { body.onclick = opts.onclick; body.onkeydown = (e) => { if (e.key === 'Enter') opts.onclick(); }; }
    if (opts.remove) {
      const x = document.createElement('button');
      x.className = 'wp-x'; x.type = 'button'; x.title = t('remove'); x.setAttribute('aria-label', `${t('remove')}: ${name}`);
      x.textContent = '✕';
      x.onclick = (e) => { e.stopPropagation(); opts.remove(); };
      body.append(x);
    }
    ol.append(li);
  };
  row('H', 'hab', `${t('from')} · ${t('habitat')}`, fmtClock(state.leaveMin), { onclick: () => openPlace('habitat') });
  ids.forEach((id, k) => {
    const x = state.targets.find((q) => q.id === id);
    if (!x) return;
    const a = arrive.get(id);
    const bad = unreach.has(id);
    row(bad ? '!' : k + 1, '', x.name, bad ? t('unreachable', { ids: '' }).replace(/[:：]\s*$/, '') : a ? fmtClock(state.leaveMin + toMarsMin(a.arriveMin)) : '',
      { cls: bad ? 'unreach' : '', onclick: () => openPlace(id), remove: () => toggleStop(id, false) });
  });
  row('+', 'add', t('addStop'), '', { cls: 'addrow', onclick: () => { $('search').focus(); showResults(''); } });
  if (r) row('H', 'hab', t('arriveHome'), fmtClock(state.leaveMin + toMarsMin(r.analysis.totals.totalTimeMin)), { onclick: () => openPlace('habitat') });
}

function renderConds() {
  const box = $('conds');
  box.replaceChildren();
  for (const k of COND_IDS) {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'cond';
    b.setAttribute('aria-pressed', String(state.conditions[k]));
    b.innerHTML = `<span class="ci">${COND_ICON[k]}</span><b>${t(k)}</b><small>${t(k + 'D')}</small>`;
    b.onclick = () => { state.conditions[k] = !state.conditions[k]; renderConds(); replan(); };
    box.append(b);
  }
}

function renderRoutes() {
  const box = $('routes');
  box.replaceChildren();
  if (!state.included.size) { box.innerHTML = `<p class="empty">${t('noStops')}</p>`; return; }
  const rs = MODE_IDS.map((m) => state.results[m]).filter((r) => r && !r.error);
  const best = {};
  if (rs.length === 3) {
    best.eco = rs.reduce((a, b) => (b.analysis.totals.o2UsedKg < a.analysis.totals.o2UsedKg ? b : a)).mode;
    best.safe = rs.reduce((a, b) => (b.analysis.totals.safetyScore > a.analysis.totals.safetyScore ? b : a)).mode;
    best.short = rs.reduce((a, b) => (b.analysis.totals.distanceM < a.analysis.totals.distanceM ? b : a)).mode;
  }
  for (const mode of MODE_IDS) {
    const r = state.results[mode];
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'route'; b.setAttribute('role', 'radio');
    b.setAttribute('aria-checked', String(state.selected === mode));
    b.title = t(`mode_${mode}_d`);
    if (!r) {
      b.classList.add('loading');
      b.innerHTML = `<span class="ri">${MODE_ICON[mode]}</span><span class="rt">${t('mode_' + mode)}</span><span class="rtime">…</span><span class="rs">${t('planning')}</span>`;
    } else if (r.error) {
      b.innerHTML = `<span class="ri">${MODE_ICON[mode]}</span><span class="rt">${t('mode_' + mode)}</span><span class="rtime over">—</span><span class="rs">${esc(r.error)}</span>`;
    } else {
      const T = r.analysis.totals;
      const badges = Object.entries(best).filter(([k, v]) => v === mode && k === mode).map(() => `<span class="badge">${t('best')}</span>`).join('');
      const over = !r.analysis.withinBudget;
      b.innerHTML = `<span class="ri">${MODE_ICON[mode]}</span>
        <span class="rt">${t('mode_' + mode)} ${badges}</span>
        <span class="rtime${over ? ' over' : ''}">${fmtDur(T.totalTimeMin)}<small>${t('returnAt', { t: fmtClock(state.leaveMin + toMarsMin(T.totalTimeMin)) })}</small></span>
        <span class="rs">${fmtKm(T.distanceM)} · ${num(T.o2UsedKg, 2)} kg O₂ · 🛡 ${T.safetyScore}</span>`;
    }
    b.onclick = () => selectMode(mode, true);
    box.append(b);
  }
}

function selectMode(mode, byUser) {
  if (byUser) state.userPicked = true;
  state.selected = mode;
  syncUrl();
  renderPlan();
}

const cur = () => { const r = state.results[state.selected]; return r && !r.error ? r : null; };

function gauge(frac, valText, unit, label, sub, color) {
  const R = 30, C = 2 * Math.PI * R;
  const f = Math.max(0, Math.min(1, frac));
  return `<div class="gauge"><svg viewBox="0 0 74 74"><circle class="g-bg" cx="37" cy="37" r="${R}"/>
    <circle class="g-fg" cx="37" cy="37" r="${R}" stroke="${color}" stroke-dasharray="${C}" stroke-dashoffset="${C * (1 - f)}"/>
    <text class="g-val" x="37" y="38" text-anchor="middle">${valText}</text><text class="g-unit" x="37" y="51" text-anchor="middle">${unit}</text></svg>
    <b>${label}</b><small>${sub}</small></div>`;
}
const lvlColor = (f) => (f > 1 ? 'var(--bad)' : f > 0.8 ? 'var(--warn)' : 'var(--ok)');

function renderSummary() {
  const box = $('summary');
  const r = cur();
  if (!r) { box.hidden = true; return; }
  box.hidden = false;
  const T = r.analysis.totals;
  const o2f = T.o2UsedKg / T.o2UsableKg, df = T.doseMSv / T.doseLimitMSv;
  const scoreColor = T.safetyScore >= 70 ? 'var(--ok)' : T.safetyScore >= 50 ? 'var(--warn)' : 'var(--bad)';
  let html = `<div class="gauges">
    ${gauge(o2f, `${Math.round(o2f * 100)}%`, 'O₂', t('o2'), t('o2Used', { used: num(T.o2UsedKg, 2), usable: num(T.o2UsableKg, 2) }), lvlColor(o2f))}
    ${gauge(df, num(T.doseMSv, 2), 'mSv', t('dose'), t('doseOf', { v: num(T.doseMSv, 2), lim: num(T.doseLimitMSv, 1) }), lvlColor(df))}
    ${gauge(T.safetyScore / 100, T.safetyScore, '/100', t('safety'), t('mode_' + r.mode), scoreColor)}
  </div>`;
  const tb = r.analysis.turnBackIndex;
  if (tb != null) {
    html += `<div class="callout bad"><span class="co-i">↩</span><div><b>${t('turnBack')}</b><br>${t('turnBackAt', { t: fmtClock(clockAt(r, tb)), d: num(r.analysis.profile.d_m[tb] / 1000, 2) })}</div></div>`;
  } else {
    html += `<div class="callout good"><span class="co-i">✓</span><div>${t('turnBackNone')}</div></div>`;
  }
  const drop = state.results.eco?.plan?.dropSuggestion;
  if (!r.analysis.withinBudget && drop) {
    html += `<div class="callout warn"><span class="co-i">💡</span><div>${t('dropHint', { name: esc(drop.name), o2: num(drop.o2SavedKg, 2) })}</div><button type="button" id="drop-btn">${t('dropBtn')}</button></div>`;
  }
  if (r.plan.unreachable.length) {
    const names = r.plan.unreachable.map((id) => state.targets.find((x) => x.id === id)?.name ?? id).join(', ');
    html += `<div class="callout bad"><span class="co-i">⛔</span><div>${t('unreachable', { ids: esc(names) })}</div></div>`;
  }
  const share = T.slopeShare;
  html += `<div><div class="slopebar">${SLOPE_CLASSES.map((c, i) => `<span style="width:${(share[c.id] * 100).toFixed(1)}%;background:${SLOPE_COLORS[i]}" title="${c.id}° · ${Math.round(share[c.id] * 100)}%"></span>`).join('')}</div>
    <div class="slopebar-legend"><span>0°</span><span>10°</span><span>15°</span><span>20°+</span></div></div>`;
  html += `<dl class="metrics">
    <div><dt>${t('distance')}</dt><dd>${fmtKm(T.distanceM)}</dd></div>
    <div><dt>${t('time')}</dt><dd>${fmtDur(T.totalTimeMin)}</dd></div>
    <div><dt>${t('climb')}</dt><dd>${num(T.climbM)} m</dd></div>
    <div><dt>${t('maxSlope')}</dt><dd>${num(T.maxSlopeDeg, 1)}°</dd></div>
    <div><dt>${t('los')}</dt><dd>${Math.round(T.losShare * 100)} %</dd></div>
    <div><dt>${t('sand')}</dt><dd>${Math.round(T.sandShare * 100)} %</dd></div>
    <div><dt>${t('range')}</dt><dd>${fmtKm(T.maxRangeM)}</dd></div>
    <div><dt>${t('walkback')}</dt><dd>${fmtDur(T.maxWalkbackMin)}</dd></div>
    <div><dt>${t('margin')}</dt><dd>${num(T.minO2MarginKg, 2)} kg</dd></div>
    <div><dt>${t('value')}</dt><dd>${T.scienceValue}</dd></div>
  </dl>`;
  box.innerHTML = html;
  const db = $('drop-btn');
  if (db) db.onclick = () => toggleStop(drop.id, false);
}

const TURN_ICON = {
  depart: '<svg viewBox="0 0 24 24"><circle cx="12" cy="17" r="3"/><path d="M12 14V4m-4 4 4-4 4 4"/></svg>',
  straight: '<svg viewBox="0 0 24 24"><path d="M12 20V4m-5 5 5-5 5 5"/></svg>',
  left: '<svg viewBox="0 0 24 24"><path d="M16 20v-7a3 3 0 0 0-3-3H5m4-4-4 4 4 4"/></svg>',
  right: '<svg viewBox="0 0 24 24"><path d="M8 20v-7a3 3 0 0 1 3-3h8m-4-4 4 4-4 4"/></svg>',
  'slight-left': '<svg viewBox="0 0 24 24"><path d="M14 20v-6L8 6m0 6V6h6"/></svg>',
  'slight-right': '<svg viewBox="0 0 24 24"><path d="M10 20v-6l6-8m0 6V6h-6"/></svg>',
  uturn: '<svg viewBox="0 0 24 24"><path d="M8 20V9a4 4 0 0 1 8 0v4m-3-3 3 3 3-3"/></svg>',
  arrive: '<svg viewBox="0 0 24 24"><path d="M12 21s-6-5.7-6-10.5a6 6 0 0 1 12 0C18 15.3 12 21 12 21Z"/><circle cx="12" cy="10.5" r="2"/></svg>',
};

function renderSteps() {
  const box = $('steps');
  box.replaceChildren();
  const r = cur();
  if (!r) { box.innerHTML = `<p class="empty">${state.planning ? t('planning') : t('noStops')}</p>`; return; }
  const nameOf = (id) => (id === 'habitat' ? t('habitat') : state.targets.find((x) => x.id === id)?.name ?? id);
  r.steps.forEach((leg, li) => {
    const d = document.createElement('details');
    d.className = 'leg';
    if (li === 0) d.open = true;
    const toHab = leg.to === 'habitat';
    d.innerHTML = `<summary><span class="leg-n ${toHab ? 'hab' : ''}">${toHab ? 'H' : li + 1}</span>
      <span class="leg-t">${esc(nameOf(leg.from))} → ${esc(nameOf(leg.to))}</span>
      <span class="leg-m">${fmtKm(leg.distM)} · ${fmtDur(leg.walkMin)}</span></summary>`;
    const ol = document.createElement('ol');
    for (const s of leg.steps) {
      const li2 = document.createElement('li');
      if (s.kind === 'arrive') {
        const stop = r.analysis.stops.find((q) => q.id === s.to);
        li2.className = 'step arrive';
        li2.innerHTML = `<span class="si">${TURN_ICON.arrive}</span><span class="st">${toHab ? t('arriveHome') : t('arrive', { to: esc(nameOf(s.to)) })}</span>
          <span class="sm">${stop ? `${fmtClock(state.leaveMin + toMarsMin(stop.arriveMin))} · ${t('work', { n: stop.dwellMin })}` : fmtClock(state.leaveMin + toMarsMin(r.analysis.totals.totalTimeMin))}</span>`;
        li2.onclick = () => { if (!toHab) openPlace(s.to); map.flyTo(r.latlngs[s.toIndex], Math.max(map.getZoom(), 17), { duration: 0.6 }); };
      } else {
        const dir = dirName(s.heading);
        const text = s.kind === 'depart' ? t('depart', { from: esc(nameOf(leg.from)), dir }) : t(`turn_${s.turn}`, { dir });
        const slopeCls = s.maxSlopeDeg > 20 ? 'nogo' : s.maxSlopeDeg > 15 ? 'steep' : '';
        li2.className = 'step';
        li2.innerHTML = `<span class="si">${TURN_ICON[s.kind === 'depart' ? 'depart' : s.turn]}</span><span class="st">${text}</span>
          <span class="sm">${fmtM(s.distM)} · ${fmtDur(s.walkMin)} · ↑${num(s.climbM)} m ↓${num(s.descentM)} m · <span class="${slopeCls}">${t('maxSlope').toLowerCase()} ${num(s.maxSlopeDeg)}°</span></span>`;
        li2.onclick = () => highlightSpan(s.fromIndex, s.toIndex);
        li2.onmouseenter = () => setScrub(s.fromIndex);
        li2.onmouseleave = () => setScrub(null);
      }
      ol.append(li2);
    }
    d.append(ol);
    box.append(d);
  });
}

function verdict(r) {
  const reasons = [];
  let level = 'GO';
  const up = (l) => { const rank = { GO: 0, CAUTION: 1, 'NO-GO': 2 }; if (rank[l] > rank[level]) level = l; };
  if (!r) return { level: '…', reasons: [] };
  const T = r.analysis.totals;
  if (r.analysis.violations.includes('oxygen')) { up('NO-GO'); reasons.push(t('r_o2')); }
  if (r.analysis.violations.includes('radiation')) { up('NO-GO'); reasons.push(t('r_dose')); }
  if (state.conditions.solarEvent) { up('NO-GO'); reasons.push(t('r_solar')); }
  if (state.conditions.dustStorm) { up('CAUTION'); reasons.push(t('r_dust')); }
  if (T.minO2MarginKg >= 0 && T.minO2MarginKg < 0.1 * T.o2UsableKg) { up('CAUTION'); reasons.push(t('r_margin')); }
  if (T.safetyScore < 50) { up('CAUTION'); reasons.push(t('r_score')); }
  if (state.leaveMin + toMarsMin(T.totalTimeMin) > EVA_WINDOW.end) { up('CAUTION'); reasons.push(t('r_window', { end: fmtClock(EVA_WINDOW.end) })); }
  if (!reasons.length) reasons.push(t('r_ok'));
  return { level, reasons };
}

function renderGo() {
  const r = cur();
  const v = verdict(r);
  const chip = $('go');
  chip.dataset.level = v.level;
  chip.querySelector('.go-level').textContent = v.level === 'GO' ? t('go') : v.level === 'CAUTION' ? t('caution') : v.level === 'NO-GO' ? t('nogo') : '…';
  chip.querySelector('.go-reason').textContent = r ? v.reasons[0] : state.planning ? t('planning') : t('noStops');
  $('go-pop').innerHTML = `<ul>${v.reasons.map((x) => `<li>${esc(x)}</li>`).join('')}</ul><p>${t(DATASET === 'gale' ? 'doseGale' : 'doseNote')} ${t('windowNote')} ${t('scoreNote')}</p>`;
}

// ---------------------------------------------------------------------------
// Place card
// ---------------------------------------------------------------------------

function openPlace(id, fly = true) {
  state.place = id;
  const card = $('place');
  const isHab = id === 'habitat';
  const x = isHab ? state.habitat : state.targets.find((q) => q.id === id);
  if (!x) { closePlace(); return; }
  $('layers-pop').hidden = true; $('btn-layers').setAttribute('aria-expanded', 'false');
  const g = state.grid, i = x.y * state.terrain.width + x.x;
  const r = cur();
  const a = r?.analysis.stops.find((s) => s.id === id);
  const inc = state.included.has(id);
  const chips = [];
  if (!isHab) {
    if (x.sol != null) chips.push(`${t('sol')} <b>${x.sol}</b>`);
    if (x.placeholder) chips.push(`⚠ <b>${t('placeholder')}</b>`);
    chips.push(`${t('value')} <b>${x.value}/10</b>`);
    chips.push(`${t('dwell')} <b>${x.dwellMin} min</b>`);
  }
  chips.push(`${t('pElev')} <b>${num(g.elev[i])} m</b>`);
  chips.push(`${t('maxSlope').replace(/ max|max /i, '')} <b>${num(g.slopeDeg[i], 1)}°</b>`);
  if (state.viewshed && !isHab) chips.push(state.viewshed[i] ? '📡 <b>LOS</b>' : '⚠ <b>no LOS</b>');
  card.innerHTML = `<div class="pl-hero"></div><div class="pl-in">
    <div class="pl-top"><h3>${esc(isHab ? t('habitat') : x.name)}</h3><button class="pl-x" type="button" aria-label="Close">✕</button></div>
    <div class="chips">${chips.map((c) => `<span class="chip">${c}</span>`).join('')}</div>
    ${a ? `<div class="callout good"><span class="co-i">🕑</span><div>${t('inRoute')} · ${fmtClock(state.leaveMin + toMarsMin(a.arriveMin))} · ${t('pO2')} ${num(a.arriveO2LeftKg, 2)} kg</div></div>` : ''}
    ${isHab ? '' : `<div class="pl-act"><button type="button" class="btn ${inc ? '' : 'primary'}" id="pl-toggle">${inc ? t('remove') : '＋ ' + t('add')}</button></div>`}
    <div id="pl-photos"></div>
    ${isHab && x.note ? `<p class="pl-src">${esc(x.note)}</p>` : ''}
    ${x.source ? `<p class="pl-src"><a href="${encodeURI(x.source)}" target="_blank" rel="noopener">${esc(x.source.replace(/^https?:\/\//, '').slice(0, 60))}</a></p>` : ''}
    <div class="pl-coords">${num(x.lat, 5)}°N, ${num(x.lon, 5)}°E</div></div>`;
  card.hidden = false;
  card.querySelector('.pl-x').onclick = closePlace;
  const tg = $('pl-toggle');
  if (tg) tg.onclick = () => toggleStop(id, !inc);
  if (!isHab) {
    renderPhotos($('pl-photos'), x);
    const credit = x.photos?.[0]?.credit;
    if (credit) $('pl-photos').querySelectorAll('.pb-credit').forEach((n) => { n.textContent = `Credit: ${credit}`; });
  }
  if (fly) {
    const small = matchMedia('(max-width: 820px)').matches;
    const pad = small ? { paddingTopLeft: [20, 70], paddingBottomRight: [20, innerHeight * 0.5] }
      : { paddingTopLeft: [panelW() + 40, 70], paddingBottomRight: [card.getBoundingClientRect().width + 100, sheetH() + 40] };
    map.flyToBounds(L.latLngBounds([[x.lat, x.lon], [x.lat, x.lon]]), { ...pad, maxZoom: Math.max(map.getZoom(), 16.5), duration: 0.7 });
  }
  drawMarkers();
}
function openPlaceRoute() { document.getElementById('summary').scrollIntoView({ behavior: 'smooth', block: 'start' }); }
function closePlace() { state.place = null; $('place').hidden = true; drawMarkers(); }

function toggleStop(id, on) {
  if (on) state.included.add(id); else state.included.delete(id);
  if (!on && state.targets.find((x) => x.id === id)?.custom) state.targets = state.targets.filter((x) => x.id !== id);
  if (state.place === id && !state.targets.find((x) => x.id === id)) closePlace();
  drawMarkers();
  replan();
}

// ---------------------------------------------------------------------------
// Search
// ---------------------------------------------------------------------------

let srIndex = -1, srItems = [];
function showResults(q) {
  const ul = $('search-results');
  const s = q.trim().toLowerCase();
  const all = [{ id: 'habitat', name: t('habitat'), note: state.habitat.name }, ...state.targets];
  srItems = all.filter((x) => !s || `${x.name} ${x.id} ${x.note ?? ''}`.toLowerCase().includes(s)).slice(0, 8);
  srIndex = srItems.length ? 0 : -1;
  ul.innerHTML = srItems.length ? srItems.map((x, i) => {
    const th = x.photos?.[0]?.thumb || x.photos?.[0]?.url;
    const sub = x.id === 'habitat' ? esc(x.note ?? '') : `${x.sol != null ? `${t('sol')} ${x.sol} · ` : ''}${t('value')} ${x.value}/10${state.included.has(x.id) ? ' · ✓' : ''}`;
    return `<li role="option" data-id="${esc(x.id)}" aria-selected="${i === 0}"><span class="sr-ico">${th ? `<img src="${esc(th)}" alt="" loading="lazy">` : esc(x.id === 'habitat' ? 'H' : x.id)}</span><span><div class="sr-t">${esc(x.name)}</div><div class="sr-s">${sub}</div></span></li>`;
  }).join('') : `<li class="sr-empty">${t('searchEmpty')}</li>`;
  ul.hidden = false;
  ul.querySelectorAll('li[data-id]').forEach((li) => { li.onmousedown = (e) => { e.preventDefault(); chooseResult(li.dataset.id); }; });
}
function chooseResult(id) {
  $('search-results').hidden = true;
  $('search').value = '';
  $('search').blur();
  openPlace(id);
}

// ---------------------------------------------------------------------------
// Layers popover
// ---------------------------------------------------------------------------

function renderLayersPop() {
  const pop = $('layers-pop');
  const sw = (c) => `<i style="background:${c}"></i>`;
  const lg = (labels, colors) => `<div class="lg">${labels.map((l, i) => `<span>${sw(colors[i])}${l}</span>`).join('')}</div>`;
  const ovs = [
    ['hillshade', t('l_hillshade'), '', 'HiRISE DTM'],
    ['slope', t('l_slope'), lg(t('lg_slope'), ['#7ee08a', '#ffe066', '#ff9f43', '#ff3b4e']), 'HiRISE DTM · NTRS 20210000827'],
    ['hazard', t('l_hazard'), lg(t('lg_hazard'), ['#ff3b4e', '#ff9f43', '#ffd678']), 'DTM slope + THEMIS TI'],
    ['sand', t('l_sand'), '', `THEMIS TI ≤ ${CONFIG.terrain.looseSandTI}`],
    ['viewshed', t('l_viewshed'), lg(t('lg_view'), ['#5ee7ff', '#3a1a5e']), '3 m antenna → 2 m'],
    ['traverse', DATASET === 'gale' ? t('l_traverse').replace('Perseverance', 'Curiosity') : t('l_traverse'), '', 'NASA/JPL MMGIS'],
  ].filter(([k]) => overlays[k] || (k === 'traverse' && baseLayers.traverse));
  pop.innerHTML = `<h3>${t('base')}</h3><div class="bases">
      <button type="button" class="base" data-b="hirise" aria-pressed="${state.base === 'hirise'}"><i style="background:linear-gradient(135deg,#5a4434,#a98463 50%,#3d2c22)"></i>HiRISE</button>
      <button type="button" class="base" data-b="ctx" aria-pressed="${state.base === 'ctx'}" ${baseLayers.ctx ? '' : 'hidden'}><i style="background:linear-gradient(135deg,#3d3a3a,#7a7470 50%,#2b2928)"></i>CTX</button>
      <button type="button" class="base" data-b="none" aria-pressed="${state.base === 'none'}"><i style="background:radial-gradient(circle at 30% 30%,#1b1440,#05060d)"></i>${t('none')}</button>
    </div><h3>${t('overlays')}</h3>
    ${ovs.map(([k, name, legend, src]) => `<div class="ov"><label><input type="checkbox" data-o="${k}" ${state.layersOn[k] ? 'checked' : ''}>${name}</label>${legend}<div class="src">${src}</div></div>`).join('')}`;
  pop.querySelectorAll('[data-b]').forEach((b) => { b.onclick = () => { state.base = b.dataset.b; applyBase(); renderLayersPop(); }; });
  pop.querySelectorAll('[data-o]').forEach((c) => { c.onchange = () => setOverlay(c.dataset.o, c.checked); });
}

// ---------------------------------------------------------------------------
// Profile chart
// ---------------------------------------------------------------------------

let chartGeom = null;
function drawChart() {
  const cv = $('chart');
  const wrap = cv.parentElement;
  const W = wrap.clientWidth, H = wrap.clientHeight;
  if (W < 20 || H < 20) return;
  const dpr = devicePixelRatio || 1;
  cv.width = W * dpr; cv.height = H * dpr;
  const ctx = cv.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, W, H);
  const legend = $('sheet-legend');
  const r = cur();
  if (!r) {
    chartGeom = null;
    legend.innerHTML = '';
    ctx.fillStyle = '#6a7396'; ctx.font = '13px Inter, sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(state.planning ? t('planning') : t('noStops'), W / 2, H / 2);
    return;
  }
  legend.innerHTML = `<span><i style="background:linear-gradient(90deg,#7ee08a,#ffe066,#ff9f43)"></i>${t('pElev')}</span>
    <span><i style="background:#3fd2ff"></i>${t('pO2')}</span><span><i style="background:repeating-linear-gradient(90deg,#fff 0 4px,transparent 4px 7px)"></i>${t('pHome')}</span>
    <span><i style="background:#ff4d5e"></i>${t('turnBack')}</span>`;
  const P = r.analysis.profile, n = P.d_m.length, T = r.analysis.totals;
  const pad = { l: 46, r: 46, t: 14, b: 20 };
  const iw = W - pad.l - pad.r, ih = H - pad.t - pad.b;
  const dMax = P.d_m[n - 1] || 1;
  let eMin = Infinity, eMax = -Infinity;
  for (let i = 0; i < n; i++) { eMin = Math.min(eMin, P.elev_m[i]); eMax = Math.max(eMax, P.elev_m[i]); }
  const span = Math.max(10, eMax - eMin);
  eMin -= span * 0.1; eMax += span * 0.15;
  const X = (d) => pad.l + (d / dMax) * iw;
  const YE = (e) => pad.t + ih - ((e - eMin) / (eMax - eMin)) * ih;
  const cap = T.o2CapacityKg;
  const YO = (kg) => pad.t + ih - (kg / cap) * ih;
  chartGeom = { X, pad, iw, n, P, dMax };

  // grid + axes
  ctx.strokeStyle = 'rgba(170,190,255,0.08)'; ctx.lineWidth = 1;
  ctx.fillStyle = '#6a7396'; ctx.font = '10.5px Inter, sans-serif';
  for (let k = 0; k <= 4; k++) {
    const y = pad.t + (ih * k) / 4;
    ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(W - pad.r, y); ctx.stroke();
    ctx.textAlign = 'right'; ctx.fillText(`${num(eMax - ((eMax - eMin) * k) / 4)} m`, pad.l - 6, y + 3);
    ctx.textAlign = 'left'; ctx.fillText(`${num(cap - (cap * k) / 4, 2)} kg`, W - pad.r + 6, y + 3);
  }
  const stepKm = dMax > 4000 ? 1000 : dMax > 1500 ? 500 : 250;
  ctx.textAlign = 'center';
  for (let d = 0; d <= dMax; d += stepKm) ctx.fillText(`${num(d / 1000, d % 1000 ? 2 : 0)} km`, X(d), H - 5);

  // reserve band
  const reserve = cap - T.o2UsableKg;
  ctx.fillStyle = 'rgba(255,77,94,0.07)';
  ctx.fillRect(pad.l, YO(reserve), iw, YO(0) - YO(reserve));

  // elevation area
  const grad = ctx.createLinearGradient(0, pad.t, 0, pad.t + ih);
  grad.addColorStop(0, 'rgba(255,122,69,0.38)'); grad.addColorStop(1, 'rgba(255,122,69,0.02)');
  ctx.beginPath(); ctx.moveTo(X(0), pad.t + ih);
  for (let i = 0; i < n; i++) ctx.lineTo(X(P.d_m[i]), YE(P.elev_m[i]));
  ctx.lineTo(X(dMax), pad.t + ih); ctx.closePath(); ctx.fillStyle = grad; ctx.fill();
  // elevation line coloured by slope class
  ctx.lineWidth = 2.2; ctx.lineJoin = 'round';
  for (let i = 1; i < n; i++) {
    const s = P.slope_deg[i];
    ctx.strokeStyle = s > 20 ? '#ff3b4e' : s > 15 ? '#ff9f43' : s > 10 ? '#ffe066' : '#7ee08a';
    ctx.beginPath(); ctx.moveTo(X(P.d_m[i - 1]), YE(P.elev_m[i - 1])); ctx.lineTo(X(P.d_m[i]), YE(P.elev_m[i])); ctx.stroke();
  }
  // O2 needed to get home (+ reserve), dashed
  ctx.setLineDash([4, 3]); ctx.strokeStyle = 'rgba(255,255,255,0.75)'; ctx.lineWidth = 1.4;
  ctx.beginPath();
  for (let i = 0; i < n; i++) { const y = YO(P.o2_home_kg[i] + reserve); i ? ctx.lineTo(X(P.d_m[i]), y) : ctx.moveTo(X(P.d_m[i]), y); }
  ctx.stroke(); ctx.setLineDash([]);
  // danger where O2 left < needed
  ctx.fillStyle = 'rgba(255,77,94,0.35)';
  for (let i = 1; i < n; i++) {
    const need = P.o2_home_kg[i] + reserve;
    if (P.o2_left_kg[i] < need) ctx.fillRect(X(P.d_m[i - 1]), YO(need), Math.max(1, X(P.d_m[i]) - X(P.d_m[i - 1])), YO(P.o2_left_kg[i]) - YO(need));
  }
  // O2 left
  ctx.strokeStyle = '#3fd2ff'; ctx.lineWidth = 2.4; ctx.shadowColor = 'rgba(63,210,255,0.7)'; ctx.shadowBlur = 8;
  ctx.beginPath();
  for (let i = 0; i < n; i++) { const y = YO(Math.max(0, P.o2_left_kg[i])); i ? ctx.lineTo(X(P.d_m[i]), y) : ctx.moveTo(X(P.d_m[i]), y); }
  ctx.stroke(); ctx.shadowBlur = 0;
  // stops
  r.analysis.stops.forEach((s, k) => {
    const x = X(P.d_m[s.pathIndex]);
    ctx.strokeStyle = 'rgba(255,179,107,0.35)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x, pad.t); ctx.lineTo(x, pad.t + ih); ctx.stroke();
    ctx.fillStyle = '#ff7a45'; ctx.beginPath(); ctx.arc(x, pad.t + 6, 8, 0, 7); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = '600 10px "Space Grotesk", sans-serif'; ctx.textAlign = 'center'; ctx.fillText(k + 1, x, pad.t + 9.5);
  });
  // turn-back
  const tb = r.analysis.turnBackIndex;
  if (tb != null) {
    const x = X(P.d_m[tb]);
    ctx.strokeStyle = '#ff4d5e'; ctx.lineWidth = 2; ctx.setLineDash([5, 4]);
    ctx.beginPath(); ctx.moveTo(x, pad.t); ctx.lineTo(x, pad.t + ih); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = '#ff4d5e'; ctx.font = '600 10.5px Inter, sans-serif'; ctx.textAlign = 'left';
    ctx.fillText(`↩ ${fmtClock(clockAt(r, tb))}`, Math.min(x + 5, W - pad.r - 50), pad.t + ih - 6);
  }
  // hover crosshair
  if (state.hoverIdx != null && state.hoverIdx < n) {
    const i = state.hoverIdx, x = X(P.d_m[i]);
    ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x, pad.t); ctx.lineTo(x, pad.t + ih); ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x, YE(P.elev_m[i]), 4, 0, 7); ctx.fill();
    ctx.fillStyle = '#3fd2ff'; ctx.beginPath(); ctx.arc(x, YO(Math.max(0, P.o2_left_kg[i])), 4, 0, 7); ctx.fill();
  }
}

function chartHover(e) {
  const tip = $('chart-tip');
  const r = cur();
  if (!chartGeom || !r) { tip.hidden = true; return; }
  const rect = $('chart').getBoundingClientRect();
  const px = e.clientX - rect.left;
  const { pad, iw, P, n, dMax } = chartGeom;
  const d = Math.max(0, Math.min(1, (px - pad.l) / iw)) * dMax;
  let lo = 0, hi = n - 1;
  while (lo < hi) { const mid = (lo + hi) >> 1; if (P.d_m[mid] < d) lo = mid + 1; else hi = mid; }
  const i = lo;
  setScrub(i);
  drawChart();
  tip.hidden = false;
  tip.innerHTML = `<b>${fmtKm(P.d_m[i])}</b> · ${fmtClock(clockAt(r, i))} · ${num(P.elev_m[i])} m · ${num(P.slope_deg[i], 1)}°<br>
    O₂ ${num(P.o2_left_kg[i], 2)} kg ${t('left')} · ${num(P.o2_home_kg[i], 2)} kg ${t('home')} · ↩ ${fmtDur(P.walkback_min[i])} · ${P.los[i] ? '📡' : '⚠ no LOS'}`;
  const tw = tip.offsetWidth;
  tip.style.left = `${Math.max(0, Math.min(rect.width - tw, px - tw / 2))}px`;
}

// ---------------------------------------------------------------------------
// Sources
// ---------------------------------------------------------------------------

function renderSources() {
  const T = state.terrain;
  const items = [
    ...(T.sources ?? []).map((s) => [s.name, s.url]),
    ['NASA Mars Trek — HiRISE 25 cm / CTX 6 m mosaics (NASA/JPL-Caltech/UArizona/MSSS)', 'https://trek.nasa.gov/mars/'],
    ['Perseverance raw images — NASA/JPL-Caltech/ASU', 'https://mars.nasa.gov/mars2020/multimedia/raw-images/'],
    ['Perseverance traverse — NASA/JPL MMGIS', 'https://mars.nasa.gov/mmgis-maps/M20/Layers/json/M20_traverse.json'],
    ['Curiosity RAD surface dose 0.64 mSv/day — Hassler et al. 2014, Science 343', 'https://doi.org/10.1126/science.1244797'],
    ['NASA xEVA concept: 20° max walkable slope, 2 km radius — NTRS 20210000827', 'https://ntrs.nasa.gov/citations/20210000827'],
    ['Tobler (1993) hiking function — walking speed vs grade', null],
  ];
  $('sources-body').innerHTML = `<ul>${items.map(([n, u]) => `<li>${u ? `<a href="${encodeURI(u)}" target="_blank" rel="noopener">${esc(n)}</a>` : esc(n)}</li>`).join('')}</ul>
    <p>${t(DATASET === 'gale' ? 'doseGale' : 'doseNote')}</p><p>${t('windowNote')}</p><p>${t('scoreNote')}</p>
    <p>Suit O₂ capacity ${CONFIG.suit.o2CapacityKg} kg, reserve ${CONFIG.suit.reserveFraction * 100} %, dose limit ${CONFIG.radiation.walkLimitMSv} mSv/EVA: ASSUMPTION values from js/config.js.</p>`;
}

// ---------------------------------------------------------------------------
// UI wiring
// ---------------------------------------------------------------------------

function closePops() {
  $('layers-pop').hidden = true; $('btn-layers').setAttribute('aria-expanded', 'false');
  $('go-pop').hidden = true; $('go').setAttribute('aria-expanded', 'false');
}

function wireUi() {
  applyStaticText();
  $('lang').onclick = () => {
    setLang(getLang() === 'fr' ? 'en' : 'fr');
    applyStaticText(); renderConds(); renderSources(); renderPlan();
    if (!$('layers-pop').hidden) renderLayersPop();
  };
  $('btn-in').onclick = () => map.zoomIn();
  $('btn-out').onclick = () => map.zoomOut();
  $('btn-fit').onclick = () => map.flyToBounds(areaBounds(), { ...fitPadding(), duration: 0.6 });
  $('btn-layers').onclick = () => {
    const pop = $('layers-pop');
    const open = pop.hidden;
    closePops();
    if (open) { $('place').hidden = true; renderLayersPop(); pop.hidden = false; $('btn-layers').setAttribute('aria-expanded', 'true'); }
  };
  $('go').onclick = () => { const p = $('go-pop'); const open = p.hidden; closePops(); p.hidden = !open; $('go').setAttribute('aria-expanded', String(open)); };
  $('leave').onchange = (e) => { state.leaveMin = toMin(e.target.value || '09:00'); syncUrl(); renderPlan(); };

  const s = $('search');
  s.oninput = () => showResults(s.value);
  s.onfocus = () => showResults(s.value);
  s.onblur = () => setTimeout(() => { $('search-results').hidden = true; }, 120);
  s.onkeydown = (e) => {
    const lis = [...$('search-results').querySelectorAll('li[data-id]')];
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      srIndex = (srIndex + (e.key === 'ArrowDown' ? 1 : -1) + lis.length) % Math.max(1, lis.length);
      lis.forEach((li, i) => li.setAttribute('aria-selected', String(i === srIndex)));
    } else if (e.key === 'Enter' && srItems[srIndex]) chooseResult(srItems[srIndex].id);
    else if (e.key === 'Escape') { s.blur(); }
  };

  const cv = $('chart');
  cv.addEventListener('pointermove', chartHover);
  cv.addEventListener('pointerleave', () => { $('chart-tip').hidden = true; setScrub(null); drawChart(); });
  cv.addEventListener('click', () => { const r = cur(); if (r && state.hoverIdx != null) map.panTo(r.latlngs[state.hoverIdx]); });
  new ResizeObserver(() => drawChart()).observe(cv.parentElement);

  // Small screens: the profile lives inside the bottom-sheet panel.
  const mq = matchMedia('(max-width: 820px)');
  const place = () => {
    const sheet = $('sheet');
    if (mq.matches) $('summary').after(sheet); else document.body.insertBefore(sheet, $('hud'));
    drawChart();
  };
  mq.addEventListener('change', place); place();
  $('grab').onclick = () => $('panel').classList.toggle('collapsed');
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { closePops(); closePlace(); } });
}

// ---------------------------------------------------------------------------
// Scale bar (Mars radius, not Earth's: Leaflet's own scale would be wrong by ~1.9×)
// ---------------------------------------------------------------------------

function updateScale() {
  const b = map.getBounds(), h = map.getSize().y;
  const mPerPx = ((b.getNorth() - b.getSouth()) * Math.PI / 180 * 3389500) / h;
  const target = mPerPx * 90;
  const pow = 10 ** Math.floor(Math.log10(target));
  const nice = [1, 2, 5, 10].map((k) => k * pow).filter((v) => v <= target).pop() ?? pow;
  $('scale-bar').style.width = `${nice / mPerPx}px`;
  $('scale-label').textContent = nice >= 1000 ? `${num(nice / 1000)} km` : `${num(nice)} m`;
}

// ---------------------------------------------------------------------------
// Starfield
// ---------------------------------------------------------------------------

function drawStars() {
  const cv = $('stars');
  const paint = () => {
    const dpr = devicePixelRatio || 1;
    cv.width = innerWidth * dpr; cv.height = innerHeight * dpr;
    const ctx = cv.getContext('2d');
    ctx.scale(dpr, dpr);
    let seed = 7;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const n = Math.round((innerWidth * innerHeight) / 2600);
    for (let i = 0; i < n; i++) {
      const x = rnd() * innerWidth, y = rnd() * innerHeight, r = rnd() ** 3 * 1.4 + 0.25;
      const hue = rnd() < 0.15 ? '255,200,170' : rnd() < 0.3 ? '170,210,255' : '255,255,255';
      ctx.fillStyle = `rgba(${hue},${0.25 + rnd() * 0.65})`;
      ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
    }
  };
  paint();
  addEventListener('resize', paint);
}

// ---------------------------------------------------------------------------
// Formatting
// ---------------------------------------------------------------------------

function esc(s) { return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
function fmtDur(min) {
  if (!Number.isFinite(min)) return '—';
  const m = Math.round(min);
  if (m < 60) return `${m} min`;
  return `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, '0')}`;
}
const fmtKm = (m) => (m >= 1000 ? `${num(m / 1000, 2)} km` : `${num(m)} m`);
const fmtM = (m) => (m >= 1000 ? `${num(m / 1000, 2)} km` : `${num(Math.round(m / 10) * 10)} m`);
const toMin = (hhmm) => { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m; };
/** Earth minutes of walking -> LMST minutes on the Mars clock. */
const toMarsMin = (earthMin) => (earthMin * 60) / MARS_MINUTE_S;
function fmtClock(lmstMin) {
  const m = ((Math.round(lmstMin) % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}
const clockAt = (r, i) => state.leaveMin + toMarsMin(r.analysis.profile.t_min[i]);

function showBanner(msg, isError) {
  const b = $('banner');
  b.textContent = msg; b.hidden = !msg; b.classList.toggle('error', !!isError);
}
function hideLoader() { $('loader').classList.add('done'); setTimeout(() => $('loader').remove(), 700); }

boot();
