// Generated with AI assistance for NASA Space Apps 2026; reviewed by the team
import { renderPhotos } from '../photos.js';
import {
  cellLatLng, fmtDuration, fmtKg, imageLayer, paintHillshade, terrainBounds,
} from '../render.js';
import { turnBackPoint } from './geometry.js';
import { bindProgress, byId, headingText, loadWalk, showLoadError } from './walk.js';

function mountMap(walk) {
  const { L } = window;
  const container = byId('map');
  if (!L) {
    container.textContent = 'Route map unavailable. Check your connection to Leaflet.';
    container.classList.add('map-unavailable');
    return () => {};
  }

  const { plan, terrain, habitat } = walk;
  const bounds = terrainBounds(terrain);
  const map = L.map(container, {
    attributionControl: false, maxZoom: 22, zoomSnap: 0.25, scrollWheelZoom: false,
  });
  map.fitBounds(bounds, { padding: [4, 4] });
  imageLayer(paintHillshade(terrain), bounds, 0.82, 'overlayPane').addTo(map);

  const route = plan.path.map(([x, y]) => cellLatLng(terrain, x, y));
  const turn = turnBackPoint(plan);
  L.polyline(route, { color: '#24130f', weight: 7, opacity: 0.85 }).addTo(map);
  L.polyline(route, { color: '#ffc979', weight: 3, opacity: 1 }).addTo(map);
  if (turn && route.length > turn.pathIndex + 1) {
    L.polyline(route.slice(turn.pathIndex), { color: '#ff8279', weight: 3, dashArray: '5 5' }).addTo(map);
  }

  const marker = (x, y, label, type, tooltip) => L.marker(cellLatLng(terrain, x, y), {
    icon: L.divIcon({ className: `map-marker map-marker-${type}`, html: label, iconSize: [20, 20] }),
    title: tooltip,
  }).addTo(map);
  marker(habitat.x, habitat.y, 'H', 'habitat', 'Habitat');
  plan.stops.forEach((stop, index) => marker(stop.x, stop.y, String(index + 1), 'stop', stop.name));
  const astronaut = L.circleMarker(route[0], {
    radius: 6, color: '#fff', weight: 2, fillColor: '#00f0ca', fillOpacity: 1, interactive: false,
  }).addTo(map);
  return ({ lat, lon }) => astronaut.setLatLng([lat, lon]);
}

const oxygenText = (kg) => Number.isFinite(kg) ? `${fmtKg(kg)} kg` : '—';

async function start() {
  const walk = await loadWalk();
  byId('dataset').textContent = walk.label;
  byId('dataset').hidden = false;
  const consoleUrl = new URL('index.html', walk.url);
  consoleUrl.search = walk.url.search;
  consoleUrl.searchParams.delete('p');
  byId('console-link').href = consoleUrl.href;

  byId('walk').hidden = false;
  const moveAstronaut = mountMap(walk);
  const hasProfile = Boolean(walk.plan.profile?.length);
  const oxygenNote = byId('oxygen-note');
  let shownStopId;

  bindProgress(walk, (frame) => {
    moveAstronaut(frame.position);
    byId('destination-label').textContent = frame.complete ? 'EVA complete' : frame.returning ? 'Return to habitat' : 'Next stop';
    byId('destination').textContent = frame.complete || frame.returning ? 'Habitat' : frame.destination.name;
    byId('bearing').hidden = frame.bearing === null;
    if (frame.bearing !== null) {
      byId('bearing-value').textContent = headingText(frame.bearing);
      byId('direction-arrow').style.transform = `rotate(${frame.bearing}deg)`;
    }
    byId('distance').textContent = `${Math.round(frame.rangeM)} m`;
    byId('elapsed').textContent = fmtDuration(frame.position.elapsedS);
    byId('remaining').textContent = fmtDuration(frame.remainingS);
    byId('oxygen-left').textContent = oxygenText(frame.o2LeftKg);
    byId('oxygen-home').textContent = oxygenText(frame.o2ToHomeKg);
    byId('oxygen-reserve').textContent = oxygenText(frame.reserveKg);
    byId('estimate').textContent = hasProfile ? '' : 'Estimated';
    oxygenNote.hidden = frame.o2ToHomeKg !== null;
    oxygenNote.textContent = 'The plan has no walkback estimate at this point.';
    byId('turn-back').hidden = !frame.turnBack;

    const stopId = frame.complete ? null : frame.upcoming?.id;
    if (stopId !== shownStopId) {
      shownStopId = stopId;
      const target = walk.targets.get(stopId);
      byId('photo-card').hidden = !target;
      if (target) renderPhotos(byId('photos'), target);
    }
  });
  byId('load-status').hidden = true;
}

start().catch(showLoadError);
