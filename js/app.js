// Marswalk Budget — app entry: loads data, runs the planner off the main thread, wires the UI.
// Owner: UI lane (Claude 1). Drawing helpers live in js/render.js.

import { latLonToCell, planWalk } from './engine.js';
import { CONFIG } from './config.js';
import { renderPhotos } from './photos.js';
import { addBaseLayers } from './basemap.js';
import {
  el, fmtClock, fmtDuration, fmtKg, fmtMSv, cellLatLng, terrainBounds,
  LAYER_INFO, rampCss, paintHillshade, paintSlope, paintScalar, imageLayer,
  stopIcon, habitatIcon, turnBackIcon, pathTimeline, renderBudget, renderChart,
} from './render.js';

const L = window.L;
const $ = (id) => document.getElementById(id);

const DATASET = new URLSearchParams(location.search).get('data') === 'real' ? 'real' : 'demo';
const DATA_DIR = new URL(`../data/${DATASET}/`, import.meta.url);

const CONDITIONS = [
  { key: 'dustStorm', name: 'Dust storm' },
  { key: 'solarEvent', name: 'Solar particle event' },
  { key: 'heavyKit', name: 'Heavy sample kit' },
];

const state = {
  terrain: null,
  habitat: null,
  targets: [],            // all targets, incl. ones the user added
  included: new Set(),    // ids the astronaut wants to visit
  conditions: {},
  plan: null,
  timeline: null,
  selectedId: null,
  customCount: 0,
};

let map, overlays = {}, routeLayer, markerLayer;

// ---------------------------------------------------------------------------
// Planner: Web Worker (module worker from a Blob that imports engine.js), with
// a main-thread fallback if module workers are unavailable.
// ---------------------------------------------------------------------------

const planner = (() => {
  let worker = null, seq = 0;
  const pending = new Map();
  try {
    const engineUrl = new URL('./engine.js', import.meta.url).href;
    const src = `
      import { planWalk } from ${JSON.stringify(engineUrl)};
      let terrain = null;
      self.onmessage = async (e) => {
        const m = e.data;
        try {
          if (m.type === 'init') {
            terrain = await (await fetch(m.terrainUrl)).json();
            self.postMessage({ id: m.id, ok: true });
          } else {
            const plan = planWalk(terrain, m.targetsFile, m.options);
            self.postMessage({ id: m.id, plan });
          }
        } catch (err) { self.postMessage({ id: m.id, error: String(err && err.message || err) }); }
      };`;
    worker = new Worker(URL.createObjectURL(new Blob([src], { type: 'text/javascript' })), { type: 'module' });
    worker.onmessage = (e) => {
      const p = pending.get(e.data.id);
      if (!p) return;
      pending.delete(e.data.id);
      e.data.error ? p.reject(new Error(e.data.error)) : p.resolve(e.data);
    };
    worker.onerror = (e) => { console.warn('planner worker failed, using main thread', e.message); worker = null; for (const p of pending.values()) p.reject(new Error('worker failed')); pending.clear(); };
  } catch (err) {
    console.warn('module worker unavailable, planning on the main thread', err);
    worker = null;
  }
  const call = (msg) => new Promise((resolve, reject) => {
    const id = ++seq;
    pending.set(id, { resolve, reject });
    worker.postMessage({ ...msg, id });
  });
  return {
    get mode() { return worker ? 'worker' : 'main thread'; },
    async init(terrainUrl) {
      if (!worker) return;
      try { await call({ type: 'init', terrainUrl }); } catch { worker = null; }
    },
    async plan(targetsFile, options) {
      if (worker) {
        try { return (await call({ type: 'plan', targetsFile, options })).plan; }
        catch (err) { if (worker) throw err; } // worker died: fall through to main thread
      }
      await new Promise((r) => setTimeout(r, 30)); // let the "planning…" state paint
      return planWalk(state.terrain, targetsFile, options);
    },
  };
})();

// ---------------------------------------------------------------------------
// Boot
// ---------------------------------------------------------------------------

async function boot() {
  $('dataset-label').textContent = DATASET === 'real' ? 'Real data · Jezero' : 'Demo data';
  let terrain, targetsFile;
  try {
    const terrainUrl = new URL('terrain.json', DATA_DIR).href;
    [terrain, targetsFile] = await Promise.all([
      fetch(terrainUrl).then((r) => { if (!r.ok) throw new Error(`terrain.json: HTTP ${r.status}`); return r.json(); }),
      fetch(new URL('targets.json', DATA_DIR)).then((r) => { if (!r.ok) throw new Error(`targets.json: HTTP ${r.status}`); return r.json(); }),
      planner.init(terrainUrl),
    ]);
  } catch (err) {
    const hint = location.protocol === 'file:'
      ? 'Open the app over http (npm run serve), not file://.'
      : DATASET === 'real' ? 'The real-data files may not be generated yet; try the demo (remove ?data=real).' : '';
    showError(`Could not load data/${DATASET}/ (${err.message}). ${hint}`);
    $('verdict').textContent = 'No data';
    return;
  }

  state.terrain = terrain;
  state.habitat = targetsFile.habitat;
  state.targets = targetsFile.targets.map((t) => ({ ...t }));
  // Targets given as lat/lon get cell x/y here too, so markers can be drawn before the first plan.
  for (const t of [state.habitat, ...state.targets]) {
    if (!(Number.isInteger(t.x) && Number.isInteger(t.y)) && t.lat != null) Object.assign(t, latLonToCell(terrain, t.lat, t.lon));
  }
  state.included = new Set(state.targets.map((t) => t.id));

  $('synthetic-banner').hidden = !terrain.synthetic;
  if (terrain.name) $('dataset-label').textContent += ` · ${terrain.name}`;
  renderCredits();
  initMap();
  renderConditions();
  renderLayerControls();
  replan();
}

function showError(msg) {
  const b = $('error-banner');
  b.textContent = msg;
  b.hidden = !msg;
}

// ---------------------------------------------------------------------------
// Map
// ---------------------------------------------------------------------------

function initMap() {
  const t = state.terrain;
  const bounds = terrainBounds(t);
  map = L.map('map', { zoomSnap: 0.25, maxZoom: 21, attributionControl: true, preferCanvas: false });
  map.attributionControl.setPrefix(false);
  map.fitBounds(bounds, { padding: [10, 10] });
  map.setMaxBounds(bounds.pad(0.6));
  L.control.scale({ imperial: false, position: 'bottomleft' }).addTo(map);

  map.createPane('terrain'); map.getPane('terrain').style.zIndex = 250;
  map.createPane('route'); map.getPane('route').style.zIndex = 450;

  // NASA base layers from the photos lane (empty stub on develop).
  try {
    const base = addBaseLayers(map, t) || {};
    if (base.control && !base.control._map) base.control.addTo(map);
    if (!base.control) for (const layer of Object.values(base.layers || {})) layer.addTo?.(map);
  } catch (err) {
    console.warn('addBaseLayers failed', err);
  }

  // Terrain rasters.
  overlays.hillshade = imageLayer(paintHillshade(t), bounds, LAYER_INFO.hillshade.opacity, 'terrain');
  overlays.slope = imageLayer(paintSlope(t, {}), bounds, LAYER_INFO.slope.opacity, 'terrain');
  const ti = paintScalar(t, 'thermalInertia', LAYER_INFO.thermalInertia.ramp);
  if (ti) overlays.thermalInertia = imageLayer(ti, bounds, LAYER_INFO.thermalInertia.opacity, 'terrain');
  const ro = paintScalar(t, 'roughness', LAYER_INFO.roughness.ramp, [0, 1]);
  if (ro) overlays.roughness = imageLayer(ro, bounds, LAYER_INFO.roughness.opacity, 'terrain');
  for (const [k, layer] of Object.entries(overlays)) if (LAYER_INFO[k].defaultOn) layer.addTo(map);
  L.rectangle(bounds, { color: '#e0a14a', weight: 1, fill: false, dashArray: '4 4', interactive: false, pane: 'terrain' }).addTo(map);

  routeLayer = L.layerGroup().addTo(map);
  markerLayer = L.layerGroup().addTo(map);

  map.on('click', (e) => addStopAt(e.latlng));

  // Keep the map sized to its box; refit if it was laid out before the box had a size.
  let fitted = map.getSize().y > 50;
  new ResizeObserver(() => {
    map.invalidateSize();
    if (!fitted && map.getSize().y > 50) { fitted = true; map.fitBounds(bounds, { padding: [10, 10] }); }
  }).observe($('map'));
}

/** Slope/blocked depends on conditions (dust storm and heavy kit lower the max slope). */
function refreshSlopeLayer() {
  const on = map.hasLayer(overlays.slope);
  if (on) map.removeLayer(overlays.slope);
  overlays.slope = imageLayer(paintSlope(state.terrain, state.conditions), terrainBounds(state.terrain), LAYER_INFO.slope.opacity, 'terrain');
  if (on) overlays.slope.addTo(map);
}

function addStopAt(latlng) {
  const t = state.terrain;
  const { x, y } = latLonToCell(t, latlng.lat, latlng.lng);
  if (x < 0 || y < 0 || x >= t.width || y >= t.height) return;
  const n = ++state.customCount;
  const stop = {
    id: `U${n}`, name: `My stop ${n}`, x, y, value: 5, dwellMin: 20,
    note: 'Added by you on the map. Edit its science value and time on site in the stop list.', custom: true,
  };
  state.targets.push(stop);
  state.included.add(stop.id);
  state.selectedId = stop.id;
  replan();
}

function drawMap() {
  const { terrain: t, plan } = state;
  routeLayer.clearLayers();
  markerLayer.clearLayers();

  if (plan && plan.path.length > 1) {
    const ll = plan.path.map(([x, y]) => cellLatLng(t, x, y));
    const k = plan.turnBack ? plan.turnBack.pathIndex : ll.length - 1;
    const safe = ll.slice(0, k + 1), beyond = ll.slice(k);
    L.polyline(safe, { pane: 'route', color: '#1a0f0a', weight: 7, opacity: 0.7, interactive: false }).addTo(routeLayer);
    L.polyline(safe, { pane: 'route', color: '#ffcf6e', weight: 4, interactive: false }).addTo(routeLayer);
    if (plan.turnBack && beyond.length > 1) {
      L.polyline(beyond, { pane: 'route', color: '#1a0f0a', weight: 7, opacity: 0.6, interactive: false }).addTo(routeLayer);
      L.polyline(beyond, { pane: 'route', color: '#ef4b3f', weight: 4, dashArray: '8 6', interactive: false }).addTo(routeLayer);
    }
    // Wide invisible line for hover: elapsed time and O2 at the nearest path point.
    const hover = L.polyline(ll, { pane: 'route', weight: 18, opacity: 0 }).addTo(routeLayer);
    hover.on('mousemove', (e) => {
      const kk = nearestPathIndex(ll, e.latlng);
      const tl = state.timeline;
      const left = plan.totals.o2CapacityKg - tl.o2[kk];
      const pastTurn = plan.turnBack && kk > plan.turnBack.pathIndex;
      hover.setTooltipContent(`${tl.exact ? '' : '≈ '}${fmtClock(tl.t[kk])} · O₂ left ${fmtKg(left)} kg${pastTurn ? '<br><b style="color:#ff8a80">beyond the point of no return</b>' : ''}`);
      hover.openTooltip(e.latlng);
    });
    hover.bindTooltip('', { className: 'tip', sticky: true, direction: 'top', offset: [0, -8] });
    hover.on('click', (e) => { L.DomEvent.stopPropagation(e); });
  }

  // Habitat
  L.marker(cellLatLng(t, state.habitat.x, state.habitat.y), { icon: habitatIcon(), zIndexOffset: 500 })
    .bindTooltip(`${state.habitat.name || 'Habitat'}<br>start and finish`, { className: 'tip', direction: 'top', offset: [0, -14] })
    .addTo(markerLayer);

  // Stops
  const orderNum = new Map((plan?.order || []).map((id, i) => [id, i + 1]));
  const unreachable = new Set(plan?.unreachable || []);
  for (const s of state.targets) {
    if (!Number.isInteger(s.x)) continue;
    const num = orderNum.get(s.id);
    const inc = state.included.has(s.id);
    let label = num ?? '', cls = s.custom ? 'custom' : '';
    if (!inc) { cls += ' off'; label = '–'; }
    else if (unreachable.has(s.id)) { cls += ' unreach'; label = '✕'; }
    const sel = s.id === state.selectedId;
    const tip = `<b>${esc(s.name)}</b><br>${!inc ? 'not included' : unreachable.has(s.id) ? 'unreachable under these conditions' : `stop ${num} · value ${s.value} · ${s.dwellMin} min`}`;
    L.marker(cellLatLng(t, s.x, s.y), { icon: stopIcon(label, cls, sel), zIndexOffset: sel ? 1000 : num ? 600 : 300 })
      .bindTooltip(tip, { className: 'tip', direction: 'top', offset: [0, -14] })
      .on('click', (e) => {
        L.DomEvent.stopPropagation(e);
        selectStop(s.id);
        $('photo-card').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      })
      .addTo(markerLayer);
  }

  // Point of no return
  if (plan?.turnBack) {
    const tb = plan.turnBack;
    L.marker(cellLatLng(t, tb.x, tb.y), { icon: turnBackIcon(), zIndexOffset: 2000 })
      .bindTooltip(`<b>Point of no return</b><br>${fmtClock(tb.elapsedS)} · ${fmtKg(tb.o2UsedKg)} kg O₂ used<br>Past here you can't get home without the reserve.`,
        { className: 'tip', direction: 'top', offset: [0, -18], permanent: false })
      .addTo(markerLayer);
  }
}

function nearestPathIndex(ll, p) {
  let best = 0, bd = Infinity;
  for (let k = 0; k < ll.length; k++) {
    const d = (ll[k][0] - p.lat) ** 2 + (ll[k][1] - p.lng) ** 2;
    if (d < bd) { bd = d; best = k; }
  }
  return best;
}

// ---------------------------------------------------------------------------
// Planning
// ---------------------------------------------------------------------------

let planSeq = 0;
async function replan() {
  const mine = ++planSeq;
  $('planning').hidden = false;
  const stopIds = state.targets.filter((t) => state.included.has(t.id)).map((t) => t.id);
  try {
    const plan = await planner.plan(
      { habitat: state.habitat, targets: state.targets },
      { stopIds, conditions: { ...state.conditions } });
    if (mine !== planSeq) return; // a newer request superseded this one
    state.plan = plan;
    state.timeline = pathTimeline(plan);
    showError('');
  } catch (err) {
    if (mine !== planSeq) return;
    console.error(err);
    showError(`Planner error: ${err.message}`);
  } finally {
    if (mine === planSeq) $('planning').hidden = true;
  }
  renderAll();
}

function renderAll() {
  drawMap();
  renderVerdict();
  if (state.plan) {
    renderBudget($('budget'), state.plan);
    renderChart($('chart'), state.plan, state.timeline);
  }
  renderStops();
  renderSelected();
}

// ---------------------------------------------------------------------------
// Side panel
// ---------------------------------------------------------------------------

function renderVerdict() {
  const p = state.plan;
  const v = $('verdict'), sub = $('verdict-sub'), btn = $('drop-btn');
  btn.hidden = true;
  if (!p) return;
  const nStops = p.order.length;
  if (p.withinBudget) {
    v.className = 'verdict ok';
    v.textContent = nStops ? `Fits the budget · ${nStops} stop${nStops > 1 ? 's' : ''}` : 'No stops selected';
    sub.textContent = `${fmtDuration(p.totals.totalTimeS)} out and back · science value ${p.totals.scienceValue}`;
  } else {
    v.className = 'verdict over';
    const what = p.violations.map((x) => (x === 'oxygen' ? 'oxygen' : 'radiation')).join(' and ');
    v.textContent = `Over budget on ${what}`;
    sub.textContent = p.turnBack
      ? `Turn back by ${fmtClock(p.turnBack.elapsedS)} (red ↩ on the map) or drop a stop.`
      : 'O₂ still gets you home, but the dose limit is exceeded. Drop a stop or shorten the walk.';
  }
  if (p.unreachable.length) {
    sub.textContent += ` ${p.unreachable.length} stop${p.unreachable.length > 1 ? 's' : ''} unreachable.`;
  }
  const d = p.dropSuggestion;
  if (d) {
    btn.hidden = false;
    btn.innerHTML = '';
    btn.append(`Drop “${d.name}” to ${d.makesFeasible ? 'fit the budget' : 'get closer'}`,
      el('small', {}, `saves ${fmtKg(d.o2SavedKg)} kg O₂ and ${fmtMSv(d.doseSavedMSv)} mSv · loses ${d.value} science`));
    btn.onclick = () => { state.included.delete(d.id); replan(); };
  }
}

function renderConditions() {
  const box = $('conditions');
  box.replaceChildren();
  for (const c of CONDITIONS) {
    const cfg = CONFIG.conditions[c.key] || {};
    const fx = [];
    if (cfg.speedFactor && cfg.speedFactor !== 1) fx.push(`walk ×${cfg.speedFactor}`);
    if (cfg.metabolicFactor && cfg.metabolicFactor !== 1) fx.push(`effort +${Math.round((cfg.metabolicFactor - 1) * 100)}%`);
    if (cfg.doseFactor && cfg.doseFactor !== 1) fx.push(`dose ×${cfg.doseFactor}`);
    if (cfg.maxSlopeDeg != null) fx.push(`avoid slopes > ${cfg.maxSlopeDeg}°`);
    const input = el('input', { type: 'checkbox', 'aria-label': c.name });
    input.checked = !!state.conditions[c.key];
    const row = el('label', { class: `cond${input.checked ? ' on' : ''}` },
      input, el('span', { class: 'cond-name' }, c.name), el('span', { class: 'cond-effect' }, fx.join(' · ')));
    input.addEventListener('change', () => {
      state.conditions[c.key] = input.checked;
      if (!input.checked) delete state.conditions[c.key];
      row.classList.toggle('on', input.checked);
      refreshSlopeLayer();
      replan();
    });
    box.append(row);
  }
}

function renderStops() {
  const list = $('stops');
  list.replaceChildren();
  const p = state.plan;
  const byId = new Map(state.targets.map((t) => [t.id, t]));
  const planStop = new Map((p?.stops || []).map((s) => [s.id, s]));
  const unreachable = new Set(p?.unreachable || []);
  const ordered = [
    ...(p?.order || []).map((id) => byId.get(id)).filter(Boolean),
    ...state.targets.filter((t) => state.included.has(t.id) && !p?.order.includes(t.id)),
    ...state.targets.filter((t) => !state.included.has(t.id)),
  ];
  let turnShown = false;
  ordered.forEach((t) => {
    const ps = planStop.get(t.id);
    const inc = state.included.has(t.id);
    const isUnreach = inc && unreachable.has(t.id);
    // Show where the turn-back point falls between stops.
    if (p?.turnBack && !turnShown && ps && ps.pathIndex > p.turnBack.pathIndex) {
      list.append(el('li', { class: 'turnback-row' }, `↩ Point of no return at ${fmtClock(p.turnBack.elapsedS)} — stops below need the O₂ reserve`));
      turnShown = true;
    }
    const cb = el('input', { type: 'checkbox', 'aria-label': `Include ${t.name}` });
    cb.checked = inc;
    cb.addEventListener('click', (e) => e.stopPropagation());
    cb.addEventListener('change', () => {
      cb.checked ? state.included.add(t.id) : state.included.delete(t.id);
      replan();
    });
    const num = ps ? p.order.indexOf(t.id) + 1 : null;
    const badge = el('span', { class: `badge${!inc ? ' muted-badge' : isUnreach ? ' bad' : ''}` }, inc ? (isUnreach ? '✕' : num ?? '…') : '–');
    const sub = !inc ? 'not included'
      : isUnreach ? 'unreachable under these conditions'
      : ps ? `arrive ${fmtClock(ps.arriveS)} · ${t.dwellMin} min on site` : 'planning…';
    const main = el('div', {}, el('div', { class: 'stop-name' }, t.name), el('div', { class: 'stop-sub' }, sub));
    if (t.custom) main.append(customEditor(t));
    const right = el('div', { class: 'stop-right', html: `<b>${t.value}</b><br>value` });
    const li = el('li', { class: `stop${!inc ? ' excluded' : ''}${isUnreach ? ' unreachable' : ''}${t.id === state.selectedId ? ' selected' : ''}` },
      cb, badge, main, right);
    li.addEventListener('click', () => selectStop(t.id));
    list.append(li);
  });
  if (p?.turnBack && !turnShown) {
    list.append(el('li', { class: 'turnback-row' }, `↩ Point of no return at ${fmtClock(p.turnBack.elapsedS)} — on the way home`));
  }
}

function customEditor(t) {
  const num = (key, min, max) => {
    const i = el('input', { type: 'number', min, max, value: t[key] });
    i.addEventListener('click', (e) => e.stopPropagation());
    i.addEventListener('change', () => {
      const v = Math.round(Number(i.value));
      if (!Number.isFinite(v)) return;
      t[key] = Math.min(max, Math.max(min, v));
      replan();
    });
    return i;
  };
  const rm = el('button', { type: 'button' }, 'remove');
  rm.addEventListener('click', (e) => {
    e.stopPropagation();
    state.targets = state.targets.filter((x) => x.id !== t.id);
    state.included.delete(t.id);
    if (state.selectedId === t.id) state.selectedId = null;
    replan();
  });
  return el('div', { class: 'stop-edit' }, 'value', num('value', 1, 10), 'min', num('dwellMin', 0, 240), rm);
}

function selectStop(id) {
  state.selectedId = id;
  const t = state.targets.find((x) => x.id === id);
  drawMap();
  renderStops();
  renderSelected();
  if (t && Number.isInteger(t.x)) map.panTo(cellLatLng(state.terrain, t.x, t.y), { animate: true });
}

function renderSelected() {
  const t = state.targets.find((x) => x.id === state.selectedId);
  const box = $('photos');
  if (!t) {
    $('photo-title').textContent = 'Stop details';
    $('photo-meta').textContent = '';
    box.replaceChildren(el('p', { class: 'muted' }, 'Select a stop on the map or in the list.'));
    return;
  }
  $('photo-title').textContent = t.name;
  const ps = state.plan?.stops.find((s) => s.id === t.id);
  const bits = [`science value ${t.value}`, `${t.dwellMin} min on site`];
  if (ps) bits.push(`arrive ${fmtClock(ps.arriveS)} with ${fmtKg(ps.arriveO2Kg)} kg O₂ used`);
  if (t.sol != null) bits.push(`Perseverance sol ${t.sol}`);
  $('photo-meta').textContent = bits.join(' · ');
  try {
    renderPhotos(box, t);
  } catch (err) {
    console.warn('renderPhotos failed', err);
    box.replaceChildren(el('p', {}, t.note || ''));
  }
}

function renderLayerControls() {
  const box = $('layers');
  box.replaceChildren();
  for (const [key, info] of Object.entries(LAYER_INFO)) {
    if (!overlays[key]) continue;
    const input = el('input', { type: 'checkbox', 'aria-label': info.name });
    input.checked = map.hasLayer(overlays[key]);
    input.addEventListener('change', () => {
      input.checked ? overlays[key].addTo(map) : map.removeLayer(overlays[key]);
    });
    const labels = info.labels.map((s) => el('span', {}, s));
    box.append(el('label', { class: 'layer' },
      input,
      el('span', { class: 'layer-name' }, info.name),
      el('div', { class: 'ramp', style: `background:${rampCss(info.ramp)}` }),
      el('div', { class: 'ramp-labels' }, labels)));
  }
}

function renderCredits() {
  const t = state.terrain;
  const parts = [];
  if (t.synthetic) parts.push('Terrain: synthetic demo grid (scripts/make_demo.mjs).');
  for (const s of t.sources || []) {
    parts.push(s.url ? `<a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.name)}</a> (${esc(s.layer)})` : `${esc(s.name)} (${esc(s.layer)})`);
  }
  parts.push('Model numbers tagged ASSUMPTION in js/config.js are estimates, not flight rules.');
  $('credits').innerHTML = parts.join(' · ');
}

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// Handle for debugging from the console.
window.marswalk = { state, get map() { return map; }, get planner() { return planner.mode; }, replan };

boot();
