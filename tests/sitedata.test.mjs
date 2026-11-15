// Generated with AI assistance for NASA Space Apps 2026; reviewed by the team
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { daysOld, ageText, weatherDate, stopsSummary, buildRows, tally, TAGS } from '../js/sitedata.js';

const load = (p) => JSON.parse(readFileSync(new URL(`../${p}`, import.meta.url), 'utf8'));
const data = {
  galeTargets: load('data/gale/targets.json'),
  realTargets: load('data/real/targets.json'),
  galeCond: load('data/conditions/real-gale.json'),
  realCond: load('data/conditions/real.json'),
  galeChem: load('data/gale/chemistry.json'),
};
const NOW = Date.parse('2026-11-14T21:00:00Z');

test('ages read in plain words', () => {
  assert.equal(daysOld('2026-11-14', NOW), 0);
  assert.equal(daysOld('2026-11-04', NOW), 10);
  assert.equal(daysOld(null, NOW), null);
  assert.equal(ageText(0), 'today');
  assert.equal(ageText(1), '1 day old');
  assert.equal(ageText(81), 'about 3 months old');
  assert.equal(ageText(931), 'about 2.5 years old');
  assert.equal(ageText(null), 'age unknown');
});

test('weather dates come from the conditions source notes', () => {
  assert.match(weatherDate(data.galeCond), /^\d{4}-\d{2}-\d{2}$/);
  assert.match(weatherDate(data.realCond), /^\d{4}-\d{2}-\d{2}$/);
  assert.equal(weatherDate({ sources: [{ note: 'no date' }] }), null);
});

test('stops summary counts stops, photos, sols and photo dates', () => {
  const g = stopsSummary(data.galeTargets);
  assert.equal(g.stops, data.galeTargets.targets.length);
  assert.ok(g.photos >= g.stops);
  assert.ok(g.solMin <= g.solMax);
  assert.ok(g.dateMin <= g.dateMax);
  assert.deepEqual(stopsSummary(null), { stops: 0, photos: 0, solMin: null, solMax: null, dateMin: null, dateMax: null });
});

test('every row has a known tag for both sites; site differences are where we expect', () => {
  const rows = buildRows(data, NOW);
  for (const [label, g, j] of rows) {
    assert.ok(label && TAGS[g.tag] && TAGS[j.tag], label);
    assert.ok(g.text && j.text, label);
  }
  const row = (name) => rows.find((r) => r[0].startsWith(name));
  assert.equal(row('Radiation')[1].tag, 'here');
  assert.equal(row('Radiation')[2].tag, 'borrowed');
  assert.equal(row('Sand')[1].tag, 'missing');
  assert.equal(row('Sand')[2].tag, 'orbit');
  assert.equal(row('Rock chemistry')[1].tag, 'here');
  assert.equal(row('Weather')[1].tag, 'latest');
  assert.ok(tally(rows, 0).here > tally(rows, 1).here, 'Gale has more measured-here rows');
});

test('missing files degrade to "not available" instead of throwing', () => {
  const rows = buildRows({}, NOW);
  const row = (name) => rows.find((r) => r[0].startsWith(name));
  assert.equal(row('Weather')[1].tag, 'missing');
  assert.equal(row('Science stops')[2].tag, 'missing');
  assert.equal(row('Rock chemistry')[1].tag, 'missing');
});
