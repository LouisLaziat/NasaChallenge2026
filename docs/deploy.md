# Publishing Marswalk Budget as a static site

Nothing here is published yet. Making the repo public (or paying for a plan) and pressing
"publish" are the humans' decisions. This page is the checklist for when they decide.

The site is plain static files. There is no build step: the repository folder **is** the site.
Total size is about 10 MB (the biggest files are the three `terrain.json` grids and the Gale
imagery, all under 3 MB).

## What was checked (2026-11-14, tonny-claude)

GitHub Pages serves a project site from a sub-path, `https://<owner>.github.io/NasaChallenge2026/`,
so every page must work there and not only at `/`. To test it, I served the folder *above* the repo
so the app sat at `http://localhost:8092/NasaChallenge2026/`, then loaded every page:

| Page | Result |
|---|---|
| `index.html` (demo, `?data=real`, `?data=gale`) | plan, Go/No-Go, turn-by-turn, photos load; no failed requests |
| `tablet.html?data=real`, `?data=gale` | loads, same plan |
| `hud.html?data=real`, `?data=gale` | loads, same plan |
| `docs/conditions-demo.html`, `docs/photos-demo.html` | load |

- No root-relative URLs (`/js/...`, `/data/...`): every file is loaded relative to the page or
  through `new URL(..., import.meta.url)`, which works under any sub-path.
- File names match their references letter for letter. GitHub Pages is case-sensitive and Windows
  is not, so this would only break online.
- Every external URL is `https://` (Leaflet and fonts from CDNs, Mars Trek tiles, the MMGIS
  traverse), so an HTTPS site has no mixed-content blocking.
- `.nojekyll` (empty, at the repo root) turns off Jekyll, so GitHub serves the files as they are.

To repeat the sub-path test (the `.` root bug in `scripts/serve.mjs` is fixed since 14:50):

```bash
node scripts/serve.mjs "$(cd .. && pwd)" 8092
# then open http://localhost:8092/NasaChallenge2026/
```

## Option A: GitHub Pages from `main` (preferred)

Needs: the repository **public** (GitHub Pages on a private repo needs a paid plan), and the
final `develop` merged into `main` (schedule: Sunday 12:00).

1. Repo owner: Settings → Pages → Build and deployment → Source: *Deploy from a branch*.
2. Branch: `main`, folder: `/ (root)` → Save.
3. Wait 1–2 minutes; the URL appears at the top of the Pages settings:
   `https://louislaziat.github.io/NasaChallenge2026/`.
4. Open the URL and check: `/`, `?data=real`, `?data=gale`, the tablet and HUD links, one photo.
5. Every later push to `main` redeploys on its own.

## Option B: Netlify Drop (fallback, no repo change)

For a private repo, or if Pages misbehaves.

1. Get a clean copy of the release: `git clone --branch main <repo> marswalk` (or download the
   ZIP from GitHub). Leave out `node_modules/` and `raw/`; they aren't needed.
2. Go to <https://app.netlify.com/drop> and drag the `marswalk` folder onto the page. It needs a
   free Netlify account to keep the site for longer than a short trial.
3. Netlify serves the site at the root of a random `*.netlify.app` address. That works too: the
   pages don't care whether they are at `/` or under a sub-path.
4. Re-drop the folder after any fix. The address stays the same if you drop onto the same site
   (Site → Deploys).

## After publishing

- Put the live URL in `README.md` and in the Space Apps project page.
- The Perseverance and Curiosity photos are loaded from NASA's servers at view time, so the site
  needs internet. Photo credits are shown next to each photo.
- If a NASA tile server is down during judging, the map still plans routes. Only the background
  imagery is missing.
