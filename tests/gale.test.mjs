// Generated with AI assistance for NASA Space Apps 2026; reviewed by the team
//
// Gale dataset checks (gale lane, amarz-claude). Offline, no node_modules: reads data/gale/ only.
// Skips cleanly if data/gale/terrain.json has not been generated yet.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { planWalk, resolveTargets, buildCostGrid } from '../js/engine.js';
import { addBaseLayers, TREK_LAYERS } from '../js/basemap.js';
import { renderPhotos, PHOTO_CREDIT } from '../js/photos.js';

const dir = new URL('../data/gale/', import.meta.url);
const has = existsSync(new URL('terrain.json', dir));
const load = (f) => JSON.parse(readFileSync(new URL(f, dir), 'utf8'));

test('gale area sits inside the USGS 1 m DEM footprint', () => {
  const a = load('area.json');
  const b = a.bounds;
  assert.ok(b.north > b.south && b.east > b.west);
  assert.ok(b.south >= -5.10 && b.north <= -4.13, 'latitude inside -5.10..-4.13');
  assert.ok(b.west >= 137.12 && b.east <= 137.68, 'longitude inside 137.12..137.68');
});

test('gale targets follow CONTRACTS §2 and every stop is cited', () => {
  const t = load('targets.json');
  assert.ok(t.habitat && Number.isFinite(t.habitat.lat) && Number.isFinite(t.habitat.lon));
  assert.ok(t.targets.length >= 3);
  const ids = new Set();
  for (const s of t.targets) {
    assert.ok(!ids.has(s.id), `duplicate id ${s.id}`); ids.add(s.id);
    assert.ok(Number.isFinite(s.lat) && Number.isFinite(s.lon));
    assert.ok(s.value >= 1 && s.value <= 10);
    assert.ok(s.dwellMin > 0);
    assert.ok(!s.placeholder, `${s.id} is still a placeholder`);
    assert.match(s.source ?? '', /^https:\/\/science\.nasa\.gov\//, `${s.id} cites a NASA mission update`);
    assert.ok(s.note && s.note.length > 40);
    for (const p of s.photos ?? []) {
      assert.match(p.url, /^https:\/\/mars\.nasa\.gov\//);
      assert.ok(Number.isInteger(p.sol) && p.camera && p.credit);
      assert.match(p.credit, /^NASA\/JPL-Caltech/);
    }
  }
});

test('gale terrain follows CONTRACTS §1', { skip: !has && 'data/gale/terrain.json not generated' }, () => {
  const terrain = load('terrain.json');
  assert.equal(terrain.synthetic, false);
  const n = terrain.width * terrain.height;
  assert.equal(terrain.layers.elevation.length, n);
  assert.equal(terrain.layers.roughness.length, n);
  assert.ok(terrain.sources.some((s) => s.layer === 'elevation'));
});

test('gale stops resolve inside the grid and the walk plans', { skip: !has && 'data/gale/terrain.json not generated' }, () => {
  const terrain = load('terrain.json');
  const targets = load('targets.json');
  const r = resolveTargets(terrain, targets);
  for (const p of [r.habitat, ...r.targets]) {
    assert.ok(p.x >= 0 && p.y >= 0 && p.x < terrain.width && p.y < terrain.height, `${p.id ?? 'habitat'} inside grid`);
  }
  const g = buildCostGrid(terrain);
  assert.equal(g.blocked[r.habitat.y * terrain.width + r.habitat.x], 0, 'habitat on walkable ground');
  const plan = planWalk(terrain, targets);
  assert.ok(plan.ok);
  assert.ok(plan.order.length >= 3, `at least 3 stops reachable (unreachable: ${plan.unreachable.join(', ')})`);
  assert.ok(plan.totals.distanceM > 500);
});

test('gale demo story: every stop reachable at 20°, a normal walk fits, all three hazards go over', { skip: !has && 'data/gale/terrain.json not generated' }, () => {
  const terrain = load('terrain.json');
  const targets = load('targets.json');
  const normal = planWalk(terrain, targets);
  assert.deepEqual(normal.unreachable, []);
  assert.equal(normal.withinBudget, true);
  const all = planWalk(terrain, targets, { conditions: { dustStorm: true, heavyKit: true, solarEvent: true } });
  assert.equal(all.withinBudget, false);
  assert.ok(all.bestSubset, 'over budget offers a best set');
});

function replaceGlobal(t, key, value) {
  const previous = Object.getOwnPropertyDescriptor(globalThis, key);
  Object.defineProperty(globalThis, key, { value, writable: true, configurable: true });
  t.after(() => {
    if (previous) Object.defineProperty(globalThis, key, previous);
    else delete globalThis[key];
  });
}

// The map boundary is stubbed; real committed bounds and drive coordinates exercise georeferencing.
function mapFixture() {
  const layer = (kind, options = {}) => ({
    kind, options, children: [],
    addLayer(child) { this.children.push(child); return this; },
    addTo(parent) { parent.addLayer(this); return this; },
    bindTooltip(text) { this.tooltip = text; return this; },
  });
  const L = {
    CRS: { EPSG4326: {} },
    layerGroup: () => layer('group'),
    imageOverlay: (url, bounds, options) => Object.assign(layer('image', options), { url, bounds }),
    tileLayer: (url, options) => Object.assign(layer('tiles', options), { url }),
    polyline: (points, options) => Object.assign(layer('line', options), { points }),
    latLngBounds: ([[south, west], [north, east]]) => ({
      pad(ratio) {
        const dy = (north - south) * ratio, dx = (east - west) * ratio;
        return L.latLngBounds([[south - dy, west - dx], [north + dy, east + dx]]);
      },
      contains: ([lat, lon]) => lat >= south && lat <= north && lon >= west && lon <= east,
    }),
    control: { layers: (_, overlays, options) => Object.assign(layer('control', options), { overlays }) },
  };
  const map = () => {
    const panes = {};
    return Object.assign(layer('map'), {
      options: { crs: L.CRS.EPSG4326 },
      getPane: (name) => panes[name],
      createPane: (name) => (panes[name] = { style: {} }),
    });
  };
  return { L, map };
}

test('Gale uses local imagery at area bounds and Curiosity coordinates; Jezero keeps its own layers', async (t) => {
  const { L, map } = mapFixture();
  replaceGlobal(t, 'L', L);
  const requests = [];
  const jezeroPath = { features: [{ properties: { sol: 100 }, geometry: {
    type: 'LineString', coordinates: [[77.4, 18.45], [77.401, 18.451]],
  } }] };
  t.mock.method(globalThis, 'fetch', async (url) => {
    requests.push(url);
    const path = new URL(url).pathname;
    const json = path.endsWith('/data/gale/area.json') ? load('area.json')
      : path.endsWith('/data/gale/traverse.json') ? load('traverse.json')
      : url === 'https://mars.nasa.gov/mmgis-maps/M20/Layers/json/M20_traverse.json' ? jezeroPath
      : assert.fail(`Unexpected network request: ${url}`);
    return { ok: true, json: async () => json };
  });
  const terrain = load('terrain.json');
  const galeMap = map();
  const gale = addBaseLayers(galeMap, terrain);
  const jezeroMap = map();
  const jezero = addBaseLayers(jezeroMap, null);
  const syntheticMap = map();
  const synthetic = addBaseLayers(syntheticMap, { ...terrain, synthetic: true });
  await new Promise((resolve) => setImmediate(resolve));

  assert.deepEqual(Object.keys(gale.layers), ['imagery', 'traverse']);
  const image = gale.layers.imagery.children[0];
  assert.ok(image, 'local mosaic loaded');
  assert.match(image.url, /\/data\/gale\/imagery\.png$/);
  const b = load('area.json').bounds;
  assert.deepEqual(image.bounds, [[b.south, b.west], [b.north, b.east]]);
  assert.match(image.options.attribution, /NASA\/JPL-Caltech\/UArizona.*USGS/);
  assert.equal(image.options.pane, 'pbBasemap');
  const lines = gale.layers.traverse.children;
  assert.ok(lines.length > 0, 'committed Curiosity drive appears');
  assert.deepEqual(lines[0].points[0], load('traverse.json').features[0].geometry.coordinates[0].toReversed());
  assert.ok(lines.every((line) => line.tooltip.startsWith('Curiosity drive') && line.options.dashArray === '6 5'));
  assert.ok(galeMap.children.includes(gale.layers.imagery) && galeMap.children.includes(gale.layers.traverse));
  assert.equal(galeMap.getPane('pbBasemap').style.zIndex, 250);
  assert.deepEqual(Object.keys(jezero.layers), ['hirise', 'ctx', 'traverse']);
  assert.ok(jezero.layers.hirise.url.includes(TREK_LAYERS.hirise.id));
  assert.ok(jezero.layers.ctx.url.includes(TREK_LAYERS.ctx.id));
  assert.equal(jezero.layers.traverse.children[0].tooltip, 'Perseverance drive, sol 100');
  assert.deepEqual(jezero.layers.traverse.children[0].points, [[18.45, 77.4], [18.451, 77.401]]);
  assert.ok(jezeroMap.children.includes(jezero.layers.hirise) && jezeroMap.children.includes(jezero.layers.traverse));
  assert.ok(!syntheticMap.children.includes(synthetic.layers.imagery), 'synthetic terrain does not auto-show real imagery');
  assert.ok(Object.keys(synthetic.control.overlays).every((name) => name.includes('real Gale, not this synthetic grid')));
  assert.equal(requests.length, 3, 'Gale metadata and paths are cached separately from Jezero');
});

// Minimal DOM boundary for checking the visible caption, alt text, and thumbnail/error events.
function photoFixture() {
  class Element {
    constructor(tag) { this.tag = tag; this.children = []; this.attrs = {}; this.events = {}; this.text = ''; }
    append(...children) { this.children.push(...children); }
    replaceChildren(...children) { this.children = children; this.text = ''; }
    setAttribute(key, value) { this.attrs[key] = value; }
    addEventListener(event, handler) { this.events[event] = handler; }
    set textContent(text) { this.text = text; this.children = []; }
    get textContent() { return this.text + this.children.map((c) => typeof c === 'string' ? c : c.textContent).join(''); }
  }
  const document = { head: new Element('head'), getElementById: () => true, createElement: (tag) => new Element(tag) };
  const find = (node, predicate) => [node, ...node.children.flatMap((c) => typeof c === 'string' ? [] : find(c, predicate))].filter(predicate);
  return { document, container: new Element('div'), find };
}

test('photo selection and failed-image fallback keep Curiosity camera names and the matching credit', (t) => {
  const { document, container, find } = photoFixture();
  replaceGlobal(t, 'document', document);
  const nav = load('targets.json').targets[0].photos.find((p) => p.camera === 'NAV_LEFT_B');
  const mahli = load('targets.json').targets[0].photos.find((p) => p.camera === 'MAHLI');
  const mast = load('targets.json').targets[1].photos.find((p) => p.camera === 'MAST_LEFT');
  renderPhotos(container, { name: 'Gale stop', photos: [nav, mahli, mast] });
  const img = find(container, (n) => n.tag === 'img')[0];
  const buttons = find(container, (n) => n.tag === 'button');
  const credit = find(container, (n) => n.className === 'pb-credit')[0];
  assert.equal(credit.textContent, 'Credit: NASA/JPL-Caltech');
  assert.match(img.alt, /^Curiosity Navcam \(left\)/);
  buttons[1].events.click();
  assert.equal(credit.textContent, 'Credit: NASA/JPL-Caltech/MSSS');
  assert.match(img.alt, /^Curiosity MAHLI/);
  buttons[2].events.click();
  assert.match(img.alt, /^Curiosity Mastcam \(left\)/);
  assert.equal(buttons[2].attrs['aria-pressed'], 'true');
  img.events.error(); // Broken Mastcam photo falls back to Navcam, with a different credit.
  assert.equal(img.src, nav.url);
  assert.equal(credit.textContent, 'Credit: NASA/JPL-Caltech');
  renderPhotos(container, { name: 'Jezero stop', photos: [{ url: 'https://example.test/photo.jpg', camera: 'MCZ_LEFT', sol: 100 }] });
  assert.equal(find(container, (n) => n.className === 'pb-credit')[0].textContent, `Credit: ${PHOTO_CREDIT}`);
  assert.match(find(container, (n) => n.tag === 'img')[0].alt, /^Perseverance Mastcam-Z \(left\)/);
});
