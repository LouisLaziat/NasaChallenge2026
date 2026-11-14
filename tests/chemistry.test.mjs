// Generated with AI assistance for NASA Space Apps 2026; reviewed by the team
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { loadChemistry, renderChemistry } from '../js/chemistry.js';
import { distanceM } from '../js/views/geometry.js';

const data = JSON.parse(readFileSync(new URL('../data/gale/chemistry.json', import.meta.url), 'utf8'));
const stops = JSON.parse(readFileSync(new URL('../data/gale/targets.json', import.meta.url), 'utf8')).targets;
const components = ['SiO2', 'FeO(T)', 'MgO', 'CaO', 'SO3', 'Na2O', 'Al2O3', 'Cl'];

test('all four APXS associations match preserved RWP abundances, precision and product metadata', () => {
  assert.equal(data.synthetic, false);
  assert.equal(data.instrument, 'APXS (CSA)');
  assert.equal(data.units, 'wt%');
  assert.deepEqual(Object.keys(data.byStop), ['G1', 'G2', 'G3', 'G4']);
  for (const [id, main] of Object.entries(data.byStop)) {
    for (const record of [main, ...(main.relatedMeasurements || [])]) {
      assert.equal(createHash('sha256').update(record.evidence.rwpCsv).digest('hex'), record.evidence.sha256);
      const csv = Object.fromEntries(record.evidence.rwpCsv.trim().split(/\r?\n/).slice(1).map(line => {
        const [key, value, precision] = line.split(',').map(s => s.trim());
        return [key, { value: Number(value), precision: Number(precision) }];
      }));
      for (const key of components) {
        const sourceKey = key === 'FeO(T)' ? 'FeO' : key;
        assert.equal(record.oxidesWtPct[key], csv[sourceKey].value, `${id} ${key} copied without conversion`);
        assert.equal(record.precisionWtPct[key], csv[sourceKey].precision, `${id} ${key} statistical precision`);
        assert.ok(record.oxidesWtPct[key] >= 0 && record.oxidesWtPct[key] <= 100);
      }
      const match = record.productId.match(/^APB_(\d{9})RWP(\d{4})(\d{3})(\d{4})_+P1$/);
      assert.ok(match, 'legacy product id');
      assert.equal(Number(match[2]), record.sol);
      assert.equal(Number(match[3]), record.roverPosition.site);
      assert.equal(Number(match[4]), record.roverPosition.drive);
      assert.ok(record.sourceDataProducts.some(p => p.startsWith(`APB_${match[1]}ESC`)));
      assert.equal(record.logicalIdentifier, `urn:nasa:pds:msl_apxs_calibrated:data:${record.productId.toLowerCase()}`);
      assert.match(record.url, /^https:\/\/pds-geosciences\.wustl\.edu\/.*rwp.*\.csv$/);
      assert.match(record.labelUrl, /\.xml$/);
      const stop = stops.find(s => s.id === id);
      assert.equal(record.stopSol, stop.sol);
      assert.equal(record.solOffset, record.sol - stop.sol);
      assert.equal(record.distanceM, Math.round(distanceM(stop, record.roverPosition)));
      assert.ok(Math.abs(record.solOffset) <= data.selection.maxSolOffset);
      assert.match(record.distanceBasis, /contact-point distance is unknown/);
    }
  }
  // Independent reference values guard against swapping valid products between targets.
  assert.equal(data.byStop.G1.oxidesWtPct.SO3, 15.21);
  assert.equal(data.byStop.G2.oxidesWtPct['FeO(T)'], 19.63);
  assert.equal(data.byStop.G3.oxidesWtPct.SiO2, 40.28);
  assert.equal(data.byStop.G4.oxidesWtPct.Cl, 0.88);
});

test('G3 companion and G4 release gap cannot masquerade as exact-stop measurements', () => {
  assert.equal(data.byStop.G3.target, 'Tesoro_del_Pangal_DRT');
  assert.equal(data.byStop.G3.relatedMeasurements[0].target, 'Nevado_Sajama_DRT');
  assert.equal(data.byStop.G3.relatedMeasurements[0].sol, 4713);
  const g4 = data.byStop.G4;
  assert.equal(g4.exactStopAvailable, false);
  assert.equal(g4.sol, 4842);
  assert.equal(g4.distanceM, 96);
  assert.match(g4.note, /Nearby contextual sample only/);
  assert.match(g4.note, /beyond release 42/);
});

test('loader is module-relative and skips unsupported sites without any request', async (t) => {
  const requests = [];
  t.mock.method(globalThis, 'fetch', async (url) => {
    requests.push(String(url));
    return { ok: true, json: async () => data };
  });
  assert.equal(await loadChemistry('real'), null);
  assert.equal(await loadChemistry('demo'), null);
  assert.equal(await loadChemistry('../secrets'), null);
  assert.equal(requests.length, 0);
  assert.equal(await loadChemistry('gale'), data);
  assert.equal(requests[0], new URL('../data/gale/chemistry.json', import.meta.url).href);
});

test('loader reports network, HTTP, JSON and wrong-site failures instead of substituting chemistry', async (t) => {
  const responses = [
    () => { throw new Error('offline'); },
    () => ({ ok: false, status: 404 }),
    () => ({ ok: true, json: async () => { throw new Error('invalid JSON'); } }),
    () => ({ ok: true, json: async () => ({ site: 'jezero', byStop: {} }) }),
    () => ({ ok: true, json: async () => ({ site: 'gale', byStop: [] }) }),
  ];
  t.mock.method(globalThis, 'fetch', async () => responses.shift()());
  for (const message of [/offline/, /HTTP 404/, /invalid JSON/, /Invalid Gale/, /Invalid Gale/]) {
    await assert.rejects(() => loadChemistry('gale'), message);
  }
});

function fixture(t) {
  const prior = Object.getOwnPropertyDescriptor(globalThis, 'document');
  class Element {
    constructor(tag) { this.tag = tag; this.children = []; this.attrs = {}; this.style = {}; this.text = ''; }
    append(...children) { this.children.push(...children); }
    replaceChildren(...children) { this.children = children; this.text = ''; }
    setAttribute(key, value) { this.attrs[key] = String(value); }
    set textContent(value) { this.text = String(value); this.children = []; }
    get textContent() { return this.text + this.children.map(c => c.textContent).join(''); }
  }
  const doc = {
    head: new Element('head'), getElementById: () => true,
    createElement: tag => new Element(tag), createTextNode: text => Object.assign(new Element('#text'), { text }),
  };
  Object.defineProperty(globalThis, 'document', { configurable: true, value: doc });
  t.after(() => prior ? Object.defineProperty(globalThis, 'document', prior) : delete globalThis.document);
  const find = (node, predicate) => [node, ...node.children.flatMap(c => find(c, predicate))].filter(predicate);
  return { container: new Element('div'), find };
}

test('renderer shows source, unit, precision, distance caveat and a fixed percent scale', (t) => {
  const { container, find } = fixture(t);
  renderChemistry(container, 'G4', data);
  assert.match(container.textContent, /Challapata DRT/);
  assert.match(container.textContent, /Sol 4842.*9 sols before stop.*~96 m to rover station/);
  assert.match(container.textContent, /beyond release 42/);
  assert.match(container.textContent, /Nearby context only; exact-stop APXS data is not yet released/);
  assert.match(container.textContent, /Cl is elemental chlorine/);
  assert.match(container.textContent, /APXS · Canadian Space Agency \/ NASA/);
  const rows = find(container, n => n.className === 'apxs-row');
  assert.equal(rows.length, 8);
  const silica = rows[0];
  assert.match(silica.textContent, /39\.81 ± 0\.43/);
  assert.equal(find(silica, n => n.className === 'apxs-fill')[0].style.width, '39.81%');
  const source = find(container, n => n.tag === 'a')[0];
  assert.equal(source.attrs.href, data.byStop.G4.url);
  assert.equal(source.attrs.rel, 'noopener noreferrer');
  renderChemistry(container, 'G1', data);
  assert.equal(find(container, n => n.className === 'apxs-card').length, 1, 'selection replaces old card');
  assert.doesNotMatch(container.textContent, /Challapata/);
});

test('unknown values stay unknown, true zeros stay zero, and source text cannot become HTML or script', (t) => {
  const { container, find } = fixture(t);
  const chem = { site: 'gale', byStop: { G1: {
    target: '<img src=x onerror=alert(1)>', sol: null, distanceM: null, url: 'javascript:alert(1)',
    oxidesWtPct: { SiO2: null, 'FeO(T)': '20', MgO: -1, CaO: Infinity, SO3: 101, Na2O: 0, Al2O3: 1, Cl: NaN },
  } } };
  renderChemistry(container, 'G1', chem);
  assert.match(container.textContent, /Measurement sol unknown.*Distance unknown/);
  assert.equal(find(container, n => n.tag === 'a' || n.tag === 'img').length, 0);
  const rows = find(container, n => n.className === 'apxs-row');
  assert.match(rows[0].textContent, /Not reported/);
  assert.equal(find(rows[0], n => n.className === 'apxs-track')[0].hidden, true);
  assert.match(rows[5].textContent, /0\.00/);
  assert.equal(find(rows[5], n => n.className === 'apxs-fill')[0].style.width, '0%');
  assert.equal(find(rows[5], n => n.className === 'apxs-track')[0].hidden, undefined);
});

test('missing stop, missing file or wrong site renders an explicit unavailable state', (t) => {
  const { container, find } = fixture(t);
  for (const [id, chem, message] of [
    ['custom', data, /No published APXS association/],
    ['G1', null, /unavailable or has not loaded/],
    ['G1', { ...data, site: 'jezero' }, /No APXS chemistry is provided for this site/],
  ]) {
    renderChemistry(container, id, chem);
    assert.match(container.textContent, message);
    assert.equal(find(container, n => n.className === 'apxs-row').length, 0);
  }
  renderChemistry(null, 'G1', data);
});

test('importing chemistry requires no document and makes no request', async (t) => {
  const prior = Object.getOwnPropertyDescriptor(globalThis, 'document');
  Object.defineProperty(globalThis, 'document', { configurable: true, get() { throw new Error('DOM access during import'); } });
  t.after(() => prior ? Object.defineProperty(globalThis, 'document', prior) : delete globalThis.document);
  t.mock.method(globalThis, 'fetch', async () => { throw new Error('network during import'); });
  await import('../js/chemistry.js?no-import-side-effects');
});
