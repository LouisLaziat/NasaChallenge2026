// Generated with AI assistance for NASA Space Apps 2026; reviewed by the team
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { loadConditions, toToggles, verdict, renderConditions } from '../js/conditions.js';
import { parseMEDA, parseDONKI, donkiURL, fetchConditions, MEDA_URL } from '../scripts/fetch_conditions.mjs';
import { CONFIG } from '../js/config.js';
import { planWalk } from '../js/engine.js';

const json = async (path) => JSON.parse(await readFile(new URL(path, import.meta.url), 'utf8'));
const quiet = await json('../data/conditions/demo-quiet.json');
const meda = await json('./fixtures/conditions/meda.json');
const donki = await json('./fixtures/conditions/donki-sep.json');
const now = new Date('2026-11-14T17:00:00Z');
const plan = (totals = {}) => ({ ok: true, withinBudget: true, totals: {
  o2UsedKg: 0.2, o2UsableKg: 0.4, doseMSv: 0.1, doseLimitMSv: 1, ...totals,
} });
const codes = (result) => result.reasons.map((r) => r.code);

test('toggles have strict dust threshold, require alert for solar, never set heavyKit', () => {
  for (const [tau, dust] of [[0, false], [1, false], [1.000001, true], [1.5, true], [null, false], ['1.5', false], [NaN, false]]) {
    for (const status of ['quiet', 'watch', 'alert', null]) {
      assert.deepEqual(toToggles({ dustTau: tau, sep: { status } }), { dustStorm: dust, solarEvent: status === 'alert' });
    }
  }
  assert.deepEqual(toToggles(null), { dustStorm: false, solarEvent: false });
});

test('complete quiet conditions are GO with a plan and with plan=null', () => {
  for (const route of [plan(), null]) {
    const r = verdict(quiet, route);
    assert.equal(r.level, 'GO');
    assert.deepEqual(codes(r), ['within-thresholds']);
    assert.ok(r.reasons.every((v) => v.text && v.source));
  }
  assert.match(verdict(quiet, null).reasons[0].text, /no route budget/i);
});

test('every condition rule works without a route and NO-GO wins over CAUTION', () => {
  assert.equal(verdict({ ...quiet, sep: { status: 'watch' } }, null).level, 'CAUTION');
  assert.equal(verdict({ ...quiet, sep: { status: 'alert' } }, null).level, 'NO-GO');
  assert.equal(verdict({ ...quiet, dustTau: 1 }, null).level, 'GO');
  assert.equal(verdict({ ...quiet, dustTau: 1.000001 }, null).level, 'CAUTION');
  const r = verdict({ ...quiet, dustTau: 1.5, sep: { status: 'alert' } }, plan({ o2UsedKg: 0.39 }));
  assert.equal(r.level, 'NO-GO');
  assert.deepEqual(codes(r), ['sep-alert', 'dust', 'oxygen-margin']);
});

test('oxygen and dose caution boundaries are strict, measured against usable oxygen', () => {
  assert.equal(verdict(quiet, plan({ o2UsedKg: 0.36 })).level, 'GO');
  assert.equal(verdict(quiet, plan({ o2UsedKg: 0.360001 })).level, 'CAUTION');
  assert.ok(codes(verdict(quiet, plan({ o2UsedKg: 0.360001 }))).includes('oxygen-margin'));
  assert.equal(verdict(quiet, plan({ doseMSv: 0.8 })).level, 'GO');
  const dose = verdict(quiet, plan({ doseMSv: 0.800001 }));
  assert.equal(dose.level, 'CAUTION');
  assert.ok(codes(dose).includes('dose-margin'));
  assert.match(dose.reasons[0].text, /Gale Crater.*proxy for Jezero/);
});

test('any engine budget violation yields NO-GO and preserves its explanation', () => {
  for (const violation of ['oxygen', 'radiation']) {
    const result = verdict(quiet, { ...plan(), withinBudget: false, violations: [violation] });
    assert.equal(result.level, 'NO-GO');
    assert.match(result.reasons.find((r) => r.code === 'plan-budget').text, new RegExp(violation));
  }
  assert.equal(verdict(quiet, { ...plan(), ok: false }).level, 'NO-GO');
});

test('unknown conditions and invalid budget numbers cannot silently produce GO', () => {
  assert.equal(verdict(null, null).level, 'CAUTION');
  for (const field of ['sol', 'tempC', 'pressurePa', 'dustTau', 'doseRateMSvDay', 'evaWindowLocal', 'sep']) {
    const r = verdict({ ...quiet, [field]: null }, null);
    assert.equal(r.level, 'CAUTION', field);
    assert.ok(codes(r).includes('unknown-conditions'));
  }
  for (const totals of [{ o2UsableKg: 0 }, { o2UsedKg: NaN }, { doseLimitMSv: 0 }, { doseMSv: -1 }]) {
    assert.equal(verdict(quiet, plan(totals)).level, 'CAUTION');
  }
});

test('MEDA saved response selects latest sol and parses numeric strings / missing markers', () => {
  assert.deepEqual(parseMEDA(meda), { sol: 1133, tempC: { min: -79.3, max: -24.7 }, pressurePa: 778.9, observationDate: '2024-04-27' });
  const unsorted = structuredClone(meda);
  unsorted.sols.reverse();
  assert.deepEqual(parseMEDA(unsorted), parseMEDA(meda));
  const missing = parseMEDA({ sols: [...meda.sols, { sol: '1134', min_temp: '--', max_temp: '', pressure: null }] });
  assert.deepEqual(missing, { sol: 1134, tempC: null, pressurePa: null, observationDate: null });
  assert.equal(parseMEDA({ sols: [{ sol: 0, min_temp: '-80', max_temp: '-20', pressure: '700' }] }).pressurePa, 700);
  assert.throws(() => parseMEDA({}), /sols array/);
  assert.throws(() => parseMEDA({ sols: [] }), /no valid sols/);
});

test('DONKI saved response chooses the latest event even when unsorted', () => {
  const latest = Math.max(...donki.map((e) => Date.parse(e.eventTime)));
  const expected = new Date(latest).toISOString();
  assert.deepEqual(parseDONKI([...donki].reverse(), new Date(latest + 86400000)), { status: 'alert', lastEvent: expected });
});

test('DONKI event ages include 2-day alert and 7-day watch boundaries, exclude future / out-of-range events', () => {
  for (const [age, expected] of [[0, 'alert'], [2 * 86400000, 'alert'], [2 * 86400000 + 1, 'watch'], [7 * 86400000, 'watch'], [7 * 86400000 + 1, 'quiet']]) {
    assert.equal(parseDONKI([{ eventTime: new Date(now - age).toISOString() }], now).status, expected);
  }
  assert.deepEqual(parseDONKI([], now), { status: 'quiet', lastEvent: null });
  assert.deepEqual(parseDONKI([{ eventTime: '2026-11-15T17:00Z' }, { eventTime: '2026-01-01T00:00Z' }], now), { status: 'quiet', lastEvent: null });
  for (const payload of [null, {}, [{ eventTime: 'broken' }], [{ eventTime: null }], [{ eventTime: '2026-11-14T12:00' }]]) {
    assert.throws(() => parseDONKI(payload, now));
  }
  assert.throws(() => parseDONKI([], 'invalid'), /reference time/);
  assert.equal(donkiURL(now), 'https://ccmc.gsfc.nasa.gov/DONKI-API/get/SEP?startDate=2026-10-15&endDate=2026-11-14');
});

test('fetcher uses injected fixture responses, CONFIG radiation, provenance and manual nulls', async () => {
  const requests = [];
  const cond = await fetchConditions({ now, fetchImpl: async (url, options) => {
    requests.push({ url, options });
    return { ok: true, json: async () => url === MEDA_URL ? meda : [] };
  } });
  assert.equal(requests.length, 2);
  assert.ok(requests.every((r) => r.options.headers['User-Agent'].includes('Mozilla') && r.options.signal));
  assert.equal(cond.asOf, now.toISOString());
  assert.equal(cond.synthetic, false);
  assert.equal(cond.sol, 1133);
  assert.equal(cond.doseRateMSvDay, CONFIG.radiation.surfaceMSvPerDay);
  assert.equal(cond.dustTau, null);
  assert.equal(cond.evaWindowLocal, null);
  assert.deepEqual(cond.manual, ['dustTau', 'evaWindowLocal']);
  assert.deepEqual(cond.sep, { status: 'quiet', lastEvent: null });
  assert.ok(cond.sources.every((s) => s.url.startsWith('https://') && s.retrieved === cond.asOf && s.note));
  assert.match(cond.sources[0].note, /2024-04-27.*archival/);
  assert.match(cond.sources[1].note, /Earth-side detection used as a proxy for Mars/);
  assert.match(cond.sources[2].note, /Gale Crater.*proxy for Jezero/);
  assert.equal(verdict(cond, null).level, 'CAUTION');
});

test('network, HTTP, JSON and schema failures stay unknown instead of reporting quiet', async () => {
  const failures = [
    async () => { throw new Error('offline'); },
    async () => ({ ok: false, status: 503 }),
    async () => ({ ok: true, json: async () => { throw new Error('invalid JSON'); } }),
    async () => ({ ok: true, json: async () => ({ error: 'bad schema' }) }),
  ];
  for (const fetchImpl of failures) {
    const cond = await fetchConditions({ now, fetchImpl });
    assert.deepEqual([cond.sol, cond.tempC, cond.pressurePa], [null, null, null]);
    assert.deepEqual(cond.sep, { status: null, lastEvent: null });
    for (const field of ['sol', 'tempC', 'pressurePa', 'sep']) assert.ok(cond.manual.includes(field));
    assert.match(cond.sources[1].note, /Unavailable:.*unknown, never quiet/);
    assert.equal(verdict(cond, null).level, 'CAUTION');
  }
  const partial = await fetchConditions({ now, fetchImpl: async (url) => {
    if (url !== MEDA_URL) throw new Error('solar offline');
    return { ok: true, json: async () => meda };
  } });
  assert.equal(partial.sol, 1133);
  assert.equal(partial.sep.status, null);
});

test('loader is module-relative, rejects unknown names / HTTP errors, and uses no live network', async (t) => {
  const calls = [];
  t.mock.method(globalThis, 'fetch', async (url) => {
    calls.push(url);
    return { ok: true, json: async () => quiet };
  });
  assert.deepEqual(await loadConditions('demo-quiet'), quiet);
  assert.equal(calls[0].href, new URL('../data/conditions/demo-quiet.json', import.meta.url).href);
  await assert.rejects(loadConditions('../secret'), /Unknown/);
  assert.equal(calls.length, 1);
  t.mock.method(globalThis, 'fetch', async () => ({ ok: false, status: 404 }));
  await assert.rejects(loadConditions('real'), /HTTP 404/);
});

test('all demo files obey the shared shape and give GO / CAUTION / NO-GO with actual demo plans', async () => {
  const terrain = await json('../data/demo/terrain.json');
  const targets = await json('../data/demo/targets.json');
  for (const [name, expected] of [['demo-quiet', 'GO'], ['demo-dusty', 'CAUTION'], ['demo-solar', 'NO-GO']]) {
    const cond = await json(`../data/conditions/${name}.json`);
    assert.equal(cond.synthetic, true);
    assert.equal(cond.site, 'jezero');
    assert.equal(cond.doseRateMSvDay, CONFIG.radiation.surfaceMSvPerDay);
    assert.ok(Number.isFinite(Date.parse(cond.asOf)));
    assert.ok(cond.sources.every((s) => s.name && s.url && s.retrieved));
    assert.equal(verdict(cond, null).level, expected);
    assert.equal(verdict(cond, planWalk(terrain, targets, { conditions: toToggles(cond) })).level, expected);
  }
});

test('renderer labels synthetic / manual values, replaces the card, uses text and safe links', () => {
  // Minimal DOM surface to verify rendering without installing a DOM library.
  class Element {
    constructor(tag) { this.tagName = tag; this.children = []; this.dataset = {}; this.attributes = {}; this.ownerDocument = doc; }
    append(child) { this.children.push(child); }
    replaceChildren(...children) { this.children = children; }
    setAttribute(name, value) { this.attributes[name] = value; }
    set textContent(text) { this.text = String(text); this.children = []; }
    get textContent() { return (this.text || '') + this.children.map((c) => c.textContent).join(' '); }
  }
  const doc = { createElement: (tag) => new Element(tag) };
  const mount = new Element('div');
  const cond = { ...quiet, sources: [{ name: '<img onerror=boom>', url: 'javascript:boom()', retrieved: quiet.asOf, note: 'Literal <b>text</b>' }] };
  assert.equal(renderConditions(mount, cond, plan()).level, 'GO');
  assert.equal(mount.children.length, 1);
  assert.match(mount.textContent, /SYNTHETIC DEMO/);
  assert.match(mount.textContent, /manual/);
  assert.match(mount.textContent, /Gale Crater.*proxy for Jezero/);
  assert.match(mount.textContent, /Literal <b>text<\/b>/);
  const walk = (node) => [node, ...node.children.flatMap(walk)];
  assert.equal(walk(mount).filter((e) => e.tagName === 'a').length, 0);
  renderConditions(mount, null, null);
  assert.equal(mount.children.length, 1);
  assert.equal(mount.children[0].dataset.level, 'CAUTION');
  assert.match(mount.textContent, /Unknown/);
});
