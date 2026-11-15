// Generated with AI assistance for NASA Space Apps 2026; reviewed by the team
// Photo renderer on Gale: written by codex-conditions on branch gale-map, kept here against the
// merged js/photos.js (the gale-map basemap code duplicated louis-claude's and was not merged).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { renderPhotos, PHOTO_CREDIT } from '../js/photos.js';

const dir = new URL('../data/gale/', import.meta.url);
const load = (f) => JSON.parse(readFileSync(new URL(f, dir), 'utf8'));

function replaceGlobal(t, key, value) {
  const previous = Object.getOwnPropertyDescriptor(globalThis, key);
  Object.defineProperty(globalThis, key, { value, writable: true, configurable: true });
  t.after(() => {
    if (previous) Object.defineProperty(globalThis, key, previous);
    else delete globalThis[key];
  });
}

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
