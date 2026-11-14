// Generated with AI assistance for NASA Space Apps 2026; reviewed by the team
import { planWalk, resolveTargets } from '../engine.js';
import { clampProgress, walkSnapshot } from './geometry.js';

export const byId = (id) => document.getElementById(id);

async function loadJson(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${url.pathname.split('/').at(-1)} returned HTTP ${response.status}`);
  return response.json();
}

export async function loadWalk() {
  const url = new URL(location.href);
  const params = url.searchParams;
  const requestedData = params.get('data');
  const dataset = ['real', 'gale'].includes(requestedData) ? requestedData : 'demo';
  const directory = new URL(`../../data/${dataset}/`, import.meta.url);
  const conditions = {
    dustStorm: params.get('dust') === '1',
    solarEvent: params.get('solar') === '1',
    heavyKit: params.get('kit') === '1',
  };
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
  const { habitat, targets } = resolveTargets(terrain, targetsFile);
  const plan = planWalk(terrain, { habitat, targets }, { stopIds, conditions });
  return {
    url, dataset, terrain, habitat, plan,
    targets: new Map(targets.map((target) => [target.id, target])),
    progress: clampProgress(Number(params.get('p'))),
    conditionFile: params.get('cond') ?? (dataset === 'demo' ? 'demo-quiet' : 'real'),
    label: terrain.synthetic ? 'Synthetic demo terrain' : dataset === 'gale' ? 'Gale Crater' : 'Jezero Crater',
  };
}

export function bindProgress(walk, draw) {
  const slider = byId('progress');
  const output = byId('progress-value');
  slider.value = walk.progress;
  const update = (progress) => {
    output.value = `${Math.round(progress * 100)}%`;
    slider.setAttribute('aria-valuetext', output.value);
    draw(walkSnapshot(walk.plan, walk.terrain, walk.habitat, progress));
  };
  slider.addEventListener('input', () => update(slider.valueAsNumber));
  // A committed slider change updates the shareable link without adding a history entry.
  slider.addEventListener('change', () => {
    walk.url.searchParams.set('p', slider.value);
    history.replaceState(history.state, '', walk.url);
  });
  update(slider.valueAsNumber);
}

export function showLoadError(error) {
  const status = byId('load-status');
  status.textContent = error.message;
  status.classList.add('load-error');
  status.hidden = false;
}

export const headingText = (angle) => `${String(Math.round(angle) % 360).padStart(3, '0')}°`;
