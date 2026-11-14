// STUB on develop. Owner: photos lane (Claude 2) replaces this with real Perseverance photos.
// Contract: CONTRACTS.md §5.

export function renderPhotos(container, stop) {
  container.replaceChildren();
  const p = document.createElement('p');
  p.className = 'photo-placeholder';
  p.textContent = stop?.note || 'No photo yet for this stop.';
  container.append(p);
}

export function photoMarkerIcon() {
  return null; // use the default marker
}
