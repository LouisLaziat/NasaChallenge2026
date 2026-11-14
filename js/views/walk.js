// Generated with AI assistance for NASA Space Apps 2026; reviewed by the team
import { planWalk, resolveTargets } from '../engine.js';
import { buildSteps } from '../steps.js';
import { clampProgress, currentInstruction, walkSnapshot } from './geometry.js';

export const byId = (id) => document.getElementById(id);

async function loadJson(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${url.pathname.split('/').at(-1)} returned HTTP ${response.status}`);
  return response.json();
}

async function loadSnapshot(name) {
  try {
    const { loadConditions, toToggles, verdict } = await import('../conditions.js');
    const snapshot = await loadConditions(name);
    return { snapshot, suggested: toToggles(snapshot), verdict: (plan) => verdict(snapshot, plan) };
  } catch {
    return { suggested: {}, verdict: () => null };
  }
}

export async function loadWalk() {
  const url = new URL(location.href);
  const params = url.searchParams;
  const requestedData = params.get('data');
  const dataset = ['real', 'gale'].includes(requestedData) ? requestedData : 'demo';
  const directory = new URL(`../../data/${dataset}/`, import.meta.url);
  const localSnapshot = dataset === 'gale' ? 'real-gale' : 'real';
  const allowedSnapshots = [localSnapshot, 'demo-quiet', 'demo-dusty', 'demo-solar'];
  const requestedSnapshot = params.get('cond');
  const conditionFile = allowedSnapshots.includes(requestedSnapshot)
    ? requestedSnapshot : dataset === 'demo' ? 'demo-quiet' : localSnapshot;
  const snapshot = loadSnapshot(conditionFile);
  const stopIds = params.get('stops')?.split(',').map((id) => id.trim()).filter(Boolean);
  let terrain, targetsFile;
  try {
    [terrain, targetsFile] = await Promise.all([
      loadJson(new URL('terrain.json', directory)),
      loadJson(new URL('targets.json', directory)),
    ]);
  } catch (error) {
    const hint = dataset === 'demo' ? ' Open this page through the project’s local server.' : ' Try ?data=demo.';
    throw new Error(`Could not load ${dataset} data. ${error.message}.${hint}`);
  }
  const { snapshot: conditionsSnapshot, suggested, verdict } = await snapshot;
  const enabled = (param, fallback) => params.get(param) === '1' || (params.get(param) !== '0' && fallback === true);
  const conditions = {
    dustStorm: enabled('dust', suggested.dustStorm),
    solarEvent: enabled('solar', suggested.solarEvent),
    heavyKit: enabled('kit'),
  };
  const { habitat, targets } = resolveTargets(terrain, targetsFile);
  const plan = planWalk(terrain, { habitat, targets }, { stopIds, conditions });
  const playSeconds = Number(params.get('play'));
  return {
    url, dataset, terrain, habitat, plan,
    targets: new Map(targets.map((target) => [target.id, target])),
    routeSteps: buildSteps(plan, terrain),
    progress: clampProgress(Number(params.get('p'))),
    playMs: Number.isFinite(playSeconds * 1000) && playSeconds > 0 ? playSeconds * 1000 : 0,
    verdict: verdict(plan),
    conditionsSnapshot,
    label: terrain.synthetic ? 'Synthetic demo terrain' : dataset === 'gale' ? 'Gale Crater' : 'Jezero Crater',
  };
}

export function bindProgress(walk, draw) {
  const slider = byId('progress');
  const output = byId('progress-value');
  let animation;
  let started;
  slider.value = walk.playMs ? 0 : walk.progress;
  const update = (progress) => {
    output.value = `${Math.round(progress * 100)}%`;
    slider.setAttribute('aria-valuetext', output.value);
    const frame = walkSnapshot(walk.plan, walk.terrain, walk.habitat, progress);
    const instruction = frame.complete ? null : currentInstruction(walk.routeSteps, frame.routeIndex, walk.plan);
    draw(frame, instruction);
  };
  slider.addEventListener('input', () => {
    cancelAnimationFrame(animation);
    update(slider.valueAsNumber);
  });
  // A committed slider change updates the shareable link without adding a history entry.
  slider.addEventListener('change', () => {
    walk.url.searchParams.set('p', slider.value);
    walk.url.searchParams.delete('play');
    history.replaceState(history.state, '', walk.url);
  });
  update(slider.valueAsNumber);
  const advance = (now) => {
    started ??= now;
    const progress = clampProgress((now - started) / walk.playMs);
    slider.value = progress;
    update(progress);
    if (progress < 1) animation = requestAnimationFrame(advance);
  };
  if (walk.playMs && walk.plan.totals.totalTimeS > 0) animation = requestAnimationFrame(advance);
}

export function instructionText(instruction) {
  if (!instruction) return '';
  const { step, destination, remainingM } = instruction;
  return `${step.text} · ${Math.round(remainingM)} m toward ${destination}`;
}

export function showLoadError(error) {
  const status = byId('load-status');
  status.textContent = error.message;
  status.classList.add('load-error');
  status.hidden = false;
}

export const headingText = (angle) => `${String(Math.round(angle) % 360).padStart(3, '0')}°`;
