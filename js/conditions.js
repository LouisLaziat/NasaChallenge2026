// Generated with AI assistance for NASA Space Apps 2026; reviewed by the team
import { CONFIG } from './config.js';

// ASSUMPTION: decision thresholds assigned in docs/briefs/conditions.md; not EVA certification.
// Keep these local to this lane until the engine owner centralises them in CONFIG.
const DUST_TAU_LIMIT = 1.0;
const O2_CAUTION_FRACTION = 0.90; // less than 10% of usable oxygen left
const DOSE_CAUTION_FRACTION = 0.80;
const finite = (v) => typeof v === 'number' && Number.isFinite(v);
const nonnegative = (v) => finite(v) && v >= 0;
const knownSEP = (s) => ['quiet', 'watch', 'alert'].includes(s);
const MODEL_SOURCE = 'Marswalk planning model (team-assigned ASSUMPTION thresholds)';
const RAD_PROXY = 'Curiosity RAD measured at Gale Crater, used as a proxy for Jezero';

/** Module-relative URL works from the console, tablet and docs/ demo page alike. */
export async function loadConditions(name = 'real') {
  if (!['real', 'demo-quiet', 'demo-dusty', 'demo-solar'].includes(name)) {
    throw new Error(`Unknown conditions snapshot: ${name}`);
  }
  const response = await fetch(new URL(`../data/conditions/${name}.json`, import.meta.url));
  if (!response.ok) throw new Error(`Cannot load conditions ${name}: HTTP ${response.status}`);
  return response.json();
}

/** False means no positive trigger; unknown readings are explained by verdict(). */
export function toToggles(cond) {
  return {
    dustStorm: nonnegative(cond?.dustTau) && cond.dustTau > DUST_TAU_LIMIT,
    solarEvent: cond?.sep?.status === 'alert',
  };
}

function sourceFor(cond, pattern, fallback) {
  return cond?.sources?.find((s) => pattern.test(s.name))?.name || fallback;
}

/** Consume engine budgets without recomputing route costs or applying factors twice. */
export function verdict(cond, plan = null) {
  let level = 'GO';
  const reasons = [];
  const add = (severity, code, text, source) => {
    if (severity === 'NO-GO' || (severity === 'CAUTION' && level === 'GO')) level = severity;
    reasons.push({ code, text, source });
  };
  const sepSource = sourceFor(cond, /DONKI/i, 'NASA CCMC DONKI SEP');
  const dustSource = sourceFor(cond, /Climate|MCD/i, 'Mars Climate Database (LMD / ESA / CNES), manual input');

  if (cond?.sep?.status === 'alert') {
    add('NO-GO', 'sep-alert', 'Recent solar particle event. Earth-side detection used as a proxy for Mars.', sepSource);
  } else if (cond?.sep?.status === 'watch') {
    add('CAUTION', 'sep-watch', 'Solar particle event watch. Earth-side detection used as a proxy for Mars.', sepSource);
  }
  if (toToggles(cond).dustStorm) {
    add('CAUTION', 'dust', 'Dust optical depth exceeds 1.0; enable the dust-storm walking model (ASSUMPTION).', dustSource);
  }

  // ASSUMPTION: missing condition inputs require review rather than a reassuring GO.
  const missing = [];
  if (!knownSEP(cond?.sep?.status)) missing.push('solar particle status');
  if (!nonnegative(cond?.dustTau)) missing.push('dust optical depth');
  if (!nonnegative(cond?.sol) || !Number.isInteger(cond.sol)) missing.push('weather sol');
  if (!finite(cond?.tempC?.min) || !finite(cond?.tempC?.max) || cond.tempC.min > cond.tempC.max) missing.push('air temperature');
  if (!finite(cond?.pressurePa) || cond.pressurePa <= 0) missing.push('pressure');
  if (!nonnegative(cond?.doseRateMSvDay)) missing.push('baseline dose rate');
  const clockTime = (s) => typeof s === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(s);
  if (!clockTime(cond?.evaWindowLocal?.start) || !clockTime(cond?.evaWindowLocal?.end)) missing.push('manual EVA window');
  if (missing.length) add('CAUTION', 'unknown-conditions', `Unknown or invalid: ${missing.join(', ')}. Human review required (ASSUMPTION).`, 'Snapshot sources and manual fields');

  if (plan !== null && plan !== undefined) {
    if (plan.ok === false) add('NO-GO', 'plan-failed', 'The route planner could not produce a walk.', 'Route engine');
    if (plan.withinBudget === false) {
      const violations = Array.isArray(plan.violations) && plan.violations.length ? ` (${plan.violations.join(', ')})` : '';
      add('NO-GO', 'plan-budget', `The planned walk exceeds its budget${violations}.`, 'Route planner / suit budget settings');
    }
    const totals = plan.totals;
    const validO2 = nonnegative(totals?.o2UsedKg) && finite(totals?.o2UsableKg) && totals.o2UsableKg > 0;
    const validDose = nonnegative(totals?.doseMSv) && finite(totals?.doseLimitMSv) && totals.doseLimitMSv > 0;
    if (!validO2 || !validDose || typeof plan.withinBudget !== 'boolean') {
      add('CAUTION', 'unknown-budget', 'Route budget readings are incomplete or invalid; check the plan.', 'Route engine');
    }
    // Compare products to keep exactly 90% O2 / 80% dose on the non-caution side.
    if (validO2 && totals.o2UsedKg > O2_CAUTION_FRACTION * totals.o2UsableKg) {
      add('CAUTION', 'oxygen-margin', 'Less than 10% of usable oxygen remains above the suit reserve (ASSUMPTION).', MODEL_SOURCE);
    }
    if (validDose && totals.doseMSv > DOSE_CAUTION_FRACTION * totals.doseLimitMSv) {
      add('CAUTION', 'dose-margin', `Planned dose exceeds 80% of the EVA limit (ASSUMPTION). ${RAD_PROXY}.`, MODEL_SOURCE);
    }
  }
  if (!reasons.length) reasons.push({
    code: 'within-thresholds',
    text: plan ? 'Conditions and route budgets are within the planning thresholds.' : 'Conditions are within the planning thresholds; no route budget was evaluated.',
    source: MODEL_SOURCE,
  });
  return { level, reasons };
}

/** A self-contained, accessible card. No DOM access occurs until this is called. */
export function renderConditions(container, cond, plan = null) {
  const doc = container.ownerDocument;
  const make = (tag, text, parent, className) => {
    const el = doc.createElement(tag);
    if (text !== undefined) el.textContent = text;
    if (className) el.className = className;
    if (parent) parent.append(el);
    return el;
  };
  const result = verdict(cond, plan);
  const card = make('section', undefined, null, 'conditions-card');
  card.dataset.level = result.level;
  card.setAttribute('aria-label', `Jezero conditions: ${result.level}`);
  // Scoped styles travel with the module; no changes to another lane's CSS are needed.
  make('style', `
    .conditions-card { box-sizing:border-box; padding:1.3rem; border:1px solid #8295a8; border-top:5px solid var(--cond-accent); border-radius:12px; background:#12202e; color:#edf4fb; font:15px/1.5 system-ui,sans-serif; overflow-wrap:anywhere; --cond-accent:#8ae0b2; }
    .conditions-card[data-level="CAUTION"] { --cond-accent:#ffd381; }
    .conditions-card[data-level="NO-GO"] { --cond-accent:#ff9eaa; }
    .conditions-card h2 { font-size:2.2rem; margin:0; color:var(--cond-accent); }
    .conditions-card h3 { font-size:1rem; margin:1.2rem 0 .4rem; }
    .conditions-card p { margin:.5rem 0; }
    .conditions-card ul { padding-left:1.2rem; margin:.6rem 0; }
    .conditions-card li { margin:.55rem 0; }
    .conditions-card dl { margin:.8rem 0; }
    .conditions-card .conditions-row { display:grid; grid-template-columns:minmax(7rem,1fr) minmax(0,1.25fr); gap:.6rem; padding:.5rem 0; border-bottom:1px solid #34475a; }
    .conditions-card dt { color:#bdcddd; }
    .conditions-card dd { margin:0; }
    .conditions-card a { color:#acd6ff; text-underline-offset:3px; }
    .conditions-card small { display:block; color:#bdcddd; }
    .conditions-card .conditions-badge { display:inline-block; margin-left:.4rem; padding:0 .35rem; border:1px solid #b9a36d; border-radius:4px; color:#ffe0a1; font-size:.75rem; }
    .conditions-card .conditions-label { font-weight:600; color:#bdcddd; }
  `, card);
  make('p', cond?.synthetic === true ? 'SYNTHETIC DEMO · JEZERO' : 'JEZERO · SAVED CONDITIONS', card, 'conditions-label');
  make('h2', result.level, card);
  make('p', plan ? 'Conditions + route budget' : 'Conditions only · route budget not evaluated', card);
  const list = make('ul', undefined, card);
  for (const reason of result.reasons) {
    const item = make('li', reason.text, list);
    make('small', `Source: ${reason.source}`, item);
  }
  const values = make('dl', undefined, card);
  const manual = new Set(Array.isArray(cond?.manual) ? cond.manual : []);
  const row = (label, value, field) => {
    const group = make('div', undefined, values, 'conditions-row');
    make('dt', label, group);
    const dd = make('dd', value, group);
    if (manual.has(field)) make('span', 'manual', dd, 'conditions-badge');
  };
  const number = (v, unit, digits = 1) => finite(v) ? `${v.toFixed(digits)} ${unit}`.trim() : 'Unknown';
  row('Weather sol', number(cond?.sol, '', 0), 'sol');
  row('Air temperature', cond?.tempC ? `${number(cond.tempC.min, '°C')} to ${number(cond.tempC.max, '°C')}` : 'Unknown', 'tempC');
  row('Pressure', number(cond?.pressurePa, 'Pa'), 'pressurePa');
  row('Dust optical depth', number(cond?.dustTau, 'τ'), 'dustTau');
  row('Solar particles', knownSEP(cond?.sep?.status) ? cond.sep.status.toUpperCase() : 'Unknown', 'sep');
  row('Last SEP start (UTC)', cond?.sep?.lastEvent || 'None reported / unknown', 'sep.lastEvent');
  row('EVA window (Mars local)', cond?.evaWindowLocal ? `${cond.evaWindowLocal.start}–${cond.evaWindowLocal.end}` : 'Unknown', 'evaWindowLocal');
  row('Baseline radiation', number(cond?.doseRateMSvDay, 'mSv/day', 2), 'doseRateMSvDay');
  if (plan?.totals) {
    row('Route O₂ / usable', `${number(plan.totals.o2UsedKg, 'kg', 3)} / ${number(plan.totals.o2UsableKg, 'kg', 3)}`, '');
    row('Route dose / limit', `${number(plan.totals.doseMSv, 'mSv', 3)} / ${number(plan.totals.doseLimitMSv, 'mSv', 3)}`, '');
  }
  make('p', `${RAD_PROXY}. Published surface baseline: ${CONFIG.radiation.surfaceMSvPerDay} mSv/day; solar factors are planning assumptions.`, card);
  make('small', `Snapshot written: ${cond?.asOf || 'Unknown'}. This is a retrieval time, not a weather observation time; read the source notes.`, card);
  make('h3', 'Sources & provenance', card);
  const sources = make('ul', undefined, card);
  for (const source of cond?.sources || []) {
    const item = make('li', undefined, sources);
    // Build text nodes, and allow only web links from externally fetched metadata.
    let url;
    try { url = new URL(source.url); } catch { /* show an unlinked source */ }
    if (url && ['http:', 'https:'].includes(url.protocol)) {
      const a = make('a', source.name || 'Source', item);
      a.href = url.href;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
    } else make('span', source.name || 'Source', item);
    make('small', `Retrieved / recorded: ${source.retrieved || 'Unknown'}`, item);
    if (source.note) make('small', source.note, item);
  }
  make('small', 'GO/CAUTION/NO-GO is an educational planning model with ASSUMPTION thresholds; the manual EVA window is displayed, not enforced.', card);
  container.replaceChildren(card);
  return result;
}
