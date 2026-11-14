// Generated with AI assistance for NASA Space Apps 2026; reviewed by the team
// Usage: node scripts/fetch_conditions.mjs (Node >= 20, no dependencies).
// Imports are side-effect free so all parsers and failure paths can be tested offline.
import { mkdir, writeFile, rename, rm } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, resolve } from 'node:path';
import { CONFIG } from '../js/config.js';

// ASSUMPTION: event-age windows assigned by the conditions brief, not Mars forecasts.
export const SEP_ALERT_DAYS = 2;
export const SEP_WATCH_DAYS = 7;
export const SEP_LOOKBACK_DAYS = 30;
const DAY_MS = 86400000;
const TIMEOUT_MS = 15000; // operational timeout, not a science threshold
export const MEDA_URL = 'https://mars.nasa.gov/rss/api/?feed=weather&category=mars2020&feedtype=json';
// NASA's September 2026 migration: https://ccmc.gsfc.nasa.gov/news/major-updates/
export const DONKI_URL = 'https://ccmc.gsfc.nasa.gov/DONKI-API/get/SEP';
const MCD_URL = 'https://www-mars.lmd.jussieu.fr/';
const RAD_URL = 'https://doi.org/10.1126/science.1244797';
const HEADERS = { 'User-Agent': 'Mozilla/5.0 (Marswalk Budget conditions fetcher)', Accept: 'application/json' };
const ROOT = fileURLToPath(new URL('../', import.meta.url));
const DEFAULT_OUTPUT = resolve(ROOT, 'data/conditions/real.json');

function numeric(value) {
  if (typeof value !== 'number' && typeof value !== 'string') return null;
  if (typeof value === 'string' && !value.trim()) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

/** Read the highest sol only: do not fill its gaps using another day's weather. */
export function parseMEDA(payload) {
  if (!Array.isArray(payload?.sols)) throw new Error('MEDA response must contain a sols array');
  const rows = payload.sols.filter((s) => s && numeric(s.sol) !== null && Number.isInteger(numeric(s.sol)) && numeric(s.sol) >= 0);
  if (!rows.length) throw new Error('MEDA response has no valid sols');
  const latest = rows.reduce((a, b) => numeric(a.sol) >= numeric(b.sol) ? a : b);
  const min = numeric(latest.min_temp), max = numeric(latest.max_temp);
  const pressure = numeric(latest.pressure);
  return {
    sol: numeric(latest.sol),
    tempC: min !== null && max !== null && min <= max ? { min, max } : null,
    pressurePa: pressure !== null && pressure > 0 ? pressure : null,
    observationDate: typeof latest.terrestrial_date === 'string' ? latest.terrestrial_date : null,
  };
}

/** Parse UTC DONKI eventTime, filtering future events; a failed query is never quiet. */
export function parseDONKI(payload, now = new Date()) {
  const at = new Date(now).getTime();
  if (!Number.isFinite(at)) throw new Error('Invalid reference time');
  if (!Array.isArray(payload)) throw new Error('DONKI response must be an array');
  let latest = null;
  for (const event of payload) {
    const value = event?.eventTime;
    // DONKI documents UTC; explicit offsets are accepted, ambiguous local dates are not.
    const timestamp = typeof value === 'string' && /T.*(?:Z|[+-]\d{2}:\d{2})$/.test(value) ? Date.parse(value) : NaN;
    if (!Number.isFinite(timestamp)) throw new Error('DONKI event has an invalid eventTime');
    if (timestamp <= at && timestamp >= at - SEP_LOOKBACK_DAYS * DAY_MS && (latest === null || timestamp > latest)) latest = timestamp;
  }
  if (latest === null) return { status: 'quiet', lastEvent: null };
  const age = at - latest;
  return {
    status: age <= SEP_ALERT_DAYS * DAY_MS ? 'alert' : age <= SEP_WATCH_DAYS * DAY_MS ? 'watch' : 'quiet',
    lastEvent: new Date(latest).toISOString(),
  };
}

export function donkiURL(now = new Date()) {
  const end = new Date(now);
  const start = new Date(end.getTime() - SEP_LOOKBACK_DAYS * DAY_MS);
  return `${DONKI_URL}?${new URLSearchParams({ startDate: start.toISOString().slice(0, 10), endDate: end.toISOString().slice(0, 10) })}`;
}

async function getJSON(url, fetchImpl) {
  const response = await fetchImpl(url, { headers: HEADERS, signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

/** Fetch independent feeds once. Failure is explicit in nulls, manual fields and notes. */
export async function fetchConditions({ now = new Date(), fetchImpl = globalThis.fetch } = {}) {
  const asOf = new Date(now).toISOString();
  const sepURL = donkiURL(now);
  const results = await Promise.allSettled([
    getJSON(MEDA_URL, fetchImpl).then(parseMEDA),
    getJSON(sepURL, fetchImpl).then((json) => parseDONKI(json, now)),
  ]);
  const [weather, solar] = results;
  const cond = {
    asOf, site: 'jezero', synthetic: false,
    sol: null, tempC: null, pressurePa: null,
    dustTau: null,
    doseRateMSvDay: CONFIG.radiation.surfaceMSvPerDay,
    sep: { status: null, lastEvent: null },
    evaWindowLocal: null,
    sources: [],
    manual: ['dustTau', 'evaWindowLocal'],
  };
  let weatherNote = 'MEDA, led by Spain\'s Centro de Astrobiología; sol, air temperature (°C), pressure (Pa).';
  if (weather.status === 'fulfilled') {
    const { observationDate, ...values } = weather.value;
    Object.assign(cond, values);
    weatherNote += ` Weather observation date: ${observationDate || 'unknown'}; this feed can be archival, not current EVA weather.`;
  } else weatherNote += ` Unavailable: ${weather.reason.message}. Unknown weather fields require manual input.`;
  for (const key of ['sol', 'tempC', 'pressurePa']) if (cond[key] === null) cond.manual.push(key);
  cond.sources.push({ name: 'Perseverance MEDA (NASA/JPL; CAB, Spain)', url: MEDA_URL, retrieved: asOf, note: weatherNote });
  if (solar.status === 'fulfilled') cond.sep = solar.value;
  else cond.manual.push('sep');
  cond.sources.push({
    name: 'DONKI SEP (NASA CCMC)', url: sepURL, retrieved: asOf,
    note: `Earth-side detection used as a proxy for Mars. Event-start age <= ${SEP_ALERT_DAYS} days: alert; <= ${SEP_WATCH_DAYS}: watch; otherwise quiet (ASSUMPTION). Query covers the last ${SEP_LOOKBACK_DAYS} days. ${solar.status === 'fulfilled' ? 'Query succeeded; quiet means no recent event start in this catalogue, not a Mars all-clear.' : `Unavailable: ${solar.reason.message}. Status remains unknown, never quiet.`}`,
  });
  cond.sources.push({ name: 'Curiosity RAD / Hassler et al. (2014)', url: RAD_URL, retrieved: asOf,
    note: 'doseRateMSvDay read from CONFIG.radiation.surfaceMSvPerDay; measured at Gale Crater, used as a proxy for Jezero. Published baseline, not a live dosimeter.' });
  cond.sources.push({ name: 'Mars Climate Database (LMD / ESA / CNES)', url: MCD_URL, retrieved: asOf,
    note: 'dustTau and evaWindowLocal require manual entry from the MCD interface and team review; no MCD values were retrieved. The manual EVA window is displayed, not enforced.' });
  return cond;
}

/** Atomic replacement avoids leaving a truncated snapshot if writing is interrupted. */
export async function writeConditions(cond, output = DEFAULT_OUTPUT) {
  await mkdir(dirname(output), { recursive: true });
  const temp = `${output}.${process.pid}.tmp`;
  try {
    await writeFile(temp, `${JSON.stringify(cond, null, 2)}\n`, 'utf8');
    await rename(temp, output);
  } finally { await rm(temp, { force: true }); }
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  try {
    const cond = await fetchConditions();
    await writeConditions(cond);
    console.log(`Wrote data/conditions/real.json (${cond.asOf}); manual: ${cond.manual.join(', ')}`);
    for (const source of cond.sources) if (source.note.includes('Unavailable:')) console.warn(source.note);
  } catch (error) {
    console.error(`Conditions snapshot was not written: ${error.message}`);
    process.exitCode = 1;
  }
}
